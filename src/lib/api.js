/**
 * api.js
 * Thin wrappers around Netlify Function endpoints.
 * All API keys stay server-side — these calls go to /.netlify/functions/*
 */

const BASE = '/.netlify/functions'

async function post(path, body) {
  const res  = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  const text = await res.text()
  if (!text) throw new Error(`Empty response from ${path} (status ${res.status}) — check Netlify function logs`)
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Server error from ${path} (status ${res.status}): ${text.slice(0, 200)}`)
  }
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`)
  return data
}

async function get(path, params = {}) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${BASE}${path}${qs ? `?${qs}` : ''}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`)
  return data
}

// ── Client list ──────────────────────────────────────────────────
export const fetchClients = () =>
  get('/clients')

// ── Claude copy generation ───────────────────────────────────────
export const generateCopy = ({ client, prompt }) =>
  post('/generate-copy', { client, prompt })

// ── Google Drive images ──────────────────────────────────────────
export const fetchDriveImages = ({ folderId }) =>
  get('/get-drive-images', { folderId })

// ── GHL Media Library images ─────────────────────────────────────
// apiKey is optional: omit it and the function resolves it from locationId.
// It must be left out entirely rather than passed as undefined — URLSearchParams
// would serialise that as the string "undefined" and it would be used as a token.
export const fetchGhlImages = ({ locationId, apiKey, folderId }) =>
  get('/fetch-ghl-images', {
    locationId,
    ...(apiKey   ? { apiKey }   : {}),
    ...(folderId ? { folderId } : {}),
  })

// ── Push custom values to GHL (legacy) ───────────────────────────
export const pushToGHL = ({ client, renderedHtml, generatedCopy, selectedImages, templateId, locationId }) =>
  post('/push-to-ghl', { client, renderedHtml, generatedCopy, selectedImages, templateId, locationId })

// ── Push full HTML template to GHL ───────────────────────────────
export const pushHtmlToGHL = ({ client, renderedHtml, generatedCopy, templateId, locationId, folderId, templateLabel }) =>
  post('/push-html-to-ghl', { client, renderedHtml, generatedCopy, templateId, locationId, folderId, templateLabel })

// ── Send rendered HTML to the fixed test inbox via GHL ───────────
// Sender + recipient are hardcoded server-side; only html/subject are sent.
export const sendTestEmail = ({ html, subject }) =>
  post('/send-test-email', { html, subject })

// ── Google Chat notification ─────────────────────────────────────
export const notifyChat = ({ clientName, previewUrl, approvedBy }) =>
  post('/notify-chat', { clientName, previewUrl, approvedBy })

// ── Welcome Flow: save an email to email_wf_emails ───────────────
// Pass dbId to update the row a previous push created, instead of adding another.
export const wfPushEmail = ({ clientId, clientName, position, dbId, email }) =>
  post('/wf-push-email', { clientId, clientName, position, dbId, email })

// ── Welcome Flow copy generation ─────────────────────────────────
// Only the week number goes over the wire; the server resolves it to that
// week's n8n webhook so the URLs never reach the browser.
export const wfGenerateCopy = ({ week, prompt, clientName, locationId }) =>
  post('/wf-generate-copy', { week, prompt, clientName, locationId })

// ── Logo upload → GHL media library + save logo_url to Email_Client_API ──
// apiKey is optional: omit it and the function resolves it from locationId.
export const uploadLogo = ({ base64, mimeType, fileName, locationId, apiKey, clientRowIndex }) =>
  post('/upload-logo', { base64, mimeType, fileName, locationId, apiKey, clientRowIndex })

// ── AI template recommendation + auto-bold ───────────────────────
export const recommendTemplate = ({ copy }) =>
  post('/recommend-template', { copy })

// ── AI image focal-point detection ───────────────────────────────
export const analyzeImageFocal = ({ imageUrl }) =>
  post('/analyze-image-focal', { imageUrl })

// ── HTML → PNG via server (html2image.net → Puppeteer fallback) ──
export const htmlToImage = ({ html, width, height, locationId, apiKey, transparent }) =>
  post('/html-to-image', { html, width, height, locationId, apiKey, transparent })

// ── Upload base64 PNG to GHL Media Library ────────────────────────
export const uploadScreenshot = ({ base64, locationId }) =>
  post('/upload-screenshot', { base64, locationId })

// ── HTML → PNG client-side (browser renders → uploads to GHL) ────
// Fallback when server-side rendering APIs are unavailable.
// Requires: locationId from the campaign store, and the GHL_API_KEY env var.

// Pre-fetches every external image URL in the HTML (both src="..." and url('...'))
// through the proxy, converts them to base64 data URLs, and inlines them.
// This makes the HTML fully self-contained so html-to-image can render it without CORS issues.
async function inlineAllImages(html) {
  const urls = new Set()
  for (const [, u] of html.matchAll(/src="(https?:\/\/[^"]+)"/g))       urls.add(u)
  for (const [, u] of html.matchAll(/url\('(https?:\/\/[^']+)'\)/g))    urls.add(u)
  for (const [, u] of html.matchAll(/url\("(https?:\/\/[^"]+)"\)/g))    urls.add(u)

  const cache = {}
  await Promise.all([...urls].map(async url => {
    try {
      const res = await fetch(`/.netlify/functions/proxy-image?url=${encodeURIComponent(url)}`)
      if (!res.ok) return
      const blob   = await res.blob()
      const reader = new FileReader()
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload  = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      cache[url] = dataUrl
    } catch (e) {
      console.warn('[inlineAllImages] Failed to inline:', url, e.message)
    }
  }))

  let result = html
  for (const [url, dataUrl] of Object.entries(cache)) {
    // Replace every occurrence (src, url(), etc.)
    result = result.split(url).join(dataUrl)
  }
  return result
}

export async function htmlToImageClient({ html, width, height, locationId }) {
  if (!locationId) throw new Error('locationId is required for client-side image generation')

  // 1. Inline all external images as base64 so html-to-image never needs CORS
  const inlinedHtml = await inlineAllImages(html)

  // 2. Extract <style> blocks and <body> content
  const styleBlocks = (inlinedHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [])
    .map(s => s.replace(/<style[^>]*>/i, '').replace(/<\/style>/i, ''))
    .join('\n')
  const bodyMatch   = inlinedHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  const bodyContent = bodyMatch ? bodyMatch[1] : inlinedHtml

  // 3. Mount in a fixed off-screen container (left: far negative keeps it out of view
  //    but still painted by the browser — negative top can skip paint in some browsers)
  const styleEl = document.createElement('style')
  styleEl.textContent = styleBlocks
  document.head.appendChild(styleEl)

  const wrapper = document.createElement('div')
  wrapper.style.cssText = [
    'position:fixed',
    'top:0',
    `left:-${width + 400}px`,   // far off-screen left — painted but not visible
    `width:${width}px`,
    `height:${height}px`,
    'overflow:hidden',
    'background:#ffffff',
    'pointer-events:none',
  ].join(';')
  wrapper.innerHTML = bodyContent
  document.body.appendChild(wrapper)

  try {
    // 4. Wait for any remaining img elements to finish loading
    const imgs = [...wrapper.querySelectorAll('img')]
    await Promise.all(imgs.map(img =>
      img.complete
        ? Promise.resolve()
        : new Promise(resolve => { img.onload = resolve; img.onerror = resolve })
    ))
    // Let the browser finish painting transforms / gradients
    await new Promise(r => setTimeout(r, 400))

    // 5. Capture with html-to-image
    const { toPng } = await import('html-to-image')
    const dataUrl = await toPng(wrapper, { width, height, pixelRatio: 2, skipAutoScale: true })

    // 6. Upload PNG to GHL Media Library → get a hosted URL
    const base64 = dataUrl.split(',')[1]
    const res    = await fetch('/.netlify/functions/upload-screenshot', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ base64, locationId }),
    })
    const data = await res.json()
    if (!res.ok || !data.url) throw new Error(data.error || 'Screenshot upload failed')
    return { url: data.url }
  } finally {
    document.body.removeChild(wrapper)
    document.head.removeChild(styleEl)
  }
}

// ── Google Sheets logging ─────────────────────────────────────────
// Pass { client, variations } to log all 3 at once (after generation)
// Pass { client, generatedCopy, variationLabel } to log the selected one (on approval)
export const logToSheets = (payload) =>
  post('/log-to-sheets', payload)

// ── Footer data from brand board sheet ───────────────────────────
export const fetchFooterData = ({ clientName }) =>
  get('/fetch-footer-data', { clientName })

// ── Feedback → Google Doc ─────────────────────────────────────────
export const submitFeedback = ({ section, feedback, clientName }) =>
  post('/submit-feedback', { section, feedback, clientName })
