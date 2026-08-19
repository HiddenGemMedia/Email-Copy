/**
 * Turn the n8n workflow's Markdown output into variation objects.
 *
 * The Welcome Flow workflow returns prose, not JSON — a single string with
 * `VARIATION n — Name` headers and `**Field Label**` blocks under each. This
 * maps those labels onto the same field names the templates and the copy editor
 * already use, so parsed copy is indistinguishable from the test data.
 *
 * Written defensively on purpose: this is free-form model output, so labels may
 * drift. Anything unrecognised is ignored rather than throwing, and callers
 * should check that the result is non-empty before using it.
 */

/** Markdown label -> the field name used by the templates and the copy editor. */
const FIELD_MAP = {
  'subject line':          'subjectLine',
  'preview text':          'previewText',
  'campaign eyebrow':      'campaignEyebrow',
  'hero headline':         'headlineText',
  'hero cta':              'heroCtaText',
  'intro cta (hero cta)':  'heroCtaText',   // what the workflow currently emits
  'intro cta':             'introCtaText',
  'intro body':            'bodyText',
  'body block':            'bodyText',      // the workflow's name for the intro body
  'section eyebrow':       'sectionEyebrow',
  'section headline':      'sectionHeadline',
  'section subhead':       'sectionSubhead',
  'closing nudge title':   'bodyBlock2Title',
  'body block title':      'bodyBlock2Title',
  'closing nudge':         'bodyBlock2',
  'closing line':          'closingLine',
  'cta':                   'ctaText',
}

const CARD_MAP = {
  'card name':        'name',
  'card stats':       'stats',
  'card description': 'description',
  'card cta':         'ctaText',
}

const clean = (s) => (s || '')
  .replace(/\*\*/g, '')
  .replace(/^["“]|["”]$/g, '')
  .trim()

/** Split the document into one chunk per VARIATION header. */
function splitVariations(text) {
  const re = /^VARIATION\s+(\d+)\s*[—–-]\s*(.+)$/gim
  const heads = []
  let m
  while ((m = re.exec(text)) !== null) {
    heads.push({ index: m.index, end: m.index + m[0].length, num: Number(m[1]), name: clean(m[2]) })
  }
  return heads.map((h, i) => ({
    num:  h.num,
    name: h.name,
    body: text.slice(h.end, i + 1 < heads.length ? heads[i + 1].index : text.length),
  }))
}

/** Property cards come as `- **Card Name:** value` bullets under a card header. */
function parseCards(body) {
  const cards = []
  const headRe = /^\*\*PROPERTY CARD\s+(\d+)\s+of\s+(\d+)\*\*\s*$/gim
  const heads = []
  let m
  while ((m = headRe.exec(body)) !== null) heads.push({ start: m.index + m[0].length, index: m.index })

  heads.forEach((h, i) => {
    const chunk = body.slice(h.start, i + 1 < heads.length ? heads[i + 1].index : body.length)
    const card = {}
    for (const line of chunk.split('\n')) {
      const bm = line.match(/^\s*[-*]\s*\*\*(.+?):?\*\*:?\s*(.*)$/)
      if (!bm) continue
      const key = CARD_MAP[clean(bm[1]).toLowerCase().replace(/:$/, '')]
      if (key) card[key] = clean(bm[2])
    }
    if (card.name || card.description) cards.push(card)
  })
  return cards
}

/** Fields are `**Label**` on one line, value on the following line(s). */
function parseFields(body) {
  const out = {}
  const lines = body.split('\n')
  let current = null
  let buffer = []

  const flush = () => {
    if (!current) return
    const value = buffer.join('\n').trim()
    if (value) out[current] = clean(value).replace(/\n{3,}/g, '\n\n')
    current = null
    buffer = []
  }

  for (const line of lines) {
    const head = line.match(/^\*\*(.+?):?\*\*\s*$/)
    if (head) {
      flush()
      const label = clean(head[1]).toLowerCase().replace(/:$/, '')
      // property cards are handled separately
      current = /^property card/.test(label) ? null : (FIELD_MAP[label] || null)
      continue
    }
    // a horizontal rule or a new bullet list ends the current field
    if (/^\s*---\s*$/.test(line) || /^\s*[-*]\s*\*\*/.test(line)) { flush(); continue }
    if (current) buffer.push(line)
  }
  flush()
  return out
}

/**
 * @param {string} text  the workflow's Markdown output
 * @returns {Array} variation objects, [] if nothing could be parsed
 */

/* ── JSON format ──────────────────────────────────────────────────────────
   The workflow may emit a fenced ```json block containing an array of
   variation objects with snake_case keys instead of Markdown prose. That is
   preferred — no formatting to drift — so it is tried first.               */

/** snake_case / spaced label -> the field name templates and the editor use. */
const JSON_KEY_MAP = {
  subject_line:     'subjectLine',
  preview_text:     'previewText',
  campaign_eyebrow: 'campaignEyebrow',
  hero_headline:    'headlineText',
  headline:         'headlineText',
  hero_cta:         'heroCtaText',
  intro_cta:        'heroCtaText',   // the workflow's name for the hero pill
  intro_body:       'bodyText',
  body_block:       'bodyText',
  section_eyebrow:  'sectionEyebrow',
  section_headline: 'sectionHeadline',
  section_subhead:  'sectionSubhead',
  body_block_title:   'bodyBlock2Title',
  closing_nudge_title:'bodyBlock2Title',
  closing_nudge:      'bodyBlock2',
  closing_line:     'closingLine',
  cta:              'ctaText',
  cta_text:         'ctaText',
  cta_url:          'ctaUrl',
  pov:              'name',
  variation_name:   'name',
}

const JSON_CARD_MAP = {
  card_name:        'name',
  name:             'name',
  card_stats:       'stats',
  stats:            'stats',
  card_description: 'description',
  description:      'description',
  card_cta:         'ctaText',
  cta:              'ctaText',
  cta_text:         'ctaText',
  card_cta_url:     'ctaUrl',
  cta_url:          'ctaUrl',
}

const snakeToCamel = (k) => k.replace(/[_\s]+(\w)/g, (_, c) => c.toUpperCase())

/** Pull the first ```json fenced block, or the first bare [ … ] / { … }. */
function findJsonPayload(text) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidates = []
  if (fence) candidates.push(fence[1])
  const arr = text.match(/\[\s*\{[\s\S]*\}\s*\]/)
  if (arr) candidates.push(arr[0])
  const obj = text.match(/\{[\s\S]*\}/)
  if (obj) candidates.push(obj[0])
  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c.trim())
      if (parsed && (Array.isArray(parsed) || typeof parsed === 'object')) return parsed
    } catch { /* try the next candidate */ }
  }
  return null
}

function mapCard(raw) {
  const card = {}
  for (const [k, v] of Object.entries(raw || {})) {
    const key = JSON_CARD_MAP[k.toLowerCase()] || (['name','stats','description','ctaText','ctaUrl'].includes(snakeToCamel(k)) ? snakeToCamel(k) : null)
    if (key && v != null && String(v).trim()) card[key] = String(v).trim()
  }
  return card
}

function mapVariation(raw, i) {
  const out = {}
  let cards = []
  for (const [k, v] of Object.entries(raw || {})) {
    const lk = k.toLowerCase()
    if (lk === 'property_cards' || lk === 'propertycards' || lk === 'cards') {
      cards = (Array.isArray(v) ? v : []).map(mapCard).filter(c => c.name || c.description)
      continue
    }
    if (lk === 'variation' || lk === 'id') continue          // handled below
    const key = JSON_KEY_MAP[lk] || snakeToCamel(k)
    if (v != null && typeof v !== 'object') out[key] = String(v).trim()
  }
  return {
    id: Number(raw?.variation) || i + 1,
    name: out.name || `Variation ${i + 1}`,
    ...out,
    subhead: out.sectionSubhead || out.subhead || '',
    introCtaText: out.introCtaText || out.ctaText || '',
    ...(cards.length ? { propertyCards: cards } : {}),
  }
}

/** @returns {Array} variations, or [] if the text holds no usable JSON. */
export function parseWfCopyJson(text) {
  if (typeof text !== 'string' || !text.trim()) return []
  const payload = findJsonPayload(text)
  if (!payload) return []
  const list = Array.isArray(payload)
    ? payload
    : (Array.isArray(payload.variations) ? payload.variations : [payload])
  return list.map(mapVariation).filter(v => v.subjectLine || v.headlineText)
}

export function parseWfCopy(text) {
  if (typeof text !== 'string' || !text.trim()) return []

  return splitVariations(text).map((v, i) => {
    const fields = parseFields(v.body)
    const cards  = parseCards(v.body)
    return {
      id: v.num || i + 1,
      name: v.name || `Variation ${i + 1}`,
      ...fields,
      // keep subhead in sync with Section Subhead for any template reading it
      subhead: fields.sectionSubhead || fields.subhead || '',
      // The workflow currently emits no separate Intro CTA — it only labels the
      // hero one. Fall back to the main CTA so the button below the intro line
      // is never blank; it stays editable either way.
      introCtaText: fields.introCtaText || fields.ctaText || '',
      ...(cards.length ? { propertyCards: cards } : {}),
    }
  }).filter(v => v.subjectLine || v.headlineText)
}

/**
 * n8n's envelope varies, so pull the prose out of whichever shape arrives.
 * Falls through to returning any pre-structured variations untouched.
 */
export function extractWfVariations(payload) {
  if (!payload) return []
  // already structured — nothing to parse
  if (Array.isArray(payload.variations) && payload.variations.length) return payload.variations

  const text =
    (typeof payload?.structured?.output === 'string' && payload.structured.output) ||
    (typeof payload?.output === 'string' && payload.output) ||
    (typeof payload === 'string' && payload) ||
    ''

  // JSON first — it is exact. Markdown is the fallback for older prose output.
  const fromJson = parseWfCopyJson(text)
  if (fromJson.length) return fromJson
  return parseWfCopy(text)
}
