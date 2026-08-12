import { runHandler } from './_adapter.js'
import { handler as addClient }          from '../netlify/functions/add-client.js'
import { handler as analyzeImageFocal }  from '../netlify/functions/analyze-image-focal.js'
import { handler as deleteClient }       from '../netlify/functions/delete-client.js'
import { handler as clients }            from '../netlify/functions/clients.js'
import { handler as copyCallback }       from '../netlify/functions/copy-callback.js'
import { handler as fetchBrandBoard }    from '../netlify/functions/fetch-brand-board.js'
import { handler as fetchEmailStats }    from '../netlify/functions/fetch-email-stats.js'
import { handler as fetchFooterData }    from '../netlify/functions/fetch-footer-data.js'
import { handler as fetchGhlImages }     from '../netlify/functions/fetch-ghl-images.js'
import { handler as fetchTemplateName }  from '../netlify/functions/fetch-template-name.js'
import { handler as generateCopy }       from '../netlify/functions/generate-copy.js'
import { handler as getDriveImages }     from '../netlify/functions/get-drive-images.js'
import { handler as htmlToImage }        from '../netlify/functions/html-to-image.js'
import { handler as logToSheets }        from '../netlify/functions/log-to-sheets.js'
import { handler as notifyChat }         from '../netlify/functions/notify-chat.js'
import { handler as previewEmail }       from '../netlify/functions/preview-email.js'
import { handler as proxyImage }         from '../netlify/functions/proxy-image.js'
import { handler as pushHtmlToGhl }      from '../netlify/functions/push-html-to-ghl.js'
import { handler as pushToGhl }          from '../netlify/functions/push-to-ghl.js'
import { handler as recommendTemplate }  from '../netlify/functions/recommend-template.js'
import { handler as submitFeedback }     from '../netlify/functions/submit-feedback.js'
import { handler as uploadLogo }         from '../netlify/functions/upload-logo.js'
import { handler as uploadScreenshot }   from '../netlify/functions/upload-screenshot.js'
import { handler as wfClients }          from '../netlify/functions/wf-clients.js'

export const config = {
  api: {
    bodyParser:    false,
    responseLimit: false,
  },
}

const HANDLERS = {
  'add-client':          addClient,
  'analyze-image-focal': analyzeImageFocal,
  'delete-client':       deleteClient,
  'clients':             clients,
  'copy-callback':       copyCallback,
  'fetch-brand-board':   fetchBrandBoard,
  'fetch-email-stats':   fetchEmailStats,
  'fetch-footer-data':   fetchFooterData,
  'fetch-ghl-images':    fetchGhlImages,
  'fetch-template-name': fetchTemplateName,
  'generate-copy':       generateCopy,
  'get-drive-images':    getDriveImages,
  'html-to-image':       htmlToImage,
  'log-to-sheets':       logToSheets,
  'notify-chat':         notifyChat,
  'preview-email':       previewEmail,
  'proxy-image':         proxyImage,
  'push-html-to-ghl':    pushHtmlToGhl,
  'push-to-ghl':         pushToGhl,
  'recommend-template':  recommendTemplate,
  'submit-feedback':     submitFeedback,
  'upload-logo':         uploadLogo,
  'upload-screenshot':   uploadScreenshot,
  'wf-clients':          wfClients,
}

export default async function handler(req, res) {
  const urlPath   = req.url.split('?')[0]
  const parts     = urlPath.split('/').filter(Boolean)
  const markerIdx = parts.findLastIndex(p => p === 'api' || p === 'functions')
  const slug      = markerIdx >= 0 ? parts[markerIdx + 1] : parts[parts.length - 1]

  const fn = HANDLERS[slug]
  if (!fn) return res.status(404).json({ error: `Unknown function: ${slug}` })

  await runHandler(fn, req, res)
}
