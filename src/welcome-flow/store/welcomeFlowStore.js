/**
 * Welcome Flow store.
 *
 * CLIENTS come from the database — email_wf_clients in the Welcome Flow Supabase
 * project — via /.netlify/functions/wf-clients. They are not persisted locally,
 * so the server is the single source of truth and stale rows cannot linger.
 *
 * EMAILS are still localStorage for now; they move to email_wf_emails next.
 *
 * A client only appears here once it has been added on this page. The location_id
 * is the join key: the GHL API key and logo are resolved from the other Supabase
 * project at request time and never stored here.
 *
 * Shape:
 *   clients: [{ id, name, email, locationId, ghlApiKey, folderUrl, folderId }]
 *     - folderUrl/folderId are the "static info" entered once, reused per email
 *   emails:  { [clientId]: [{ id, position, subject, status, templateId,
 *                             copy, selectedImages, generatedUrls, renderedHtml,
 *                             createdAt, updatedAt }] }
 *
 * Status lifecycle:  draft -> ready -> in_review -> approved -> pushed
 *                                                        ↑         ↓
 *                                                    needs_update ←┘
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const WF_STATUS = {
  draft:        { label: 'Draft',        tone: 'neutral' },
  ready:        { label: 'Ready',        tone: 'info'    },
  in_review:    { label: 'In review',    tone: 'warn'    },
  approved:     { label: 'Approved',     tone: 'good'    },
  pushed:       { label: 'Pushed',       tone: 'good'    },
  needs_update: { label: 'Needs update', tone: 'warn'    },
}

// statuses that count as "finished" on the client cards
const DONE = new Set(['approved', 'pushed'])

const uid = () => `wf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`

export const useWelcomeFlowStore = create(
  persist(
    (set, get) => ({
      clients: [],
      emails:  {},
      loadingClients: false,
      clientsError:   null,

      // ── clients: server-backed ─────────────────────────────────────────
      fetchClients: async () => {
        set({ loadingClients: true, clientsError: null })
        try {
          const res  = await fetch('/.netlify/functions/wf-clients')
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
          set({ clients: data.clients || [], loadingClients: false })
        } catch (e) {
          set({ clientsError: e.message, loadingClients: false })
        }
      },

      /** Validate a GHL location against the client database before creating. */
      lookupLocation: async (locationId) => {
        const res  = await fetch('/.netlify/functions/wf-clients?locationId=' + encodeURIComponent(locationId))
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Lookup failed')
        return data.match
      },

      addClient: async (data) => {
        const res  = await fetch('/.netlify/functions/wf-clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        const body = await res.json()
        if (!res.ok) throw new Error(body.error || `Create failed (${res.status})`)
        set((s) => ({
          clients: [...s.clients, body.client].sort((a, b) => a.name.localeCompare(b.name)),
          emails:  { ...s.emails, [body.client.id]: s.emails[body.client.id] || [] },
        }))
        return body.client.id
      },

      updateClient: (id, patch) => set((s) => ({
        clients: s.clients.map(c => (c.id === id ? { ...c, ...patch } : c)),
      })),

      removeClient: (id) => set((s) => {
        const { [id]: _drop, ...rest } = s.emails
        return { clients: s.clients.filter(c => c.id !== id), emails: rest }
      }),

      getClient: (id) => get().clients.find(c => c.id === id) || null,

      // ── emails ─────────────────────────────────────────────────────────
      getEmails: (clientId) => get().emails[clientId] || [],

      addEmail: (clientId, data = {}) => {
        const list = get().emails[clientId] || []
        const id = uid()
        const now = new Date().toISOString()
        set((s) => ({
          emails: {
            ...s.emails,
            [clientId]: [...list, {
              id,
              position:       list.length + 1,
              subject:        data.subject || '',
              status:         'draft',
              templateId:     data.templateId ?? null,
              copy:           data.copy || {},
              selectedImages: [],
              generatedUrls:  {},
              renderedHtml:   '',
              createdAt:      now,
              updatedAt:      now,
            }],
          },
        }))
        return id
      },

      updateEmail: (clientId, emailId, patch) => set((s) => ({
        emails: {
          ...s.emails,
          [clientId]: (s.emails[clientId] || []).map(e =>
            e.id === emailId
              ? {
                  ...e,
                  ...patch,
                  // editing something already pushed means GHL is now stale
                  status: (e.status === 'pushed' && !patch.status) ? 'needs_update' : (patch.status || e.status),
                  updatedAt: new Date().toISOString(),
                }
              : e
          ),
        },
      })),

      removeEmail: (clientId, emailId) => set((s) => ({
        emails: {
          ...s.emails,
          [clientId]: (s.emails[clientId] || [])
            .filter(e => e.id !== emailId)
            .map((e, i) => ({ ...e, position: i + 1 })),
        },
      })),

      // ── counts for the client cards ────────────────────────────────────
      counts: (clientId) => {
        const list = get().emails[clientId] || []
        return {
          total:      list.length,
          done:       list.filter(e => DONE.has(e.status)).length,
          inProgress: list.filter(e => !DONE.has(e.status)).length,
          lastActive: list.reduce((a, e) => (e.updatedAt > a ? e.updatedAt : a), ''),
        }
      },
    }),
    {
      name: 'welcome-flow-v1',
      // clients are server-backed; only emails persist locally
      partialize: (s) => ({ emails: s.emails }),
    }
  )
)
