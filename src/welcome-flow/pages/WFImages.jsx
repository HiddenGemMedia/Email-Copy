/**
 * Welcome Flow — images (step 3 of a WF email).
 *
 * Same shape as the Weekly Email Campaign's ImagePicker: named slots down the
 * left, the client's GHL media library on the right, click to fill the next
 * empty slot. Five slots — one hero, four subs — plus the logo, which lives
 * here in the weekly campaign too.
 *
 * The one difference is how the media library is reached. The weekly campaign
 * passes the GHL key from the browser; Welcome Flow never holds it, so it sends
 * only the location and fetch-ghl-images / upload-logo resolve the key server
 * side from Email_Client_API.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft } from '@tabler/icons-react'
import { useWelcomeFlowStore } from '../store/welcomeFlowStore'
import { useWfTheme, WfCard, WfButton, WfStepNav } from '../components/wfUi'
import { fetchGhlImages, uploadLogo, analyzeImageFocal } from '../../lib/api'

const SLOTS = [
  { key: 'hero', label: 'Hero Image',  desc: 'Main banner at the top' },
  { key: 'sub1', label: 'Sub Image 1', desc: 'Stay card 1' },
  { key: 'sub2', label: 'Sub Image 2', desc: 'Stay card 2' },
  { key: 'sub3', label: 'Sub Image 3', desc: 'Stay card 3' },
  { key: 'sub4', label: 'Sub Image 4', desc: 'Story · large circle' },
  { key: 'sub5', label: 'Sub Image 5', desc: 'Story · small circle' },
]

export default function WFImages() {
  const { clientId, emailId } = useParams()
  const navigate = useNavigate()
  const t = useWfTheme()
  const { getClient, getEmails, updateEmail, updateClient, ensureClients, loadingClients } = useWelcomeFlowStore()

  // clients are not persisted — refetch after a reload on this deep route
  useEffect(() => { ensureClients() }, [ensureClients])

  const client = getClient(clientId)
  const email  = (getEmails(clientId) || []).find(e => e.id === emailId)

  const [folders, setFolders] = useState([])
  const [images,  setImages]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const [folderStack, setFolderStack] = useState([])
  const activeFolder = folderStack[folderStack.length - 1] ?? null

  const [slots, setSlots] = useState(SLOTS.map(() => null))

  const [logoUrl, setLogoUrl]             = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoMsg, setLogoMsg]             = useState('')
  const [logoStatus, setLogoStatus]       = useState('')
  const logoInputRef = useRef(null)

  const locationId = client?.locationId

  useEffect(() => { setLogoUrl(client?.logoUrl || '') }, [client?.logoUrl])

  useEffect(() => {
    if (!email) return
    const saved = email.selectedImages || []
    setSlots(SLOTS.map((_, i) => saved[i] ?? null))
  }, [email?.id])   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!locationId) { setError('This client has no GHL location.'); setLoading(false); return }
    setError(null)
    setLoading(true)
    // no apiKey — the function resolves it from the location
    fetchGhlImages({ locationId, folderId: activeFolder?.id })
      .then(d => { setFolders(d.folders || []); setImages(d.images || []) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [locationId, activeFolder?.id])

  const save = useCallback((next) => {
    setSlots(next)
    updateEmail(clientId, emailId, { selectedImages: next })
  }, [clientId, emailId, updateEmail])

  function handleImageClick(img) {
    const at = slots.findIndex(s => s?.id === img.id)
    if (at !== -1) { const next = [...slots]; next[at] = null; save(next); return }

    const empty = slots.findIndex(s => s === null)
    if (empty === -1) return
    const next = [...slots]; next[empty] = img; save(next)

    // enrich with a focal point in the background — default centring is fine
    const url = img.url || img.thumbnailUrl
    if (!url) return
    analyzeImageFocal({ imageUrl: url })
      .then(({ focalX, focalY }) => {
        setSlots(cur => {
          const idx = cur.findIndex(s => s?.id === img.id)
          if (idx === -1) return cur
          const updated = [...cur]
          updated[idx] = { ...updated[idx], focalX, focalY }
          updateEmail(clientId, emailId, { selectedImages: updated })
          return updated
        })
      })
      .catch(() => {})
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !locationId) return
    setLogoUploading(true); setLogoStatus(''); setLogoMsg('')
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload  = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      // no apiKey — resolved server side from the location
      const result = await uploadLogo({ base64, mimeType: file.type, fileName: file.name, locationId })
      setLogoUrl(result.logoUrl)
      setLogoStatus('success'); setLogoMsg('Logo saved!')
      updateClient(clientId, { logoUrl: result.logoUrl })
    } catch (err) {
      setLogoStatus('error'); setLogoMsg(err.message || 'Upload failed')
    } finally {
      setLogoUploading(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

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

  const filledCount = slots.filter(Boolean).length

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '28px 24px 64px' }}>
      <WfStepNav
        backLabel="Copy"
        onBack={() => navigate(`/welcome-flow/${clientId}/email/${emailId}/copy`)}
        nextLabel={slots[0] ? 'Next: Preview' : 'Pick a hero image'}
        nextDisabled={!slots[0]}
        onNext={() => navigate(`/welcome-flow/${clientId}/email/${emailId}/preview`)}
      />

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 13px', borderRadius: 999,
          background: t.dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.72)',
          border: `1px solid ${t.border}`, fontSize: 11, fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: t.muted, marginBottom: 12,
        }}>
          Email {String(email.position).padStart(2, '0')} · Step 3 of 5
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: t.text }}>
          Pick Your Images
        </h1>
        <p style={{ fontSize: 13, color: t.muted, margin: '7px 0 0' }}>
          {filledCount} of {SLOTS.length} slots filled. Click an image to place it in the next empty slot.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* ── Left: logo + named slots ── */}
        <div style={{ width: 236, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 11 }}>

          {/* logo */}
          <WfCard style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '9px 13px', borderBottom: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: t.faint, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Client Logo
              </div>
            </div>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
              {logoUrl ? (
                <div style={{ width: '100%', height: 74, background: '#1a1a1a', borderRadius: 8,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                  <img src={logoUrl} alt="Logo" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                </div>
              ) : (
                <div style={{ width: '100%', height: 74, borderRadius: 8, border: `1.5px dashed ${t.border}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 11.5, color: t.faint }}>No logo yet</span>
                </div>
              )}
              <WfButton
                variant="ghost"
                disabled={logoUploading}
                onClick={() => logoInputRef.current?.click()}
                style={{ width: '100%', justifyContent: 'center', padding: '7px 0', fontSize: 12 }}
              >
                {logoUploading ? 'Uploading…' : logoUrl ? '↑ Replace' : '↑ Upload Logo'}
              </WfButton>
              {logoStatus === 'success' && <span style={{ fontSize: 11, color: '#16a34a' }}>✓ {logoMsg}</span>}
              {logoStatus === 'error'   && <span style={{ fontSize: 11, color: '#dc2626' }}>⚠ {logoMsg}</span>}
            </div>
            <input
              ref={logoInputRef} type="file" style={{ display: 'none' }}
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleLogoUpload}
            />
          </WfCard>

          {SLOTS.map((slot, i) => {
            const filled = slots[i]
            return (
              <div key={slot.key} style={{
                borderRadius: 14, overflow: 'hidden',
                border: `2px ${filled ? 'solid' : 'dashed'} ${filled ? t.accent : t.border}`,
              }}>
                {filled ? (
                  <div style={{ position: 'relative' }}>
                    <img src={filled.thumbnailUrl || filled.url} alt={filled.name}
                         style={{ width: '100%', height: 96, objectFit: 'cover', display: 'block' }} />
                    <button
                      onClick={() => { const next = [...slots]; next[i] = null; save(next) }}
                      title="Remove"
                      style={{
                        position: 'absolute', top: 8, left: 8, width: 25, height: 25,
                        background: 'rgba(0,0,0,0.55)', borderRadius: '50%', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 15, fontWeight: 700, color: '#fff',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.55)'}
                    >×</button>
                    <div style={{ padding: '9px 12px', background: t.cardBg }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: t.text }}>{slot.label}</div>
                      <div style={{ fontSize: 11.5, color: t.muted, marginTop: 2, overflow: 'hidden',
                                    textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {filled.name?.replace(/\.[^.]+$/, '')}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ height: 112, display: 'flex', flexDirection: 'column', alignItems: 'center',
                                justifyContent: 'center', background: t.dark ? 'rgba(255,255,255,0.02)' : '#f9fafb' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2px dashed ${t.border}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: t.faint }}>{i + 1}</span>
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: t.muted }}>{slot.label}</div>
                    <div style={{ fontSize: 11, color: t.faint, marginTop: 3 }}>{slot.desc}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Right: media library ── */}
        <div style={{ flex: 1, minWidth: 320 }}>
          {/* breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setFolderStack([])}
              style={{
                fontSize: 11.5, fontWeight: folderStack.length === 0 ? 700 : 500,
                color: folderStack.length === 0 ? t.text : t.muted,
                background: 'none', border: 'none', padding: 0,
                cursor: folderStack.length === 0 ? 'default' : 'pointer',
                fontFamily: 'Inter, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase',
              }}
            >Media Library</button>
            {folderStack.map((f, i) => (
              <span key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: t.faint }}>›</span>
                <button
                  type="button"
                  onClick={() => setFolderStack(folderStack.slice(0, i + 1))}
                  style={{
                    fontSize: 12.5, fontWeight: i === folderStack.length - 1 ? 700 : 500,
                    color: i === folderStack.length - 1 ? t.text : t.muted,
                    background: 'none', border: 'none', padding: 0,
                    cursor: i === folderStack.length - 1 ? 'default' : 'pointer',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >{f.name}</button>
              </span>
            ))}
            {folderStack.length > 0 && (
              <WfButton
                variant="ghost"
                onClick={() => setFolderStack(s => s.slice(0, -1))}
                style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 11.5 }}
              >← Back</WfButton>
            )}
          </div>

          {/* folders */}
          {folders.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {folders.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFolderStack(s => [...s, f])}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                    border: `1px solid ${t.border}`,
                    background: t.dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6',
                    color: t.text, fontFamily: 'Inter, sans-serif',
                  }}
                >📁 {f.name}</button>
              ))}
            </div>
          )}

          {error ? (
            <WfCard style={{ padding: 28, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#dc2626' }}>{error}</div>
            </WfCard>
          ) : loading ? (
            <WfCard style={{ padding: 28, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: t.muted }}>Loading images from the GHL media library…</div>
            </WfCard>
          ) : images.length === 0 ? (
            <WfCard style={{ padding: 28, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: t.muted }}>No images in this folder.</div>
            </WfCard>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(116px,1fr))', gap: 9 }}>
              {images.map(img => {
                const at = slots.findIndex(s => s?.id === img.id)
                const on = at !== -1
                const full = !on && slots.every(Boolean)
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => handleImageClick(img)}
                    disabled={full}
                    title={full ? 'All slots are full — remove one first' : img.name}
                    style={{
                      position: 'relative', padding: 0, borderRadius: 10, overflow: 'hidden',
                      border: `2px solid ${on ? t.accent : t.border}`,
                      background: 'none', cursor: full ? 'not-allowed' : 'pointer',
                      opacity: full ? 0.4 : 1, aspectRatio: '1 / 1',
                    }}
                  >
                    <img src={img.thumbnailUrl || img.url} alt={img.name}
                         style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    {on && (
                      <span style={{
                        position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%',
                        background: t.accent, color: t.onAccent, fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{at + 1}</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
