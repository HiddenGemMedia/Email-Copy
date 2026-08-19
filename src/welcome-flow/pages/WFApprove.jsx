/**
 * Welcome Flow — approve & push (step 5 of a WF email).
 *
 * Same shape and same endpoints as the Weekly Email Campaign's ApprovalPanel:
 * review summary, optional notes, Approve & Push / Send Back for Revision.
 * Approve calls push-html-to-ghl (creates or updates a GHL email template,
 * moves it into the client's folder) then notifyChat (non-fatal).
 *
 * The one difference is the API key: the weekly campaign sends it from the
 * browser, Welcome Flow never holds it, so client.ghlApiKey is omitted and
 * push-html-to-ghl resolves it server-side from the location id.
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IconCheck, IconRotate, IconDatabase } from '@tabler/icons-react'
import { useWelcomeFlowStore } from '../store/welcomeFlowStore'
import { useWfTheme, WfCard, WfButton, WfStepNav } from '../components/wfUi'
import { pushHtmlToGHL, notifyChat, wfPushEmail } from '../../lib/api'

export default function WFApprove() {
  const { clientId, emailId } = useParams()
  const navigate = useNavigate()
  const t = useWfTheme()
  const { getClient, getEmails, updateEmail, ensureClients, loadingClients } = useWelcomeFlowStore()

  useEffect(() => { ensureClients() }, [ensureClients])

  const client = getClient(clientId)
  const email  = (getEmails(clientId) || []).find(e => e.id === emailId)

  const [notes, setNotes]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [dbSaving, setDbSaving] = useState(false)
  const [dbMsg, setDbMsg]       = useState('')
  const [dbErr, setDbErr]       = useState('')
  const [done, setDone]       = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')

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
            All clients
          </WfButton>
        </WfCard>
      </div>
    )
  }

  const copy = email.copy || {}

  /** Save this email — all three variations plus both HTML versions — into
   *  email_wf_emails. Re-pushing updates the same row rather than adding one. */
  async function handlePushDatabase() {
    setDbSaving(true); setDbErr(''); setDbMsg('')
    try {
      const res = await wfPushEmail({
        clientId:   clientId,
        clientName: client.name,
        position:   email.position,
        dbId:       email.dbId || null,
        email,
      })
      updateEmail(clientId, emailId, { dbId: res.id })
      setDbMsg(`${res.action === 'updated' ? 'Updated' : 'Saved'} — ${res.variations} variations, ${(res.renderedBytes/1024).toFixed(1)} KB of HTML`)
    } catch (e) {
      setDbErr(e.message)
    } finally {
      setDbSaving(false)
    }
  }

  async function handleApprove() {
    setLoading(true); setError('')
    try {
      const result = await pushHtmlToGHL({
        client: { name: client.name, ghl: { locationId: client.locationId } }, // no ghlApiKey — resolved server side
        renderedHtml:  email.renderedHtml,
        generatedCopy: copy,
        templateId:    email.ghlTemplateId || null,
        locationId:    client.locationId,
        folderId:      client.folderId,
        templateLabel: email.templateLabel || `Email ${email.position}`,
      })
      updateEmail(clientId, emailId, {
        status: 'pushed',
        ghlTemplateId: result.templateId || email.ghlTemplateId || null,
        pushedAt: new Date().toISOString(),
      })
      setPreviewUrl(client.folderUrl || result.previewUrl || '')
      try {
        await notifyChat({ clientName: client.name, previewUrl: result.previewUrl, approvedBy: 'Welcome Flow' })
      } catch { /* non-fatal — the push already succeeded */ }
      setDone(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleReject() {
    updateEmail(clientId, emailId, { status: 'needs_update', reviewNotes: notes })
  }

  if (done) {
    return (
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ textAlign: 'center', padding: '56px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 44 }}>✅</div>
          <p style={{ fontSize: 19, fontWeight: 700, color: t.text }}>Email pushed to GHL!</p>
          <p style={{ fontSize: 13.5, color: t.muted }}>Google Chat notification sent.</p>
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', marginTop: 6 }}>
              <WfButton>Open in GHL →</WfButton>
            </a>
          )}
          <WfButton variant="ghost" style={{ marginTop: 4 }} onClick={() => navigate(`/welcome-flow/${clientId}`)}>
            Back to {client.name}
          </WfButton>
        </div>
      </div>
    )
  }

  if (email.status === 'needs_update') {
    return (
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ textAlign: 'center', padding: '56px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 44 }}>🔄</div>
          <p style={{ fontSize: 19, fontWeight: 700, color: t.text }}>Sent back for revision</p>
          <p style={{ fontSize: 13.5, color: t.muted }}>Notes: {email.reviewNotes || '—'}</p>
          <WfButton variant="ghost" style={{ marginTop: 6 }} onClick={() => updateEmail(clientId, emailId, { status: 'ready' })}>
            Re-open
          </WfButton>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '28px 24px 64px' }}>
      <WfStepNav backLabel="Preview" onBack={() => navigate(`/welcome-flow/${clientId}/email/${emailId}/preview`)} />

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 13px', borderRadius: 999,
          background: t.dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.72)',
          border: `1px solid ${t.border}`, fontSize: 11, fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: t.muted, marginBottom: 12,
        }}>
          Email {String(email.position).padStart(2, '0')} · Step 5 of 5
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: t.text }}>
          Approve &amp; Push
        </h1>
        <p style={{ fontSize: 13, color: t.muted, margin: '7px 0 0' }}>
          Pushes the rendered email into {client.name}'s GHL template folder.
        </p>
      </div>

      <WfCard style={{ padding: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.faint, marginBottom: 14 }}>
          Review Summary
        </div>
        <dl style={{ fontSize: 13.5, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Client',  value: client.name },
            { label: 'Subject', value: copy.subjectLine },
            { label: 'Preview', value: copy.previewText },
            { label: 'CTA',     value: copy.ctaText },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', gap: 8 }}>
              <dt style={{ fontWeight: 600, color: t.muted, minWidth: 62 }}>{label}</dt>
              <dd style={{ color: t.text }}>{value || '—'}</dd>
            </div>
          ))}
        </dl>
      </WfCard>

      {!email.renderedHtml && (
        <WfCard style={{ padding: 16, marginTop: 14, borderColor: 'rgba(180,83,9,0.35)' }}>
          <div style={{ fontSize: 12.5, color: '#b45309' }}>
            No rendered preview yet — go back to Preview and let the template load before pushing.
          </div>
        </WfCard>
      )}

      <div style={{ marginTop: 18 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: t.text, display: 'block', marginBottom: 6 }}>
          Notes <span style={{ fontWeight: 400, color: t.muted }}>(optional)</span>
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any feedback for the record…"
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 10,
            border: `1px solid ${t.border}`, background: t.inputBg, color: t.text,
            fontSize: 13, fontFamily: 'Inter, sans-serif', lineHeight: 1.6, outline: 'none', resize: 'vertical',
          }}
        />
      </div>

      {error && (
        <div style={{ fontSize: 12.5, color: '#dc2626', marginTop: 12 }}>{error}</div>
      )}

      {/* Save to the Welcome Flow database — independent of the GHL push, so
          the copy and HTML can be stored without publishing anything. */}
      <div style={{ marginTop: 16 }}>
        <WfButton
          variant="ghost"
          onClick={handlePushDatabase}
          disabled={dbSaving}
          style={{ width: '100%', justifyContent: 'center', padding: '12px 16px' }}
        >
          <IconDatabase size={15} stroke={2} /> {dbSaving ? 'Saving to database…' : 'Push to Database'}
        </WfButton>
        {dbMsg && <div style={{ fontSize: 12, color: '#16a34a', marginTop: 8, textAlign: 'center' }}>✓ {dbMsg}</div>}
        {dbErr && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 8, textAlign: 'center' }}>⚠ {dbErr}</div>}
        <div style={{ fontSize: 11.5, color: t.muted, marginTop: 8, textAlign: 'center' }}>
          Stores all {(email.variations || []).length || 0} variations, the preview HTML and the rendered HTML.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <WfButton
          onClick={handleApprove}
          disabled={loading || !email.renderedHtml}
          style={{ flex: 1, justifyContent: 'center', padding: '12px 16px' }}
        >
          <IconCheck size={15} stroke={2.4} /> {loading ? 'Pushing to GHL…' : 'Approve & Push to GHL'}
        </WfButton>
        <WfButton
          variant="ghost"
          onClick={handleReject}
          disabled={loading}
          style={{ flex: 1, justifyContent: 'center', padding: '12px 16px' }}
        >
          <IconRotate size={15} stroke={2.2} /> Send Back for Revision
        </WfButton>
      </div>
    </div>
  )
}
