/**
 * GET /.netlify/functions/fetch-ghl-images
 *
 * ?locationId=XXX              → returns { folders, images } (root level)
 * ?locationId=XXX&folderId=YYY → returns { images } inside that folder
 */

const GHL_BASE    = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']

async function ghlGet(path, apiKey) {
  const res = await fetch(`${GHL_BASE}${path}`, {
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      Version:        GHL_VERSION,
      'Content-Type': 'application/json',
    },
  })
  return res.json()
}

/**
 * Look up a location's own GHL key. Used when the caller sends none — the
 * Welcome Flow Campaign never holds the key in the browser, so it passes only
 * the location and lets the server resolve it.
 */
async function resolveApiKey(locationId) {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) return ''
  try {
    const res = await fetch(
      `${url}/rest/v1/Email_Client_API?select=ghl_api_key&location_id=eq.${encodeURIComponent(locationId)}&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    )
    if (!res.ok) return ''
    const [row] = await res.json()
    return row?.ghl_api_key || ''
  } catch { return '' }
}

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' }

  const { locationId, folderId, apiKey: qApiKey } = event.queryStringParameters || {}

  if (!locationId) return { statusCode: 400, body: JSON.stringify({ error: 'locationId required' }) }

  // guard against a caller serialising an absent key as the string "undefined"
  const passedKey = qApiKey && qApiKey !== 'undefined' && qApiKey !== 'null' ? qApiKey : ''
  const apiKey = passedKey || await resolveApiKey(locationId) || process.env.GHL_API_KEY
  if (!apiKey) return { statusCode: 500, body: JSON.stringify({ error: `No GHL API key for location ${locationId}` }) }

  try {
    if (folderId) {
      // ── Fetch subfolders + images inside a specific folder in parallel ──
      const [subFolderData, fileData] = await Promise.all([
        ghlGet(`/medias/files?locationId=${locationId}&type=folder&parentId=${folderId}&limit=100&sortBy=name&sortOrder=asc`, apiKey),
        ghlGet(`/medias/files?locationId=${locationId}&type=file&parentId=${folderId}&limit=200&sortBy=updatedAt&sortOrder=desc`, apiKey),
      ])

      const folders = (subFolderData.files || []).map(f => ({ id: f._id, name: f.name }))
      const images  = (fileData.files || [])
        .filter(f => IMAGE_TYPES.includes(f.contentType))
        .map(f => ({ id: f._id, name: f.name, url: f.url, thumbnailUrl: f.url, contentType: f.contentType }))

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folders, images }),
      }
    }

    // ── Fetch root: folders + root-level images in parallel ────────────
    const [folderData, fileData] = await Promise.all([
      ghlGet(`/medias/files?locationId=${locationId}&type=folder&limit=100&sortBy=name&sortOrder=asc`, apiKey),
      ghlGet(`/medias/files?locationId=${locationId}&type=file&limit=200&sortBy=updatedAt&sortOrder=desc`, apiKey),
    ])

    const folders = (folderData.files || []).map(f => ({
      id:   f._id,
      name: f.name,
    }))

    const images = (fileData.files || [])
      .filter(f => IMAGE_TYPES.includes(f.contentType))
      .map(f => ({ id: f._id, name: f.name, url: f.url, thumbnailUrl: f.url, contentType: f.contentType }))

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folders, images }),
    }

  } catch (err) {
    console.error('[fetch-ghl-images] Error:', err.message)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
