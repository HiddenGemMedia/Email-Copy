/**
 * Welcome Flow store — LOCAL ONLY for now.
 *
 * Everything lives in localStorage. No Supabase, no server. When we move to a
 * database this store keeps the same shape, so only the read/write calls change.
 *
 * Welcome Flow keeps its OWN client list — deliberately not wired to
 * Email_Client_API. These are new onboarding clients, and decoupling means the
 * campaign client list can change without affecting this.
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

      // ── clients ────────────────────────────────────────────────────────
      addClient: (data) => {
        const id = uid()
        set((s) => ({
          clients: [...s.clients, {
            id,
            name:       data.name?.trim()  || 'Untitled client',
            email:      data.email?.trim() || '',
            locationId: data.locationId?.trim() || '',
            ghlApiKey:  data.ghlApiKey?.trim()  || '',
            folderUrl:  data.folderUrl?.trim()  || '',
            folderId:   data.folderId?.trim()   || '',
            logoUrl:    '',
          }].sort((a, b) => a.name.localeCompare(b.name)),
          emails: { ...s.emails, [id]: [] },
        }))
        return id
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
    { name: 'welcome-flow-v1' }
  )
)
