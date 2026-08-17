/**
 * POST /.netlify/functions/upload-logo
 * Body: { base64, mimeType, fileName, locationId, apiKey? }
 *
 * 1. Uploads logo image to GHL Media Library
 * 2. Saves the returned URL to Supabase Email_Client_API (matched by location_id)
 * Returns: { success, logoUrl }
 *
 * apiKey is optional. The Weekly Email Campaign passes it from the browser, which
 * is the original path. Welcome Flow Campaign never holds the key client-side, so
 * it sends locationId alone and the key is resolved here from Email_Client_API.
 */

const GHL_BASE    = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

async function uploadToGHL(apiKey, locationId, base64, mimeType, fileName) {
  const buffer   = Buffer.from(base64, 'base64')
  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2)
  const CRLF     = '\r\n'

  const headerPart =
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="file"; filename="${fileName}"${CRLF}` +
    `Content-Type: ${mimeType}${CRLF}${CRLF}`

  const footerPart = `${CRLF}--${boundary}--${CRLF}`

  const body = Buffer.concat([
    Buffer.from(headerPart, 'utf-8'),
    buffer,
    Buffer.from(footerPart, 'utf-8'),
  ])

  const res = await fetch(`${GHL_BASE}/medias/upload-file?locationId=${locationId}`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      Version:        GHL_VERSION,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GHL media upload failed: ${res.status} ${text}`)
  }

  const data = await res.json()
  const url  = data.url || data.fileUrl || data?.data?.url || data?.file?.url || ''
  if (!url) throw new Error(`GHL media upload succeeded but no URL returned: ${JSON.stringify(data)}`)
  return url
}

/** Look up a location's GHL key. Used only when the caller did not supply one. */
async function resolveApiKey(locationId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/Email_Client_API?select=ghl_api_key&location_id=eq.${encodeURIComponent(locationId)}&limit=1`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  )
  if (!res.ok) throw new Error(`Client lookup failed: ${res.status}`)
  const [row] = await res.json()
  return row?.ghl_api_key || ''
}

async function saveLogoUrlToSupabase(locationId, logoUrl) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/Email_Client_API?location_id=eq.${encodeURIComponent(locationId)}`,
    {
      method: 'PATCH',
      headers: {
        apikey:         SUPABASE_KEY,
        Authorization:  `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer:         'return=minimal',
      },
      body: JSON.stringify({ logo_url: logoUrl }),
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase update failed: ${res.status} ${text}`)
  }
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  try {
    const { base64, mimeType, fileName, locationId, apiKey } = JSON.parse(event.body)

    if (!base64)     throw new Error('No image data provided')
    if (!locationId) throw new Error('No locationId provided')

    // Welcome Flow sends no key — resolve it from the client database instead.
    const key = apiKey || await resolveApiKey(locationId)
    if (!key) throw new Error(`No GHL API key found for location ${locationId}`)

    // 1. Upload to GHL
    const logoUrl = await uploadToGHL(key, locationId, base64, mimeType || 'image/png', fileName || 'logo.png')

    // 2. Save URL to Supabase (non-fatal)
    try {
      await saveLogoUrlToSupabase(locationId, logoUrl)
      console.log(`[upload-logo] Saved logo for locationId ${locationId}: ${logoUrl}`)
    } catch (dbErr) {
      console.warn(`[upload-logo] Supabase write failed (non-fatal): ${dbErr.message}`)
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, logoUrl }),
    }
  } catch (err) {
    console.error('[upload-logo] Error:', err.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
