/**
 * POST /.netlify/functions/wf-generate-copy
 * Body: { week, prompt, clientName, locationId }
 * Returns: { jobId, brandData }  ← immediately, before n8n finishes
 *
 * Welcome Flow Campaign's copy generation. Same async shape as the Weekly
 * Email Campaign's generate-copy, and for the same reason: the workflow takes
 * 45-50s, which is longer than a serverless function may stay open. Nothing
 * waits on it.
 *
 *   1. generate a jobId
 *   2. fetch brand data from the brand board sheet by client name
 *   3. POST to this week's n8n webhook with { jobId, callbackUrl, prompt, ... }
 *   4. n8n replies 200 immediately and keeps working in the background
 *   5. n8n POSTs the finished copy to /.netlify/functions/copy-callback
 *   6. the page polls copy-callback?jobId=... until it lands
 *
 * The copy arrives as Markdown prose, not JSON; the browser parses it with
 * parseWfCopy.js once the callback delivers it.
 *
 * Each welcome email has its OWN n8n workflow, so the webhook is resolved per
 * week from env: N8N_WF_WEEK1_WEBHOOK_URL … N8N_WF_WEEK9_WEBHOOK_URL. The
 * browser only ever sends the week number — the URLs stay server-side.
 *
 * Brand data is fetched here rather than in the browser so the copy the model
 * writes can be brand-aware, matching how the weekly campaign does it.
 */

import { randomUUID, createSign } from 'crypto'

const SPREADSHEET_ID = '14HEBZ9DPckY9jJRq-DYUZYI6bz2WJHhec9LTmP8FP54'
const SHEET_NAME     = 'Sheet1'

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

async function getGoogleToken() {
  const email      = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  if (!email || !privateKey) return null

  const now     = Math.floor(Date.now() / 1000)
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: email, scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now,
  })).toString('base64url')

  const sign = createSign('RSA-SHA256')
  sign.update(`${header}.${payload}`)
  const jwt = `${header}.${payload}.${sign.sign(privateKey, 'base64url')}`

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  const data = await res.json()
  return data.access_token || null
}

/** Brand board row for this client — colours, footer text, socials. */
async function fetchBrandData(clientName) {
  try {
    const token = await getGoogleToken()
    if (!token) return null
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:K`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()
    const rows = data.values || []
    const row  = rows.find(r => (r[0] || '').trim().toLowerCase() === (clientName || '').trim().toLowerCase())
    if (!row) return null
    return {
      found: true,
      bgColor:        row[1] || '',
      buttonColor:    row[2] || '',
      secondaryColor: row[3] || '',
      contactInfo:    row[4] || '',
      footerText:     row[5] || '',
      instagramUrl:   row[6] || '',
      facebookUrl:    row[7] || '',
      tiktokUrl:      row[8] || '',
      websiteUrl:     row[9] || '',
      contactNumber:  row[10] || '',
    }
  } catch (err) {
    console.warn('[wf-generate-copy] brand data lookup failed (non-fatal):', err.message)
    return null
  }
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' })

  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body
    const { week, prompt, clientName, locationId } = JSON.parse(raw || '{}')

    if (!prompt?.trim()) return json(400, { error: 'prompt is required' })
    const weekNum = Number(week)
    if (!weekNum || weekNum < 1 || weekNum > 9) {
      return json(400, { error: `Invalid week "${week}" — expected 1-9` })
    }

    const webhookUrl = process.env[`N8N_WF_WEEK${weekNum}_WEBHOOK_URL`]
    if (!webhookUrl) {
      return json(400, {
        error: `No n8n webhook configured for Week ${weekNum}. Set N8N_WF_WEEK${weekNum}_WEBHOOK_URL.`,
      })
    }

    const jobId = randomUUID()

    const brandData = await fetchBrandData(clientName)
    console.log(`[wf-generate-copy] week=${weekNum} client="${clientName}" brandData=${brandData ? 'found' : 'not found'}`)

    // strip a trailing slash so the URL cannot come out with a double slash
    const base = (process.env.CALLBACK_BASE_URL || process.env.URL || '').replace(/\/+$/, '')
    const callbackUrl = `${base}/.netlify/functions/copy-callback`

    // Fire and return — do NOT await the copy. n8n must be set to respond
    // immediately; if it is left on "when last node finishes" this request
    // hangs for ~46s and the function times out before n8n ever answers.
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId,
        callbackUrl,
        prompt,
        week: weekNum,
        clientName: clientName || '',
        locationId: locationId || '',
        brandData,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`n8n webhook returned ${res.status}: ${text.slice(0, 300)}`)
    }

    console.log(`[wf-generate-copy] fired week ${weekNum} webhook, jobId=${jobId}, callback=${callbackUrl}`)
    return json(200, { jobId, brandData })

  } catch (err) {
    console.error('[wf-generate-copy] Error:', err.message)
    return json(500, { error: err.message })
  }
}
