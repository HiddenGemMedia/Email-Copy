/**
 * Welcome Flow — one client's emails.
 * Summary tiles + the email list, with a filter and a New email action.
 * No Export button (deliberately, per spec).
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft, IconPlus, IconMail } from '@tabler/icons-react'
import { useWelcomeFlowStore } from '../store/welcomeFlowStore'
import { useWfTheme, WfCard, WfButton, WfStatusPill } from '../components/wfUi'

const DONE = new Set(['approved', 'pushed'])

function relative(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const day = 86400000
  if (diff < 60000)    return 'just now'
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`
  if (diff < day)      return `${Math.floor(diff / 3600000)}h ago`
  if (diff < day * 30) return `${Math.floor(diff / day)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function Tile({ label, value, tone }) {
  const t = useWfTheme()
  return (
    <WfCard style={{ padding: '16px 18px', flex: '1 1 180px' }}>
      <div style={{ fontSize: 12, color: t.muted }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: tone || t.text, marginTop: 6, lineHeight: 1 }}>{value}</div>
    </WfCard>
  )
}

export default function WFClientDetail() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const t = useWfTheme()
  const { getClient, getEmails, counts, addEmail, ensureClients, loadingClients } = useWelcomeFlowStore()
  const [filter, setFilter] = useState('all')

  // clients are not persisted — refetch after a reload on this deep route
  useEffect(() => { ensureClients() }, [ensureClients])

  const client = getClient(clientId)
  const emails = getEmails(clientId)
  const c = counts(clientId)

  const shown = useMemo(() => {
    if (filter === 'done')        return emails.filter(e => DONE.has(e.status))
    if (filter === 'in_progress') return emails.filter(e => !DONE.has(e.status))
    return emails
  }, [emails, filter])

  if (loadingClients && !client) {
    return (
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 24px' }}>
        <WfCard style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: t.muted }}>Loading…</div>
        </WfCard>
      </div>
    )
  }

  if (!client) {
    return (
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 24px' }}>
        <WfCard style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Client not found</div>
          <WfButton variant="ghost" style={{ marginTop: 14 }} onClick={() => navigate('/welcome-flow')}>
            <IconArrowLeft size={15} /> All clients
          </WfButton>
        </WfCard>
      </div>
    )
  }

  const initials = client.name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()

  const startNewEmail = () => {
    const id = addEmail(clientId)
    navigate(`/welcome-flow/${clientId}/email/${id}`)
  }

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px 64px' }}>
      <button
        onClick={() => navigate('/welcome-flow')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
                 color: t.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 20 }}
      >
        <IconArrowLeft size={15} stroke={2.2} /> All clients
      </button>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 999, flexShrink: 0,
            background: t.dark ? 'rgba(255,255,255,0.06)' : '#eef2f7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: t.muted, letterSpacing: '0.02em',
          }}>{initials}</div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: t.text, letterSpacing: '-0.02em', margin: 0 }}>{client.name}</h1>
            {client.email && (
              <div style={{ fontSize: 12.5, color: t.muted, marginTop: 3 }}>{client.email}</div>
            )}
          </div>
        </div>
        <WfButton onClick={startNewEmail}>
          <IconPlus size={15} stroke={2.4} /> New email
        </WfButton>
      </div>

      {/* summary */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
        <Tile label="Done"        value={c.done} />
        <Tile label="In progress" value={c.inProgress} tone={c.inProgress ? '#b45309' : undefined} />
        <Tile label="Last activity" value={relative(c.lastActive)} />
      </div>

      {/* emails */}
      <WfCard style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '16px 18px', borderBottom: `1px solid ${t.border}`, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>Emails</div>
            <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>
              {emails.length} total for this client
            </div>
          </div>
          <div style={{ display: 'flex', background: t.dark ? 'rgba(255,255,255,0.05)' : '#f3f4f6', borderRadius: 9, padding: 3 }}>
            {[['all', 'All'], ['done', 'Done'], ['in_progress', 'In progress']].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                style={{
                  padding: '6px 13px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontSize: 12.5, fontWeight: 600, fontFamily: 'Inter, sans-serif',
                  background: filter === k ? (t.dark ? 'rgba(255,255,255,0.10)' : '#fff') : 'transparent',
                  color: filter === k ? t.text : t.muted,
                  boxShadow: filter === k && !t.dark ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >{label}</button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <div style={{ padding: '52px 24px', textAlign: 'center' }}>
            <IconMail size={28} color={t.faint} stroke={1.5} />
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginTop: 12 }}>
              {emails.length === 0 ? 'No emails yet' : 'Nothing in this view'}
            </div>
            <div style={{ fontSize: 12.5, color: t.muted, marginTop: 5, marginBottom: 16 }}>
              {emails.length === 0
                ? 'Start the first email of this welcome flow.'
                : 'Try a different filter.'}
            </div>
            {emails.length === 0 && (
              <WfButton onClick={startNewEmail}><IconPlus size={15} stroke={2.4} /> New email</WfButton>
            )}
          </div>
        ) : (
          shown.map((e, i) => (
            <div
              key={e.id}
              onClick={() => navigate(`/welcome-flow/${clientId}/email/${e.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer',
                borderTop: i === 0 ? 'none' : `1px solid ${t.border}`,
              }}
              onMouseEnter={ev => ev.currentTarget.style.background = t.dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)'}
              onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: 12, color: t.faint, fontVariantNumeric: 'tabular-nums', width: 22, flexShrink: 0 }}>
                {String(e.position).padStart(2, '0')}
              </span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 500, color: t.text,
                             overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.subject || <span style={{ color: t.faint, fontStyle: 'italic' }}>Untitled email</span>}
              </span>
              <WfStatusPill status={e.status} />
              <span style={{ fontSize: 12, color: t.faint, width: 74, textAlign: 'right', flexShrink: 0 }}>
                {relative(e.updatedAt)}
              </span>
            </div>
          ))
        )}
      </WfCard>
    </div>
  )
}
