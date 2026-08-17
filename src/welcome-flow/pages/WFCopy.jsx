/**
 * Welcome Flow — copy (step 2 of a WF email).
 *
 * Shows the three variations side by side, same idea as the Weekly Email
 * Campaign's CopyEditor: pick one, edit it in place, carry it forward. The
 * field list is deliberately the same, so copy written for either workflow
 * drops into the other.
 *
 * Property cards are shown read-only for now — WF — Week 1 does not render
 * them yet, so editing them would imply an effect that does not exist.
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft, IconCheck, IconPlus, IconTrash } from '@tabler/icons-react'
import { useWelcomeFlowStore } from '../store/welcomeFlowStore'
import { useWfTheme, WfCard, WfButton, WfStepNav } from '../components/wfUi'

/* Field order and guidance follow the welcome-flow copy spec. The property cards
   sit between the two groups, which is where they appear in the email. */
const FIELDS_BEFORE_CARDS = [
  { key: 'subjectLine',     label: 'Subject Line',     hint: 'One sentence. Question, imperative, or pattern interrupt' },
  { key: 'previewText',     label: 'Preview Text',     hint: '8–9 words. Supports the subject, never repeats it. No location' },
  { key: 'campaignEyebrow', label: 'Campaign Eyebrow', hint: '3–5 words, small caps. Same across all 3 variations' },
  { key: 'headlineText',    label: 'Hero Headline',    hint: '4–7 words. Must make sense on its own' },
  // pale pill sitting on the hero image, under the headline — usually the code
  { key: 'heroCtaText',     label: 'Hero CTA',         hint: 'Pill on the hero image, under the headline. e.g. "Use code STAR23 at checkout."' },
  { key: 'bodyText',        label: 'Intro Body',       hint: '2–3 sentences, 30–40 words. States the offer. No feature list' },
  // renders as a pill button directly below the intro line
  { key: 'introCtaText',    label: 'Intro CTA',        hint: '2–3 words. Button below the intro line, into the property section' },
  { key: 'sectionEyebrow',  label: 'Section Eyebrow',  hint: '1–3 words. Small label above the property block' },
  { key: 'sectionHeadline', label: 'Section Headline', hint: '5–8 words. Names the region or collection' },
  { key: 'sectionSubhead',  label: 'Section Subhead',  hint: 'One sentence, 6–10 words. Names audience and brand' },
]

const FIELDS_AFTER_CARDS = [
  { key: 'bodyBlock2Title', label: 'Body Block Title', hint: 'One sentence, present tense. Gentle pressure, no invented urgency' },
  { key: 'bodyBlock2',      label: 'Body Block',       hint: 'One sentence. Real urgency only — an actual offer or availability' },
  { key: 'closingLine',     label: 'Closing Line',     hint: '1–2 sentences. Warm but direct' },
  { key: 'ctaText',         label: 'CTA',              hint: '2–3 words. The final push out of the email' },
  { key: 'ctaUrl',          label: 'CTA URL',          hint: 'Full URL with https://' },
]

const MULTILINE = new Set(['bodyText', 'bodyBlock2', 'closingLine'])

/* Facts stay identical across variations; only the description shifts with POV. */
const CARD_FIELDS = [
  { key: 'name',        label: 'Card Name',        hint: 'Exact from the brief — never invented or shortened' },
  { key: 'stats',       label: 'Card Stats',       hint: 'bed | bath | guests, in that order. Missing figure → leave blank' },
  { key: 'description', label: 'Card Description', hint: '5–8 words. What the guest does with it' },
  { key: 'ctaText',     label: 'Card CTA',         hint: '2–3 words. Identical on every card, by design' },
]

export default function WFCopy() {
  const { clientId, emailId } = useParams()
  const navigate = useNavigate()
  const t = useWfTheme()
  const { getClient, getEmails, updateEmail, ensureClients, loadingClients } = useWelcomeFlowStore()

  // clients are not persisted — refetch after a reload on this deep route
  useEffect(() => { ensureClients() }, [ensureClients])

  const client = getClient(clientId)
  const email  = (getEmails(clientId) || []).find(e => e.id === emailId)

  // local editable copy of every variation, so switching tabs keeps edits
  const [vars, setVars]   = useState([])
  const [picked, setPicked] = useState(0)

  useEffect(() => {
    if (!email) return
    setVars((email.variations || []).map(v => ({ ...v })))
    setPicked(email.selectedVariation ?? 0)
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

  if (!vars.length) {
    return (
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>
        <WfCard style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>No copy generated yet</div>
          <div style={{ fontSize: 12.5, color: t.muted, marginTop: 6 }}>
            Go back to the brief and generate, or use the test-data path.
          </div>
          <WfButton
            variant="ghost"
            style={{ marginTop: 14 }}
            onClick={() => navigate(`/welcome-flow/${clientId}/email/${emailId}`)}
          >
            <IconArrowLeft size={15} /> Back to brief
          </WfButton>
        </WfCard>
      </div>
    )
  }

  const active = vars[picked] || vars[0]
  const cards  = active.propertyCards || []

  const persist = (nextVars = vars, nextPicked = picked) => {
    // Test Template (the Week 2 clone) reads copy.subhead; Week 1 WF reads
    // Section Subhead instead. There is no separate Subhead field in the editor
    // any more, so this keeps the older template fed without duplicating input.
    const withSubhead = nextVars.map(v => ({ ...v, subhead: v.sectionSubhead || '' }))
    updateEmail(clientId, emailId, {
      variations:        withSubhead,
      selectedVariation: nextPicked,
      copy:              withSubhead[nextPicked],
      subject:           withSubhead[nextPicked]?.subjectLine || '',
      status:            'ready',
    })
  }

  const editField = (key, value) => {
    const next = vars.map((v, i) => (i === picked ? { ...v, [key]: value } : v))
    setVars(next)
  }

  /* 1–3 stays. Capped at 3 because each card takes one sub-image slot and the
     picker offers Sub 1–3 for this template. */
  const MAX_CARDS = 3

  const addCard = () => {
    const next = vars.map((v, i) => {
      if (i !== picked) return v
      const cards = v.propertyCards || []
      if (cards.length >= MAX_CARDS) return v
      // copy the CTA wording from the first card — it is identical by design
      return { ...v, propertyCards: [...cards, { name: '', stats: '', description: '', ctaText: cards[0]?.ctaText || 'View Dates', ctaUrl: cards[0]?.ctaUrl || '' }] }
    })
    setVars(next); persist(next)
  }

  const removeCard = (cardIndex) => {
    const next = vars.map((v, i) => {
      if (i !== picked) return v
      return { ...v, propertyCards: (v.propertyCards || []).filter((_, ci) => ci !== cardIndex) }
    })
    setVars(next); persist(next)
  }

  const editCard = (cardIndex, key, value) => {
    const next = vars.map((v, i) => {
      if (i !== picked) return v
      const cards = (v.propertyCards || []).map((c, ci) =>
        ci === cardIndex ? { ...c, [key]: value } : c)
      return { ...v, propertyCards: cards }
    })
    setVars(next)
  }

  const choose = (i) => { setPicked(i); persist(vars, i) }

  const inputStyle = {
    width: '100%', padding: '9px 11px', borderRadius: 9,
    border: `1px solid ${t.border}`, background: t.inputBg, color: t.text,
    fontSize: 13, fontFamily: 'Inter, sans-serif', lineHeight: 1.6, outline: 'none',
  }

  /** One labelled row. Used for both the copy fields and the card fields. */
  const fieldRow = ({ key, label, hint }, value, onChange, last) => (
    <div key={key} style={{ padding: '14px 18px', borderBottom: last ? 'none' : `1px solid ${t.border}` }}>
      <label style={{ fontSize: 11.5, fontWeight: 700, color: t.text, display: 'block', marginBottom: 5 }}>
        {label}{hint && <span style={{ fontWeight: 400, color: t.muted }}> — {hint}</span>}
      </label>
      {MULTILINE.has(key) ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => persist()}
          rows={key === 'bodyText' ? 4 : 2}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      ) : (
        <input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => persist()}
          style={inputStyle}
        />
      )}
    </div>
  )

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 24px 64px' }}>
      <WfStepNav
        backLabel="Brief"
        onBack={() => { persist(); navigate(`/welcome-flow/${clientId}/email/${emailId}`) }}
        nextLabel="Next: Pick Images"
        onNext={() => { persist(); navigate(`/welcome-flow/${clientId}/email/${emailId}/images`) }}
      />

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 13px', borderRadius: 999,
          background: t.dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.72)',
          border: `1px solid ${t.border}`, fontSize: 11, fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: t.muted, marginBottom: 12,
        }}>
          Email {String(email.position).padStart(2, '0')} · Step 2 of 5
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: t.text }}>
          Choose Your Copy
        </h1>
        <p style={{ fontSize: 13, color: t.muted, margin: '7px 0 0' }}>
          Three variations. Pick one, edit anything, then continue.
        </p>
      </div>

      {/* variation tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${vars.length},1fr)`, gap: 10, marginBottom: 18 }}>
        {vars.map((v, i) => {
          const on = i === picked
          return (
            <WfCard
              key={v.id ?? i}
              onClick={() => choose(i)}
              style={{
                padding: '13px 15px', cursor: 'pointer',
                borderColor: on ? t.accent : t.border,
                background: on ? (t.dark ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0.06)') : undefined,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: on ? t.accent : t.faint }}>
                  V{i + 1}
                </div>
                {on && <IconCheck size={14} color={t.accent} stroke={2.6} />}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginTop: 4 }}>{v.name}</div>
            </WfCard>
          )
        })}
      </div>

      {/* everything above the property block */}
      <WfCard style={{ padding: 0, overflow: 'hidden' }}>
        {FIELDS_BEFORE_CARDS.map((f, i) =>
          fieldRow(f, active[f.key], (v) => editField(f.key, v), i === FIELDS_BEFORE_CARDS.length - 1))}
      </WfCard>

      {/* property cards — 1 to 3 featured stays, each rendered full width */}
      <WfCard style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.border}`, display: 'flex',
                      alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: t.text }}>
            Property Cards{' '}
            <span style={{ fontWeight: 400, color: t.muted }}>
              — {cards.length} of {MAX_CARDS}. Facts stay the same across all 3 variations; only the description shifts
            </span>
          </div>
          <WfButton
            variant="subtle"
            disabled={cards.length >= MAX_CARDS}
            onClick={addCard}
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            <IconPlus size={13} stroke={2.4} /> Add stay
          </WfButton>
        </div>

        {cards.length === 0 ? (
          <div style={{ padding: '22px 18px', fontSize: 12.5, color: t.muted }}>
            No stays yet. Add one to show a featured stay in the email.
          </div>
        ) : cards.map((card, ci) => (
          <div key={ci} style={{ borderBottom: ci < cards.length - 1 ? `1px solid ${t.border}` : 'none' }}>
            <div style={{
              padding: '10px 18px', background: t.dark ? 'rgba(255,255,255,0.03)' : '#f7f8fa',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.faint }}>
                Card {ci + 1} of {cards.length} · Sub Image {ci + 1}
              </span>
              <button
                onClick={() => removeCard(ci)}
                title="Remove this stay"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none',
                  border: 'none', cursor: 'pointer', padding: '2px 4px',
                  fontSize: 11.5, fontWeight: 600, color: '#dc2626', fontFamily: 'Inter, sans-serif',
                }}
              >
                <IconTrash size={13} stroke={2} /> Remove
              </button>
            </div>
            {CARD_FIELDS.map((cf, fi) =>
              fieldRow(
                { ...cf, key: `card${ci}-${cf.key}` },
                card[cf.key],
                (v) => editCard(ci, cf.key, v),
                fi === CARD_FIELDS.length - 1,
              ))}
          </div>
        ))}
      </WfCard>

      {/* everything below the property block */}
      <WfCard style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
        {FIELDS_AFTER_CARDS.map((f, i) =>
          fieldRow(f, active[f.key], (v) => editField(f.key, v), i === FIELDS_AFTER_CARDS.length - 1))}
      </WfCard>

    </div>
  )
}
