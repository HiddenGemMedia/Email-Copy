/**
 * POST /.netlify/functions/push-html-to-ghl
 * Body: { client, renderedHtml, generatedCopy, templateId, locationId }
 *
 * Creates a new GHL email template with the full rendered HTML,
 * OR updates the existing template if templateId is provided.
 * Returns: { success, previewUrl, templateId }
 *
 * client.ghlApiKey is optional. The Weekly Email Campaign sends it from the
 * browser; Welcome Flow Campaign never holds the key client-side, so it sends
 * only the location and the key is resolved here from Email_Client_API.
 */

const GHL_BASE    = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'

function ghlHeaders(apiKey) {
  return {
    Authorization:  `Bearer ${apiKey}`,
    Version:        GHL_VERSION,
    'Content-Type': 'application/json',
  }
}

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
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body

    const { client, renderedHtml, generatedCopy, templateId, locationId: urlLocationId, folderId, templateLabel } = JSON.parse(rawBody)

    const locationId = urlLocationId || client?.ghl?.locationId
    if (!locationId) throw new Error('No locationId available')

    const apiKey = client?.ghlApiKey || await resolveApiKey(locationId) || process.env.GHL_API_KEY
    if (!apiKey) throw new Error(`No GHL API key found for location ${locationId}`)
    if (!renderedHtml) throw new Error('No HTML to push — make sure you preview the template before approving')

    console.log(`[push-html-to-ghl] htmlLength=${renderedHtml.length} templateId=${templateId || '(new)'} locationId=${locationId} folderId=${folderId || '(none)'}`)

    const clientName   = client?.name || 'Campaign'
    const tplLabel     = templateLabel || 'Email'
    const templateName = `${clientName} - ${tplLabel}`

    let newTemplateId
    let method
    let url

    if (templateId) {
      // Update existing template
      method = 'PATCH'
      url    = `${GHL_BASE}/emails/public/v2/locations/${locationId}/templates/${templateId}`
    } else {
      // Create new template
      method = 'POST'
      url    = `${GHL_BASE}/emails/public/v2/locations/${locationId}/templates`
    }

    // GHL requires editorType:"html" + editorContent when creating templates
    // (editorType required especially when folderId is provided)
    const templateBody = { name: templateName, editorType: 'html', editorContent: renderedHtml }

    console.log(`[push-html-to-ghl] ${method} ${url}`)

    const res = await fetch(url, {
      method,
      headers: ghlHeaders(apiKey),
      body: JSON.stringify(templateBody),
    })

    const responseText = await res.text()
    console.log(`[push-html-to-ghl] GHL response ${res.status}: ${responseText.slice(0, 300)}`)

    if (!res.ok) {
      throw new Error(`GHL template push failed: ${res.status} ${responseText}`)
    }

    const data = JSON.parse(responseText)
    newTemplateId = data?.id || data?.template?.id || data?.data?.id || templateId || ''
    console.log(`[push-html-to-ghl] newTemplateId=${newTemplateId}`)

    // GHL ignores folderId in POST body — move to folder via separate PATCH
    if (folderId && method === 'POST' && newTemplateId) {
      const moveUrl = `${GHL_BASE}/emails/public/v2/locations/${locationId}/templates/${newTemplateId}`
      const moveRes = await fetch(moveUrl, {
        method:  'PATCH',
        headers: ghlHeaders(apiKey),
        body:    JSON.stringify({ parentFolderId: folderId }),
      })
      const moveText = await moveRes.text()
      console.log(`[push-html-to-ghl] Move to folder ${folderId}: ${moveRes.status} ${moveText.slice(0, 100)}`)
    }

    const emailsBase = `https://app.gohighlevel.com/v2/location/${locationId}/marketing/emails`
    const previewUrl = newTemplateId
      ? `${emailsBase}/builder/${newTemplateId}`
      : `${emailsBase}/all?pageNumber=1`

    console.log(`[push-html-to-ghl] Pushed HTML template "${templateName}" → ${previewUrl}`)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, previewUrl, templateId: newTemplateId }),
    }

  } catch (err) {
    console.error('[push-html-to-ghl] Error:', err.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
