/**
 * Welcome Flow — clients list.
 *
 * Its OWN client list, deliberately not wired to Email_Client_API. These are new
 * onboarding clients, so a client is created here with its GHL location id and
 * API key rather than looked up elsewhere.
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconSearch, IconPlus, IconChevronRight, IconUsers } from '@tabler/icons-react'
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

function AddClientForm({ onCancel, onSave }) {
  const t = useWfTheme()
  const [f, setF] = useState({ name: '', email: '', locationId: '', ghlApiKey: '', folderUrl: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const valid = f.name.trim() && f.locationId.trim() && f.ghlApiKey.trim()

  return (
    <WfCard style={{ padding: 20, marginBottom: 22 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 14 }}>Add a client</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
        <div>
          <label style={{ fontSize: 11.5, color: t.muted, display: 'block', marginBottom: 5 }}>Client name *</label>
          <WfInput value={f.name} onChange={set('name')} placeholder="Northwind Coffee" autoFocus />
        </div>
        <div>
          <label style={{ fontSize: 11.5, color: t.muted, display: 'block', marginBottom: 5 }}>Contact email</label>
          <WfInput value={f.email} onChange={set('email')} placeholder="ops@northwind.com" />
        </div>
        <div>
          <label style={{ fontSize: 11.5, color: t.muted, display: 'block', marginBottom: 5 }}>GHL location ID *</label>
          <WfInput value={f.locationId} onChange={set('locationId')} placeholder="VWszdEOrmbETl88rx85j" />
        </div>
        <div>
          <label style={{ fontSize: 11.5, color: t.muted, display: 'block', marginBottom: 5 }}>GHL API key *</label>
          <WfInput value={f.ghlApiKey} onChange={set('ghlApiKey')} type="password" placeholder="pit-…" />
        </div>
        <div>
          <label style={{ fontSize: 11.5, color: t.muted, display: 'block', marginBottom: 5 }}>GHL folder URL</label>
          <WfInput value={f.folderUrl} onChange={set('folderUrl')} placeholder="paste once — reused for every email" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 9, marginTop: 16 }}>
        <WfButton onClick={() => onSave(f)} disabled={!valid}>Create client</WfButton>
        <WfButton variant="ghost" onClick={onCancel}>Cancel</WfButton>
      </div>
    </WfCard>
  )
}

export default function WFClients() {
  const navigate = useNavigate()
  const t = useWfTheme()
  const { clients, addClient, counts } = useWelcomeFlowStore()
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
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
        subtitle={`${clients.length} client${clients.length === 1 ? '' : 's'}. Open one to see its emails.`}
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
          onSave={(data) => {
            const id = addClient(data)
            setAdding(false)
            navigate(`/welcome-flow/${id}`)
          }}
        />
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
