/**
 * Welcome Flow — email brief (step 1 of a WF email).
 *
 * Same shape as the campaign brief, but scoped to one email inside one client's
 * flow. The client is fixed by the route, so it is shown rather than chosen.
 *
 * The GHL folder URL is the "static info" — entered once, saved onto the client,
 * and pre-filled on every later email for that client.
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft, IconSparkles, IconBolt } from '@tabler/icons-react'
import { useWelcomeFlowStore } from '../store/welcomeFlowStore'
import { useWfTheme, WfCard, WfButton, WfInput, WfStepNav } from '../components/wfUi'
import { WF_WEEKS, wfWeek, wfWeekReady } from '../wfWeeks'
import { WF_TEST_VARIATIONS } from '../wfTestData'

/** GHL folder links carry the id as ?folderId=… */
function folderIdFrom(url = '') {
  const m = url.match(/[?&]folderId=([^&\s]+)/)
  return m ? m[1] : ''
}

export default function WFBrief() {
  const { clientId, emailId } = useParams()
  const navigate = useNavigate()
  const t = useWfTheme()
  const { getClient, getEmails, updateClient, updateEmail, ensureClients, loadingClients } = useWelcomeFlowStore()

  // clients are not persisted — refetch after a reload on this deep route
  useEffect(() => { ensureClients() }, [ensureClients])

  const client = getClient(clientId)
  const email  = (getEmails(clientId) || []).find(e => e.id === emailId)

  const [folderUrl, setFolderUrl] = useState('')
  const [prompt, setPrompt]       = useState('')
  const [week, setWeek]           = useState('')

  useEffect(() => {
    if (!client) return
    setFolderUrl(client.folderUrl || '')
    setPrompt(prev => prev || `Client Name: ${client.name}\nTheme:\nAudience:`)
  }, [client])

  // default to this email's slot in the flow — email 3 is usually week 3
  useEffect(() => {
    if (!email) return
    setWeek(String(email.week || email.position || ''))
  }, [email?.id])   // eslint-disable-line react-hooks/exhaustive-deps

  if (loadingClients && !client) {
    return (
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>
        <WfCard style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: t.muted }}>Loading…</div>
        </WfCard>
      </div>
    )
  }

  if (!client || !email) {
    return (
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>
        <WfCard style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>That email no longer exists</div>
          <WfButton variant="ghost" style={{ marginTop: 14 }} onClick={() => navigate('/welcome-flow')}>
            <IconArrowLeft size={15} /> All clients
          </WfButton>
        </WfCard>
      </div>
    )
  }

  const folderId = folderIdFrom(folderUrl)
  const themeFilled = /Theme:\s*\S/.test(prompt) && /Audience:\s*\S/.test(prompt)
  const weekReady   = wfWeekReady(week)

  const persist = () => {
    updateClient(clientId, { folderUrl, folderId })          // remember for next time
    updateEmail(clientId, emailId, {
      brief: prompt, folderUrl, folderId,
      week:       week ? Number(week) : null,
      templateId: wfWeek(week)?.templateId ?? null,
    })
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '28px 24px 64px' }}>
      <WfStepNav
        backLabel={client.name}
        onBack={() => { persist(); navigate(`/welcome-flow/${clientId}`) }}
        // only offered once copy exists — otherwise there is nothing to review
        nextLabel={email.variations?.length ? 'Next: Copy' : undefined}
        onNext={email.variations?.length
          ? () => { persist(); navigate(`/welcome-flow/${clientId}/email/${emailId}/copy`) }
          : undefined}
      />

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 13px', borderRadius: 999,
          background: t.dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.72)',
          border: `1px solid ${t.border}`, fontSize: 11, fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: t.muted, marginBottom: 12,
        }}>
          <IconSparkles size={13} color={t.accent} stroke={2} />
          Email {String(email.position).padStart(2, '0')} · Step 1 of 5
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: t.text }}>
          Email Brief
        </h1>
        <p style={{ fontSize: 13, color: t.muted, margin: '7px 0 0' }}>
          Describe this email. The client is already set by the flow.
        </p>
      </div>

      <WfCard style={{ padding: 24 }}>
        {/* client — fixed by the route */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: t.text, display: 'block', marginBottom: 6 }}>Client</label>
          <div style={{
            padding: '10px 12px', borderRadius: 10, border: `1px solid ${t.border}`,
            background: t.dark ? 'rgba(255,255,255,0.02)' : '#f9fafb',
            fontSize: 13, color: t.text,
          }}>
            {client.name}
          </div>
        </div>

        {/* which email in the flow — decides the template and the n8n workflow */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: t.text, display: 'block', marginBottom: 6 }}>
            Welcome Email{' '}
            <span style={{ fontWeight: 400, color: t.muted }}>sets the template and which n8n workflow runs</span>
          </label>
          <select
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            onBlur={persist}
            style={{
              width: '100%', padding: '11px 12px', borderRadius: 10,
              border: `1px solid ${t.border}`, background: t.inputBg, color: t.text,
              fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="">Select which email this is…</option>
            {WF_WEEKS.map(w => (
              <option key={w.week} value={w.week}>
                Week {w.week}{w.templateId ? '' : ' — template not built yet'}
              </option>
            ))}
          </select>
          {week && !weekReady && (
            <div style={{ fontSize: 11.5, color: '#b45309', marginTop: 6 }}>
              Week {week} has no template yet, so it can’t be generated.
            </div>
          )}
        </div>

        {/* folder — static info, remembered on the client */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: t.text, display: 'block', marginBottom: 6 }}>
            GHL Folder URL{' '}
            <span style={{ fontWeight: 400, color: t.muted }}>saved to this client — you only enter it once</span>
          </label>
          <WfInput
            value={folderUrl}
            onChange={(e) => setFolderUrl(e.target.value)}
            onBlur={persist}
            placeholder="https://app.gohighlevel.com/v2/location/…/marketing/emails/all?folderId=…"
          />
          {folderId && (
            <div style={{ fontSize: 11.5, color: '#16a34a', marginTop: 6 }}>✓ Folder ID: {folderId}</div>
          )}
        </div>

        {/* prompt */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: t.text, display: 'block', marginBottom: 6 }}>
            Prompt <span style={{ fontWeight: 400, color: t.muted }}>sent to your n8n workflow</span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onBlur={persist}
            rows={7}
            style={{
              width: '100%', padding: '11px 12px', borderRadius: 10,
              border: `1px solid ${t.border}`, background: t.inputBg, color: t.text,
              fontSize: 13, fontFamily: 'Inter, sans-serif', lineHeight: 1.6, outline: 'none', resize: 'vertical',
            }}
          />
          <div style={{ fontSize: 11.5, color: t.muted, marginTop: 6 }}>
            Pick the week, fill in Theme and Audience, then generate.
          </div>
        </div>

        <WfButton
          disabled={!themeFilled || !weekReady}
          onClick={() => { persist(); alert(`Week ${week}: copy generation is wired up in the next step.`) }}
          style={{ width: '100%', justifyContent: 'center', padding: '12px 16px' }}
        >
          Generate Copy with n8n →
        </WfButton>

        <button
          onClick={() => {
            persist()
            // skip n8n: drop the Starlight Haven variations straight into the email
            updateEmail(clientId, emailId, {
              variations:        WF_TEST_VARIATIONS,
              selectedVariation: 0,
              copy:              WF_TEST_VARIATIONS[0],
              subject:           WF_TEST_VARIATIONS[0].subjectLine,
              status:            'ready',
            })
            navigate(`/welcome-flow/${clientId}/email/${emailId}/copy`)
          }}
          style={{
            width: '100%', marginTop: 10, padding: '10px 16px', borderRadius: 10,
            border: `1px dashed ${t.border}`, background: 'transparent', color: t.muted,
            fontSize: 12.5, fontWeight: 600, fontFamily: 'Inter, sans-serif', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}
        >
          <IconBolt size={14} stroke={2} /> Dev: Skip n8n — use test data
        </button>
      </WfCard>
    </div>
  )
}
