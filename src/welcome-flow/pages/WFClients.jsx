/**
 * Welcome Flow — clients list.
 *
 * Reads email_wf_clients from the Welcome Flow Supabase project. A client only
 * appears once it has been added here, so this is an opt-in roster rather than a
 * mirror of the campaign client list.
 *
 * Adding one takes a GHL location ID, which is matched against Email_Client_API in
 * the other project. That match supplies the client name and logo; the API key is
 * resolved server-side at request time and never reaches the browser.
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconSearch, IconPlus, IconChevronRight, IconUsers, IconCheck, IconAlertCircle } from '@tabler/icons-react'
import { useWelcomeFlowStore } from '../store/welcomeFlowStore'
import { useWfTheme, WfCard, WfButton, WfInput, WfPageHeader } from '../components/wfUi'

function ClientCard({ client, counts, onOpen }) {
  const t = useWfTheme()
  const [hover, setHover] = useState(false)
  return (
    <WfCard
      hovered={hover}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onOpen}
      style={{ padding: '18px 18px 16px', cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {client.name}
          </div>
          <div style={{ fontSize: 12, color: t.faint, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {client.email || (client.locationId ? `Location ${client.locationId.slice(0, 12)}…` : 'No contact set')}
          </div>
        </div>
        <IconChevronRight size={17} color={hover ? t.accent : t.faint} stroke={2} style={{ flexShrink: 0 }} />
      </div>

      <div style={{ display: 'flex', gap: 26, marginTop: 18 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: t.text, lineHeight: 1 }}>{counts.done}</div>
          <div style={{ fontSize: 11, color: t.faint, marginTop: 5 }}>Done</div>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: counts.inProgress ? '#b45309' : t.faint, lineHeight: 1 }}>
            {counts.inProgress}
          </div>
          <div style={{ fontSize: 11, color: t.faint, marginTop: 5 }}>In progress</div>
        </div>
      </div>
    </WfCard>
  )
}

function AddClientForm({ onCancel, onSave, lookupLocation }) {
  const t = useWfTheme()
  const [f, setF] = useState({ name: '', email: '', locationId: '', folderUrl: '' })
  const [match, setMatch] = useState(null)      // null | 'checking' | {…} | 'none'
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  // resolve the location against the client database as they type
  useEffect(() => {
    const loc = f.locationId.trim()
    if (!loc) { setMatch(null); return }
    setMatch('checking')
    const id = setTimeout(async () => {
      try {
        const m = await lookupLocation(loc)
        setMatch(m || 'none')
        if (m && !f.name.trim()) setF(prev => ({ ...prev, name: m.clientName }))
      } catch { setMatch('none') }
    }, 450)
    return () => clearTimeout(id)
  }, [f.locationId])   // eslint-disable-line react-hooks/exhaustive-deps

  const matched = match && match !== 'checking' && match !== 'none'
  const valid   = f.name.trim() && matched && !saving

  return (
    <WfCard style={{ padding: 20, marginBottom: 22 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 4 }}>Add a client</div>
      <div style={{ fontSize: 12, color: t.muted, marginBottom: 14 }}>
        The location ID is matched against your client database — the GHL key and logo come from there.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
        <div>
          <label style={{ fontSize: 11.5, color: t.muted, display: 'block', marginBottom: 5 }}>GHL location ID *</label>
          <WfInput value={f.locationId} onChange={set('locationId')} placeholder="VWszdEOrmbETl88rx85j" autoFocus />
          <div style={{ minHeight: 18, marginTop: 6, fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 5 }}>
            {match === 'checking' && <span style={{ color: t.faint }}>Checking…</span>}
            {match === 'none' && (
              <><IconAlertCircle size={13} color="#dc2626" />
                <span style={{ color: '#dc2626' }}>Not found in the client database</span></>
            )}
            {matched && (
              <><IconCheck size={13} color="#16a34a" />
                <span style={{ color: '#16a34a' }}>Matched: {match.clientName}</span></>
            )}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11.5, color: t.muted, display: 'block', marginBottom: 5 }}>Client name *</label>
          <WfInput value={f.name} onChange={set('name')} placeholder="filled from the match" />
        </div>
        <div>
          <label style={{ fontSize: 11.5, color: t.muted, display: 'block', marginBottom: 5 }}>Contact email</label>
          <WfInput value={f.email} onChange={set('email')} placeholder="ops@northwind.com" />
        </div>
        <div>
          <label style={{ fontSize: 11.5, color: t.muted, display: 'block', marginBottom: 5 }}>GHL folder URL</label>
          <WfInput value={f.folderUrl} onChange={set('folderUrl')} placeholder="paste once — reused for every email" />
        </div>
      </div>
      {error && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 12 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 9, marginTop: 16 }}>
        <WfButton
          disabled={!valid}
          onClick={async () => {
            setSaving(true); setError('')
            try { await onSave(f) } catch (e) { setError(e.message); setSaving(false) }
          }}
        >{saving ? 'Creating…' : 'Create client'}</WfButton>
        <WfButton variant="ghost" onClick={onCancel}>Cancel</WfButton>
      </div>
    </WfCard>
  )
}

export default function WFClients() {
  const navigate = useNavigate()
  const t = useWfTheme()
  const { clients, addClient, counts, fetchClients, lookupLocation, loadingClients, clientsError } = useWelcomeFlowStore()
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => { fetchClients() }, [fetchClients])
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return clients
    return clients.filter(c =>
      c.name.toLowerCase().includes(needle) || (c.email || '').toLowerCase().includes(needle))
  }, [clients, q])

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 24px 64px' }}>
      <WfPageHeader
        title="Welcome Flow"
        subtitle={loadingClients ? 'Loading clients…' : `${clients.length} client${clients.length === 1 ? '' : 's'}. Open one to see its emails.`}
        right={
          <>
            <div style={{ position: 'relative' }}>
              <IconSearch size={15} color={t.faint} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
              <WfInput
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search clients"
                style={{ paddingLeft: 33, width: 240 }}
              />
            </div>
            <WfButton onClick={() => setAdding(v => !v)}>
              <IconPlus size={15} stroke={2.4} /> Add client
            </WfButton>
          </>
        }
      />

      {adding && (
        <AddClientForm
          onCancel={() => setAdding(false)}
          lookupLocation={lookupLocation}
          onSave={async (data) => {
            const id = await addClient(data)
            setAdding(false)
            navigate(`/welcome-flow/${id}`)
          }}
        />
      )}

      {clientsError && (
        <WfCard style={{ padding: 16, marginBottom: 18, borderColor: 'rgba(220,38,38,0.35)' }}>
          <div style={{ fontSize: 13, color: '#dc2626' }}>Could not load clients: {clientsError}</div>
        </WfCard>
      )}

      {filtered.length === 0 ? (
        <WfCard style={{ padding: '56px 24px', textAlign: 'center' }}>
          <IconUsers size={30} color={t.faint} stroke={1.5} />
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginTop: 12 }}>
            {q ? 'No clients match that search' : 'No clients yet'}
          </div>
          <div style={{ fontSize: 12.5, color: t.muted, marginTop: 5 }}>
            {q ? 'Try a different name.' : 'Welcome Flow keeps its own client list. Add one to get started.'}
          </div>
        </WfCard>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
          {filtered.map(c => (
            <ClientCard
              key={c.id}
              client={c}
              counts={counts(c.id)}
              onOpen={() => navigate(`/welcome-flow/${c.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
