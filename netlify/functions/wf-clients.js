/**
 * Welcome Flow — clients
 *
 *   GET  /.netlify/functions/wf-clients              → { clients: [...] }
 *   GET  /.netlify/functions/wf-clients?locationId=X → { match: {...} | null }   (lookup only)
 *   POST /.netlify/functions/wf-clients              → { client }
 *
 * Talks to TWO Supabase projects on purpose:
 *
 *   WF project  (iymhjrmmgwrxdggcvmjn)  email_wf_clients — the Welcome Flow roster
 *   VD project  (vdonazmwxzucdxduzfhh)  Email_Client_API — resolves ghl_api_key +
 *                                       logo_url from location_id
 *
 * The GHL API key is never stored in the WF table and never sent to the browser.
 */

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

const wfEnv = () => ({
  url: process.env.WF_SUPABASE_URL,
  key: process.env.WF_SUPABASE_SERVICE_KEY,
})
const vdEnv = () => ({
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_KEY,
})

const headers = (key) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
})

/** Resolve a GHL location against the VD project. Returns null when unknown. */
async function resolveLocation(locationId) {
  const { url, key } = vdEnv()
  if (!url || !key) throw new Error('VD Supabase credentials not configured')
  const res = await fetch(
    `${url}/rest/v1/Email_Client_API?select=client_name,logo_url,ghl_api_key&location_id=eq.${encodeURIComponent(locationId)}&limit=1`,
    { headers: headers(key) }
  )
  if (!res.ok) throw new Error(`VD lookup failed (${res.status})`)
  const [row] = await res.json()
  if (!row) return null
  return {
    clientName: row.client_name,
    logoUrl:    row.logo_url || '',
    hasApiKey:  !!row.ghl_api_key,        // never return the key itself
  }
}

export const handler = async (event) => {
  try {
    const { url, key } = wfEnv()
    if (!url || !key) {
      return json(500, { error: 'WF_SUPABASE_URL / WF_SUPABASE_SERVICE_KEY not configured' })
    }

    // ── lookup-only: validate a location before the client is created ──────
    const locationId = event.queryStringParameters?.locationId
    if (event.httpMethod === 'GET' && locationId) {
      return json(200, { match: await resolveLocation(locationId) })
    }

    // ── list ───────────────────────────────────────────────────────────────
    if (event.httpMethod === 'GET') {
      const res = await fetch(
        `${url}/rest/v1/email_wf_clients?select=*&order=client_name.asc`,
        { headers: headers(key) }
      )
      if (!res.ok) throw new Error(`WF list failed (${res.status}): ${(await res.text()).slice(0, 200)}`)
      const rows = await res.json()

      // decorate each with the logo from the VD project (best effort — a client
      // whose location has since been removed should still list)
      const clients = await Promise.all(rows.map(async (r) => {
        let logoUrl = ''
        try { logoUrl = (await resolveLocation(r.location_id))?.logoUrl || '' } catch { /* ignore */ }
        return {
          id:         r.id,
          name:       r.client_name,
          email:      r.contact_email || '',
          locationId: r.location_id,
          folderUrl:  r.folder_url || '',
          folderId:   r.folder_id  || '',
          logoUrl,
          createdAt:  r.created_at,
          updatedAt:  r.updated_at,
        }
      }))
      return json(200, { clients })
    }

    // ── create ─────────────────────────────────────────────────────────────
    if (event.httpMethod === 'POST') {
      const raw = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf-8')
        : event.body
      const { name, email, locationId: loc, folderUrl, folderId } = JSON.parse(raw || '{}')

      if (!name?.trim()) return json(400, { error: 'Client name is required' })
      if (!loc?.trim())  return json(400, { error: 'GHL location ID is required' })

      // the location must exist in the VD project, otherwise nothing can push later
      const match = await resolveLocation(loc.trim())
      if (!match) {
        return json(400, { error: `Location ${loc.trim()} was not found in the client database. Add it there first.` })
      }

      const res = await fetch(`${url}/rest/v1/email_wf_clients`, {
        method: 'POST',
        headers: { ...headers(key), Prefer: 'return=representation' },
        body: JSON.stringify({
          client_name:   name.trim(),
          contact_email: email?.trim() || null,
          location_id:   loc.trim(),
          folder_url:    folderUrl?.trim() || null,
          folder_id:     folderId?.trim()  || null,
        }),
      })
      const text = await res.text()
      if (!res.ok) {
        if (text.includes('duplicate key') || res.status === 409) {
          return json(409, { error: 'That location already has a welcome flow.' })
        }
        throw new Error(`WF insert failed (${res.status}): ${text.slice(0, 200)}`)
      }
      const [r] = JSON.parse(text)
      return json(200, {
        client: {
          id: r.id, name: r.client_name, email: r.contact_email || '',
          locationId: r.location_id, folderUrl: r.folder_url || '', folderId: r.folder_id || '',
          logoUrl: match.logoUrl, createdAt: r.created_at, updatedAt: r.updated_at,
        },
      })
    }

    return json(405, { error: 'Method Not Allowed' })
  } catch (err) {
    console.error('[wf-clients]', err)
    return json(500, { error: err.message })
  }
}
