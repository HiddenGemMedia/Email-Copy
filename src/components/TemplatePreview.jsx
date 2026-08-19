/**
 * TemplatePreview — 6 luxury email template designs
 *
 * Content order: headline → subhead → body → closing line → CTA → body block 2
 *
 * Order: Casa · Tropica · Refined · Newsletter · MasterClass · Blueprint
 */
import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { useCampaignStore }  from '../store/campaignStore'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { recommendTemplate, analyzeImageFocal, htmlToImage, fetchFooterData, sendTestEmail } from '../lib/api'

/* ─────────────────────── shared email-client header ─────────────────────── */
function emailClientHeader({ client, copy }) {
  return `
  <div style="max-width:600px;margin:24px auto 16px;background:#fff;border-radius:8px;border:1px solid #e8e8e8;padding:16px 28px;font-family:Arial,Helvetica,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.06);">
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tr>
        <td style="color:#aaa;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:5px 0;width:80px;vertical-align:top;">From:</td>
        <td style="padding:5px 0;vertical-align:top;">
          <span style="font-weight:700;color:#1a1a1a;">${client?.name||'Brand'}</span>
          <span style="color:#aaa;font-size:12px;margin-left:8px;">&lt;hello@${(client?.name||'brand').toLowerCase().replace(/\s+/g,'')}.com&gt;</span>
        </td>
      </tr>
      <tr>
        <td style="color:#aaa;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:5px 0;vertical-align:top;">Subject:</td>
        <td style="padding:5px 0;font-weight:600;color:#1a1a1a;vertical-align:top;">${copy.subjectLine||'—'}</td>
      </tr>
      <tr>
        <td style="color:#aaa;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:5px 0;vertical-align:top;">Preview:</td>
        <td style="padding:5px 0;color:#888;vertical-align:top;">${copy.previewText||'—'}</td>
      </tr>
    </table>
  </div>`
}

/* ─── focal-point helper ─────────────────────────────────────────────────── */
// Returns "object-position: X% Y%" string from an image object's focal data
function focalPos(imgObj) {
  const x = imgObj?.focalX ?? 50
  const y = imgObj?.focalY ?? 50
  return `${x}% ${y}%`
}

/* ─── text-on-background contrast helper ────────────────────────────────── */
// Returns '#1a1a1a' (dark) for light backgrounds, '#ffffff' for dark ones.
// Used throughout the 70/20/10 color system.
function textOn(hex) {
  const h = (hex || '').replace('#', '')
  if (h.length < 6) return '#1a1a1a'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) > 160 ? '#1a1a1a' : '#ffffff'
}
// Muted variant — 60% opacity over transparent
function mutedOn(hex) {
  return textOn(hex) === '#1a1a1a' ? 'rgba(26,26,26,0.62)' : 'rgba(255,255,255,0.62)'
}
// Hairline divider colour
function divOn(hex) {
  return textOn(hex) === '#1a1a1a' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'
}

/* ─── footer builder ────────────────────────────────────────────────────── */
// Generates a branded footer block for every template.
// footerData comes from the brand board Google Sheet (fetch-footer-data endpoint).
// Falls back gracefully when footerData is null or fields are empty.
function buildFooter(client, footerData = null, options = {}) {
  const fd          = footerData || {}
  const bgRaw       = options.bgOverride || fd.bgColor || options.defaultBg  || '#1c1c1c'
  const btnColor    = fd.buttonColor  || options.defaultBtn || '#b07a50'
  const contactInfo   = fd.contactInfo   || ''
  const contactNumber = fd.contactNumber || ''
  const footerText    = fd.footerText    || ''
  const instagram     = fd.instagramUrl  || ''
  const facebook    = fd.facebookUrl  || ''
  const tiktok      = fd.tiktokUrl    || ''
  const website     = fd.websiteUrl   || ''
  const logoUrl     = client?.logoUrl || ''
  const name        = client?.name    || ''
  const logoColorOpt = fd.logoColor   || 'original'

  // Decide text colour based on bg brightness (simple luminance check)
  // If bg is a light hex colour use dark text, otherwise white
  function isLight(hex) {
    const h = hex.replace('#','')
    if (h.length < 6) return false
    const r = parseInt(h.slice(0,2),16)
    const g = parseInt(h.slice(2,4),16)
    const b = parseInt(h.slice(4,6),16)
    return (0.299*r + 0.587*g + 0.114*b) > 160
  }
  const light    = isLight(bgRaw)
  const textCol  = options.textColor || (light ? 'rgba(0,0,0,0.55)'  : 'rgba(255,255,255,0.55)')
  const linkCol  = options.textColor || (light ? 'rgba(0,0,0,0.4)'   : 'rgba(255,255,255,0.35)')
  const divCol   = options.dividerColor || (light ? 'rgba(0,0,0,0.08)'  : 'rgba(255,255,255,0.1)')

  // Social icon URLs (GHL CDN circular icons)
  const CDN = 'https://storage.googleapis.com/preview-production-assets/email/img/hl_default_img/social'
  const socialIcons = [
    { url: instagram, icon: `${CDN}/instagram_circle_grey.png`, label: 'Instagram' },
    { url: facebook,  icon: `${CDN}/facebook_circle_grey.png`,  label: 'Facebook'  },
    { url: tiktok,    icon: `${CDN}/tiktok_circle_grey.png`,    label: 'TikTok'    },
    { url: website,   icon: `${CDN}/website_circle_grey.png`,   label: 'Website'   },
  ].filter(s => s.url)

  const sectionGap     = options.sectionGap     !== undefined ? options.sectionGap     : 28
  const footerTextSize = options.footerTextSize !== undefined ? options.footerTextSize : 12

  const socialHtml = socialIcons.length ? `
    <div style="margin:0 0 ${sectionGap || 20}px;text-align:center;font-size:0">
      ${socialIcons.map(s =>
        `<a href="${s.url}" target="_blank" rel="noopener" style="display:inline-block;line-height:0;margin:0 7px">
           <img class="w5-footer-icon" src="${s.icon}" alt="${s.label}" width="36" height="36" style="display:block;width:36px;height:36px;border-radius:50%"/>
         </a>`
      ).join('')}
    </div>` : ''

  const footerLogoFilter = logoColorOpt === 'original' ? 'none'
    : light ? 'brightness(0)'
    : 'brightness(0) invert(1)'
  const logoHtml = logoUrl
    ? `<div style="margin:0 0 20px;text-align:center"><img class="w5-footer-logo" src="${logoUrl}" alt="${name}" style="height:${fd.footerLogoSize || 40}px;width:auto;object-fit:contain;display:inline-block;filter:${footerLogoFilter};opacity:.8;background-color:${bgRaw};"/></div>`
    : `<div style="margin:0 0 20px;font-size:16px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${textCol};font-family:Arial,sans-serif">${name}</div>`

  const contactParts = [
    contactInfo   ? `<a href="mailto:${contactInfo}" style="color:${textCol};text-decoration:underline;font-weight:600">${contactInfo}</a>` : '',
    contactNumber ? `<a href="tel:${contactNumber.replace(/\s/g,'')}" style="color:${textCol};text-decoration:underline;font-weight:600">${contactNumber}</a>` : '',
  ].filter(Boolean)
  const contactHtml = contactParts.length
    ? `<div style="font-size:14px;color:${textCol};font-family:Arial,sans-serif;margin-bottom:${sectionGap || 16}px;line-height:1.25;text-align:center">${contactParts.join(`&nbsp;&nbsp;·&nbsp;&nbsp;`)}</div>`
    : ''

  const footerTextHtml = footerText
    ? `<div class="mobile-footer" style="font-size:${footerTextSize}px;color:#878787;font-family:Arial,sans-serif;margin-bottom:${sectionGap || 20}px;line-height:1.25;text-align:left">${footerText}</div>`
    : ''

  const divClass = options.gmailClass ? ` class="${options.gmailClass}"` : ''
  return `
  <!-- Footer -->
  <div${divClass} style="background:${bgRaw};padding:44px 48px 36px;text-align:left;border-top:1px solid ${divCol}">
    ${logoHtml}
    ${socialHtml}
    ${contactHtml}
    ${footerTextHtml}
    <div style="font-size:14px;color:${linkCol};font-family:Arial,sans-serif;line-height:1.25;margin-top:8px;text-align:center">
      <a href="{{email.view_in_browser_url}}" style="color:${linkCol};text-decoration:underline">View in browser</a>
      &nbsp;·&nbsp;
      <a href="{{email.unsubscribe_link}}" style="color:${linkCol};text-decoration:underline;font-weight:600">Unsubscribe</a>
    </div>
  </div>`
}

/* ══════════════════════════════════════════════════════════════════════════
   SHARED MOBILE CSS — FOR FUTURE TEMPLATES ONLY
   Do not apply to existing templates (Week 2–8). They have their own inline CSS.
   To change: update TEMPLATE_SPEC.md first, then update the values below.
   Usage in a new template: <style>*{...} ${SHARED_MOBILE_CSS}</style>
   ══════════════════════════════════════════════════════════════════════════ */
const SHARED_MOBILE_CSS = `
  @media only screen and (max-width:600px){
    .w2-section    { padding-left:35px!important; padding-right:35px!important; }
    .w2-btn-img    { width:300px!important; max-width:300px!important; }
    .w2-b2         { padding-left:35px!important; padding-right:35px!important; }
    .w2-b2-inner   { padding-left:0!important;   padding-right:0!important;   }
    .mobile-body    { font-size:17px!important; line-height:1.5!important; }
    .mobile-subhead { font-size:17px!important; line-height:1.4!important; }
    .mobile-b2title { font-size:22px!important; line-height:1.25!important; }
    .mobile-closing { font-size:17px!important; line-height:1.5!important; }
    .mobile-cta     { font-size:20px!important; padding:20px 80px!important; }
    .mobile-footer  { font-size:14px!important; line-height:1.4!important; }
  }
`

function buildTemplateWeek2v2({ client, copy, images, footerData, isHeroGenerated = false,
  heroScale=1, heroX=0, heroY=0,
  textSize=38, textTop=32, textLeft=24,
  logoColor='original', logoTop=24, logoRight=200, logoSize=40,
  img1Scale=1, img1X=0, img1Y=0,
  img2Scale=1, img2X=0, img2Y=0,
  img3Scale=1, img3X=0, img3Y=0,
  btnImgUrl = null,
}) {
  const heroObj  = images?.[0]; const heroImg = heroObj?.url||''
  const img1Obj  = images?.[1]; const img1    = img1Obj?.url||''
  const img2Obj  = images?.[2]; const img2    = img2Obj?.url||''
  const img3Obj  = images?.[3]; const img3    = img3Obj?.url||''
  const img4     = images?.[4]?.url || ''
  const img5     = images?.[5]?.url || ''
  const body     = (copy.bodyText||'').replace(/\n/g,'<br>')
  const b2body   = (copy.bodyBlock2||'').replace(/\n/g,'<br>')
  const logoUrl  = client?.logoUrl||''
  const pageBg   = footerData?.bgColor || '#1e2a4a'
  const accent   = footerData?.buttonColor || '#d4006a'
  const secondary = footerData?.secondaryColor || accent
  const logoFilter = logoColor === 'white' ? 'brightness(0) invert(1)' : logoColor === 'black' ? 'brightness(0)' : 'none'

  const _rgb = pageBg.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  const _r = _rgb ? parseInt(_rgb[1],16) : 30
  const _g = _rgb ? parseInt(_rgb[2],16) : 42
  const _b = _rgb ? parseInt(_rgb[3],16) : 74
  const _lum = (0.299*_r + 0.587*_g + 0.114*_b)/255
  const lightBg      = _lum > 0.55
  const mutedTextCol = lightBg ? '#595959' : '#d4d4d4'
  const dividerCol   = lightBg ? '#e0e0e0' : '#444444'

  const logoOverlay = logoUrl
    ? `<img src="${logoUrl}" alt="${client?.name||''}" style="display:inline-block;height:${logoSize}px;width:auto;max-width:${logoSize * 6}px;filter:${logoFilter};"/>`
    : `<div style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:${mutedTextCol};margin-bottom:10px;">${client?.name||''}</div>`

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@700&display=swap" rel="stylesheet"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{margin:0;padding:0;color:#1a1a1a;}
  table{border-collapse:collapse;}
  @media only screen and (max-width:600px){
    .w2-section    { padding-left:35px!important; padding-right:35px!important; }
    .w2-btn-img    { width:300px!important; max-width:300px!important; }
    .w2-b2         { padding-left:35px!important; padding-right:35px!important; }
    .w2-b2-inner   { padding-left:0!important;   padding-right:0!important;   }
    .mobile-body    { font-size:17px!important; line-height:1.5!important; }
    .mobile-subhead { font-size:17px!important; line-height:1.4!important; }
    .mobile-b2title { font-size:22px!important; line-height:1.25!important; }
    .mobile-closing { font-size:17px!important; line-height:1.5!important; }
    .mobile-cta     { font-size:20px!important; padding:20px 80px!important; }
    .mobile-footer  { font-size:14px!important; line-height:1.4!important; }
  }
</style></head>
<body style="margin:0;padding:32px 0 48px;background-color:#ffffff;">

<table width="600" cellpadding="0" cellspacing="0" bgcolor="${pageBg}" style="width:600px;max-width:600px;margin:0 auto;background-color:${pageBg};border-collapse:collapse;border-radius:20px;overflow:hidden;">
<tr><td style="background-color:${pageBg};">

  <!-- LOGO HEADER: only in CSS preview; generated PNG already includes the logo -->
  ${!isHeroGenerated ? `<div style="padding:${logoTop}px 32px 18px;text-align:center;background-color:${pageBg};">${logoOverlay}</div>` : ''}

  <!-- HERO: transparent PNG or CSS preview -->
  ${isHeroGenerated
    ? `<div style="line-height:0;font-size:0;background-color:${pageBg};"><a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;"><img src="${heroImg}" alt="" width="600" style="width:100%;display:block;max-width:600px;border:0;"/></a></div>`
    : `<div style="line-height:0;font-size:0;padding:0 36px;background-color:${pageBg};">
    <div style="position:relative;width:528px;height:680px;border-radius:999px 999px 0 0;overflow:hidden;">
      ${heroImg
        ? `<img src="${heroImg}" alt="" style="position:absolute;top:0;left:0;width:528px;height:680px;object-fit:cover;display:block;transform:translate(${heroX}px,${heroY}px) scale(${heroScale});transform-origin:center center;"/>`
        : `<div style="width:528px;height:680px;background:#f0c8b8;text-align:center;color:${accent};font-size:12px;font-family:Arial,sans-serif;line-height:680px;">Hero image</div>`}
      <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0) 0%,rgba(0,0,0,0) 50%,rgba(0,0,0,0.45) 100%);">
        <table width="100%" height="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;height:100%;border-collapse:collapse;">
          <tr><td valign="bottom" align="center" style="vertical-align:bottom;text-align:center;padding:0 ${textLeft}px ${textTop}px;">
            <div style="font-family:'Lora',Georgia,serif;font-size:${textSize}px;font-weight:700;color:#fff;line-height:1.12;text-shadow:0 2px 10px rgba(0,0,0,.3);display:inline-block;max-width:360px;">${copy.headlineText||''}</div>
          </td></tr>
        </table>
      </div>
    </div>
  </div>`}

  <!-- SUBHEAD -->
  ${copy.subhead ? `<div class="w2-section" style="padding:28px 48px 4px;text-align:center;background-color:${pageBg};"><div class="mobile-subhead" style="font-family:Georgia,serif;font-size:20px;font-weight:400;font-style:italic;color:${mutedTextCol};line-height:1.5;">${copy.subhead}</div></div>` : ''}

  <!-- CTA -->
  ${copy.ctaText ? `<div class="w2-section" style="padding:24px 48px 28px;text-align:center;background-color:${pageBg};">${btnImgUrl
    ? `<a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;outline:none;border:none;"><img class="w2-btn-img" src="${btnImgUrl}" alt="${copy.ctaText}" width="375" style="width:375px;max-width:375px;display:block;margin:0 auto;border:0;outline:none;"/></a>`
    : `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td style="background:${accent};border-radius:999px;"><a class="mobile-cta" href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:15px 40px;font-family:Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:.04em;color:#ffffff!important;-webkit-text-fill-color:#ffffff;text-decoration:none!important;white-space:nowrap;">${copy.ctaText} &rarr;</a></td></tr></table>`
  }</div>` : ''}

  <!-- LONG IMAGE (img1): transparent PNG above body text -->
  ${isHeroGenerated && img4
    ? `<div style="line-height:0;font-size:0;background-color:${pageBg};"><a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;"><img src="${img4}" alt="" width="600" style="width:100%;display:block;max-width:600px;border:0;"/></a></div>`
    : img1 ? `<div style="line-height:0;font-size:0;padding:0 36px 16px;background-color:${pageBg};"><div style="overflow:hidden;border-radius:8px;height:360px;"><img src="${img1}" alt="" style="width:100%;height:360px;object-fit:cover;display:block;object-position:${focalPos(img1Obj)};transform:translate(${img1X}px,${img1Y}px) scale(${img1Scale});transform-origin:center center;"/></div></div>` : ''}

  <!-- BODY BLOCK -->
  ${copy.bodyText ? `<div class="w2-section" style="padding:24px 48px 32px;background-color:${pageBg};"><div class="mobile-body" style="font-size:17px;line-height:1.8;color:${mutedTextCol};margin-bottom:18px;font-family:Arial,sans-serif;">${body}</div></div>` : ''}

  <!-- STRIP IMAGES (img2+img3): transparent PNG after body text -->
  ${isHeroGenerated && img5
    ? `<div style="line-height:0;font-size:0;background-color:${pageBg};"><a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;"><img src="${img5}" alt="" width="600" style="width:100%;display:block;max-width:600px;border:0;"/></a></div>`
    : img2 ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background-color:${pageBg};">
      <tr><td style="padding:0 36px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;line-height:0;font-size:0;">
          <tr>
            <td width="49%" style="padding-right:4px;vertical-align:top;"><div style="overflow:hidden;border-radius:6px;height:220px;"><img src="${img2}" alt="" width="100%" style="width:100%;height:220px;object-fit:cover;display:block;object-position:${focalPos(img2Obj)};transform:translate(${img2X}px,${img2Y}px) scale(${img2Scale});transform-origin:center center;"/></div></td>
            ${img3 ? `<td width="49%" style="padding-left:4px;vertical-align:top;"><div style="overflow:hidden;border-radius:6px;height:220px;"><img src="${img3}" alt="" width="100%" style="width:100%;height:220px;object-fit:cover;display:block;object-position:${focalPos(img3Obj)};transform:translate(${img3X}px,${img3Y}px) scale(${img3Scale});transform-origin:center center;"/></div></td>` : ''}
          </tr>
        </table>
      </td></tr>
    </table>` : ''}

  <!-- BODY BLOCK 2: title + body2 + closing + CTA -->
  ${(copy.bodyBlock2Title || copy.bodyBlock2 || copy.closingLine) ? `
  <div class="w2-b2" style="background-color:${pageBg};padding:8px 36px 0;">
    <div class="w2-b2-inner" style="background-color:${pageBg};border-radius:10px;padding:16px 20px;">
      ${copy.bodyBlock2Title ? `<div class="mobile-b2title" style="font-size:22px;font-weight:700;font-family:Arial,sans-serif;letter-spacing:0;text-transform:uppercase;color:${secondary};margin-bottom:6px;text-align:left;">${copy.bodyBlock2Title}</div>` : ''}
      ${copy.bodyBlock2 ? `<div class="mobile-body" style="font-size:17px;line-height:1.8;color:${mutedTextCol};margin-bottom:18px;font-family:Arial,sans-serif;">${b2body}</div>` : ''}
      ${copy.closingLine ? `<div class="mobile-closing" style="font-size:17px;line-height:1.7;color:${mutedTextCol};font-style:italic;margin-bottom:24px;font-family:Georgia,serif;">${copy.closingLine}</div>` : ''}
    </div>
    ${copy.ctaText ? `<div style="padding:16px 0 36px;text-align:center;">${btnImgUrl
      ? `<a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;outline:none;border:none;"><img class="w2-btn-img" src="${btnImgUrl}" alt="${copy.ctaText}" width="375" style="width:375px;max-width:375px;display:block;margin:0 auto;border:0;outline:none;"/></a>`
      : `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td style="background:${accent};border-radius:999px;"><a class="mobile-cta" href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:15px 40px;font-family:Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:.04em;color:#ffffff!important;-webkit-text-fill-color:#ffffff;text-decoration:none!important;white-space:nowrap;">${copy.ctaText} &rarr;</a></td></tr></table>`
    }</div>` : ''}
  </div>` : ''}

  <div style="background-color:${pageBg};">${buildFooter(client, footerData, { defaultBg: pageBg, textColor: mutedTextCol, dividerColor: dividerCol, bodyTextAlign: 'justify' })}</div>
</td></tr></table>
</body></html>`
}

/* ══════════════════════════════════════════════════════════════════════════
   WEEK 6 v2 — duplicate of Week 2
   ══════════════════════════════════════════════════════════════════════════ */
function buildTemplateWeek6v2({ client, copy, images, footerData, isHeroGenerated = false,
  heroScale=1, heroX=0, heroY=0,
  textSize=38, textTop=32, textLeft=24,
  logoColor='original', logoTop=24, logoRight=200, logoSize=40,
  img1Scale=1, img1X=0, img1Y=0,
  img2Scale=1, img2X=0, img2Y=0,
  img3Scale=1, img3X=0, img3Y=0,
  btnImgUrl = null,
}) {
  const heroObj  = images?.[0]; const heroImg = heroObj?.url||''
  const img1Obj  = images?.[1]; const img1    = img1Obj?.url||''
  const img2Obj  = images?.[2]; const img2    = img2Obj?.url||''
  const img3Obj  = images?.[3]; const img3    = img3Obj?.url||''
  const img4     = images?.[4]?.url || ''
  const img5     = images?.[5]?.url || ''
  const body     = (copy.bodyText||'').replace(/\n/g,'<br>')
  const b2body   = (copy.bodyBlock2||'').replace(/\n/g,'<br>')
  const logoUrl  = client?.logoUrl||''
  const pageBg   = footerData?.bgColor || '#1e2a4a'
  const accent   = footerData?.buttonColor || '#d4006a'
  const secondary = footerData?.secondaryColor || accent
  const logoFilter = logoColor === 'white' ? 'brightness(0) invert(1)' : logoColor === 'black' ? 'brightness(0)' : 'none'

  const _rgb = pageBg.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  const _r = _rgb ? parseInt(_rgb[1],16) : 30
  const _g = _rgb ? parseInt(_rgb[2],16) : 42
  const _b = _rgb ? parseInt(_rgb[3],16) : 74
  const _lum = (0.299*_r + 0.587*_g + 0.114*_b)/255
  const lightBg      = _lum > 0.55
  const mutedTextCol = lightBg ? '#595959' : '#d4d4d4'
  const dividerCol   = lightBg ? '#e0e0e0' : '#444444'

  const logoOverlay = logoUrl
    ? `<img src="${logoUrl}" alt="${client?.name||''}" style="display:inline-block;height:${logoSize}px;width:auto;max-width:${logoSize * 6}px;filter:${logoFilter};"/>`
    : `<div style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:${mutedTextCol};margin-bottom:10px;">${client?.name||''}</div>`

  const hw = (copy.headlineText || '').trim().split(/\s+/).filter(Boolean)
  const hwBody = hw.length > 1 ? hw.slice(0, -1).join(' ') : hw[0] || ''
  const hwLast = hw.length > 1 ? hw[hw.length - 1] : ''

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,700;1,400&display=swap" rel="stylesheet"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{margin:0;padding:0;color:#1a1a1a;}
  table{border-collapse:collapse;}
  @media only screen and (max-width:600px){
    .w6v2-section  { padding-left:35px!important; padding-right:35px!important; }
    .w6v2-btn-img  { width:300px!important; max-width:300px!important; }
    .w6v2-b2       { padding-left:35px!important; padding-right:35px!important; }
    .w6v2-b2-inner { padding-left:0!important;   padding-right:0!important;   }
    .mobile-body    { font-size:17px!important; line-height:1.5!important; }
    .mobile-subhead { font-size:17px!important; line-height:1.4!important; }
    .mobile-b2title { font-size:22px!important; line-height:1.25!important; }
    .mobile-closing { font-size:17px!important; line-height:1.5!important; }
    .mobile-cta     { font-size:20px!important; padding:20px 80px!important; }
    .mobile-footer  { font-size:14px!important; line-height:1.4!important; }
  }
</style></head>
<body style="margin:0;padding:32px 0 48px;background-color:#ffffff;">

<table width="600" cellpadding="0" cellspacing="0" bgcolor="${pageBg}" style="width:600px;max-width:600px;margin:0 auto;background-color:${pageBg};border-collapse:collapse;border-radius:20px;overflow:hidden;">
<tr><td style="background-color:${pageBg};">

  <!-- LOGO HEADER: only in CSS preview; generated PNG already includes the logo -->
  ${!isHeroGenerated ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:${pageBg};"><tr>
    <td style="padding:${logoTop}px 0 ${logoTop}px 24px;vertical-align:middle;">${logoOverlay}</td>
    <td style="text-align:right;vertical-align:middle;padding-right:40px;">${copy.ctaText ? `<a href="${copy.ctaUrl||'#'}" style="font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:${lightBg ? '#1a1a1a' : '#ffffff'};text-decoration:underline;letter-spacing:.01em;">${copy.ctaText} ›</a>` : ''}</td>
  </tr></table>` : ''}

  <!-- HERO: transparent PNG or CSS preview -->
  ${isHeroGenerated
    ? `<div style="line-height:0;font-size:0;background-color:${pageBg};"><a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;"><img src="${heroImg}" alt="" width="600" style="width:100%;display:block;max-width:600px;border:0;"/></a></div>`
    : `<div style="line-height:0;font-size:0;background-color:${pageBg};">
    <div style="position:relative;width:600px;height:740px;overflow:hidden;">
      ${heroImg
        ? `<img src="${heroImg}" alt="" style="position:absolute;top:-30px;left:-30px;width:660px;height:800px;object-fit:cover;object-position:calc(50% + ${heroX}px) calc(50% + ${heroY}px);filter:blur(36px) saturate(1.4) brightness(0.82);transform:scale(${Math.max(1.12, heroScale)});display:block;"/>`
        : `<div style="position:absolute;inset:0;background:linear-gradient(160deg,#7ab5d8,#6ba87a);"></div>`}
      <div style="position:absolute;left:28px;top:22px;right:28px;">
        <div style="position:relative;width:544px;height:480px;overflow:hidden;border-radius:20px;box-shadow:0 6px 40px rgba(0,0,0,0.3);border:2px solid rgba(255,255,255,0.55);">
          ${heroImg ? `<img src="${heroImg}" alt="" style="position:absolute;top:${Math.min(0,Math.max(480*(1-heroScale),-(480*(heroScale-1)/2)+heroY))}px;left:${Math.min(0,Math.max(544*(1-heroScale),-(544*(heroScale-1)/2)+heroX))}px;width:${544*heroScale}px;height:${480*heroScale}px;object-fit:cover;display:block;"/>` : ''}
          <div style="position:absolute;top:0;left:0;right:0;height:72%;background:linear-gradient(to bottom,rgba(0,0,0,0.52) 0%,rgba(0,0,0,0.16) 65%,rgba(0,0,0,0) 100%);"></div>
          <div style="position:absolute;top:0;left:0;right:0;padding:${textTop}px ${textLeft}px 0;line-height:normal;font-size:initial;text-align:center;">
            <div style="font-family:'Lora',serif;font-size:${textSize}px;font-weight:700;color:#fff;line-height:1.08;text-shadow:0 2px 16px rgba(0,0,0,.3);">${hwBody}${hwLast ? ` <span style="font-family:'Lora',serif;font-style:italic;font-weight:400;font-size:${Math.round(textSize*1.17)}px;">${hwLast}</span>` : ''}</div>
          </div>
        </div>
      </div>
      ${copy.subhead ? `<div style="position:absolute;top:548px;left:44px;right:44px;text-align:center;line-height:normal;font-size:initial;"><p style="font-family:'Lora',serif;font-size:17px;font-style:italic;line-height:1.6;color:#fff;margin:0;text-shadow:0 1px 8px rgba(0,0,0,.25);">${copy.subhead}</p></div>` : ''}
      ${copy.ctaText ? `<div style="position:absolute;top:610px;left:0;right:0;text-align:center;line-height:normal;font-size:initial;"><table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;display:inline-table;"><tr><td style="background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.85);border-radius:100px;"><a href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:14px 44px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:.03em;white-space:nowrap;">${copy.ctaText}</a></td></tr></table><div style="margin-top:10px;line-height:0;font-size:0;text-align:center;"><div style="display:inline-block;width:1px;height:28px;background:rgba(255,255,255,0.65);vertical-align:top;"></div><div style="width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:6px solid rgba(255,255,255,0.65);margin:0 auto;"></div></div></div>` : ''}
    </div>
  </div>`}

  <!-- BODY BLOCK -->
  ${copy.bodyText ? `<div class="w6v2-section" style="padding:24px 48px 16px;background-color:${pageBg};"><div class="mobile-body" style="font-size:20px;line-height:1.6;color:${mutedTextCol};font-family:Arial,sans-serif;">${body}</div></div>` : ''}

  <!-- DIVIDER + BODY BLOCK 2 TITLE -->
  ${copy.bodyBlock2Title ? `<div style="padding:8px 48px 0;background-color:${pageBg};"><div style="height:1px;background:${dividerCol};font-size:0;line-height:0;"></div></div><div class="w6v2-section" style="padding:20px 48px 12px;background-color:${pageBg};"><div class="mobile-b2title" style="font-size:22px;font-weight:700;font-family:'Lora',Georgia,serif;letter-spacing:0;color:${secondary};text-align:center;">${copy.bodyBlock2Title}</div></div>` : ''}

  <!-- IMAGE GRID (img1+img2 side-by-side + img3 full-width) -->
  ${(img1 || img2 || img3)
    ? isHeroGenerated && img4
      ? `<div style="line-height:0;font-size:0;background-color:${pageBg};"><a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;"><img src="${img4}" alt="" width="600" style="width:100%;display:block;max-width:600px;border:0;"/></a></div>`
      : `<div style="padding:0 20px 24px;background-color:${pageBg};">
        ${(img1 || img2) ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr>
            <td style="width:50%;padding-right:6px;vertical-align:top;line-height:0;font-size:0;">${img1 ? `<div style="overflow:hidden;border-radius:12px;height:240px;"><img src="${img1}" alt="" style="width:100%;height:240px;object-fit:cover;display:block;object-position:${focalPos(img1Obj)};transform:translate(${img1X}px,${img1Y}px) scale(${img1Scale});transform-origin:center center;"/></div>` : `<div style="width:100%;height:240px;background:#e0e4ea;border-radius:12px;"></div>`}</td>
            <td style="width:50%;padding-left:6px;vertical-align:top;line-height:0;font-size:0;">${img2 ? `<div style="overflow:hidden;border-radius:12px;height:240px;"><img src="${img2}" alt="" style="width:100%;height:240px;object-fit:cover;display:block;object-position:${focalPos(img2Obj)};transform:translate(${img2X}px,${img2Y}px) scale(${img2Scale});transform-origin:center center;"/></div>` : `<div style="width:100%;height:240px;background:#e0e4ea;border-radius:12px;"></div>`}</td>
          </tr></table>` : ''}
        ${img3 ? `<div style="padding-top:12px;line-height:0;font-size:0;"><div style="overflow:hidden;border-radius:12px;height:300px;"><img src="${img3}" alt="" style="width:100%;height:300px;object-fit:cover;display:block;object-position:${focalPos(img3Obj)};transform:translate(${img3X}px,${img3Y}px) scale(${img3Scale});transform-origin:center center;"/></div></div>` : ''}
      </div>`
    : ''}

  <!-- BODY BLOCK 2 TEXT -->
  ${copy.bodyBlock2 ? `<div class="w6v2-section" style="padding:16px 48px 0;background-color:${pageBg};"><div class="mobile-body" style="font-size:20px;line-height:1.6;color:${mutedTextCol};font-family:Arial,sans-serif;">${b2body}</div></div>` : ''}

  <!-- CLOSING LINE -->
  ${copy.closingLine ? `<div class="w6v2-section" style="padding:16px 48px 0;background-color:${pageBg};"><div class="mobile-closing" style="font-size:17px;line-height:1.7;color:${mutedTextCol};font-style:italic;font-family:Georgia,serif;">${copy.closingLine}</div></div>` : ''}

  <!-- CTA -->
  ${copy.ctaText ? `<div style="padding:28px 0 36px;text-align:center;background-color:${pageBg};">${btnImgUrl
    ? `<a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;outline:none;border:none;"><img class="w6v2-btn-img" src="${btnImgUrl}" alt="${copy.ctaText}" width="375" style="width:375px;max-width:375px;display:block;margin:0 auto;border:0;outline:none;"/></a>`
    : `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td style="background:${accent};border-radius:999px;"><a class="mobile-cta" href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:15px 40px;font-family:Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:.04em;color:#ffffff!important;-webkit-text-fill-color:#ffffff;text-decoration:none!important;white-space:nowrap;">${copy.ctaText} &rarr;</a></td></tr></table>`
  }</div>` : ''}

  <div style="background-color:${pageBg};">${buildFooter(client, footerData, { defaultBg: pageBg, textColor: mutedTextCol, dividerColor: dividerCol, bodyTextAlign: 'justify' })}</div>
</td></tr></table>
</body></html>`
}

function buildTemplateWeek4v2b({ client, copy, images, footerData, isHeroGenerated = false,
  heroScale=1, heroX=0, heroY=0,
  textSize=38, textTop=32, textLeft=24,
  logoColor='original', logoTop=24, logoRight=200, logoSize=40,
  img1Scale=1, img1X=0, img1Y=0,
  img2Scale=1, img2X=0, img2Y=0,
  img3Scale=1, img3X=0, img3Y=0,
  btnImgUrl = null,
}) {
  const heroObj  = images?.[0]; const heroImg = heroObj?.url||''
  const img1Obj  = images?.[1]; const img1    = img1Obj?.url||''
  const img2Obj  = images?.[2]; const img2    = img2Obj?.url||''
  const img3Obj  = images?.[3]; const img3    = img3Obj?.url||''
  const img4     = images?.[4]?.url || ''
  const img5     = images?.[5]?.url || ''
  const body     = (copy.bodyText||'').replace(/\n/g,'<br>')
  const b2body   = (copy.bodyBlock2||'').replace(/\n/g,'<br>')
  const logoUrl  = client?.logoUrl||''
  const pageBg   = footerData?.bgColor || '#1e2a4a'
  const accent   = footerData?.buttonColor || '#d4006a'
  const secondary = footerData?.secondaryColor || accent
  const logoFilter = logoColor === 'white' ? 'brightness(0) invert(1)' : logoColor === 'black' ? 'brightness(0)' : 'none'

  const _rgb = pageBg.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  const _r = _rgb ? parseInt(_rgb[1],16) : 30
  const _g = _rgb ? parseInt(_rgb[2],16) : 42
  const _b = _rgb ? parseInt(_rgb[3],16) : 74
  const _lum = (0.299*_r + 0.587*_g + 0.114*_b)/255
  const lightBg      = _lum > 0.55
  const mutedTextCol = lightBg ? '#595959' : '#d4d4d4'
  const dividerCol   = lightBg ? '#e0e0e0' : '#444444'

  const logoOverlay = logoUrl
    ? `<img src="${logoUrl}" alt="${client?.name||''}" style="display:inline-block;height:${logoSize}px;width:auto;max-width:${logoSize * 6}px;filter:${logoFilter};"/>`
    : `<div style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:${mutedTextCol};margin-bottom:10px;">${client?.name||''}</div>`

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,700;1,400&display=swap" rel="stylesheet"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{margin:0;padding:0;color:#1a1a1a;}
  table{border-collapse:collapse;}
  @media only screen and (max-width:600px){
    .w6v2-section  { padding-left:35px!important; padding-right:35px!important; }
    .w6v2-btn-img  { width:300px!important; max-width:300px!important; }
    .mobile-body    { font-size:17px!important; line-height:1.5!important; }
    .mobile-subhead { font-size:17px!important; line-height:1.4!important; }
    .mobile-b2title { font-size:22px!important; line-height:1.25!important; }
    .mobile-closing { font-size:17px!important; line-height:1.5!important; }
    .mobile-cta     { font-size:20px!important; padding:20px 80px!important; }
    .mobile-footer  { font-size:14px!important; line-height:1.4!important; }
  }
</style></head>
<body style="margin:0;padding:32px 0 48px;background-color:#ffffff;">

<table width="600" cellpadding="0" cellspacing="0" bgcolor="${pageBg}" style="width:600px;max-width:600px;margin:0 auto;background-color:${pageBg};border-collapse:collapse;border-radius:20px;overflow:hidden;">
<tr><td style="background-color:${pageBg};">

  <!-- HERO: transparent PNG or CSS inset-card preview -->
  ${isHeroGenerated
    ? `<div style="line-height:0;font-size:0;background-color:${pageBg};"><a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;outline:none;"><img src="${heroImg}" alt="" width="600" style="width:100%;display:block;max-width:600px;border:0;"/></a></div>`
    : `<div style="padding:20px 20px 0;line-height:0;font-size:0;background-color:${pageBg};">
    <div style="position:relative;width:560px;height:720px;overflow:hidden;border-radius:16px;background:#1a1a1a;">
      ${heroImg ? `<img src="${heroImg}" style="position:absolute;top:${Math.min(0,Math.max(720*(1-heroScale),-(720*(heroScale-1)/2)+heroY))}px;left:${Math.min(0,Math.max(560*(1-heroScale),-(560*(heroScale-1)/2)+heroX))}px;width:${560*heroScale}px;height:${720*heroScale}px;object-fit:cover;display:block;"/>` : `<div style="width:560px;height:720px;background:#2a2a2a;"></div>`}
      <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0.78) 0%,rgba(0,0,0,0.38) 45%,rgba(0,0,0,0.05) 75%,rgba(0,0,0,0) 100%);line-height:normal;font-size:initial;">
        <div style="text-align:center;padding-top:${logoTop}px;">${logoOverlay}</div>
        <div style="text-align:center;padding:${textTop}px ${textLeft}px 0;">
          <div style="font-family:'Lora',Georgia,serif;font-size:${textSize}px;font-weight:700;line-height:1.12;color:#fff;">${copy.headlineText||''}</div>
        </div>
      </div>
    </div>
  </div>`}

  <!-- SUBHEAD + CTA (below hero) -->
  ${(copy.subhead || copy.ctaText) ? `<div style="padding:40px 48px 32px;text-align:center;background-color:${pageBg};">
    ${copy.subhead ? `<div class="mobile-subhead" style="font-family:Georgia,serif;font-size:19px;font-style:italic;line-height:1.7;color:${mutedTextCol};margin-bottom:28px;">${copy.subhead}</div>` : ''}
    ${copy.ctaText ? btnImgUrl
      ? `<a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;outline:none;border:none;"><img class="w6v2-btn-img" src="${btnImgUrl}" alt="${copy.ctaText}" width="375" style="width:375px;max-width:375px;display:block;margin:0 auto;border:0;outline:none;"/></a>`
      : `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td style="background:${accent};border-radius:999px;"><a class="mobile-cta" href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:18px 52px;font-family:Arial,sans-serif;font-size:18px;font-weight:700;letter-spacing:.02em;color:#ffffff!important;-webkit-text-fill-color:#ffffff;text-decoration:none!important;white-space:nowrap;">${copy.ctaText} &rarr;</a></td></tr></table>`
    : ''}
  </div>` : ''}

  <!-- DIVIDER -->
  <div style="padding:0 48px;background-color:${pageBg};"><div style="height:1px;background:${dividerCol};font-size:0;line-height:0;"></div></div>

  <!-- STACKED PHOTO (Week 4 single-card style: ghost + main) -->
  ${img1
    ? isHeroGenerated && img5
      ? `<div style="line-height:0;font-size:0;background-color:${pageBg};"><a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;outline:none;"><img src="${img5}" alt="" width="600" style="width:100%;display:block;max-width:600px;border:0;"/></a></div>`
      : `<div style="padding:0 72px 0;background-color:${pageBg};">
          <a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;outline:none;"><div style="position:relative;height:508px;">
            <div style="position:absolute;top:24px;left:24px;right:24px;bottom:24px;border-radius:16px;transform:rotate(5deg);transform-origin:center;overflow:hidden;background:#e0dbd3;">
              <img src="${img1}" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:${focalPos(img1Obj)};opacity:0.45;display:block;"/>
            </div>
            <div style="position:absolute;top:24px;left:24px;right:24px;bottom:24px;border-radius:16px;overflow:hidden;z-index:1;">
              <img src="${img1}" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:${focalPos(img1Obj)};display:block;transform:translate(${img1X}px,${img1Y}px) scale(${img1Scale});transform-origin:center center;"/>
            </div>
          </div></a>
        </div>`
    : ''}

  <!-- BODY BLOCK -->
  ${copy.bodyText ? `<div class="w6v2-section" style="padding:24px 48px 16px;background-color:${pageBg};"><div class="mobile-body" style="font-size:20px;line-height:1.6;color:${mutedTextCol};font-family:Arial,sans-serif;">${body}</div></div>` : ''}

  <!-- DIVIDER + BODY BLOCK 2 TITLE -->
  ${copy.bodyBlock2Title ? `<div style="padding:8px 48px 0;background-color:${pageBg};"><div style="height:1px;background:${dividerCol};font-size:0;line-height:0;"></div></div><div class="w6v2-section" style="padding:20px 48px 12px;background-color:${pageBg};"><div class="mobile-b2title" style="font-size:22px;font-weight:700;font-family:'Lora',Georgia,serif;letter-spacing:0;color:${secondary};text-align:center;">${copy.bodyBlock2Title}</div></div>` : ''}

  <!-- IMG2 STACKED CARD (ghost+main, Week 4 style) -->
  ${img2
    ? isHeroGenerated && img4
      ? `<div style="line-height:0;font-size:0;background-color:${pageBg};"><a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;outline:none;"><img src="${img4}" alt="" width="600" style="width:100%;display:block;max-width:600px;border:0;"/></a></div>`
      : `<div style="padding:20px 72px 0;background-color:${pageBg};">
          <a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;outline:none;"><div style="position:relative;height:508px;">
            <div style="position:absolute;top:24px;left:24px;right:24px;bottom:24px;border-radius:16px;transform:rotate(5deg);transform-origin:center;overflow:hidden;background:#e0dbd3;">
              <img src="${img2}" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:${focalPos(img2Obj)};opacity:0.45;display:block;"/>
            </div>
            <div style="position:absolute;top:24px;left:24px;right:24px;bottom:24px;border-radius:16px;overflow:hidden;z-index:1;">
              <img src="${img2}" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:${focalPos(img2Obj)};display:block;transform:translate(${img2X}px,${img2Y}px) scale(${img2Scale});transform-origin:center center;"/>
            </div>
          </div></a>
        </div>`
    : ''}

  <!-- BODY BLOCK 2 TEXT -->
  ${copy.bodyBlock2 ? `<div class="w6v2-section" style="padding:16px 48px 0;background-color:${pageBg};"><div class="mobile-body" style="font-size:20px;line-height:1.6;color:${mutedTextCol};font-family:Arial,sans-serif;">${b2body}</div></div>` : ''}

  <!-- CLOSING LINE (above bottom CTA) -->
  ${copy.closingLine ? `<div class="w6v2-section" style="padding:28px 48px 0;text-align:center;background-color:${pageBg};"><div class="mobile-closing" style="font-size:17px;line-height:1.7;color:${mutedTextCol};font-style:italic;font-family:Georgia,serif;">${copy.closingLine}</div></div>` : ''}

  <!-- BOTTOM CTA (button PNG or inline) -->
  ${copy.ctaText ? `<div style="padding:28px 0 36px;text-align:center;background-color:${pageBg};">${btnImgUrl
    ? `<a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;outline:none;border:none;"><img class="w6v2-btn-img" src="${btnImgUrl}" alt="${copy.ctaText}" width="375" style="width:375px;max-width:375px;display:block;margin:0 auto;border:0;outline:none;"/></a>`
    : `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td style="background:${accent};border-radius:999px;"><a class="mobile-cta" href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:15px 40px;font-family:Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:.04em;color:#ffffff!important;-webkit-text-fill-color:#ffffff;text-decoration:none!important;white-space:nowrap;">${copy.ctaText} &rarr;</a></td></tr></table>`
  }</div>` : ''}

  <div style="background-color:${pageBg};">${buildFooter(client, footerData, { defaultBg: pageBg, textColor: mutedTextCol, dividerColor: dividerCol, bodyTextAlign: 'justify' })}</div>
</td></tr></table>
</body></html>`
}


/* ══════════════════════════════════════════════════════════════════════════
   WEEK 3 v2 — duplicate of Week 3
   ══════════════════════════════════════════════════════════════════════════ */
function buildTemplateWeek3v2({ client, copy, images, footerData, isHeroGenerated = false,
  heroScale=1, heroX=0, heroY=0,
  textSize=40, textTop=14, textLeft=52,
  logoColor='white', logoTop=40, logoRight=36, logoSize=44,
  img1Scale=1, img1X=0, img1Y=0,
  img2Scale=1, img2X=0, img2Y=0,
  img3Scale=1, img3X=0, img3Y=0,
  btnImgUrl = null,
}) {
  const heroObj  = images?.[0]; const heroImg = heroObj?.url||''
  const img1Obj  = images?.[1]; const img1    = img1Obj?.url||''
  const img2Obj  = images?.[2]; const img2    = img2Obj?.url||''
  const img3Obj  = images?.[3]; const img3    = img3Obj?.url||''
  const img4Obj  = images?.[4]; const img4    = img4Obj?.url||''
  const img5Obj  = images?.[5]; const img5    = img5Obj?.url||''
  const body     = (copy.bodyText||'').replace(/\n/g,'<br>')
  const b2body   = (copy.bodyBlock2||'').replace(/\n/g,'<br>')
  const logoUrl  = client?.logoUrl||''
  const pageBg     = footerData?.bgColor || '#f5f4f2'
  const cardBg     = '#fffffe'
  const accentClr  = footerData?.buttonColor || '#1a1a1a'
  const secondaryClr = footerData?.secondaryColor || accentClr
  const logoFilter = logoColor === 'white' ? 'brightness(0) invert(1)' : logoColor === 'black' ? 'brightness(0)' : 'none'

  const _rgb = pageBg.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  const _r = _rgb ? parseInt(_rgb[1],16) : 245
  const _g = _rgb ? parseInt(_rgb[2],16) : 244
  const _b = _rgb ? parseInt(_rgb[3],16) : 242
  const _lum = (0.299*_r + 0.587*_g + 0.114*_b)/255
  const lightBg      = _lum > 0.55
  const mutedTextCol = lightBg ? '#595959'  : '#d4d4d4'
  const dividerCol   = lightBg ? '#e0e0e0'  : '#444444'
  const pageBgRgba0  = `rgba(${_r},${_g},${_b},0)`

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${client?.name||''}" style="height:${logoSize}px;width:auto;max-width:${logoSize * 5}px;display:inline-block;filter:${logoFilter};"/>`
    : `<span style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#fff;">${client?.name||''}</span>`

  const card2Src = img2 || img1
  const card2Obj = img2 ? img2Obj : img1Obj

  const stackedSection = isHeroGenerated && img4
    ? `<tr><td style="padding:32px 0 8pt;text-align:center;background-color:${pageBg};line-height:0;font-size:0;">
        <a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;"><img src="${img4}" alt="" width="600" style="width:600px;max-width:100%;display:inline-block;border:0;"/></a>
      </td></tr>`
    : img1
      ? `<tr><td style="padding:32px 0 8px;text-align:center;background-color:${pageBg};line-height:0;font-size:0;">
          <div style="position:relative;width:600px;height:420px;background-color:${pageBg};">
            <div style="position:absolute;left:28px;top:24px;width:272px;height:372px;border-radius:20px;transform:rotate(-3deg);transform-origin:center center;box-shadow:4px 0 20px rgba(0,0,0,0.18);overflow:hidden;z-index:1;">
              <img src="${img1}" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:${focalPos(img1Obj)};transform:translate(${img1X}px,${img1Y}px) scale(${img1Scale});transform-origin:center center;"/>
            </div>
            <div style="position:absolute;left:296px;top:24px;width:272px;height:372px;border-radius:20px;transform:rotate(3deg);transform-origin:center center;box-shadow:-4px 0 20px rgba(0,0,0,0.18);overflow:hidden;z-index:2;">
              <img src="${card2Src}" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:${focalPos(card2Obj)};transform:translate(${img2X}px,${img2Y}px) scale(${img2Scale});transform-origin:center center;"/>
            </div>
          </div>
        </td></tr>`
      : ''

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&display=swap"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{margin:0;padding:0;color:#1a1a1a;}
  table{border-collapse:collapse;}
  @media only screen and (max-width:600px){
    .mobile-body    { font-size:17px!important; line-height:1.5!important; }
    .mobile-subhead { font-size:17px!important; line-height:1.4!important; }
    .mobile-b2title { font-size:22px!important; line-height:1.25!important; }
    .mobile-closing { font-size:17px!important; line-height:1.5!important; }
    .mobile-cta     { font-size:20px!important; padding:20px 80px!important; }
    .mobile-footer  { font-size:14px!important; line-height:1.4!important; }
    .w3-btn-img    { width:300px!important; max-width:300px!important; }
    .w3-cta-wrap   { padding-left:20px!important; padding-right:20px!important; }
  }
</style></head><body class="body" style="margin:0;padding:32px 0 48px;">

<table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${pageBg}" style="width:600px;max-width:600px;margin:0 auto;background-color:${pageBg};border-collapse:collapse;border-radius:20px;overflow:hidden;">

    <!-- ── HERO ── -->
    ${isHeroGenerated
      ? `<tr><td style="line-height:0;font-size:0;padding:0;border-radius:20px 20px 0 0;overflow:hidden;"><a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;"><img src="${heroImg}" alt="" width="600" style="width:100%;display:block;max-width:600px;border-radius:20px 20px 0 0;border:0;"/></a></td></tr>`
      : `<tr><td style="position:relative;line-height:0;font-size:0;padding:0;height:600px;overflow:hidden;background:#1a1a1a;border-radius:20px 20px 0 0;">
          ${heroImg ? `<img src="${heroImg}" alt="" style="position:absolute;top:${Math.min(0,Math.max(600*(1-heroScale),-(600*(heroScale-1)/2)+heroY))}px;left:${Math.min(0,Math.max(600*(1-heroScale),-(600*(heroScale-1)/2)+heroX))}px;width:${600*heroScale}px;height:${600*heroScale}px;object-fit:cover;display:block;border-radius:20px 20px 0 0;"/>` : `<div style="width:100%;height:600px;background:#2a2a2a;border-radius:20px 20px 0 0;"></div>`}
          <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0.7) 0%,rgba(0,0,0,0.25) 40%,rgba(0,0,0,0) 62%);border-radius:20px 20px 0 0;">
            <div style="text-align:center;padding:${logoTop}px 48px 0;">${logoHtml}</div>
            <div style="text-align:center;padding:${textTop}px ${textLeft}px 0;">
              <div style="font-family:'Playfair Display',Georgia,serif;font-size:${textSize}px;font-weight:600;line-height:1.12;color:#fff;text-shadow:0 2px 20px rgba(0,0,0,0.4);">${copy.headlineText||''}</div>
            </div>
          </div>
          <div style="position:absolute;bottom:0;left:0;right:0;height:200px;background:linear-gradient(to bottom,${pageBgRgba0} 0%,rgba(${_r},${_g},${_b},0.5) 60%,${pageBg} 100%);pointer-events:none;"></div>
        </td></tr>`}

    <!-- ── SUBHEAD + CTA ── -->
    <tr><td class="w3-cta-wrap" style="padding:${isHeroGenerated ? '40px' : '32px'} 52px 36px;text-align:center;background-color:${pageBg};">
      ${copy.subhead ? `<div class="mobile-subhead" style="font-family:Georgia,serif;font-size:18px;font-style:italic;color:${mutedTextCol};line-height:1.6;margin-bottom:24px;max-width:460px;margin-left:auto;margin-right:auto;">${copy.subhead}</div>` : ''}
      ${btnImgUrl
        ? `<a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;outline:none;border:none;"><img class="w3-btn-img" src="${btnImgUrl}" alt="${copy.ctaText}" width="375" style="width:375px;max-width:375px;display:block;margin:0 auto;border:0;outline:none;"/></a>`
        : copy.ctaText ? `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td style="background-color:${accentClr};border-radius:100px;"><a class="mobile-cta" href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:16px 40px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#fff!important;-webkit-text-fill-color:#ffffff;text-decoration:none!important;letter-spacing:.04em;white-space:nowrap;">${copy.ctaText} &rarr;</a></td></tr></table>` : ''}
    </td></tr>

    <!-- ── DIVIDER ── -->
    <tr><td style="padding:0 48px;background-color:${pageBg};">
      <div style="height:1px;width:100%;background:${dividerCol};font-size:0;line-height:0;"></div>
    </td></tr>

    <!-- ── IMAGE ── -->
    ${stackedSection}

    <!-- ── BODY TEXT ── -->
    <tr><td style="padding:36px 52px 24px;background-color:${pageBg};text-align:left;">
      ${copy.bodyText ? `<div class="mobile-body" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.9;color:${mutedTextCol};">${body}</div>` : ''}
    </td></tr>

    <!-- ── DIVIDER 2 ── -->
    <tr><td style="padding:0 48px;background-color:${pageBg};">
      <div style="height:1px;width:100%;background:${dividerCol};font-size:0;line-height:0;"></div>
    </td></tr>

    <!-- ── BODY BLOCK 2 TITLE + IMAGE + TEXT ── -->
    ${copy.bodyBlock2Title ? `
    <tr><td style="padding:36px 52px 0;background-color:${pageBg};text-align:center;">
      <div style="font-family:Arial,sans-serif;font-size:16px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${secondaryClr};margin-bottom:0;">${copy.bodyBlock2Title}</div>
    </td></tr>` : ''}

    ${isHeroGenerated && img5
      ? `<tr><td style="padding:0;line-height:0;font-size:0;text-align:center;background-color:${pageBg};"><a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;"><img src="${img5}" alt="" width="600" style="display:block;width:600px;max-width:100%;border:0;"/></a></td></tr>`
      : (img3 || img1) ? `
    <tr><td style="padding:20px 40px 0;background-color:${pageBg};line-height:0;font-size:0;text-align:center;">
      <div style="display:inline-block;width:100%;max-width:520px;height:320px;border-radius:14px;overflow:hidden;">
        <img src="${img3 || img1}" alt="" width="520" style="width:100%;height:320px;object-fit:cover;display:block;object-position:${focalPos(img3 ? img3Obj : img1Obj)};transform:translate(${img3X}px,${img3Y}px) scale(${img3Scale});transform-origin:center center;"/>
      </div>
    </td></tr>` : ''}

    ${(copy.bodyBlock2 || copy.closingLine) ? `
    <tr><td style="padding:28px 52px 0;background-color:${pageBg};text-align:left;">
      ${copy.bodyBlock2 ? `<div class="mobile-body" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.9;color:${mutedTextCol};margin-bottom:18px;">${b2body}</div>` : ''}
      ${copy.closingLine ? `<div class="mobile-closing" style="font-family:Georgia,serif;font-size:17px;font-style:italic;color:${mutedTextCol};margin-bottom:28px;">${copy.closingLine}</div>` : ''}
    </td></tr>` : ''}

    <!-- ── REPEAT CTA ── -->
    ${copy.ctaText ? `
    <tr><td class="w3-cta-wrap" style="padding:8px 52px 44px;text-align:center;background-color:${pageBg};">
      ${btnImgUrl
        ? `<a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;outline:none;border:none;"><img class="w3-btn-img" src="${btnImgUrl}" alt="${copy.ctaText}" width="375" style="width:375px;max-width:375px;display:block;margin:0 auto;border:0;outline:none;"/></a>`
        : `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td style="background-color:${accentClr};border-radius:100px;"><a href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:16px 40px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#fff!important;-webkit-text-fill-color:#ffffff;text-decoration:none!important;letter-spacing:.04em;white-space:nowrap;">${copy.ctaText} &rarr;</a></td></tr></table>`}
    </td></tr>` : ''}

    <tr><td style="padding:0;line-height:0;font-size:0;background-color:${pageBg};">${buildFooter(client, footerData, { defaultBg: pageBg, textColor: mutedTextCol, dividerColor: dividerCol, bodyTextAlign: 'justify' })}</td></tr>
  </table>

</body></html>`
}

/* ─────────────────────────── Week 5 v2 (sizing corrections) ────────────── */
function buildTemplateWeek5v2({ client, copy, images, footerData, isHeroGenerated = false,
  heroScale=1, heroX=0, heroY=0,
  textSize=52, textTop=32, textLeft=36,
  logoColor='white', logoTop=28, logoRight=36, logoSize=40,
  img1Scale=1, img1X=0, img1Y=0,
  img2Scale=1, img2X=0, img2Y=0,
  img3Scale=1, img3X=0, img3Y=0,
  img4Scale=1, img4X=0, img4Y=0,
  btnImgUrl = null,
}) {
  const heroObj = images?.[0]; const heroImg = heroObj?.url || ''
  const img1Obj = images?.[1]; const img1    = img1Obj?.url || ''
  const img2Obj = images?.[2]; const img2    = img2Obj?.url || ''
  const img3Obj = images?.[3]; const img3    = img3Obj?.url || ''
  const img4Obj = images?.[4]; const img4    = img4Obj?.url || ''
  const body    = (copy.bodyText  || '').replace(/\n/g, '<br>')
  const b2body  = (copy.bodyBlock2|| '').replace(/\n/g, '<br>')
  const logoUrl = client?.logoUrl || ''
  const name    = client?.name    || ''
  const accent    = footerData?.buttonColor || '#1a1a1a'
  const secondary = footerData?.secondaryColor || accent
  const pageBg    = footerData?.bgColor || '#f5f4f2'
  const logoFilter = logoColor === 'white' ? 'brightness(0) invert(1)' : logoColor === 'black' ? 'brightness(0)' : 'none'

  const _rgb = pageBg.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  const _r = _rgb ? parseInt(_rgb[1],16) : 245
  const _g = _rgb ? parseInt(_rgb[2],16) : 244
  const _b = _rgb ? parseInt(_rgb[3],16) : 242
  const _lum = (0.299*_r + 0.587*_g + 0.114*_b)/255
  const lightBg      = _lum > 0.55
  const mutedTextCol = lightBg ? '#595959' : '#d4d4d4'
  const dividerCol   = lightBg ? '#e0e0e0' : '#444444'

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${name}" style="height:${logoSize}px;width:auto;max-width:160px;display:inline-block;filter:${logoFilter};"/>`
    : `<span style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#fff;">${name}</span>`

  const hw5 = (copy.headlineText || '').trim().split(/\s+/).filter(Boolean)
  const hw5First = hw5.length >= 2 ? hw5[0] : ''
  const hw5Last  = hw5.length >= 3 ? hw5[hw5.length - 1] : ''
  const hw5Main  = hw5.length >= 3 ? hw5.slice(1, -1).join(' ') : hw5.length === 2 ? hw5[1] : hw5[0] || ''

  const gridImgs = [
    { obj: img1Obj, url: img1 },
    { obj: img2Obj, url: img2 },
    { obj: img3Obj, url: img3 },
    { obj: img4Obj, url: img4 || img1 },
  ]
  const hasGrid = img1 || img2

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,700;1,400&display=swap" rel="stylesheet"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{margin:0;padding:0;color:#1a1a1a;}
  table{border-collapse:collapse;}
  @media only screen and (max-width:600px){
    .mobile-body    { font-size:24px!important; line-height:1.5!important; }
    .mobile-subhead { font-size:24px!important; line-height:1.4!important; }
    .mobile-b2title { font-size:24px!important; line-height:1.25!important; }
    .mobile-closing { font-size:24px!important; line-height:1.5!important; }
    .mobile-cta     { font-size:24px!important; padding:20px 80px!important; }
    .mobile-footer  { font-size:17px!important; line-height:1.4!important; }
    .w5-btn-img    { width:400px!important; max-width:400px!important; }
    .w5-grid-col   { width:49%!important; }
    .w5-grid-gap   { width:2%!important; }
    .w5-outer      { width:100%!important; max-width:600px!important; }
    .w5-footer-logo { height:47px!important; }
    .w5-footer-icon { width:43px!important; height:43px!important; }
  }
</style></head>
<body class="body" style="margin:0;padding:32px 0 48px;">

<table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${pageBg}" class="w5-outer" style="width:100%;max-width:600px;margin:0 auto;background-color:${pageBg};border-collapse:collapse;border-radius:20px;overflow:hidden;">

    <!-- ── HERO ── -->
    ${isHeroGenerated
      ? `<tr><td style="padding:20px 0 0;background-color:${pageBg};line-height:0;font-size:0;"><a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;"><img src="${heroImg}" alt="" width="600" style="display:block;width:600px;border:0;"/></a></td></tr>`
      : `<tr><td style="padding:20px 20px 0;background-color:${pageBg};line-height:0;font-size:0;">
      <div style="position:relative;width:560px;height:680px;overflow:hidden;border-radius:16px;background:#1a1a1a;">
        ${heroImg ? `<img src="${heroImg}" alt="" style="position:absolute;top:${Math.min(0,Math.max(680*(1-heroScale),-(680*(heroScale-1)/2)+heroY))}px;left:${Math.min(0,Math.max(560*(1-heroScale),-(560*(heroScale-1)/2)+heroX))}px;width:${560*heroScale}px;height:${680*heroScale}px;object-fit:cover;display:block;"/>` : `<div style="width:560px;height:680px;background:#2a2a2a;"></div>`}
        <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0.55) 0%,rgba(0,0,0,0.25) 40%,rgba(0,0,0,0.45) 100%);">
          <div style="text-align:center;padding-top:${logoTop}px;">${logoHtml}</div>
          <div style="position:absolute;left:${textLeft}px;right:${textLeft}px;top:${textTop}%;">
            ${hw5First ? `<div style="font-family:'Lora',serif;font-size:${Math.round(textSize*0.8)}px;font-style:italic;font-weight:400;color:#fff;line-height:1;text-shadow:0 2px 12px rgba(0,0,0,.3);margin-bottom:2px;">${hw5First}</div>` : ''}
            <div style="font-family:'Lora',serif;font-size:${textSize}px;font-weight:700;text-transform:uppercase;color:#fff;line-height:1.0;text-shadow:0 2px 20px rgba(0,0,0,.25);">${hw5Main}${hw5Last ? ` <span style="font-family:'Lora',serif;font-style:italic;font-weight:400;text-transform:none;font-size:${Math.round(textSize*0.9)}px;">${hw5Last}</span>` : ''}</div>
          </div>
        </div>
      </div>
    </td></tr>`}

    <!-- ── Subhead ── -->
    ${copy.subhead ? `
    <tr><td style="padding:32px 52px 8px;text-align:center;background-color:${pageBg};">
      <p class="mobile-subhead" style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-style:italic;line-height:1.5;color:${mutedTextCol};margin:0;">${copy.subhead}</p>
    </td></tr>` : ''}

    <!-- ── CTA ── -->
    ${copy.ctaText ? `
    <tr><td style="padding:20px 52px 8px;text-align:center;background-color:${pageBg};">
      ${btnImgUrl
        ? `<a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;outline:none;border:none;"><img class="w5-btn-img" src="${btnImgUrl}" alt="${copy.ctaText}" width="375" style="width:375px;max-width:375px;display:block;margin:0 auto;border:0;outline:none;"/></a>`
        : `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td style="background:${accent};border-radius:999px;"><a class="mobile-cta" href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:15px 40px;font-family:Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:.04em;color:#ffffff!important;-webkit-text-fill-color:#ffffff;text-decoration:none!important;white-space:nowrap;">${copy.ctaText} &rarr;</a></td></tr></table>`}
    </td></tr>` : ''}

    <!-- ── Body text ── -->
    ${copy.bodyText ? `
    <tr><td style="padding:32px 52px 24px;text-align:left;background-color:${pageBg};">
      <p class="mobile-body" style="font-family:Arial,sans-serif;font-size:17px;line-height:1.5;color:${mutedTextCol};margin:0;">${body}</p>
    </td></tr>` : ''}

    <!-- ── Divider ── -->
    <tr><td style="padding:0 48px;background-color:${pageBg};">
      <div style="height:1px;background:${dividerCol};font-size:0;line-height:0;"></div>
    </td></tr>

    <!-- ── Body block 2 title ── -->
    ${copy.bodyBlock2Title ? `
    <tr><td style="padding:32px 52px 0;text-align:center;background-color:${pageBg};">
      <p class="mobile-b2title" style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:${secondary};line-height:1.25;margin:0;">${copy.bodyBlock2Title}</p>
    </td></tr>` : ''}

    <!-- ── Grid ── -->
    ${hasGrid
      ? isHeroGenerated && img4
        ? `<tr><td style="padding:28px 0 0;background-color:${pageBg};line-height:0;font-size:0;text-align:center;"><a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;"><img src="${img4}" alt="" width="600" style="display:block;width:600px;max-width:100%;border:0;"/></a></td></tr>`
        : `<tr><td style="padding:28px 0 0;background-color:${pageBg};">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
        <tr>
          <td class="w5-grid-col" width="49%" style="width:49%;vertical-align:top;line-height:0;font-size:0;">
            ${gridImgs[0].url ? `<div style="overflow:hidden;height:262px;"><img src="${gridImgs[0].url}" alt="" width="100%" style="width:100%;height:262px;object-fit:cover;display:block;object-position:${focalPos(gridImgs[0].obj)};transform:translate(${img1X}px,${img1Y}px) scale(${img1Scale});transform-origin:center center;"/></div>` : `<div style="height:262px;background:#e8e4de;"></div>`}
          </td>
          <td class="w5-grid-gap" width="2%" style="width:2%;line-height:0;font-size:0;"></td>
          <td class="w5-grid-col" width="49%" style="width:49%;vertical-align:top;line-height:0;font-size:0;">
            ${gridImgs[1].url ? `<div style="overflow:hidden;height:262px;"><img src="${gridImgs[1].url}" alt="" width="100%" style="width:100%;height:262px;object-fit:cover;display:block;object-position:${focalPos(gridImgs[1].obj)};transform:translate(${img2X}px,${img2Y}px) scale(${img2Scale});transform-origin:center center;"/></div>` : `<div style="height:262px;background:#e8e4de;"></div>`}
          </td>
        </tr>
        <tr><td colspan="3" height="6" style="height:6px;line-height:0;font-size:0;"></td></tr>
        <tr>
          <td class="w5-grid-col" width="49%" style="width:49%;vertical-align:top;line-height:0;font-size:0;">
            ${gridImgs[3].url ? `<div style="overflow:hidden;height:262px;"><img src="${gridImgs[3].url}" alt="" width="100%" style="width:100%;height:262px;object-fit:cover;display:block;object-position:${focalPos(gridImgs[3].obj)};transform:translate(${img4X}px,${img4Y}px) scale(${img4Scale});transform-origin:center center;"/></div>` : `<div style="height:262px;background:#e8e4de;"></div>`}
          </td>
          <td class="w5-grid-gap" width="2%" style="width:2%;line-height:0;font-size:0;"></td>
          <td class="w5-grid-col" width="49%" style="width:49%;vertical-align:top;line-height:0;font-size:0;">
            ${gridImgs[2].url ? `<div style="overflow:hidden;height:262px;"><img src="${gridImgs[2].url}" alt="" width="100%" style="width:100%;height:262px;object-fit:cover;display:block;object-position:${focalPos(gridImgs[2].obj)};transform:translate(${img3X}px,${img3Y}px) scale(${img3Scale});transform-origin:center center;"/></div>` : `<div style="height:262px;background:#e8e4de;"></div>`}
          </td>
        </tr>
      </table>
    </td></tr>`
      : ''}

    <!-- ── Body block 2 + closing ── -->
    ${copy.bodyBlock2 ? `
    <tr><td style="padding:${copy.bodyBlock2Title ? '28px' : '40px'} 52px 0;text-align:left;background-color:${pageBg};">
      <p class="mobile-body" style="font-family:Arial,sans-serif;font-size:17px;line-height:1.5;color:${mutedTextCol};margin:0;">${b2body}</p>
    </td></tr>` : ''}

    ${copy.closingLine ? `
    <tr><td style="padding:20px 52px 0;text-align:left;background-color:${pageBg};">
      <p class="mobile-closing" style="font-family:Georgia,'Times New Roman',serif;font-size:17px;font-style:italic;color:${mutedTextCol};line-height:1.5;margin:0;">${copy.closingLine}</p>
    </td></tr>` : ''}

    <!-- ── Repeat CTA ── -->
    ${copy.ctaText ? `
    <tr><td style="padding:28px 52px 44px;text-align:center;background-color:${pageBg};">
      ${btnImgUrl
        ? `<a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;outline:none;border:none;"><img class="w5-btn-img" src="${btnImgUrl}" alt="${copy.ctaText}" width="375" style="width:375px;max-width:375px;display:block;margin:0 auto;border:0;outline:none;"/></a>`
        : `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td style="background:${accent};border-radius:999px;"><a class="mobile-cta" href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:15px 40px;font-family:Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:.04em;color:#ffffff!important;-webkit-text-fill-color:#ffffff;text-decoration:none!important;white-space:nowrap;">${copy.ctaText} &rarr;</a></td></tr></table>`}
    </td></tr>` : ''}

    <tr><td style="padding:0;line-height:0;font-size:0;background-color:${pageBg};">${buildFooter(client, footerData, { defaultBg: pageBg, textColor: mutedTextCol, dividerColor: dividerCol, bodyTextAlign: 'justify' })}</td></tr>
  </table>

</body></html>`
}

/* ══════════════════════════════════════════════════════════════════════════
   TESTING TEMPLATE — sandbox for new design experiments
   ══════════════════════════════════════════════════════════════════════════ */
function buildTemplateTest({ client, copy, images, footerData, isHeroGenerated = false,
  heroScale=1, heroX=0, heroY=0,
  textSize=42, textTop=32, textLeft=24,
  logoColor='original', logoTop=28, logoRight=200, logoSize=40,
}) {
  const heroObj   = images?.[0]; const heroImg = heroObj?.url || ''
  const heroFp    = heroObj?.focalX != null ? `${heroObj.focalX}% ${heroObj.focalY}%` : '50% 50%'
  const img1Obj   = images?.[1]; const img1 = img1Obj?.url || ''
  const img1Fp    = img1Obj?.focalX != null ? `${img1Obj.focalX}% ${img1Obj.focalY}%` : '50% 50%'
  const img2Obj   = images?.[2]; const img2 = img2Obj?.url || ''
  const img2Fp    = img2Obj?.focalX != null ? `${img2Obj.focalX}% ${img2Obj.focalY}%` : '50% 50%'
  const img3Obj   = images?.[3]; const img3 = img3Obj?.url || ''
  const img3Fp    = img3Obj?.focalX != null ? `${img3Obj.focalX}% ${img3Obj.focalY}%` : '50% 50%'

  const pageBg    = footerData?.bgColor || '#cde8cd'
  const accent    = footerData?.buttonColor || '#1a4a3a'
  const secondary = footerData?.secondaryColor || accent

  const logoUrl    = client?.logoUrl || ''
  const logoFilter = logoColor === 'white' ? 'brightness(0) invert(1)' : logoColor === 'black' ? 'brightness(0)' : 'none'
  const logoDisplay = logoUrl
    ? `<img src="${logoUrl}" alt="${client?.name||''}" style="height:${logoSize}px;width:auto;display:inline-block;filter:${logoFilter};"/>`
    : `<span style="font-family:Arial,sans-serif;font-size:${Math.round(logoSize * 0.38)}px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${accent};">${client?.name||''}</span>`

  const bodyParas = (copy.bodyText||'').split(/\n{2,}/)
  const bodyPara1 = (bodyParas[0]||'').replace(/\n/g,'<br>')
  const bodyPara2 = (bodyParas[1]||'').replace(/\n/g,'<br>')
  const body   = (copy.bodyText||'').replace(/\n/g,'<br>')
  const b2body = (copy.bodyBlock2||'').replace(/\n/g,'<br>')

  const hasFeatures = !!(img1 || img2 || img3)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@700&display=swap" rel="stylesheet"/>
<title>${copy.headlineText||''}</title>
<style>
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  body{margin:0;padding:0;background-color:#e8ede8;}
  img{border:0;display:block;}
</style>
</head>
<body style="margin:0;padding:0;background-color:#e8ede8;">
<table width="600" cellpadding="0" cellspacing="0" border="0" align="center" style="width:600px;max-width:600px;margin:0 auto;">

  <!-- ── HERO SECTION (brand bg) ── -->
  <tr><td style="background-color:${pageBg};padding:0;">

    <!-- Logo -->
    <table width="600" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:${logoTop}px 48px 18px;text-align:center;">${logoDisplay}</td></tr>
      <tr><td style="padding:0 48px;"><div style="height:1px;background:${accent};opacity:0.22;font-size:0;line-height:0;"></div></td></tr>
    </table>

    <!-- Pin hero: image clipped to map-pin shape, headline in floating card -->
    ${isHeroGenerated && heroImg
      ? `<table width="600" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding:0;line-height:0;font-size:0;background-color:${pageBg};">
            <img src="${heroImg}" alt="" width="600" style="width:600px;display:block;border:0;"/>
          </td></tr>
        </table>`
      : `<table width="600" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding:0;line-height:0;font-size:0;background-color:${pageBg};">
            <div style="position:relative;width:600px;height:520px;overflow:hidden;">
              <svg style="position:absolute;width:0;height:0;overflow:hidden;"><defs>
                <clipPath id="testPinClip" clipPathUnits="userSpaceOnUse">
                  <path d="M265,510 C235,460 171,378 133,273 A140,140 0 1,1 397,273 C359,378 295,460 265,510 Z"/>
                </clipPath>
              </defs></svg>
              <div style="position:absolute;top:0;left:0;width:600px;height:520px;clip-path:url(#testPinClip);">
                ${heroImg
                  ? `<img src="${heroImg}" alt="" style="position:absolute;left:125px;top:85px;width:280px;height:425px;object-fit:cover;object-position:${heroFp};display:block;"/>`
                  : `<div style="position:absolute;left:125px;top:85px;width:280px;height:425px;background:#8a9e8a;"></div>`}
              </div>
              <div style="position:absolute;left:225px;top:185px;width:80px;height:80px;border-radius:50%;background:${pageBg};"></div>
            </div>
          </td></tr>
        </table>`}

    <!-- Body text -->
    ${copy.bodyText ? `<table width="600" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:0 52px 30px;text-align:center;">
        <div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.78;color:${accent};">${body}</div>
      </td></tr>
    </table>` : ''}

    <!-- CTA -->
    ${copy.ctaText ? `<table width="600" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:0 48px 46px;text-align:center;">
        <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
          <tr><td style="background:${accent};border-radius:999px;">
            <a href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:16px 56px;font-family:Arial,sans-serif;font-size:17px;font-weight:700;color:#ffffff!important;text-decoration:none!important;white-space:nowrap;">${copy.ctaText}</a>
          </td></tr>
        </table>
      </td></tr>
    </table>` : ''}

  </td></tr>

  <!-- ── FEATURES SECTION (white bg, alternating arch rows) ── -->
  ${hasFeatures ? `<tr><td style="background:#ffffff;padding:0;">

    <!-- Row 1: text left · arch image right -->
    ${img1 ? `<table width="600" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      <tr>
        <td width="296" valign="middle" style="padding:44px 16px 36px 44px;vertical-align:middle;">
          ${copy.bodyBlock2Title ? `<div style="font-family:'Lora',Georgia,serif;font-size:22px;font-weight:700;line-height:1.22;color:${accent};margin-bottom:14px;">${copy.bodyBlock2Title}</div>` : ''}
          ${b2body ? `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.75;color:#555;">${b2body}</div>` : ''}
        </td>
        <td width="260" valign="bottom" style="padding:0 28px 0 12px;vertical-align:bottom;">
          <div style="width:220px;height:285px;border-radius:999px 999px 0 0;overflow:hidden;line-height:0;font-size:0;">
            <img src="${img1}" alt="" width="220" style="width:220px;height:285px;object-fit:cover;display:block;object-position:${img1Fp};"/>
          </div>
        </td>
      </tr>
    </table>` : ''}

    <!-- Row 2: arch image left · text right -->
    ${img2 ? `<table width="600" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      <tr>
        <td width="260" valign="bottom" style="padding:0 12px 0 28px;vertical-align:bottom;">
          <div style="width:220px;height:285px;border-radius:999px 999px 0 0;overflow:hidden;line-height:0;font-size:0;">
            <img src="${img2}" alt="" width="220" style="width:220px;height:285px;object-fit:cover;display:block;object-position:${img2Fp};"/>
          </div>
        </td>
        <td width="296" valign="middle" style="padding:44px 44px 36px 16px;vertical-align:middle;">
          ${copy.closingLine ? `<div style="font-family:'Lora',Georgia,serif;font-size:22px;font-weight:700;line-height:1.22;color:${accent};margin-bottom:14px;">${copy.closingLine}</div>` : ''}
          ${bodyPara1 ? `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.75;color:#555;">${bodyPara1}</div>` : ''}
        </td>
      </tr>
    </table>` : ''}

    <!-- Row 3: text left · arch image right -->
    ${img3 ? `<table width="600" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      <tr>
        <td width="296" valign="middle" style="padding:44px 16px 44px 44px;vertical-align:middle;">
          ${copy.subhead ? `<div style="font-family:'Lora',Georgia,serif;font-size:22px;font-weight:700;line-height:1.22;color:${accent};margin-bottom:14px;">${copy.subhead}</div>` : ''}
          ${bodyPara2 ? `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.75;color:#555;">${bodyPara2}</div>` : ''}
        </td>
        <td width="260" valign="bottom" style="padding:0 28px 0 12px;vertical-align:bottom;">
          <div style="width:220px;height:285px;border-radius:999px 999px 0 0;overflow:hidden;line-height:0;font-size:0;">
            <img src="${img3}" alt="" width="220" style="width:220px;height:285px;object-fit:cover;display:block;object-position:${img3Fp};"/>
          </div>
        </td>
      </tr>
    </table>` : ''}

  </td></tr>` : ''}

  <!-- ── FOOTER ── -->
  <tr><td style="padding:0;background-color:${pageBg};">${buildFooter(client, footerData, { defaultBg: pageBg, textColor: accent, dividerColor: accent + '33', bodyTextAlign: 'center' })}</td></tr>
</table>
</body></html>`
}


/* ══════════════════════════════════════════════════════════════════════════
   WEEK 9 — Full-bleed hero with decorative frame overlay
   Spec: TEMPLATE_SPEC.md · Mobile CSS: SHARED_MOBILE_CSS
   Hero: 600×720 full-bleed image, white bordered frame, split italic headline
   Body: identical to Week 2 (long img, strip, b2 inner box)
   ══════════════════════════════════════════════════════════════════════════ */
function buildTemplateWeek9({ client, copy, images, footerData, isHeroGenerated = false,
  heroScale=1, heroX=0, heroY=0,
  textSize=68, textTop=80, textLeft=64,
  logoColor='white', logoTop=28, logoRight=28, logoSize=44,
  img1Scale=1, img1X=0, img1Y=0,
  img2Scale=1, img2X=0, img2Y=0,
  img3Scale=1, img3X=0, img3Y=0,
  img4Scale=1, img4X=0, img4Y=0,
  btnImgUrl = null,
}) {
  const heroObj  = images?.[0]; const heroImg = heroObj?.url||''
  const img1Obj  = images?.[1]; const img1    = img1Obj?.url||''
  const img2Obj  = images?.[2]; const img2    = img2Obj?.url||''
  const img3Obj  = images?.[3]; const img3    = img3Obj?.url||''
  const img4Obj  = images?.[4]; const img4    = img4Obj?.url||''
  const body     = (copy.bodyText||'').replace(/\n/g,'<br>')
  const b2body   = (copy.bodyBlock2||'').replace(/\n/g,'<br>')
  const logoUrl  = client?.logoUrl||''
  const pageBg   = footerData?.bgColor || '#1e2a4a'
  const accent   = footerData?.buttonColor || '#d4006a'
  const secondary = footerData?.secondaryColor || accent
  const logoFilter = logoColor === 'white' ? 'brightness(0) invert(1)' : logoColor === 'black' ? 'brightness(0)' : 'none'

  const _rgb = pageBg.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  const _r = _rgb ? parseInt(_rgb[1],16) : 30
  const _g = _rgb ? parseInt(_rgb[2],16) : 42
  const _b = _rgb ? parseInt(_rgb[3],16) : 74
  const _lum = (0.299*_r + 0.587*_g + 0.114*_b)/255
  const lightBg      = _lum > 0.55
  const mutedTextCol = lightBg ? '#595959' : '#d4d4d4'
  const dividerCol   = lightBg ? '#e0e0e0' : '#444444'

  // Split headline at \n for two-line treatment (e.g. "Family\nEscape")
  const hLines = (copy.headlineText||'').split('\n')
  const hLine1 = hLines[0] || ''
  const hLine2 = hLines[1] || ''
  const taglineSize = Math.max(14, Math.round(textSize * 0.26))
  const indent      = Math.round(textSize * 0.55)

  const logoOverlay = logoUrl
    ? `<img src="${logoUrl}" alt="${client?.name||''}" style="display:block;height:${logoSize}px;width:auto;max-width:${logoSize*6}px;filter:${logoFilter};"/>`
    : `<div style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#ffffff;">${client?.name||''}</div>`

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@1,700&display=swap" rel="stylesheet"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{margin:0;padding:0;color:#1a1a1a;}
  table{border-collapse:collapse;}
  ${SHARED_MOBILE_CSS}
</style></head>
<body style="margin:0;padding:32px 0 48px;background-color:#ffffff;">

<table width="600" cellpadding="0" cellspacing="0" bgcolor="${pageBg}" style="width:600px;max-width:600px;margin:0 auto;background-color:${pageBg};border-collapse:collapse;border-radius:20px;overflow:hidden;">
<tr><td style="background-color:${pageBg};">

  <!-- HERO: Puppeteer PNG or CSS preview -->
  ${isHeroGenerated
    ? `<div style="line-height:0;font-size:0;background-color:${pageBg};"><img src="${heroImg}" alt="" width="600" style="width:100%;display:block;max-width:600px;border:0;"/></div>`
    : `<div style="position:relative;width:600px;height:720px;overflow:hidden;background:#1a3050;line-height:0;font-size:0;">
    ${heroImg ? `<img src="${heroImg}" alt="" style="position:absolute;top:${Math.min(0,Math.max(720*(1-heroScale),-(720*(heroScale-1)/2)+heroY))}px;left:${Math.min(0,Math.max(600*(1-heroScale),-(600*(heroScale-1)/2)+heroX))}px;width:${600*heroScale}px;height:${720*heroScale}px;object-fit:cover;display:block;"/>` : `<div style="width:600px;height:720px;background:linear-gradient(135deg,#3d5a80,#1a3050);"></div>`}
    <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0.06) 0%,rgba(0,0,0,0) 35%,rgba(0,0,0,0.15) 65%,rgba(0,0,0,0.52) 100%);line-height:normal;font-size:initial;">
      <div style="position:absolute;top:${logoTop}px;right:${logoRight}px;">${logoOverlay}</div>
      <div style="position:absolute;top:168px;left:56px;width:392px;height:512px;border:2.5px solid rgba(255,255,255,0.82);border-radius:0 48px 0 0;"></div>
      <div style="position:absolute;bottom:${textTop}px;left:${textLeft}px;">
        ${copy.subhead ? `<div style="font-family:Arial,sans-serif;font-size:${taglineSize}px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,0.92);margin-bottom:8px;text-shadow:0 1px 6px rgba(0,0,0,.3);">${copy.subhead}</div>` : ''}
        <div style="font-family:'Lora',Georgia,serif;font-size:${textSize}px;font-weight:700;font-style:italic;line-height:1.0;color:#fff;text-shadow:0 2px 14px rgba(0,0,0,.38);">${hLine1}${hLine2 ? `<br/><span style="padding-left:${indent}px;">${hLine2}</span>` : ''}</div>
      </div>
    </div>
  </div>`}

  <!-- 2x2 GRID -->
  ${isHeroGenerated && img4
    ? `<div style="line-height:0;font-size:0;background-color:${pageBg};"><img src="${img4}" alt="" width="600" style="width:600px;max-width:100%;display:block;border:0;"/></div>`
    : (img1 || img2 || img3) ? `<table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;border-collapse:collapse;background-color:${pageBg};">
    <tr>
      <td width="298" style="width:298px;vertical-align:top;line-height:0;font-size:0;padding:0;">
        <div style="position:relative;overflow:hidden;width:298px;height:280px;background:#1a3050;">
          ${img1 ? `<img src="${img1}" alt="" style="position:absolute;top:0;left:0;width:298px;height:280px;object-fit:cover;display:block;object-position:${focalPos(img1Obj)};transform:translate(${img1X}px,${img1Y}px) scale(${img1Scale});transform-origin:center center;"/>` : ''}
          <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0) 50%,rgba(0,0,0,0.5) 100%);"></div>
        </div>
      </td>
      <td width="4" style="width:4px;line-height:0;font-size:0;background-color:${pageBg};padding:0;"></td>
      <td style="vertical-align:top;line-height:0;font-size:0;padding:0;">
        <div style="position:relative;overflow:hidden;width:298px;height:280px;background:#1a3050;">
          ${img2 ? `<img src="${img2}" alt="" style="position:absolute;top:0;left:0;width:298px;height:280px;object-fit:cover;display:block;object-position:${focalPos(img2Obj)};transform:translate(${img2X}px,${img2Y}px) scale(${img2Scale});transform-origin:center center;"/>` : ''}
          <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0) 50%,rgba(0,0,0,0.5) 100%);"></div>
        </div>
      </td>
    </tr>
    <tr><td colspan="3" style="height:4px;line-height:0;font-size:0;background-color:${pageBg};padding:0;"></td></tr>
    <tr>
      <td width="298" style="width:298px;vertical-align:top;line-height:0;font-size:0;padding:0;">
        <div style="position:relative;overflow:hidden;width:298px;height:280px;background:#1a3050;">
          ${img3 ? `<img src="${img3}" alt="" style="position:absolute;top:0;left:0;width:298px;height:280px;object-fit:cover;display:block;object-position:${focalPos(img3Obj)};transform:translate(${img3X}px,${img3Y}px) scale(${img3Scale});transform-origin:center center;"/>` : ''}
          <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0) 50%,rgba(0,0,0,0.5) 100%);"></div>
        </div>
      </td>
      <td width="4" style="width:4px;line-height:0;font-size:0;background-color:${pageBg};padding:0;"></td>
      <td style="vertical-align:top;line-height:0;font-size:0;padding:0;">
        <div style="position:relative;overflow:hidden;width:298px;height:280px;background:#1a3050;">
          ${img4 ? `<img src="${img4}" alt="" style="position:absolute;top:0;left:0;width:298px;height:280px;object-fit:cover;display:block;object-position:${focalPos(img4Obj)};transform:translate(${img4X}px,${img4Y}px) scale(${img4Scale});transform-origin:center center;"/>` : ''}
          <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0) 50%,rgba(0,0,0,0.5) 100%);"></div>
        </div>
      </td>
    </tr>
  </table>` : ''}

  <!-- BODY BLOCK 1 -->
  ${copy.bodyText ? `<div class="w2-section" style="padding:28px 48px 8px;background-color:${pageBg};"><div class="mobile-body" style="font-size:17px;line-height:1.8;color:${mutedTextCol};font-family:Arial,sans-serif;">${body}</div></div>` : ''}

  <!-- CTA -->
  ${copy.ctaText ? `<div class="w2-section" style="padding:20px 48px 36px;text-align:center;background-color:${pageBg};">${btnImgUrl
    ? `<a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;outline:none;border:none;"><img class="w2-btn-img" src="${btnImgUrl}" alt="${copy.ctaText}" width="375" style="width:375px;max-width:375px;display:block;margin:0 auto;border:0;outline:none;"/></a>`
    : `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td style="background:${accent};border-radius:999px;"><a class="mobile-cta" href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:15px 40px;font-family:Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:.04em;color:#ffffff!important;-webkit-text-fill-color:#ffffff;text-decoration:none!important;white-space:nowrap;">${copy.ctaText} &rarr;</a></td></tr></table>`
  }</div>` : ''}

  <!-- BODY BLOCK 2 (inner box, same as Week 2) -->
  ${(copy.bodyBlock2Title || copy.bodyBlock2 || copy.closingLine) ? `
  <div class="w2-b2" style="background-color:${pageBg};padding:8px 36px 0;">
    <div class="w2-b2-inner" style="background-color:${pageBg};border-radius:10px;padding:16px 20px;">
      ${copy.bodyBlock2Title ? `<div class="mobile-b2title" style="font-size:22px;font-weight:700;font-family:Arial,sans-serif;letter-spacing:0;text-transform:uppercase;color:${secondary};margin-bottom:6px;text-align:left;">${copy.bodyBlock2Title}</div>` : ''}
      ${copy.bodyBlock2 ? `<div class="mobile-body" style="font-size:17px;line-height:1.8;color:${mutedTextCol};margin-bottom:18px;font-family:Arial,sans-serif;">${b2body}</div>` : ''}
      ${copy.closingLine ? `<div class="mobile-closing" style="font-size:17px;line-height:1.7;color:${mutedTextCol};font-style:italic;margin-bottom:24px;font-family:Georgia,serif;">${copy.closingLine}</div>` : ''}
    </div>
    ${copy.ctaText ? `<div style="padding:16px 0 36px;text-align:center;">${btnImgUrl
      ? `<a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;outline:none;border:none;"><img class="w2-btn-img" src="${btnImgUrl}" alt="${copy.ctaText}" width="375" style="width:375px;max-width:375px;display:block;margin:0 auto;border:0;outline:none;"/></a>`
      : `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td style="background:${accent};border-radius:999px;"><a class="mobile-cta" href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:15px 40px;font-family:Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:.04em;color:#ffffff!important;-webkit-text-fill-color:#ffffff;text-decoration:none!important;white-space:nowrap;">${copy.ctaText} &rarr;</a></td></tr></table>`
    }</div>` : ''}
  </div>` : ''}

  <div style="background-color:${pageBg};">${buildFooter(client, footerData, { defaultBg: pageBg, textColor: mutedTextCol, dividerColor: dividerCol, bodyTextAlign: 'justify' })}</div>
</td></tr></table>
</body></html>`
}

/* ══════════════════════════════════════════════════════════════════════════
   WEEK 7 v2 — duplicate of Week 2 (id 24)
   Independent copy: own w7v2-* classes and own Puppeteer generators,
   so it can be edited without touching Week 2.
   ══════════════════════════════════════════════════════════════════════════ */
function buildTemplateWeek7v2({ client, copy, images, footerData, isHeroGenerated = false,
  heroScale=1, heroX=0, heroY=0,
  textSize=54, textTop=60, textLeft=24,
  logoColor='original', logoTop=48, logoRight=200, logoSize=40,
  img1Scale=1, img1X=0, img1Y=0,
  img2Scale=1, img2X=0, img2Y=0,
  img3Scale=1, img3X=0, img3Y=0,
  img4Scale=1, img4X=0, img4Y=0,
  btnImgUrl = null,
}) {
  const heroObj  = images?.[0]; const heroImg = heroObj?.url||''
  const img1Obj  = images?.[1]; const img1    = img1Obj?.url||''
  const img2Obj  = images?.[2]; const img2    = img2Obj?.url||''
  const img3Obj  = images?.[3]; const img3    = img3Obj?.url||''
  const img4Obj  = images?.[4]; const img4    = img4Obj?.url||''
  const img5     = images?.[5]?.url || ''
  const body     = (copy.bodyText||'').replace(/\n/g,'<br>')
  const b2body   = (copy.bodyBlock2||'').replace(/\n/g,'<br>')
  const logoUrl  = client?.logoUrl||''
  const pageBg   = footerData?.bgColor || '#1e2a4a'
  const accent   = footerData?.buttonColor || '#d4006a'
  const secondary = footerData?.secondaryColor || accent
  const logoFilter = logoColor === 'white' ? 'brightness(0) invert(1)' : logoColor === 'black' ? 'brightness(0)' : 'none'

  const _rgb = pageBg.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  const _r = _rgb ? parseInt(_rgb[1],16) : 30
  const _g = _rgb ? parseInt(_rgb[2],16) : 42
  const _b = _rgb ? parseInt(_rgb[3],16) : 74
  const _lum = (0.299*_r + 0.587*_g + 0.114*_b)/255
  const lightBg      = _lum > 0.55
  const mutedTextCol = lightBg ? '#595959' : '#d4d4d4'
  const dividerCol   = lightBg ? '#e0e0e0' : '#444444'

  const logoOverlay = logoUrl
    ? `<img src="${logoUrl}" alt="${client?.name||''}" style="display:inline-block;height:${logoSize}px;width:auto;max-width:${logoSize * 6}px;filter:${logoFilter};"/>`
    : `<div style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:${mutedTextCol};margin-bottom:10px;">${client?.name||''}</div>`

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@700;900&family=Lora:ital,wght@0,700;1,400&display=swap" rel="stylesheet"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{margin:0;padding:0;color:#1a1a1a;}
  table{border-collapse:collapse;}
  @media only screen and (max-width:600px){
    .w7v2-section    { padding-left:35px!important; padding-right:35px!important; }
    .w7v2-btn-img    { width:300px!important; max-width:300px!important; }
    .w7v2-b2         { padding-left:35px!important; padding-right:35px!important; }
    .w7v2-b2-inner   { padding-left:0!important;   padding-right:0!important;   }
    .mobile-body    { font-size:17px!important; line-height:1.5!important; }
    .mobile-subhead { font-size:17px!important; line-height:1.4!important; }
    .mobile-b2title { font-size:22px!important; line-height:1.25!important; }
    .mobile-closing { font-size:17px!important; line-height:1.5!important; }
    .mobile-cta     { font-size:20px!important; padding:20px 80px!important; }
    .mobile-footer  { font-size:14px!important; line-height:1.4!important; }
  }
</style></head>
<body style="margin:0;padding:32px 0 48px;background-color:#ffffff;">

<table width="600" cellpadding="0" cellspacing="0" bgcolor="${pageBg}" style="width:600px;max-width:600px;margin:0 auto;background-color:${pageBg};border-collapse:collapse;border-radius:20px;overflow:hidden;">
<tr><td style="background-color:${pageBg};">

  <!-- HERO: transparent PNG or CSS inset-card preview -->
  ${isHeroGenerated
    ? `<div style="line-height:0;font-size:0;background-color:${pageBg};"><a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;outline:none;"><img src="${heroImg}" alt="" width="600" style="width:100%;display:block;max-width:600px;border:0;"/></a></div>`
    : `<div style="line-height:0;font-size:0;background-color:${pageBg};">
    <div style="position:relative;width:600px;height:720px;overflow:hidden;background:#1a1a1a;">
      ${heroImg ? `<img src="${heroImg}" style="position:absolute;top:${Math.min(0,Math.max(720*(1-heroScale),-(720*(heroScale-1)/2)+heroY))}px;left:${Math.min(0,Math.max(600*(1-heroScale),-(600*(heroScale-1)/2)+heroX))}px;width:${600*heroScale}px;height:${720*heroScale}px;object-fit:cover;display:block;"/>` : `<div style="width:600px;height:720px;background:#2a2a2a;"></div>`}
      <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0.25) 0%,rgba(0,0,0,0) 35%,rgba(0,0,0,0) 45%,rgba(0,0,0,0.55) 75%,rgba(0,0,0,0.75) 100%);line-height:normal;font-size:initial;display:flex;flex-direction:column;justify-content:space-between;">
        <div style="text-align:center;padding-top:${logoTop}px;">${logoOverlay}</div>
        <div style="padding:0 ${textLeft}px ${textTop}px;">
          <div style="font-family:'Lato',Arial,sans-serif;font-size:${textSize}px;font-weight:900;line-height:1.12;color:#fff;text-align:left;">${copy.headlineText||''}</div>
          ${copy.subhead ? `<div style="font-family:'Lora',Georgia,serif;font-size:24px;font-style:italic;font-weight:700;line-height:1.55;color:#fff;margin-top:8px;text-align:left;max-width:520px;">${copy.subhead}</div>` : ''}
          ${copy.ctaText ? `<div style="margin-top:12px;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:rgba(0,0,0,0.4);border:2px solid rgba(255,255,255,0.85);border-radius:100px;"><a href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:14px 44px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;letter-spacing:.04em;color:#fff!important;text-decoration:none!important;white-space:nowrap;">${copy.ctaText}</a></td></tr></table></div>` : ''}
        </div>
      </div>
    </div>
  </div>`}

  <!-- THREE-IMAGE STRIP (img1 / img2 / img3) — skipped when hero PNG already includes it -->
  ${!isHeroGenerated && (img1 || img2 || img3) ? `<div style="padding:8px 0 0;background-color:${pageBg};line-height:0;font-size:0;">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;border-collapse:collapse;line-height:0;font-size:0;">
      <tr>
        <td width="196" style="width:196px;padding:0;line-height:0;font-size:0;">
          ${img1 ? `<a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;outline:none;"><div style="position:relative;width:196px;height:260px;overflow:hidden;line-height:0;font-size:0;"><img src="${img1}" alt="" width="196" style="width:196px;height:260px;object-fit:cover;object-position:${focalPos(img1Obj)};transform:translate(${img1X}px,${img1Y}px) scale(${img1Scale});transform-origin:center center;"/></div></a>` : `<div style="width:196px;height:260px;background:#2a2a2a;"></div>`}
        </td>
        <td width="6" style="width:6px;padding:0;background-color:${pageBg};line-height:0;font-size:0;"> </td>
        <td width="196" style="width:196px;padding:0;line-height:0;font-size:0;">
          ${img2 ? `<a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;outline:none;"><div style="position:relative;width:196px;height:260px;overflow:hidden;line-height:0;font-size:0;"><img src="${img2}" alt="" width="196" style="width:196px;height:260px;object-fit:cover;object-position:${focalPos(img2Obj)};transform:translate(${img2X}px,${img2Y}px) scale(${img2Scale});transform-origin:center center;"/></div></a>` : `<div style="width:196px;height:260px;background:#2a2a2a;"></div>`}
        </td>
        <td width="6" style="width:6px;padding:0;background-color:${pageBg};line-height:0;font-size:0;"> </td>
        <td width="196" style="width:196px;padding:0;line-height:0;font-size:0;">
          ${(img3 || img1) ? `<a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;outline:none;"><div style="position:relative;width:196px;height:260px;overflow:hidden;line-height:0;font-size:0;"><img src="${img3 || img1}" alt="" width="196" style="width:196px;height:260px;object-fit:cover;object-position:${focalPos(img3 ? img3Obj : img1Obj)};transform:translate(${img3X}px,${img3Y}px) scale(${img3Scale});transform-origin:center center;"/></div></a>` : `<div style="width:196px;height:260px;background:#2a2a2a;"></div>`}
        </td>
      </tr>
    </table>
  </div>` : ''}

  <!-- SUBHEAD + CTA removed — the hero already carries both, so repeating them
       straight after the image grid just said the same thing twice. -->


  <!-- BODY BLOCK -->
  ${copy.bodyText ? `<div class="w7v2-section" style="padding:24px 48px 32px;background-color:${pageBg};"><div class="mobile-body" style="font-size:17px;line-height:1.8;color:${mutedTextCol};margin-bottom:18px;font-family:Arial,sans-serif;">${body}</div></div>` : ''}

  <!-- DIVIDER + BODY BLOCK 2 TITLE (Week 7 style) — sits above the stamp -->
  ${copy.bodyBlock2Title ? `<div class="w7v2-section" style="padding:8px 48px 0;background-color:${pageBg};"><div style="height:1px;background:${dividerCol};font-size:0;line-height:0;"></div></div><div class="w7v2-section" style="padding:20px 48px 12px;background-color:${pageBg};"><div class="mobile-b2title" style="font-size:22px;font-weight:700;font-family:'Lora',Georgia,serif;letter-spacing:0;color:${secondary};text-align:center;">${copy.bodyBlock2Title}</div></div>` : ''}

  <!-- STAMP DESIGN (from Week 7) — grid uses img1/2/3, stamp uses Sub Image 4 -->
  ${isHeroGenerated && img5
    ? `<div style="padding:20px 0 0;background-color:${pageBg};text-align:center;line-height:0;font-size:0;">
          <a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;outline:none;"><img src="${img5}" alt="" width="400" style="width:400px;max-width:100%;display:block;margin:0 auto;border:0;"/></a>
        </div>`
    : img4
    ? `<div style="padding:20px 0 0;background-color:${pageBg};text-align:center;line-height:0;font-size:0;">
          <a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;outline:none;"><div style="display:inline-block;position:relative;width:400px;height:500px;overflow:hidden;background:#c8c0b5;border-radius:0;">
            <img src="${img4}" alt="" style="position:absolute;top:0;left:0;width:400px;height:500px;object-fit:cover;object-position:${focalPos(img4Obj)};display:block;transform:translate(${img4X}px,${img4Y}px) scale(${img4Scale});transform-origin:center center;"/>
            <div style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;">
              <div style="position:relative;width:365px;height:478px;">
                <img src="/stamp-frame.png" alt="" style="position:absolute;top:0;left:0;width:365px;height:478px;object-fit:contain;display:block;"/>
                <div style="position:absolute;top:116px;left:94px;width:178px;height:245px;overflow:hidden;">
                  <img src="${img4}" alt="" style="width:100%;height:100%;object-fit:cover;object-position:${focalPos(img4Obj)};display:block;"/>
                </div>
              </div>
            </div>
          </div></a>
        </div>`
    : ''}

  <!-- BODY BLOCK 2: title + body2 + closing + CTA -->
  ${(copy.bodyBlock2Title || copy.bodyBlock2 || copy.closingLine) ? `
  <div class="w7v2-b2" style="background-color:${pageBg};padding:8px 36px 0;">
    <div class="w7v2-b2-inner" style="background-color:${pageBg};border-radius:10px;padding:16px 20px;">
      ${copy.bodyBlock2 ? `<div class="mobile-body" style="font-size:17px;line-height:1.8;color:${mutedTextCol};margin-bottom:18px;font-family:Arial,sans-serif;">${b2body}</div>` : ''}
      ${copy.closingLine ? `<div class="mobile-closing" style="font-size:17px;line-height:1.7;color:${mutedTextCol};font-style:italic;margin-bottom:24px;font-family:Georgia,serif;">${copy.closingLine}</div>` : ''}
    </div>
    ${copy.ctaText ? `<div style="padding:16px 0 36px;text-align:center;">${btnImgUrl
      ? `<a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;outline:none;border:none;"><img class="w7v2-btn-img" src="${btnImgUrl}" alt="${copy.ctaText}" width="375" style="width:375px;max-width:375px;display:block;margin:0 auto;border:0;outline:none;"/></a>`
      : `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td style="background:${accent};border-radius:999px;"><a class="mobile-cta" href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:15px 40px;font-family:Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:.04em;color:#ffffff!important;-webkit-text-fill-color:#ffffff;text-decoration:none!important;white-space:nowrap;">${copy.ctaText} &rarr;</a></td></tr></table>`
    }</div>` : ''}
  </div>` : ''}

  <div style="background-color:${pageBg};">${buildFooter(client, footerData, { defaultBg: pageBg, textColor: mutedTextCol, dividerColor: dividerCol, bodyTextAlign: 'justify' })}</div>
</td></tr></table>
</body></html>`
}

/* ══════════════════════════════════════════════════════════════════════════
   WEEK 8 v2 — exact duplicate of Week 2 (id 25)
   Independent copy: own w8v2-* classes and own Puppeteer generators,
   so it can be edited without touching Week 2.
   ══════════════════════════════════════════════════════════════════════════ */
function buildTemplateWeek8v2({ client, copy, images, footerData, isHeroGenerated = false,
  heroScale=1, heroX=0, heroY=0,
  textSize=38, textTop=32, textLeft=24,
  logoColor='original', logoTop=24, logoRight=200, logoSize=40,
  img1Scale=1, img1X=0, img1Y=0,
  img2Scale=1, img2X=0, img2Y=0,
  img3Scale=1, img3X=0, img3Y=0,
  img4Scale=1, img4X=0, img4Y=0,
  btnImgUrl = null,
  stampImgUrl = null,
  pinImgUrl = null,
}) {
  const heroObj  = images?.[0]; const heroImg = heroObj?.url||''
  const heroFp   = heroObj?.focalX != null ? `${heroObj.focalX}% ${heroObj.focalY}%` : '50% 50%'
  const img1Obj  = images?.[1]; const img1    = img1Obj?.url||''
  const img2Obj  = images?.[2]; const img2    = img2Obj?.url||''
  const img3Obj  = images?.[3]; const img3    = img3Obj?.url||''
  const img4Obj  = images?.[4]; const img4    = img4Obj?.url||''
  const img5     = images?.[5]?.url || ''
  const body     = (copy.bodyText||'').replace(/\n/g,'<br>')
  const b2body   = (copy.bodyBlock2||'').replace(/\n/g,'<br>')
  const logoUrl  = client?.logoUrl||''
  const pageBg   = footerData?.bgColor || '#1e2a4a'
  const accent   = footerData?.buttonColor || '#d4006a'
  const secondary = footerData?.secondaryColor || accent
  const logoFilter = logoColor === 'white' ? 'brightness(0) invert(1)' : logoColor === 'black' ? 'brightness(0)' : 'none'

  const _rgb = pageBg.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  const _r = _rgb ? parseInt(_rgb[1],16) : 30
  const _g = _rgb ? parseInt(_rgb[2],16) : 42
  const _b = _rgb ? parseInt(_rgb[3],16) : 74
  const _lum = (0.299*_r + 0.587*_g + 0.114*_b)/255
  const lightBg      = _lum > 0.55
  const mutedTextCol = lightBg ? '#595959' : '#d4d4d4'
  const dividerCol   = lightBg ? '#e0e0e0' : '#444444'

  const logoOverlay = logoUrl
    ? `<img src="${logoUrl}" alt="${client?.name||''}" style="display:inline-block;height:${logoSize}px;width:auto;max-width:${logoSize * 6}px;filter:${logoFilter};"/>`
    : `<div style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:${mutedTextCol};margin-bottom:10px;">${client?.name||''}</div>`

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@700;900&family=Lora:ital,wght@0,700;1,400&display=swap" rel="stylesheet"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{margin:0;padding:0;color:#1a1a1a;}
  table{border-collapse:collapse;}
  @media only screen and (max-width:600px){
    .w8v2-outer     { width:100%!important; max-width:600px!important; }
    .w8v2-section    { padding-left:35px!important; padding-right:35px!important; }
    .w8v2-btn-img    { width:300px!important; max-width:300px!important; }
    .w8v2-b2         { padding-left:35px!important; padding-right:35px!important; }
    .w8v2-b2-inner   { padding-left:0!important;   padding-right:0!important;   }
    .mobile-body    { font-size:17px!important; line-height:1.5!important; }
    .mobile-subhead { font-size:17px!important; line-height:1.4!important; }
    .mobile-b2title { font-size:22px!important; line-height:1.25!important; }
    .mobile-closing { font-size:17px!important; line-height:1.5!important; }
    .mobile-cta     { font-size:20px!important; padding:20px 80px!important; }
    .mobile-footer  { font-size:14px!important; line-height:1.4!important; }
  }
</style></head>
<body style="margin:0;padding:32px 0 48px;background-color:#ffffff;">

<table width="600" cellpadding="0" cellspacing="0" bgcolor="${pageBg}" class="w8v2-outer" style="width:100%;max-width:600px;margin:0 auto;background-color:${pageBg};border-collapse:collapse;border-radius:20px;overflow:hidden;">
<tr><td style="background-color:${pageBg};">

  <!-- HERO (duplicate of Week 8) -->
${(() => {
  const logoDisplayWhite = logoUrl
    ? `<img src="${logoUrl}" alt="${client?.name||''}" style="height:${logoSize}px;width:auto;display:block;filter:${logoFilter};"/>`
    : `<span style="font-family:Arial,sans-serif;font-size:${Math.round(logoSize*0.38)}px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${logoColor==='black'?'#000':'#fff'};">${client?.name||''}</span>`
  return `<div style="line-height:0;font-size:0;background-color:${pageBg};">
    ${isHeroGenerated && heroImg
      ? `<a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;outline:none;"><img src="${heroImg}" alt="" style="width:600px;max-width:100%;display:block;border:0;"/></a>`
      : `<div style="position:relative;width:100%;height:680px;overflow:hidden;background:#1a1a1a;">
          ${heroImg ? `<img src="${heroImg}" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:${heroFp};transform:translate(${heroX}px,${heroY}px) scale(${heroScale});transform-origin:center center;display:block;"/>` : `<div style="position:absolute;inset:0;background:#2a2a2a;"></div>`}
          <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.35) 0%,rgba(0,0,0,0) 35%,rgba(0,0,0,0) 48%,rgba(0,0,0,0.55) 75%,rgba(0,0,0,0.72) 100%);"></div>
          <div style="position:absolute;top:64px;left:14px;right:44px;bottom:14px;border-left:1px solid rgba(255,255,255,0.55);border-right:1px solid rgba(255,255,255,0.55);border-bottom:1px solid rgba(255,255,255,0.55);"></div>
          <table cellpadding="0" cellspacing="0" border="0" style="position:absolute;top:28px;left:28px;right:52px;width:calc(100% - 80px);border-collapse:collapse;"><tr><td style="white-space:nowrap;padding-right:16px;vertical-align:middle;line-height:0;font-size:0;">${logoDisplayWhite}</td><td style="width:100%;vertical-align:middle;"><div style="height:1px;background:rgba(255,255,255,0.55);font-size:0;line-height:0;"></div></td></tr></table>
          <div style="position:absolute;bottom:34px;left:${textLeft}px;right:60px;">
            <div style="font-family:'Lato',Arial,sans-serif;font-size:${textSize}px;font-weight:900;line-height:1.12;color:#fff;margin-bottom:12px;">${copy.headlineText||''}</div>
            <div style="width:320px;max-width:100%;height:56px;background:#fff;display:flex;align-items:center;justify-content:center;padding:0 16px;">${copy.ctaText ? `<a href="${copy.ctaUrl||'#'}" style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:0.06em;color:#1a1a1a;text-decoration:none;text-transform:uppercase;white-space:nowrap;">${copy.ctaText.toUpperCase()}</a>` : `<span style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:0.06em;color:#1a1a1a;text-transform:uppercase;white-space:nowrap;">SHOP NOW</span>`}</div>
          </div>
        </div>`}
  </div>`
})()}

  <!-- SUBHEAD -->
  ${copy.subhead ? `<div class="w8v2-section" style="padding:28px 48px 4px;text-align:center;background-color:${pageBg};"><div class="mobile-subhead" style="font-family:Georgia,serif;font-size:20px;font-weight:400;font-style:italic;color:${mutedTextCol};line-height:1.5;">${copy.subhead}</div></div>` : ''}

  <!-- CTA -->
  ${copy.ctaText ? `<div class="w8v2-section" style="padding:24px 48px 28px;text-align:center;background-color:${pageBg};">${btnImgUrl
    ? `<a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;outline:none;border:none;"><img class="w8v2-btn-img" src="${btnImgUrl}" alt="${copy.ctaText}" width="375" style="width:375px;max-width:100%;display:block;margin:0 auto;border:0;outline:none;"/></a>`
    : `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td style="background:${accent};border-radius:999px;"><a class="mobile-cta" href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:15px 40px;font-family:Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:.04em;color:#ffffff!important;-webkit-text-fill-color:#ffffff;text-decoration:none!important;white-space:nowrap;">${copy.ctaText} &rarr;</a></td></tr></table>`
  }</div>` : ''}


  <!-- DIVIDER (from Week 8) -->
  <div class="w8v2-section" style="padding:0 48px;background-color:${pageBg};"><div style="height:1px;background:${lightBg ? '#c9c9c9' : '#555555'};font-size:0;line-height:0;"></div></div>

  <!-- BODY BLOCK -->
  ${copy.bodyText ? `<div class="w8v2-section" style="padding:24px 48px 32px;background-color:${pageBg};"><div class="mobile-body" style="font-size:17px;line-height:1.8;color:${mutedTextCol};margin-bottom:18px;font-family:Arial,sans-serif;">${body}</div></div>` : ''}

  <!-- MAP PIN ELEMENT (from Week 8) — Source: Sub Image 1 -->
  ${pinImgUrl
    ? `<div style="line-height:0;font-size:0;"><a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;outline:none;"><img src="${pinImgUrl}" alt="" width="600" style="width:600px;max-width:100%;display:block;border:0;"/></a></div>`
    : `<a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;outline:none;"><div style="position:relative;width:100%;max-width:600px;height:435px;overflow:hidden;background-color:${pageBg};">
    <div style="position:absolute;top:0;left:50%;margin-left:-300px;width:600px;height:435px;overflow:hidden;">
    <div style="position:relative;width:600px;height:520px;margin-left:55px;top:-82px;">
      <svg style="position:absolute;width:0;height:0;overflow:hidden;"><defs>
        <clipPath id="w8v2PinClip" clipPathUnits="userSpaceOnUse">
          <path d="M265,510 C235,460 171,378 133,273 A140,140 0 1,1 397,273 C359,378 295,460 265,510 Z"/>
        </clipPath>
      </defs></svg>
      <div style="position:absolute;top:0;left:0;width:600px;height:520px;clip-path:url(#w8v2PinClip);">
        ${img1
          ? `<img src="${img1}" alt="" style="position:absolute;left:125px;top:85px;width:280px;height:425px;object-fit:cover;object-position:${focalPos(img1Obj)};transform:translate(${img1X}px,${img1Y}px) scale(${img1Scale});transform-origin:center center;display:block;"/>`
          : `<div style="position:absolute;left:125px;top:85px;width:280px;height:425px;background:#8a9e8a;"></div>`}
      </div>
      <div style="position:absolute;left:225px;top:185px;width:80px;height:80px;border-radius:50%;background:${pageBg};"></div>
    </div>
    </div>
  </div></a>`}

  <!-- LOCATION TITLE + 3-PHOTO GRID -->
  ${(copy.bodyBlock2Title || img2 || img3 || img4 || stampImgUrl) ? `<div style="padding:16px 0 0;background-color:${pageBg};">
    ${copy.bodyBlock2Title ? `<div class="mobile-b2title" style="text-align:center;padding:0 0 20px;font-family:'Lora',Georgia,serif;font-size:22px;font-weight:700;letter-spacing:0;color:${secondary};text-transform:uppercase;">${copy.bodyBlock2Title.toUpperCase()}</div>` : ''}
    ${stampImgUrl
      ? `<a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;outline:none;"><img src="${stampImgUrl}" alt="" width="578" style="width:578px;max-width:100%;display:block;margin:0 auto;border:0;"/></a>`
      : `<table width="578" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:578px;margin:0 auto;">
      <tr>
        <td width="33%" style="width:33.33%;padding:0 4px 0 0;vertical-align:top;"><a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;outline:none;"><div style="position:relative;width:100%;max-width:190px;height:290px;border-radius:24px;overflow:hidden;line-height:0;font-size:0;">${img2 ? `<img src="${img2}" alt="" style="position:absolute;top:0;left:0;width:100%;height:290px;object-fit:cover;display:block;object-position:${focalPos(img2Obj)};transform:translate(${img2X}px,${img2Y}px) scale(${img2Scale});transform-origin:center center;"/>` : `<div style="width:100%;max-width:190px;height:290px;background:#d0d0d0;border-radius:24px;"></div>`}</div></a></td>
        <td width="33%" style="width:33.33%;padding:0 4px;vertical-align:top;"><a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;outline:none;"><div style="position:relative;width:100%;max-width:190px;height:290px;border-radius:24px;overflow:hidden;line-height:0;font-size:0;">${img3 ? `<img src="${img3}" alt="" style="position:absolute;top:0;left:0;width:100%;height:290px;object-fit:cover;display:block;object-position:${focalPos(img3Obj)};transform:translate(${img3X}px,${img3Y}px) scale(${img3Scale});transform-origin:center center;"/>` : `<div style="width:100%;max-width:190px;height:290px;background:#d0d0d0;border-radius:24px;"></div>`}</div></a></td>
        <td width="33%" style="width:33.33%;padding:0 0 0 4px;vertical-align:top;"><a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;outline:none;"><div style="position:relative;width:100%;max-width:190px;height:290px;border-radius:24px;overflow:hidden;line-height:0;font-size:0;">${img4 ? `<img src="${img4}" alt="" style="position:absolute;top:0;left:0;width:100%;height:290px;object-fit:cover;display:block;object-position:${focalPos(img4Obj)};transform:translate(${img4X}px,${img4Y}px) scale(${img4Scale});transform-origin:center center;"/>` : `<div style="width:100%;max-width:190px;height:290px;background:#d0d0d0;border-radius:24px;"></div>`}</div></a></td>
      </tr>
    </table>`}
  </div>` : ''}

  <!-- BODY BLOCK 2: title + body2 + closing + CTA -->
  ${(copy.bodyBlock2Title || copy.bodyBlock2 || copy.closingLine) ? `
  <div class="w8v2-b2" style="background-color:${pageBg};padding:0 36px 0;">
    <div class="w8v2-b2-inner" style="background-color:${pageBg};border-radius:10px;padding:16px 20px;">
      ${copy.bodyBlock2 ? `<div class="mobile-body" style="font-size:17px;line-height:1.8;color:${mutedTextCol};margin-bottom:18px;font-family:Arial,sans-serif;">${b2body}</div>` : ''}
      ${copy.closingLine ? `<div class="mobile-closing" style="font-size:17px;line-height:1.7;color:${mutedTextCol};font-style:italic;margin-bottom:24px;font-family:Georgia,serif;">${copy.closingLine}</div>` : ''}
    </div>
    ${copy.ctaText ? `<div style="padding:16px 0 36px;text-align:center;">${btnImgUrl
      ? `<a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;outline:none;border:none;"><img class="w8v2-btn-img" src="${btnImgUrl}" alt="${copy.ctaText}" width="375" style="width:375px;max-width:100%;display:block;margin:0 auto;border:0;outline:none;"/></a>`
      : `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td style="background:${accent};border-radius:999px;"><a class="mobile-cta" href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:15px 40px;font-family:Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:.04em;color:#ffffff!important;-webkit-text-fill-color:#ffffff;text-decoration:none!important;white-space:nowrap;">${copy.ctaText} &rarr;</a></td></tr></table>`
    }</div>` : ''}
  </div>` : ''}

  <div style="background-color:${pageBg};">${buildFooter(client, footerData, { defaultBg: pageBg, textColor: mutedTextCol, dividerColor: dividerCol, bodyTextAlign: 'justify' })}</div>
</td></tr></table>
</body></html>`
}


/* ═══════════════════════════════════════════════════════════════════════════
   WEEK 1 WF (id 31) — Welcome Flow, code-delivery email
   Spec: TEMPLATE_SPEC.md · Mobile CSS: SHARED_MOBILE_CSS

   Structure, top to bottom:
     logo (148×44) · hero 600×312 with the offer line · intro body · "Stays"
     eyebrow pill · section headline + subhead · property cards · closing · CTA

   The property cards come from copy.propertyCards — 2 up on desktop, stacked on
   mobile — and take their pictures from images[1..4], so the hero stays images[0]
   exactly as every other template expects.

   Built fluid from the start (width:100%;max-width:600px) per CRITIQUE.md §1, so
   a 390px phone lays out at 390px and WebKit font boosting has nothing to correct.
   Every fixed-width child is guarded with max-width.
   ═══════════════════════════════════════════════════════════════════════════ */
function buildTemplateWeek1WF({ client, copy, images, footerData, isHeroGenerated = false, isStoryGenerated = false,
  heroScale=1, heroX=0, heroY=0,
  textSize=44, textTop=34, textLeft=52,
  logoColor='original', logoTop=64, logoRight=200, logoSize=44,
  img1Scale=1, img1X=0, img1Y=0,
  img2Scale=1, img2X=0, img2Y=0,
  img3Scale=1, img3X=0, img3Y=0,
  img4Scale=1, img4X=0, img4Y=0,
  btnImgUrl = null, introBtnImgUrl = null, cardBtnImgUrl = null,
  cardsGenerated = [false, false, false],
}) {
  const heroObj = images?.[0]; const heroImg = heroObj?.url || ''
  /* Cards cap at 3, so they only ever need Sub 1–3. That leaves slots 4 and 5
     free for the story section's two circles. */
  const cardImgs = [images?.[1]?.url || '', images?.[2]?.url || '', images?.[3]?.url || '']
  const storyA = images?.[4]?.url || ''
  const storyB = images?.[5]?.url || ''
  const cardTf = [
    `translate(${img1X}px,${img1Y}px) scale(${img1Scale})`,
    `translate(${img2X}px,${img2Y}px) scale(${img2Scale})`,
    `translate(${img3X}px,${img3Y}px) scale(${img3Scale})`,
    `translate(${img4X}px,${img4Y}px) scale(${img4Scale})`,
  ]

  const body    = (copy.bodyText || '').replace(/\n/g, '<br>')
  const b2body  = (copy.bodyBlock2 || '').replace(/\n/g, '<br>')
  const closing = (copy.closingLine || '').replace(/\n/g, '<br>')
  const logoUrl = client?.logoUrl || ''

  // this design sits on white unless the brand board says otherwise
  const pageBg    = footerData?.bgColor || '#ffffff'
  const accent    = footerData?.buttonColor || '#1a73e8'
  const secondary = footerData?.secondaryColor || accent

  const _rgb = pageBg.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  const _r = _rgb ? parseInt(_rgb[1],16) : 255
  const _g = _rgb ? parseInt(_rgb[2],16) : 255
  const _b = _rgb ? parseInt(_rgb[3],16) : 255
  const _lum = (0.299*_r + 0.587*_g + 0.114*_b)/255
  const lightBg      = _lum > 0.55
  const textCol      = lightBg ? '#1a1a1a' : '#ffffff'
  const mutedTextCol = lightBg ? '#595959' : '#d4d4d4'
  const faintTextCol = lightBg ? '#8a8a8a' : '#a8a8a8'
  const cardBorder   = lightBg ? '#e6e6e6' : '#3a3a3a'
  const pillBg       = lightBg ? '#f1f3f4' : 'rgba(255,255,255,0.10)'

  /* Card background: the brand's secondary, mixed most of the way into the page
     colour so it reads as a soft tint rather than a block of brand colour. */
  const _mix = (hex, ratio) => {
    const m = (hex || '').match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
    if (!m) return pageBg
    const to = (a, b) => Math.round(b + (a - b) * ratio).toString(16).padStart(2, '0')
    return `#${to(parseInt(m[1],16), _r)}${to(parseInt(m[2],16), _g)}${to(parseInt(m[3],16), _b)}`
  }
  const cardTint = _mix(secondary, 0.16)

  const logoFilter = logoColor === 'white' ? 'brightness(0) invert(1)' : logoColor === 'black' ? 'brightness(0)' : 'none'
  const logoOverlay = logoUrl
    ? `<img src="${logoUrl}" alt="${client?.name||''}" style="display:inline-block;height:${logoSize}px;width:auto;max-width:100%;filter:${logoFilter};"/>`
    : `<div style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:${mutedTextCol};">${client?.name||''}</div>`

  /* The logo now sits on the photo, so it defaults to white rather than to the
     brand's own colours — a dark logo would disappear against a dark image. */
  const heroLogoFilter = logoColor === 'original' ? 'brightness(0) invert(1)' : logoFilter
  const logoOverlayOnHero = logoUrl
    ? `<img src="${logoUrl}" alt="${client?.name||''}" style="display:inline-block;height:${logoSize}px;width:auto;max-width:100%;filter:${heroLogoFilter};"/>`
    : `<div style="font-family:Arial,sans-serif;font-size:20px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#ffffff;text-shadow:0 1px 6px rgba(0,0,0,.4);">${client?.name||''}</div>`

  const cards = Array.isArray(copy.propertyCards) ? copy.propertyCards.filter(Boolean) : []

  /**
   * One full-width card, stacked. Every count — 1, 2 or 3 — renders the same
   * shape, so nothing depends on a media query. That matters: Gmail strips the
   * <style> block, and a 2-up grid would stay 2-up on a phone there. Full width
   * is correct everywhere with no stylesheet at all.
   */
  const cardBlock = (card, i) => {
    const img = cardImgs[i] || ''
    const baked = cardsGenerated[i]
    return `<div class="w1wf-cardbox" style="background-color:${cardTint};border-radius:16px;padding:14px;margin-bottom:16px;">
      <div style="line-height:0;font-size:0;">
        ${img
          ? (baked
              // already cropped to 600×320 by Puppeteer — a plain img, no live
              // position:absolute crop needed (and none for Outlook to break)
              ? `<img src="${img}" alt="${card.name||''}" width="600" style="width:100%;height:320px;object-fit:cover;display:block;border-radius:12px;border:0;outline:none;"/>`
              : `<div style="position:relative;width:100%;height:320px;overflow:hidden;border-radius:12px;"><img src="${img}" alt="${card.name||''}" style="position:absolute;top:0;left:0;width:100%;height:320px;object-fit:cover;display:block;transform:${cardTf[i]};transform-origin:center center;"/></div>`)
          : `<div style="width:100%;height:320px;background:${pillBg};border-radius:12px;"></div>`}
      </div>
      <div style="padding:14px 6px 4px;">
        ${card.name ? `<div style="font-family:Arial,sans-serif;font-size:19px;font-weight:700;color:${textCol};line-height:1.3;">${card.name}</div>` : ''}
        ${card.stats ? `<div style="font-family:Arial,sans-serif;font-size:14px;color:${faintTextCol};line-height:1.4;margin-top:6px;">${card.stats}</div>` : ''}
        ${card.description ? `<div class="mobile-body" style="font-family:Arial,sans-serif;font-size:16px;color:${textCol};line-height:1.6;margin-top:10px;">${card.description}</div>` : ''}
        ${card.ctaText ? `<div style="margin-top:14px;">${cardBtnImgUrl
          // baked at 400×76 — width and height attributes both set (not just
          // CSS), since Outlook's Word engine ignores CSS width on <img>
          ? `<a href="${card.ctaUrl||copy.ctaUrl||'#'}" style="display:block;text-decoration:none;outline:none;border:none;"><img src="${cardBtnImgUrl}" alt="${card.ctaText}" width="200" height="38" style="width:200px;height:38px;max-width:100%;display:block;border:0;outline:none;"/></a>`
          : `<table cellpadding="0" cellspacing="0" border="0" style="margin:0;max-width:100%;"><tr><td style="background:${accent};border-radius:999px;">
              <a class="w1wf-cardcta" href="${card.ctaUrl||copy.ctaUrl||'#'}" style="display:inline-block;padding:14px 30px;font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff!important;-webkit-text-fill-color:#ffffff;text-decoration:none!important;">${card.ctaText} &rarr;</a>
            </td></tr></table>`
        }</div>` : ''}
      </div>
    </div>`
  }

  const cardsHtml = cards.length ? `
  <div style="padding:4px 0 8px;background-color:${pageBg};">
    ${cards.map((c, i) => cardBlock(c, i)).join('')}
  </div>` : ''

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@700&display=swap" rel="stylesheet"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{margin:0;padding:0;color:#1a1a1a;}
  table{border-collapse:collapse;}
  .w1wf-outer { width:100%!important; max-width:600px!important; }
  ${SHARED_MOBILE_CSS}
  @media only screen and (max-width:600px){
    .w1wf-section  { padding-left:24px!important; padding-right:24px!important; }
    /* 772px of hero is a lot of phone screen — crop it rather than scale it */
    .w1wf-hero     { height:560px!important; }
    /* let the baked button use the full phone width instead of 300px */
    .w1wf-btn-img  { width:100%!important; max-width:100%!important; }
    /* SHARED_MOBILE_CSS gives .mobile-cta 80px side padding, which a fluid card
       cannot absorb — this rule comes later, so it wins. */
    .w1wf-cta      { padding:18px 36px!important; }
    /* cards are full width at every count, so nothing needs stacking here */
    .w1wf-cardbox    { padding:14px!important; }
  }
</style></head>
<body style="margin:0;padding:32px 0 48px;background-color:#ffffff;">

<table class="w1wf-outer" cellpadding="0" cellspacing="0" bgcolor="${pageBg}" style="width:100%;max-width:600px;margin:0 auto;background-color:${pageBg};border-collapse:collapse;border-radius:20px;overflow:hidden;">
<tr><td style="background-color:${pageBg};">

  <!-- HERO: full-bleed 600×772 portrait. The logo, campaign eyebrow and headline
       all sit ON the photo — there is no separate logo band. When the Puppeteer
       hero has been baked it already carries all three, so it drops in whole. -->
  ${isHeroGenerated
    ? `<div style="line-height:0;font-size:0;background-color:${pageBg};"><a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;border:none;"><img src="${heroImg}" alt="" width="600" style="width:100%;max-width:600px;height:auto;display:block;border:0;outline:none;"/></a></div>`
    : `<div style="line-height:0;font-size:0;background-color:${pageBg};">
    <div class="w1wf-hero" style="position:relative;width:100%;max-width:600px;height:772px;overflow:hidden;">
      ${heroImg
        ? `<img src="${heroImg}" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:block;transform:translate(${heroX}px,${heroY}px) scale(${heroScale});transform-origin:center center;"/>`
        : `<div style="width:100%;height:100%;background:${pillBg};"></div>`}
      <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0.34) 0%,rgba(0,0,0,0.16) 45%,rgba(0,0,0,0.05) 70%,rgba(0,0,0,0) 100%);">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
          <tr><td valign="top" align="center" style="vertical-align:top;text-align:center;padding:${logoTop}px ${textLeft}px 0;line-height:normal;">
            ${logoOverlayOnHero}
            ${copy.campaignEyebrow ? `<div style="font-family:Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#ffffff;margin-top:30px;text-shadow:0 1px 6px rgba(0,0,0,.4);">${copy.campaignEyebrow}</div>` : ''}
            ${copy.headlineText ? `<div style="font-family:'Lora',Georgia,serif;font-size:${textSize}px;font-weight:700;color:#ffffff;line-height:1.16;text-shadow:0 2px 12px rgba(0,0,0,.4);margin-top:${textTop}px;display:inline-block;max-width:100%;">${copy.headlineText}</div>` : ''}
            ${copy.heroCtaText ? `<div style="margin-top:30px;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;max-width:100%;"><tr><td style="background:#e2eae8;border-radius:999px;">
                <a class="w1wf-herocta" href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:17px 44px;font-family:Arial,sans-serif;font-size:18px;font-weight:600;color:#1f2937!important;-webkit-text-fill-color:#1f2937;text-decoration:none!important;">${copy.heroCtaText}</a>
              </td></tr></table>
            </div>` : ''}
          </td></tr>
        </table>
      </div>
    </div>
  </div>`}

  <!-- INTRO BODY -->
  ${copy.bodyText ? `<div class="w1wf-section" style="padding:26px 48px 4px;background-color:${pageBg};"><div class="mobile-body" style="font-family:Arial,sans-serif;font-size:17px;line-height:1.8;color:${mutedTextCol};">${body}</div></div>` : ''}

  <!-- INTRO CTA — pill button under the intro line, sends the reader to the stays -->
  ${copy.introCtaText ? `<div class="w1wf-section" style="padding:22px 48px 4px;text-align:center;background-color:${pageBg};">${introBtnImgUrl
    ? `<a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;outline:none;border:none;"><img class="w1wf-btn-img" src="${introBtnImgUrl}" alt="${copy.introCtaText}" width="375" style="width:375px;max-width:100%;display:block;margin:0 auto;border:0;outline:none;"/></a>`
    : `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;max-width:100%;"><tr><td style="background:${accent};border-radius:999px;">
        <a class="w1wf-cta" href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:15px 40px;font-family:Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:.04em;color:#ffffff!important;-webkit-text-fill-color:#ffffff;text-decoration:none!important;">${copy.introCtaText} &rarr;</a>
      </td></tr></table>`
  }</div>` : ''}

  <!-- DIVIDER — closes off the intro before the property section starts -->
  ${(copy.introCtaText && (copy.sectionEyebrow || copy.sectionHeadline)) ? `<div class="w1wf-section" style="padding:26px 48px 0;background-color:${pageBg};">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
      <tr><td style="height:1px;line-height:1px;font-size:0;background-color:${cardBorder};">&nbsp;</td></tr>
    </table>
  </div>` : ''}

  <!-- SECTION EYEBROW PILL -->
  ${copy.sectionEyebrow ? `<div class="w1wf-section" style="padding:26px 48px 0;text-align:center;background-color:${pageBg};">
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td style="background:${pillBg};border-radius:999px;padding:5px 14px;">
      <span style="font-family:Arial,sans-serif;font-size:12px;font-weight:600;color:${mutedTextCol};letter-spacing:.02em;">${copy.sectionEyebrow}</span>
    </td></tr></table>
  </div>` : ''}

  <!-- SECTION HEADLINE -->
  ${copy.sectionHeadline ? `<div class="w1wf-section" style="padding:12px 48px 4px;text-align:center;background-color:${pageBg};"><div style="font-family:'Lora',Georgia,serif;font-size:26px;font-weight:700;color:${textCol};line-height:1.25;">${copy.sectionHeadline}</div></div>` : ''}

  <!-- SECTION SUBHEAD -->
  ${copy.sectionSubhead ? `<div class="w1wf-section" style="padding:8px 48px 16px;text-align:center;background-color:${pageBg};"><div class="mobile-subhead" style="font-family:Georgia,serif;font-size:20px;font-weight:400;font-style:italic;color:${mutedTextCol};line-height:1.5;">${copy.sectionSubhead}</div></div>` : ''}

  <!-- PROPERTY CARDS -->
  ${cardsHtml}

  <!-- STORY — two overlapping circles, then the headline and the longer read.
       The circles overlap, which needs absolute positioning, so once Generate
       Images has run they arrive as one flat PNG at slot 4. The CSS version
       below is the on-screen preview only. -->
  ${(storyA || storyB) ? `
  <div style="background-color:${pageBg};padding:34px 0 8px;">
    <div style="line-height:0;font-size:0;text-align:center;">
      ${isStoryGenerated
        ? `<img src="${storyA}" alt="" width="600" style="width:100%;max-width:600px;height:auto;display:block;margin:0 auto;border:0;outline:none;"/>`
        : `<div style="position:relative;width:100%;max-width:600px;height:360px;margin:0 auto;">
            <!-- pair spans 60→540, i.e. 480 wide centred in the 600 box -->
            ${storyB ? `<div style="position:absolute;left:60px;top:150px;width:200px;height:200px;border-radius:50%;overflow:hidden;border:6px solid ${pageBg};"><img src="${storyB}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>` : ''}
            ${storyA ? `<div style="position:absolute;left:220px;top:20px;width:320px;height:320px;border-radius:50%;overflow:hidden;border:6px solid ${pageBg};"><img src="${storyA}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>` : ''}
          </div>`}
    </div>
  </div>` : ''}

  <!-- BODY BLOCK — the observation, then the nudge -->
  ${(copy.bodyBlock2Title || copy.bodyBlock2) ? `<div class="w1wf-section" style="padding:22px 48px 0;background-color:${pageBg};">
    ${copy.bodyBlock2Title ? `<div class="mobile-b2title" style="font-family:Arial,sans-serif;font-size:22px;font-weight:700;text-transform:uppercase;letter-spacing:0;color:${secondary};line-height:1.25;margin-bottom:8px;">${copy.bodyBlock2Title}</div>` : ''}
    ${copy.bodyBlock2 ? `<div class="mobile-body" style="font-family:Arial,sans-serif;font-size:17px;line-height:1.8;color:${mutedTextCol};">${b2body}</div>` : ''}
  </div>` : ''}

  <!-- CLOSING -->
  ${closing ? `<div class="w1wf-section" style="padding:18px 48px 0;background-color:${pageBg};"><div class="mobile-closing" style="font-family:Georgia,serif;font-size:17px;font-style:italic;line-height:1.7;color:${mutedTextCol};">${closing}</div></div>` : ''}

  <!-- CTA -->
  ${copy.ctaText ? `<div class="w1wf-section" style="padding:22px 48px 34px;text-align:center;background-color:${pageBg};">${btnImgUrl
    ? `<a href="${copy.ctaUrl||'#'}" style="display:block;text-decoration:none;outline:none;border:none;"><img class="w1wf-btn-img" src="${btnImgUrl}" alt="${copy.ctaText}" width="375" style="width:375px;max-width:100%;display:block;margin:0 auto;border:0;outline:none;"/></a>`
    : `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;max-width:100%;"><tr><td style="background:${accent};border-radius:999px;"><a class="w1wf-cta mobile-cta" href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:15px 40px;font-family:Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:.04em;color:#ffffff!important;-webkit-text-fill-color:#ffffff;text-decoration:none!important;">${copy.ctaText} &rarr;</a></td></tr></table>`
  }</div>` : ''}

  <div style="background-color:${pageBg};">${buildFooter(client, footerData, { defaultBg: pageBg, textColor: mutedTextCol, dividerColor: cardBorder, secondaryColor: secondary })}</div>

</td></tr></table>
</body></html>`
}

/* ─────────────────────────── registry ──────────────────────────────────── */
const TEMPLATES = [
  { id:17, label:'✅ Week 2', build:buildTemplateWeek2v2 },
  { id:16, label:'✅ Week 3',  build:buildTemplateWeek3v2 },
  { id:13, label:'✅ Week 5',  build:buildTemplateWeek5v2 },
  { id:18, label:'✅ Week 6', build:buildTemplateWeek6v2 },
  { id:19, label:'✅ Week 4', build:buildTemplateWeek4v2b },
  { id:23, label:'✅ Week 9', build:buildTemplateWeek9, adminOnly:true },
  { id:24, label:'✅ Week 7',   build:buildTemplateWeek7v2 },
  { id:25, label:'✅ Week 8',   build:buildTemplateWeek8v2 },
  { id:31, label:'✅ Week 1 WF', build:buildTemplateWeek1WF, welcomeFlowOnly:true },
  { id:20, label:'🧪 Test',   build:buildTemplateTest,  adminOnly:true },
]

const POOJA_NAME = 'Pooja'

/* ─────────────────────────── component ─────────────────────────────────── */
/**
 * welcomeFlow flips which templates are offered: the Welcome Flow Campaign sees
 * only its own (welcomeFlowOnly) templates, the Weekly Email Campaign sees only
 * the weekly ones. Everything else — Puppeteer generation, the edit controls,
 * zoom, mobile view — is shared, so both workflows behave identically.
 */
export default function TemplatePreview({ pulseGenBtn = false, welcomeFlow = false }) {
  const [active, setActive]         = useState(0)
  const [zoom,   setZoom]           = useState(1)
  const [mobileView, setMobileView] = useState(false)
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const { user } = useAuth()
  const isAdmin = user?.name === POOJA_NAME
  const visibleTemplates = welcomeFlow
    ? TEMPLATES.filter(t => t.welcomeFlowOnly)
    : TEMPLATES.filter(t => !t.welcomeFlowOnly && (!t.adminOnly || isAdmin))

  // Send-test-email state (admin only)
  const [sendingTest, setSendingTest] = useState(false)
  const [testResult,  setTestResult]  = useState(null)   // { ok: bool, msg: string }

  const { selectedClient, generatedCopy, selectedImages, setRenderedHtml, imageGenHtml, setImageGenHtml, headerStyle, imageStyle, aiReasoning, aiRecommendDone, clientFooter, setClientFooter, setTemplateLabel, locationId } = useCampaignStore(s => ({
    selectedClient:   s.selectedClient,
    generatedCopy:    s.generatedCopy,
    selectedImages:   s.selectedImages,
    setRenderedHtml:  s.setRenderedHtml,
    imageGenHtml:     s.imageGenHtml,
    setImageGenHtml:  s.setImageGenHtml,
    headerStyle:      s.headerStyle,
    imageStyle:       s.imageStyle,
    aiReasoning:      s.aiReasoning,
    aiRecommendDone:  s.aiRecommendDone,
    clientFooter:     s.clientFooter,
    setClientFooter:  s.setClientFooter,
    setTemplateLabel: s.setTemplateLabel,
    locationId:       s.locationId,
  }))

  const tpl = visibleTemplates[active]

  // Sync selected template label to store so ApprovalPanel can use it for naming
  useEffect(() => {
    if (tpl?.label) setTemplateLabel(tpl.label.replace(/^[⭐🖼]\s*/, '').trim())
  }, [active])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Hero editor — all week templates ─────────────────────────────────────────
  const isEditable = [10, 11, 13, 16, 17, 18, 19, 20, 23, 24, 25, 31].includes(tpl?.id)
  const [heroScale,   setHeroScale]   = useState(1)
  const [heroX,       setHeroX]       = useState(0)
  const [heroY,       setHeroY]       = useState(0)
  const [textSize,    setTextSize]    = useState(34)
  const [textTop,     setTextTop]     = useState(32)
  const [textLeft,    setTextLeft]    = useState(36)
  const [logoColor,        setLogoColor]        = useState('original') // 'original' | 'white' | 'black'
  const [footerLogoColor, setFooterLogoColor]  = useState('original') // 'original' | 'white' | 'black'
  const [footerLogoSize,  setFooterLogoSize]   = useState(40)
  const [logoTop,     setLogoTop]     = useState(24)
  const [logoRight,   setLogoRight]   = useState(36)
  const [logoSize,    setLogoSize]    = useState(70)
  const [editorSection, setEditorSection] = useState(null) // 'image' | 'headline' | 'logo' | null
  const [editorOpen,    setEditorOpen]    = useState(true)
  const [img1Scale, setImg1Scale] = useState(1)
  const [img1X,     setImg1X]     = useState(0)
  const [img1Y,     setImg1Y]     = useState(0)
  const [img2Scale, setImg2Scale] = useState(1)
  const [img2X,     setImg2X]     = useState(0)
  const [img2Y,     setImg2Y]     = useState(0)
  const [img3Scale, setImg3Scale] = useState(1)
  const [img3X,     setImg3X]     = useState(0)
  const [img3Y,     setImg3Y]     = useState(0)
  const [img4Scale, setImg4Scale] = useState(1)
  const [img4X,     setImg4X]     = useState(0)
  const [img4Y,     setImg4Y]     = useState(0)

  // Reset slider defaults when switching between editable templates
  useEffect(() => {
    if (!isEditable) return
    setHeroScale(1); setHeroX(0); setHeroY(0)
    setImg1Scale(1); setImg1X(0); setImg1Y(0)
    setImg2Scale(1); setImg2X(0); setImg2Y(0)
    setImg3Scale(1); setImg3X(0); setImg3Y(0)
    setImg4Scale(1); setImg4X(0); setImg4Y(0)
    if (tpl?.id === 10 || tpl?.id === 17) { setTextSize(38); setTextTop(32);  setTextLeft(24);  setLogoColor('original'); setLogoTop(32); setLogoRight(200); setLogoSize(40) }
    if (tpl?.id === 11) { setTextSize(40); setTextTop(14);  setTextLeft(52);  setLogoColor('white');    setLogoTop(40); setLogoRight(36);  setLogoSize(44) }
    if (tpl?.id === 13) { setTextSize(52); setTextTop(32);  setTextLeft(36);  setLogoColor('white');    setLogoTop(28); setLogoRight(36);  setLogoSize(40) }
    if (tpl?.id === 16) { setTextSize(40); setTextTop(14);  setTextLeft(52);  setLogoColor('white');    setLogoTop(40); setLogoRight(36);  setLogoSize(44) }
    if (tpl?.id === 18 || tpl?.id === 19) { setTextSize(38); setTextTop(32);  setTextLeft(24);  setLogoColor('original'); setLogoTop(12); setLogoRight(24);  setLogoSize(40) }
    if (tpl?.id === 24) { setTextSize(54); setTextTop(60);  setTextLeft(24);  setLogoColor('original'); setLogoTop(48); setLogoRight(200); setLogoSize(40) }
    if (tpl?.id === 20) { setTextSize(38); setTextTop(32); setTextLeft(24); setLogoColor('original'); setLogoTop(24); setLogoRight(200); setLogoSize(40) }
    if (tpl?.id === 25) { setTextSize(48); setTextTop(108); setTextLeft(28); setLogoColor('white');    setLogoTop(28); setLogoRight(28);  setLogoSize(40) }
    if (tpl?.id === 23) { setTextSize(68); setTextTop(80);  setTextLeft(64); setLogoColor('white');    setLogoTop(28); setLogoRight(28);  setLogoSize(44) }
    if (tpl?.id === 31) { setTextSize(44); setTextTop(34);  setTextLeft(52); setLogoColor('original'); setLogoTop(64); setLogoRight(200); setLogoSize(44) }
  }, [tpl?.id])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Week template image generation ───────────────────────────────────────────
  const isWeekTemplate = [10, 11, 13, 16, 17, 18, 19, 20, 23, 24, 25, 31].includes(tpl?.id)
  const [weekGenUrls,     setWeekGenUrls]     = useState({})  // { [tplId]: { hero, sec, ter } }
  const [weekGenLoading,  setWeekGenLoading]  = useState(false)
  const [weekGenError,    setWeekGenError]    = useState(null)
  const [weekGenTrigger,  setWeekGenTrigger]  = useState(0)

  const baseHtml = useMemo(() => {
    if (!generatedCopy?.headlineText) return null
    if (!tpl.build) return null  // HCTI template uses image generation, not HTML build
    let effectiveImages = selectedImages
    const tplUrls = weekGenUrls[tpl?.id] || {}
    if (isWeekTemplate && (tplUrls.hero || tplUrls.sec || tplUrls.ter || tplUrls.card1 || tplUrls.card2 || tplUrls.card3)) {
      effectiveImages = [...(selectedImages || [])]
      if (tplUrls.hero)  effectiveImages[0] = { url: tplUrls.hero,  focalX: 50, focalY: 50 }
      if (tplUrls.card1) effectiveImages[1] = { url: tplUrls.card1, focalX: 50, focalY: 50 }
      if (tplUrls.card2) effectiveImages[2] = { url: tplUrls.card2, focalX: 50, focalY: 50 }
      if (tplUrls.card3) effectiveImages[3] = { url: tplUrls.card3, focalX: 50, focalY: 50 }
      if (tplUrls.sec)   effectiveImages[4] = { url: tplUrls.sec,   focalX: 50, focalY: 50 }
      if (tplUrls.ter)   effectiveImages[5] = { url: tplUrls.ter,   focalX: 50, focalY: 50 }
    }
    const editorProps = isEditable ? { heroScale, heroX, heroY, textSize, textTop, textLeft, logoColor, logoTop, logoRight, logoSize, img1Scale, img1X, img1Y, img2Scale, img2X, img2Y, img3Scale, img3X, img3Y, img4Scale, img4X, img4Y } : {}
    const isHeroGenerated = [10, 11, 13, 16, 17, 18, 19, 20, 23, 24, 25, 31].includes(tpl?.id) && !!tplUrls.hero
    // Week 1 WF bakes its two overlapping story circles into one PNG at slot 4
    const isStoryGenerated = tpl?.id === 31 && !!tplUrls.sec
    // ...and each stay photo into its own flat crop, so cardsGenerated[i] tells
    // the builder that images[i+1] is already cropped/zoomed and should render
    // as a plain <img> rather than re-applying position:absolute + a transform
    const cardsGenerated = tpl?.id === 31 ? [!!tplUrls.card1, !!tplUrls.card2, !!tplUrls.card3] : [false, false, false]
    const effectiveFooterData = clientFooter
      ? { ...clientFooter, logoColor: footerLogoColor, footerLogoSize }
      : clientFooter
    console.log('[baseHtml] tplId:', tpl?.id, 'isHeroGenerated:', isHeroGenerated, 'tplUrls:', tplUrls, 'effectiveImages[4]:', effectiveImages?.[4], 'effectiveImages[5]:', effectiveImages?.[5])
    const effectiveCopy = generatedCopy ? { ...generatedCopy, headlineText: (generatedCopy.headlineText || '').replace(/\.$/, '') } : generatedCopy
    return tpl.build({ client:selectedClient, copy:effectiveCopy, images:effectiveImages, headerStyle, imageStyle, footerData: effectiveFooterData, isHeroGenerated, isStoryGenerated, cardsGenerated, btnImgUrl: tplUrls.btn || null, introBtnImgUrl: tplUrls.introBtn || null, cardBtnImgUrl: tplUrls.cardBtn || null, stampImgUrl: tplUrls.sec || null, pinImgUrl: tplUrls.ter || null, ...editorProps })
  }, [active, selectedClient, generatedCopy, selectedImages, headerStyle, imageStyle, clientFooter, footerLogoColor, footerLogoSize, weekGenUrls, heroScale, heroX, heroY, textSize, textTop, textLeft, logoColor, logoTop, logoRight, logoSize, img1Scale, img1X, img1Y, img2Scale, img2X, img2Y, img3Scale, img3X, img3Y, img4Scale, img4X, img4Y])

  // Keep store in sync so ApprovalPanel always has the latest HTML
  useEffect(() => {
    if (baseHtml) setRenderedHtml(baseHtml)
  }, [baseHtml])

  // Auto-analyze focal points for selected images that haven't been analyzed yet
  useEffect(() => {
    const images = useCampaignStore.getState().selectedImages
    const { setSelectedImages } = useCampaignStore.getState()
    images.forEach((img, idx) => {
      if (!img || img.focalX != null) return
      const urlToUse = img.url || img.thumbnailUrl
      if (!urlToUse) return
      analyzeImageFocal({ imageUrl: urlToUse })
        .then(({ focalX, focalY }) => {
          const latest = [...useCampaignStore.getState().selectedImages]
          if (latest[idx]?.id === img.id) {
            latest[idx] = { ...latest[idx], focalX, focalY }
            setSelectedImages(latest)
          }
        })
        .catch(() => {})
    })
  }, [selectedImages])

  // Fetch footer data from brand board sheet whenever the selected client changes.
  // Falls back to a mock so templates always show a full footer preview.
  useEffect(() => {
    if (!selectedClient?.name) return
    const mockFooter = {
      found:          true,
      bgColor:        '#1c1c1c',
      buttonColor:    '#e84b8a',
      secondaryColor: '#c8965a',
      contactInfo:  `hello@${(selectedClient.name||'brand').toLowerCase().replace(/\s+/g,'')}.com`,
      footerText:   `© ${new Date().getFullYear()} ${selectedClient.name}. All rights reserved.`,
      instagramUrl: 'https://www.instagram.com/',
      facebookUrl:  'https://www.facebook.com/',
      tiktokUrl:    'https://www.tiktok.com/',
      websiteUrl:   '',
    }
    fetchFooterData({ clientName: selectedClient.name })
      .then(data => {
        if (data?.found) setClientFooter(data)
        else setClientFooter(mockFooter)  // sheet has no entry yet → use mock
      })
      .catch(() => setClientFooter(mockFooter))
  }, [selectedClient?.name])  // eslint-disable-line react-hooks/exhaustive-deps

  // Inject zoom into the email body — iframe stays full size, content scales
  const previewHtml = useMemo(() => {
    if (!baseHtml) return null
    return baseHtml.replace('<body', `<body style="zoom:${zoom}"`)
  }, [baseHtml, zoom])

  // Send the rendered email to the fixed test inbox (admin only).
  // Uses baseHtml, not previewHtml — previewHtml carries the zoom wrapper.
  const handleSendTest = useCallback(async () => {
    if (!baseHtml) return
    setSendingTest(true)
    setTestResult(null)
    try {
      const subject = `[TEST] ${selectedClient?.name || 'Template'} — ${tpl?.label?.replace(/^[^\w]+/, '') || 'preview'}`
      const res = await sendTestEmail({ html: baseHtml, subject })
      setTestResult({ ok: true, msg: `Sent to ${res.to}` })
    } catch (e) {
      setTestResult({ ok: false, msg: e.message })
    } finally {
      setSendingTest(false)
      setTimeout(() => setTestResult(null), 8000)
    }
  }, [baseHtml, selectedClient?.name, tpl?.label])

  // Write preview HTML into the iframe without reloading the document so scroll position is preserved
  const iframeRef = useRef(null)
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !previewHtml) return
    const savedY = iframe.contentWindow?.scrollY ?? 0
    iframe.contentDocument.open()
    iframe.contentDocument.write(previewHtml)
    iframe.contentDocument.close()
    // Two rAFs: first lets the DOM settle, second lets paint finish before restoring scroll
    requestAnimationFrame(() => requestAnimationFrame(() => {
      iframe.contentWindow?.scrollTo(0, savedY)
    }))
  }, [previewHtml, mobileView])

  const { setHeaderStyle, setImageStyle, setTemplateStyle } = useCampaignStore(s => ({
    setHeaderStyle:  s.setHeaderStyle,
    setImageStyle:   s.setImageStyle,
    setTemplateStyle: s.setTemplateStyle,
  }))
  const [aiLoading,  setAiLoading]  = useState(false)
  const [aiError,    setAiError]    = useState(null)
  const [aiApplied,  setAiApplied]  = useState(false)

  // ── Image Gen (html2image.net) ────────────────────────────────────────────
  const isHcti = tpl?.id === 8
  const [hctiHero,     setHctiHero]     = useState(null)
  const [hctiPolaroid, setHctiPolaroid] = useState(null)
  const [hctiLoading,  setHctiLoading]  = useState(false)
  const [hctiError,    setHctiError]    = useState(null)
  const [hctiEmail,    setHctiEmail]    = useState(null)
  const [hctiTrigger,  setHctiTrigger]  = useState(0)  // manual generate button

  // Seed local state from store on mount (survives tab/step navigation)
  useEffect(() => {
    if (imageGenHtml && !hctiEmail) {
      setHctiEmail(imageGenHtml)
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isHcti) return
    if (!generatedCopy?.headlineText) return
    if (hctiTrigger === 0) return  // don't auto-fire — wait for user to click Generate
    const heroImg  = selectedImages?.[0]?.url || selectedImages?.[0]?.thumbnailUrl
    const img1     = selectedImages?.[1]?.url || selectedImages?.[1]?.thumbnailUrl
    const img2     = selectedImages?.[2]?.url || selectedImages?.[2]?.thumbnailUrl
    const logoUrl  = selectedClient?.logoUrl || ''
    const headline = generatedCopy?.headlineText || ''
    const client   = selectedClient?.name || ''

    setHctiLoading(true)
    setHctiError(null)
    setHctiHero(null)
    setHctiPolaroid(null)
    setHctiEmail(null)

    const heroHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;900&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px}</style>
</head><body>
<div style="position:relative;width:600px;height:580px;overflow:hidden;">
  ${heroImg ? `<img src="${heroImg}" style="width:100%;height:580px;object-fit:cover;display:block;" />` : `<div style="width:100%;height:580px;background:#c8c0b5;"></div>`}
  <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0.52) 0%,rgba(0,0,0,0.05) 50%,rgba(0,0,0,0.45) 100%);display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:28px 40px 72px;text-align:center;">
    ${logoUrl ? `<img src="${logoUrl}" style="height:44px;width:auto;max-width:160px;object-fit:contain;filter:drop-shadow(0 1px 6px rgba(0,0,0,0.5));" />` : `<span style="font-size:14px;letter-spacing:.28em;text-transform:uppercase;color:#fff;font-family:Arial,sans-serif;font-weight:700;text-shadow:0 1px 8px rgba(0,0,0,0.6)">${client}</span>`}
    <div style="font-size:38px;font-weight:900;line-height:1.2;color:#fff;font-family:'Playfair Display',Georgia,serif;text-shadow:0 2px 20px rgba(0,0,0,0.7);letter-spacing:-0.3px;padding:0 8px;">${headline}</div>
  </div>
  <div style="position:absolute;bottom:-1px;left:0;right:0;line-height:0;">
    <svg viewBox="0 0 600 60" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style="display:block;width:600px;">
      <path d="M0,60 L0,30 C75,52 150,10 225,30 C300,50 375,8 450,26 C525,44 575,14 600,24 L600,60 Z" fill="#ffffff"/>
    </svg>
  </div>
</div>
</body></html>`

    const polaroidHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:#faf9f7}</style>
</head><body>
<div style="padding:40px 32px 48px;background:#faf9f7;display:flex;flex-direction:column;align-items:center;">
  <div style="display:flex;align-items:flex-start;justify-content:center;gap:24px;width:100%;">
    <div style="background:#fff;padding:10px 10px 36px;box-shadow:0 4px 20px rgba(0,0,0,0.18);flex:1;max-width:240px;transform:rotate(-4deg);margin-top:20px;">
      ${img1 ? `<img src="${img1}" style="display:block;width:100%;height:190px;object-fit:cover;" />` : `<div style="width:100%;height:190px;background:#ddd;"></div>`}
    </div>
    <div style="background:#fff;padding:10px 10px 36px;box-shadow:0 4px 20px rgba(0,0,0,0.18);flex:1;max-width:240px;transform:rotate(3deg);">
      ${img2 ? `<img src="${img2}" style="display:block;width:100%;height:190px;object-fit:cover;" />` : `<div style="width:100%;height:190px;background:#ddd;"></div>`}
    </div>
  </div>
  <div style="margin-top:36px;font-family:'Dancing Script',cursive;font-size:36px;color:#b07a50;line-height:1.2;">Favorite Memories</div>
</div>
</body></html>`

    Promise.all([
      htmlToImage({ html: heroHtml,     width: 600, height: 620 }),
      htmlToImage({ html: polaroidHtml, width: 600, height: 420 }),
    ])
      .then(([heroRes, polaroidRes]) => {
        setHctiHero(heroRes.url)
        setHctiPolaroid(polaroidRes.url)

        // Build the full email HTML with PNGs embedded — this is what goes to GHL
        const copy    = generatedCopy || {}
        const subhead = copy.subhead     || ''
        const body    = (copy.bodyText   || '').replace(/\n/g, '<br>')
        const cta     = copy.ctaText     || 'Book Now'
        const closing = copy.closingLine || ''
        const b2title = copy.body2Title  || ''
        const b2body  = copy.body2Text   || ''

        const assembledEmail = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#f5f2ed;font-family:Arial,Helvetica,sans-serif;color:#1c1c1c}
  .wrap{max-width:600px;margin:0 auto;background:#fff}
  .img-block{line-height:0}
  .img-block img{width:100%;display:block}
  .section{padding:40px 48px}
  .subhead{font-size:18px;line-height:1.65;color:#3d3830;margin-bottom:28px;text-align:center;font-family:Arial,Helvetica,sans-serif}
  .body-text{font-size:15px;line-height:1.85;color:#3d3830;margin-bottom:0;font-family:Arial,Helvetica,sans-serif}
  .cta-wrap{margin:28px 0;text-align:center}
  .cta{display:inline-block;padding:14px 40px;background:#3d2314;color:#fff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:6px;letter-spacing:.04em}
  .b2-section{padding:36px 48px}
  .b2-title{font-size:16px;font-weight:700;color:#1a1a1a;margin-bottom:12px;font-family:Arial,Helvetica,sans-serif}
  .b2-body{font-size:15px;line-height:1.85;color:#3d3830;margin-bottom:22px;font-family:Arial,Helvetica,sans-serif}
  .closing{font-size:15px;color:#5c5248;font-style:italic;margin-bottom:28px;font-family:Arial,Helvetica,sans-serif}
  .footer{background:#1c1c1c;padding:20px 40px;text-align:center;font-size:10px;color:#6b6458;font-family:Arial,Helvetica,sans-serif;letter-spacing:.1em;text-transform:uppercase}
</style></head><body>
<div class="wrap">

  <!-- 1. Hero PNG -->
  <div class="img-block"><img src="${heroRes.url}" width="600" style="width:100%;display:block;" alt=""/></div>

  <!-- 2. Subhead + CTA + Body -->
  <div class="section">
    ${subhead ? `<p class="subhead">${subhead}</p>` : ''}
    ${cta     ? `<div class="cta-wrap"><a href="#" class="cta">${cta}</a></div>` : ''}
    ${body    ? `<p class="body-text">${body}</p>` : ''}
  </div>

  <!-- 3. Polaroid PNG -->
  <div class="img-block"><img src="${polaroidRes.url}" width="600" style="width:100%;display:block;" alt=""/></div>

  <!-- 4. Body Block 2 + Closing Line + CTA -->
  <div class="b2-section">
    ${b2title  ? `<p class="b2-title">${b2title}</p>` : ''}
    ${b2body   ? `<p class="b2-body">${b2body}</p>` : ''}
    ${closing  ? `<p class="closing">${closing}</p>` : ''}
    ${cta      ? `<div class="cta-wrap"><a href="#" class="cta">${cta}</a></div>` : ''}
  </div>

  <!-- 5. Footer -->
  <div class="footer">© ${new Date().getFullYear()} ${selectedClient?.name || 'Brand'} &nbsp;·&nbsp; <a href="#" style="color:#6b6458">Unsubscribe</a></div>

</div>
</body></html>`

        setRenderedHtml(assembledEmail)
        setHctiEmail(assembledEmail)
        setImageGenHtml(assembledEmail)  // persist to store — survives step/tab navigation
      })
      .catch(err => setHctiError(err.message))
      .finally(() => setHctiLoading(false))
  // Only re-run when URLs or headline actually change, or user clicks Generate
  // NOT on focal point updates (which change selectedImages but not URLs)
  }, [hctiTrigger])

  // Calls html2image.net first; falls back to Puppeteer + GHL upload
  const renderImage = useCallback(async ({ html, width, height, transparent }) => {
    return await htmlToImage({ html, width, height, locationId, apiKey: selectedClient?.ghlApiKey, transparent })
  }, [locationId, selectedClient?.ghlApiKey])

  // Week template image generation effect
  useEffect(() => {
    if (!isWeekTemplate) return
    if (weekGenTrigger === 0) return
    const heroImgUrl = selectedImages?.[0]?.url || selectedImages?.[0]?.thumbnailUrl || ''
    const img1Url    = selectedImages?.[1]?.url || selectedImages?.[1]?.thumbnailUrl || ''
    const img2Url    = selectedImages?.[2]?.url || selectedImages?.[2]?.thumbnailUrl || ''
    const img3Url    = selectedImages?.[3]?.url || selectedImages?.[3]?.thumbnailUrl || ''
    const img4Url    = selectedImages?.[4]?.url || selectedImages?.[4]?.thumbnailUrl || ''
    const img5Url    = selectedImages?.[5]?.url || selectedImages?.[5]?.thumbnailUrl || ''
    const logoUrl    = selectedClient?.logoUrl || ''
    const headline   = (generatedCopy?.headlineText || '').replace(/\.$/, '')
    const clientName = selectedClient?.name || ''
    // Week 5 two-font split
    const w5words = headline.trim().split(/\s+/).filter(Boolean)
    const w5First = w5words.length >= 2 ? w5words[0] : ''
    const w5Last  = w5words.length >= 3 ? w5words[w5words.length - 1] : ''
    const w5Main  = w5words.length >= 3 ? w5words.slice(1, -1).join(' ') : w5words.length === 2 ? w5words[1] : w5words[0] || ''
    const midBg      = clientFooter?.bgColor || '#fff'
    const midBgIsLight = (() => { const m = midBg.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i); if (!m) return true; const [r,g,b]=[parseInt(m[1],16),parseInt(m[2],16),parseInt(m[3],16)]; return (0.299*r+0.587*g+0.114*b) > 128; })()

    setWeekGenLoading(true)
    setWeekGenError(null)

    // Week 2: bake the full arch (image + gradient + headline) into a single PNG
    // Week 3: bake full-bleed hero (image + dark gradient + white fade + logo + headline) + stacked cards
    // Week 4: bake hero inset card + two stacked property card images
    const isWeek2 = tpl?.id === 10
    const isWeek2v2 = tpl?.id === 17
    const isWeek3 = tpl?.id === 11
    const isWeek3v2 = tpl?.id === 16
    const isWeek5 = tpl?.id === 13
    const isWeek6v2  = tpl?.id === 18
    const isWeek4v2b = tpl?.id === 19
    const isWeek9    = tpl?.id === 23
    const isWeek7v2  = tpl?.id === 24
    const isWeek8v2  = tpl?.id === 25
    const isWeek1WF  = tpl?.id === 31
    const isTest     = tpl?.id === 20
    const renderLogoFilter = logoColor === 'white' ? 'brightness(0) invert(1)' : logoColor === 'black' ? 'brightness(0)' : 'none'
    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="" style="height:${logoSize}px;width:auto;max-width:${logoSize * 5}px;display:inline-block;filter:${renderLogoFilter};"/>`
      : `<span style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#fff;">${clientName}</span>`

    const week2ArchHtml = (bg, useLoraFont = false) => `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
${useLoraFont ? '<link href="https://fonts.googleapis.com/css2?family=Lora:wght@700&display=swap" rel="stylesheet"/>' : ''}
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:${bg};}</style>
</head><body>
<div style="width:600px;height:580px;padding:0 36px;background:${bg};box-sizing:border-box;line-height:0;font-size:0;">
  <div style="position:relative;width:528px;height:580px;border-radius:999px 999px 0 0;overflow:hidden;">
    ${heroImgUrl ? `<img src="${heroImgUrl}" style="width:528px;height:580px;object-fit:cover;display:block;object-position:50% 50%;"/>` : `<div style="width:528px;height:580px;background:#c8c0b5;"></div>`}
    <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0) 0%,rgba(0,0,0,0) 50%,rgba(0,0,0,0.45) 100%);">
      <div style="position:absolute;bottom:32px;left:0;right:0;text-align:center;padding:0 24px;line-height:normal;">
        <div style="font-family:${useLoraFont ? "'Lora',Georgia,serif" : "Georgia,'Times New Roman',serif"};font-size:${textSize}px;font-weight:700;color:#fff;line-height:1.12;text-shadow:0 2px 10px rgba(0,0,0,.3);display:inline-block;max-width:360px;">${headline}</div>
      </div>
    </div>
  </div>
</div>
</body></html>`

    const week2v2LogoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="" style="height:${logoSize}px;width:auto;max-width:${logoSize * 5}px;display:inline-block;filter:${renderLogoFilter};"/>`
      : `<span style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#1a1a1a;">${clientName}</span>`

    const week2v2HeroHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@700&display=swap" rel="stylesheet"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:${midBg};}</style>
</head><body>
<div style="background:${midBg};width:600px;padding:${logoTop}px 32px 18px;box-sizing:border-box;line-height:normal;font-size:initial;text-align:center;">
  ${week2v2LogoHtml}
</div>
<div style="width:600px;padding:0 36px;background:${midBg};box-sizing:border-box;line-height:0;font-size:0;">
  <div style="position:relative;width:528px;height:680px;border-radius:999px 999px 0 0;overflow:hidden;">
    ${heroImgUrl ? `<img src="${heroImgUrl}" style="position:absolute;top:0;left:0;width:528px;height:680px;object-fit:cover;display:block;transform:translate(${heroX}px,${heroY}px) scale(${heroScale});transform-origin:center center;"/>` : `<div style="width:528px;height:680px;background:#c8c0b5;"></div>`}
    <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0) 0%,rgba(0,0,0,0) 50%,rgba(0,0,0,0.45) 100%);">
      <div style="position:absolute;bottom:${textTop}px;left:0;right:0;text-align:center;padding:0 ${textLeft}px;line-height:normal;">
        <div style="font-family:'Lora',Georgia,serif;font-size:${textSize}px;font-weight:700;color:#fff;line-height:1.12;text-shadow:0 2px 10px rgba(0,0,0,.3);display:inline-block;max-width:360px;">${headline}</div>
      </div>
    </div>
  </div>
</div>
</body></html>`




    /* Week 1 WF: one full-bleed 600×772 portrait hero carrying the logo, the
       campaign eyebrow and the headline, matching the reference email. The logo
       is forced white here because it now sits on the photograph. */
    const week1wfBg = clientFooter?.bgColor || '#ffffff'
    const week1wfEyebrow = generatedCopy?.campaignEyebrow || ''
    const week1wfHeroCta = generatedCopy?.heroCtaText || ''
    const week1wfLogoHtml = logoUrl
      ? `<img src="${logoUrl}" style="height:${logoSize}px;width:auto;display:inline-block;filter:${logoColor === 'original' ? 'brightness(0) invert(1)' : renderLogoFilter};"/>`
      : `<span style="font-family:Arial,sans-serif;font-size:20px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.4);">${selectedClient?.name || ''}</span>`
    const week1wfHeroHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@700&display=swap" rel="stylesheet"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:${week1wfBg};}</style>
</head><body>
<div style="width:600px;background:${week1wfBg};box-sizing:border-box;line-height:0;font-size:0;">
  <div style="position:relative;width:600px;height:772px;overflow:hidden;">
    ${heroImgUrl
      ? `<img src="${heroImgUrl}" style="position:absolute;top:0;left:0;width:600px;height:772px;object-fit:cover;display:block;transform:translate(${heroX}px,${heroY}px) scale(${heroScale});transform-origin:center center;"/>`
      : `<div style="width:600px;height:772px;background:#e8eaed;"></div>`}
    <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0.34) 0%,rgba(0,0,0,0.16) 45%,rgba(0,0,0,0.05) 70%,rgba(0,0,0,0) 100%);">
      <div style="position:absolute;top:${logoTop}px;left:0;right:0;text-align:center;padding:0 ${textLeft}px;line-height:normal;">
        ${week1wfLogoHtml}
        ${week1wfEyebrow ? `<div style="font-family:Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#fff;margin-top:30px;text-shadow:0 1px 6px rgba(0,0,0,.4);">${week1wfEyebrow}</div>` : ''}
        ${headline ? `<div style="font-family:'Lora',Georgia,serif;font-size:${textSize}px;font-weight:700;color:#fff;line-height:1.16;text-shadow:0 2px 12px rgba(0,0,0,.4);margin-top:${textTop}px;display:inline-block;">${headline}</div>` : ''}
        ${week1wfHeroCta ? `<div style="margin-top:30px;">
          <span style="display:inline-block;background:#e2eae8;border-radius:999px;padding:17px 44px;font-family:Arial,sans-serif;font-size:18px;font-weight:600;color:#1f2937;white-space:nowrap;">${week1wfHeroCta}</span>
        </div>` : ''}
      </div>
    </div>
  </div>
</div>
</body></html>`

    /* Two overlapping circles baked flat. Transparent background, and the ring
       around each circle is drawn in the page colour so the smaller one reads as
       cut out of the larger without adding a visible band. */
    const week1wfPageBg = clientFooter?.bgColor || '#ffffff'
    const week1wfStoryHtml = (isWeek1WF && (img4Url || img5Url)) ? `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:transparent;}</style>
</head><body>
<div style="position:relative;width:600px;height:360px;">
  ${img5Url ? `<div style="position:absolute;left:60px;top:150px;width:200px;height:200px;border-radius:50%;overflow:hidden;border:6px solid ${week1wfPageBg};"><img src="${img5Url}" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>` : ''}
  ${img4Url ? `<div style="position:absolute;left:220px;top:20px;width:320px;height:320px;border-radius:50%;overflow:hidden;border:6px solid ${week1wfPageBg};"><img src="${img4Url}" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>` : ''}
</div>
</body></html>` : null

    const heroHtml = isWeek2
      ? week2ArchHtml(midBg, false)
      : isWeek1WF
      ? week1wfHeroHtml
      : (isWeek2v2 || isWeek6v2)
      ? week2v2HeroHtml
      : isWeek4v2b
      ? `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@700&display=swap" rel="stylesheet"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;}</style>
</head><body>
<div style="padding:20px 20px 0;line-height:0;font-size:0;">
  <div style="position:relative;width:560px;height:720px;overflow:hidden;border-radius:16px;background:#1a1a1a;">
    ${heroImgUrl ? `<img src="${heroImgUrl}" style="position:absolute;top:${Math.min(0,Math.max(720*(1-heroScale),-(720*(heroScale-1)/2)+heroY))}px;left:${Math.min(0,Math.max(560*(1-heroScale),-(560*(heroScale-1)/2)+heroX))}px;width:${560*heroScale}px;height:${720*heroScale}px;object-fit:cover;display:block;"/>` : `<div style="width:560px;height:720px;background:#2a2a2a;"></div>`}
    <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0.78) 0%,rgba(0,0,0,0.38) 45%,rgba(0,0,0,0.05) 75%,rgba(0,0,0,0) 100%);line-height:normal;font-size:initial;">
      <div style="text-align:center;padding-top:${logoTop}px;">${logoHtml}</div>
      <div style="text-align:center;padding:${textTop}px ${textLeft}px 0;">
        <div style="font-family:'Lora',Georgia,serif;font-size:${textSize}px;font-weight:700;line-height:1.12;color:#fff;">${headline}</div>
      </div>
    </div>
  </div>
</div>
</body></html>`
      : (isWeek3 || isWeek3v2)
      ? `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&display=swap" rel="stylesheet"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;}</style>
</head><body>
<div style="position:relative;width:600px;height:600px;overflow:hidden;border-radius:20px 20px 0 0;background:#1a1a1a;">
  ${heroImgUrl ? `<img src="${heroImgUrl}" style="position:absolute;top:${Math.min(0,Math.max(600*(1-heroScale),-(600*(heroScale-1)/2)+heroY))}px;left:${Math.min(0,Math.max(600*(1-heroScale),-(600*(heroScale-1)/2)+heroX))}px;width:${600*heroScale}px;height:${600*heroScale}px;object-fit:cover;display:block;"/>` : `<div style="width:600px;height:600px;background:#2a2a2a;"></div>`}
  <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0.72) 0%,rgba(0,0,0,0.28) 42%,rgba(0,0,0,0) 65%);">
    <div style="text-align:center;padding-top:${logoTop}px;">${logoHtml}</div>
    <div style="text-align:center;padding:${textTop}px ${textLeft}px 0;">
      <div style="font-family:'Playfair Display',Georgia,serif;font-size:${textSize}px;font-weight:600;line-height:1.12;color:#fff;text-shadow:0 2px 20px rgba(0,0,0,0.4);">${headline}</div>
    </div>
  </div>
  <div style="position:absolute;bottom:0;left:0;right:0;height:160px;background:linear-gradient(to bottom,${midBg}00,${midBg});"></div>
</div>
</body></html>`
      : `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px}</style>
</head><body>
<div style="position:relative;width:600px;height:400px;overflow:hidden;">
  ${heroImgUrl ? `<img src="${heroImgUrl}" style="width:600px;height:400px;object-fit:cover;display:block;"/>` : `<div style="width:600px;height:400px;background:#c8c0b5;"></div>`}
</div>
</body></html>`

    const card1Fp4  = selectedImages?.[1]?.focalX != null ? `${selectedImages[1].focalX}% ${selectedImages[1].focalY}%` : '50% 50%'
    const card2Fp4  = selectedImages?.[2]?.focalX != null ? `${selectedImages[2].focalX}% ${selectedImages[2].focalY}%` : '50% 50%'

    // Right card falls back to img1 if img2 isn't selected
    const card2Url = img2Url || img1Url

    const stackedHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:${midBg};}</style>
</head><body>
<div style="position:relative;width:600px;height:420px;background:${midBg};">
  <div style="position:absolute;left:28px;top:24px;width:272px;height:372px;border-radius:20px;transform:rotate(-3deg);transform-origin:center center;box-shadow:4px 0 20px rgba(0,0,0,0.18);overflow:hidden;z-index:1;">
    ${img1Url ? `<img src="${img1Url}" style="width:272px;height:372px;object-fit:cover;display:block;object-position:${card1Fp4};transform:translate(${img1X}px,${img1Y}px) scale(${img1Scale});transform-origin:center center;"/>` : ''}
  </div>
  <div style="position:absolute;left:296px;top:24px;width:272px;height:372px;border-radius:20px;transform:rotate(3deg);transform-origin:center center;box-shadow:-4px 0 20px rgba(0,0,0,0.18);overflow:hidden;z-index:2;">
    ${card2Url ? `<img src="${card2Url}" style="width:272px;height:372px;object-fit:cover;display:block;object-position:${img2Url ? card2Fp4 : card1Fp4};transform:translate(${img2X}px,${img2Y}px) scale(${img2Scale});transform-origin:center center;"/>` : ''}
  </div>
</div>
</body></html>`

    // Week 3 body image: padded single image with border-radius (ter slot)
    const w3BodySrc = img3Url || img1Url
    const w3BodyFp  = (img3Url ? selectedImages?.[3] : selectedImages?.[1])?.focalX != null
      ? `${(img3Url ? selectedImages[3] : selectedImages[1]).focalX}% ${(img3Url ? selectedImages[3] : selectedImages[1]).focalY}%`
      : '50% 50%'
    const week3BodyHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:${midBg};}</style>
</head><body>
<div style="padding:20px 40px 0;background:${midBg};width:600px;">
  ${w3BodySrc ? `<div style="overflow:hidden;width:520px;height:320px;border-radius:14px;"><img src="${w3BodySrc}" alt="" width="520" style="width:520px;height:320px;object-fit:cover;display:block;object-position:${w3BodyFp};transform:translate(${img3X}px,${img3Y}px) scale(${img3Scale});transform-origin:center center;"/></div>` : `<div style="width:520px;height:320px;background:#e8e4de;border-radius:14px;"></div>`}
</div>
</body></html>`

    // Week 3 v2 transparent versions (no midBg fill — lets page background show through)
    const w3v2StackedHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:transparent;}</style>
</head><body>
<div style="position:relative;width:600px;height:420px;background:transparent;">
  <div style="position:absolute;left:28px;top:24px;width:272px;height:372px;border-radius:20px;transform:rotate(-3deg);transform-origin:center center;box-shadow:4px 0 20px rgba(0,0,0,0.18);overflow:hidden;z-index:1;">
    ${img1Url ? `<img src="${img1Url}" style="width:272px;height:372px;object-fit:cover;display:block;object-position:${card1Fp4};transform:translate(${img1X}px,${img1Y}px) scale(${img1Scale});transform-origin:center center;"/>` : ''}
  </div>
  <div style="position:absolute;left:296px;top:24px;width:272px;height:372px;border-radius:20px;transform:rotate(3deg);transform-origin:center center;box-shadow:-4px 0 20px rgba(0,0,0,0.18);overflow:hidden;z-index:2;">
    ${card2Url ? `<img src="${card2Url}" style="width:272px;height:372px;object-fit:cover;display:block;object-position:${img2Url ? card2Fp4 : card1Fp4};transform:translate(${img2X}px,${img2Y}px) scale(${img2Scale});transform-origin:center center;"/>` : ''}
  </div>
</div>
</body></html>`

    const w3v2BodyHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:transparent;}</style>
</head><body>
<div style="padding:20px 40px 0;background:transparent;width:600px;">
  ${w3BodySrc ? `<div style="overflow:hidden;width:520px;height:320px;border-radius:14px;"><img src="${w3BodySrc}" alt="" width="520" style="width:520px;height:320px;object-fit:cover;display:block;object-position:${w3BodyFp};transform:translate(${img3X}px,${img3Y}px) scale(${img3Scale});transform-origin:center center;"/></div>` : `<div style="width:520px;height:320px;background:#e8e4de;border-radius:14px;"></div>`}
</div>
</body></html>`

    const w3v2AccentColor = clientFooter?.buttonColor || '#1a1a1a'
    const w3v2CtaText     = generatedCopy?.ctaText || 'Book Now'
    const w2v2AccentColor = clientFooter?.buttonColor || '#d4006a'
    const w2v2CtaText     = generatedCopy?.ctaText || 'Book Now'
    const w2v2ButtonHtml  = (isWeek2v2 || isWeek6v2 || isWeek4v2b) ? `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:transparent;}</style>
</head><body>
<div style="width:600px;text-align:center;">
  <div style="display:inline-block;background:${w2v2AccentColor};border-radius:999px;padding:20px 80px;">
    <span style="font-family:Arial,sans-serif;font-size:28px;font-weight:700;color:#ffffff;white-space:nowrap;display:inline-flex;align-items:center;">${w2v2CtaText}<span style="display:inline-flex;align-items:center;margin-left:10px;"><span style="display:inline-block;width:12px;height:2px;background:#ffffff;"></span><span style="display:inline-block;width:0;height:0;border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:7px solid #ffffff;"></span></span></span>
  </div>
</div>
</body></html>` : null

    /* Week 1 WF has THREE distinct pieces of button text — the hero pill (baked
       already, into the hero itself), the intro CTA below the intro line, and
       the "View Dates" CTA repeated on every card. The intro and card CTAs say
       different things from the main bottom CTA, so they cannot reuse btnImgUrl
       — each needs its own baked PNG, same spirit as Week 2's single button,
       just one per distinct piece of text instead of one for the whole email. */
    /* Week 1 WF's own main CTA. Kept separate from the shared Week 2 button so
       its full-width pill cannot alter Weeks 2, 4 and 6, which still use the
       centred inline-block version. */
    const week1wfMainCtaText = generatedCopy?.ctaText || 'Book Now'
    const week1wfMainBtnHtml = isWeek1WF ? `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:transparent;}</style>
</head><body>
<div style="width:600px;">
  <div style="display:block;background:${w2v2AccentColor};border-radius:999px;padding:20px 24px;text-align:center;">
    <span style="font-family:Arial,sans-serif;font-size:28px;font-weight:700;color:#ffffff;white-space:nowrap;">${week1wfMainCtaText} &rarr;</span>
  </div>
</div>
</body></html>` : null

    const week1wfIntroCtaText = generatedCopy?.introCtaText || ''
    const week1wfIntroBtnHtml = (isWeek1WF && week1wfIntroCtaText) ? `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:transparent;}</style>
</head><body>
<div style="width:600px;">
  <div style="display:block;background:${w2v2AccentColor};border-radius:999px;padding:20px 24px;text-align:center;">
    <span style="font-family:Arial,sans-serif;font-size:28px;font-weight:700;color:#ffffff;white-space:nowrap;">${week1wfIntroCtaText} &rarr;</span>
  </div>
</div>
</body></html>` : null

    // identical wording on every card by design (TEMPLATE spec), so one baked
    // image serves all three cards — same idea as Week 2 reusing one button PNG
    const week1wfCardCtaText = generatedCopy?.propertyCards?.[0]?.ctaText || ''
    const week1wfCardBtnHtml = (isWeek1WF && week1wfCardCtaText) ? `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:400px;background:transparent;}</style>
</head><body>
<div style="width:400px;text-align:center;">
  <div style="display:inline-block;background:${w2v2AccentColor};border-radius:999px;padding:17px 60px;">
    <span style="font-family:Arial,sans-serif;font-size:24px;font-weight:700;color:#ffffff;white-space:nowrap;">${week1wfCardCtaText} &rarr;</span>
  </div>
</div>
</body></html>` : null

    /* Each stay's photo, cropped and zoomed exactly as the sliders show it,
       baked flat to a 600×320 PNG. Without this the photo would need
       position:absolute + object-fit:cover live in the email, which Outlook's
       Word engine does not honour — the same reason the hero and the story
       circles are baked instead of left as live CSS crops. */
    const week1wfCardHtml = (url, scale, x, y) => url ? `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:transparent;}</style>
</head><body>
<div style="position:relative;width:600px;height:320px;overflow:hidden;">
  <img src="${url}" style="position:absolute;top:0;left:0;width:600px;height:320px;object-fit:cover;display:block;transform:translate(${x}px,${y}px) scale(${scale});transform-origin:center center;"/>
</div>
</body></html>` : null
    const week1wfCard1Html = isWeek1WF ? week1wfCardHtml(img1Url, img1Scale, img1X, img1Y) : null
    const week1wfCard2Html = isWeek1WF ? week1wfCardHtml(img2Url, img2Scale, img2X, img2Y) : null
    const week1wfCard3Html = isWeek1WF ? week1wfCardHtml(img3Url, img3Scale, img3X, img3Y) : null

    const w8v2ButtonHtml  = isWeek8v2 ? `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:transparent;}</style>
</head><body>
<div style="width:600px;text-align:center;">
  <div style="display:inline-block;background:${w2v2AccentColor};border-radius:999px;padding:20px 80px;">
    <span style="font-family:Arial,sans-serif;font-size:28px;font-weight:700;color:#ffffff;white-space:nowrap;display:inline-flex;align-items:center;">${w2v2CtaText}<span style="display:inline-flex;align-items:center;margin-left:10px;"><span style="display:inline-block;width:12px;height:2px;background:#ffffff;"></span><span style="display:inline-block;width:0;height:0;border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:7px solid #ffffff;"></span></span></span>
  </div>
</div>
</body></html>` : null

    const w7v2ButtonHtml  = isWeek7v2 ? `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:transparent;}</style>
</head><body>
<div style="width:600px;text-align:center;">
  <div style="display:inline-block;background:${w2v2AccentColor};border-radius:999px;padding:20px 80px;">
    <span style="font-family:Arial,sans-serif;font-size:28px;font-weight:700;color:#ffffff;white-space:nowrap;display:inline-flex;align-items:center;">${w2v2CtaText}<span style="display:inline-flex;align-items:center;margin-left:10px;"><span style="display:inline-block;width:12px;height:2px;background:#ffffff;"></span><span style="display:inline-block;width:0;height:0;border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:7px solid #ffffff;"></span></span></span>
  </div>
</div>
</body></html>` : null

    const w3v2ButtonHtml  = isWeek3v2 ? `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:transparent;}</style>
</head><body>
<div style="width:600px;text-align:center;">
  <div style="display:inline-block;background:${w3v2AccentColor};border-radius:999px;padding:20px 80px;">
    <span style="font-family:Arial,sans-serif;font-size:28px;font-weight:700;letter-spacing:0;color:#ffffff;white-space:nowrap;display:inline-flex;align-items:center;gap:10px;">${w3v2CtaText}<span style="display:inline-flex;align-items:center;gap:0;"><span style="display:inline-block;width:12px;height:2px;background:#ffffff;vertical-align:middle;"></span><span style="display:inline-block;width:0;height:0;border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:7px solid #ffffff;vertical-align:middle;"></span></span></span>
  </div>
</div>
</body></html>` : null

    const w5AccentColor = clientFooter?.buttonColor || '#1a1a1a'
    const w5CtaText     = generatedCopy?.ctaText || 'Book Now'
    const w5ButtonHtml  = isWeek5 ? `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:transparent;}</style>
</head><body>
<div style="width:600px;text-align:center;">
  <div style="display:inline-block;background:${w5AccentColor};border-radius:999px;padding:20px 80px;">
    <span style="font-family:Arial,sans-serif;font-size:29px;font-weight:700;color:#ffffff;white-space:nowrap;display:inline-flex;align-items:center;">${w5CtaText}<span style="display:inline-flex;align-items:center;margin-left:10px;"><span style="display:inline-block;width:12px;height:2px;background:#ffffff;"></span><span style="display:inline-block;width:0;height:0;border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:7px solid #ffffff;"></span></span></span>
  </div>
</div>
</body></html>` : null

    const polaroidHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:#f5f0e8}</style>
</head><body>
<div style="position:relative;width:600px;height:340px;overflow:hidden;">
  ${img1Url ? `<div style="position:absolute;left:55px;top:28px;width:255px;height:280px;background:#fff;border-radius:8px;transform:rotate(-4deg);box-shadow:0 8px 24px rgba(0,0,0,0.28);overflow:hidden;"><img src="${img1Url}" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>` : ''}
  ${img2Url ? `<div style="position:absolute;right:55px;top:18px;width:255px;height:280px;background:#fff;border-radius:8px;transform:rotate(4deg);box-shadow:0 8px 24px rgba(0,0,0,0.28);overflow:hidden;"><img src="${img2Url}" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>` : ''}
</div>
</body></html>`

    // ── Week 5 hero: full-bleed image + logo top-left + white-fade + headline ──
    // Week 5 hero: same inset card as Week 4 — padded, rounded, centered logo + serif headline
    const heroFp5 = selectedImages?.[0]?.focalX != null ? `${selectedImages[0].focalX}% ${selectedImages[0].focalY}%` : '50% 30%'
    const week5HeroHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,700;1,400&display=swap" rel="stylesheet"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:transparent;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}</style>
</head><body>
<div style="padding:0 20px 0;background:transparent;line-height:0;font-size:0;">
  <div style="position:relative;width:560px;height:680px;overflow:hidden;border-radius:16px;background:#1a1a1a;">
    ${heroImgUrl ? `<img src="${heroImgUrl}" style="position:absolute;top:${Math.min(0,Math.max(680*(1-heroScale),-(680*(heroScale-1)/2)+heroY))}px;left:${Math.min(0,Math.max(560*(1-heroScale),-(560*(heroScale-1)/2)+heroX))}px;width:${560*heroScale}px;height:${680*heroScale}px;object-fit:cover;display:block;"/>` : `<div style="width:560px;height:680px;background:#2a2a2a;"></div>`}
    <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0.55) 0%,rgba(0,0,0,0.25) 40%,rgba(0,0,0,0.45) 100%);line-height:normal;font-size:initial;">
      <div style="text-align:center;padding-top:${logoTop}px;">${logoHtml}</div>
      <div style="position:absolute;left:${textLeft}px;right:${textLeft}px;top:${textTop}%;">
        ${w5First ? `<div style="font-family:'Lora',serif;font-size:${Math.round(textSize * 0.8)}px;font-style:italic;font-weight:400;color:#fff;line-height:1;text-shadow:0 2px 12px rgba(0,0,0,.3);margin-bottom:2px;">${w5First}</div>` : ''}
        <div style="font-family:'Lora',serif;font-size:${textSize}px;font-weight:700;text-transform:uppercase;color:#fff;line-height:1.0;text-shadow:0 2px 20px rgba(0,0,0,.25);">${w5Main}${w5Last ? ` <span style="font-family:'Lora',serif;font-style:italic;font-weight:400;text-transform:none;font-size:${Math.round(textSize*0.9)}px;">${w5Last}</span>` : ''}</div>
      </div>
    </div>
  </div>
</div>
</body></html>`

    // ── Week 5 zigzag grid: 2×2 with narrow|wide / wide|narrow rows (sec slot) ──
    const grid1Fp = selectedImages?.[1]?.focalX != null ? `${selectedImages[1].focalX}% ${selectedImages[1].focalY}%` : '50% 50%'
    const grid2Fp = selectedImages?.[2]?.focalX != null ? `${selectedImages[2].focalX}% ${selectedImages[2].focalY}%` : '50% 50%'
    const grid3Fp = selectedImages?.[3]?.focalX != null ? `${selectedImages[3].focalX}% ${selectedImages[3].focalY}%` : '50% 50%'
    const grid4Fp = selectedImages?.[4]?.focalX != null ? `${selectedImages[4].focalX}% ${selectedImages[4].focalY}%` : '50% 50%'
    const week5GridHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:transparent;}</style>
</head><body>
<table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;border-collapse:collapse;background:transparent;">
  <tr>
    <td width="297" style="width:297px;vertical-align:top;line-height:0;font-size:0;">
      ${img1Url ? `<div style="overflow:hidden;width:297px;height:262px;"><img src="${img1Url}" alt="" width="297" style="width:297px;height:262px;object-fit:cover;display:block;object-position:${grid1Fp};transform:translate(${img1X}px,${img1Y}px) scale(${img1Scale});transform-origin:center center;"/></div>` : `<div style="width:297px;height:262px;background:#e8e4de;"></div>`}
    </td>
    <td width="6" style="width:6px;line-height:0;font-size:0;"></td>
    <td width="297" style="width:297px;vertical-align:top;line-height:0;font-size:0;">
      ${img2Url ? `<div style="overflow:hidden;width:297px;height:262px;"><img src="${img2Url}" alt="" width="297" style="width:297px;height:262px;object-fit:cover;display:block;object-position:${grid2Fp};transform:translate(${img2X}px,${img2Y}px) scale(${img2Scale});transform-origin:center center;"/></div>` : `<div style="width:297px;height:262px;background:#e8e4de;"></div>`}
    </td>
  </tr>
  <tr><td colspan="3" height="6" style="height:6px;line-height:0;font-size:0;"></td></tr>
  <tr>
    <td width="297" style="width:297px;vertical-align:top;line-height:0;font-size:0;">
      ${(img4Url || img1Url) ? `<div style="overflow:hidden;width:297px;height:262px;"><img src="${img4Url || img1Url}" alt="" width="297" style="width:297px;height:262px;object-fit:cover;display:block;object-position:${img4Url ? grid4Fp : grid1Fp};transform:translate(${img4X}px,${img4Y}px) scale(${img4Scale});transform-origin:center center;"/></div>` : `<div style="width:297px;height:262px;background:#e8e4de;"></div>`}
    </td>
    <td width="6" style="width:6px;line-height:0;font-size:0;"></td>
    <td width="297" style="width:297px;vertical-align:top;line-height:0;font-size:0;">
      ${(img3Url || img1Url) ? `<div style="overflow:hidden;width:297px;height:262px;"><img src="${img3Url || img1Url}" alt="" width="297" style="width:297px;height:262px;object-fit:cover;display:block;object-position:${img3Url ? grid3Fp : grid1Fp};transform:translate(${img3X}px,${img3Y}px) scale(${img3Scale});transform-origin:center center;"/></div>` : `<div style="width:297px;height:262px;background:#e8e4de;"></div>`}
    </td>
  </tr>
</table>
</body></html>`

    // ── Week 6 hero: padded inset image card with left-aligned two-font headline ──
    const heroFp6 = selectedImages?.[0]?.focalX != null ? `${selectedImages[0].focalX}% ${selectedImages[0].focalY}%` : '50% 30%'
    const w6words = headline.trim().split(/\s+/).filter(Boolean)
    const w6Body  = w6words.length > 1 ? w6words.slice(0, -1).join(' ') : w6words[0] || ''
    const w6Last  = w6words.length > 1 ? w6words[w6words.length - 1] : ''
    const w6NavTextColor = midBgIsLight ? '#1a1a1a' : '#ffffff'
    const w6LogoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="" style="height:${logoSize}px;width:auto;max-width:${logoSize * 5}px;display:inline-block;filter:${renderLogoFilter};"/>`
      : `<span style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${w6NavTextColor};">${clientName}</span>`
    const week6HeroHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,700;1,400&display=swap" rel="stylesheet"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;overflow:hidden;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}</style>
</head><body>
<!-- Header: logo left + nav link right, bg matches email card pageBg -->
<div style="background:${midBg};width:600px;padding:0 0 20px;box-sizing:border-box;line-height:normal;font-size:initial;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;">
    <tr>
      <td style="padding:${logoTop}px 0 0 24px;vertical-align:top;">${w6LogoHtml}</td>
      <td style="text-align:right;vertical-align:middle;padding-right:40px;">
        ${generatedCopy?.ctaText ? `<span style="font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:${w6NavTextColor};letter-spacing:.01em;">${generatedCopy.ctaText} ›</span>` : ''}
      </td>
    </tr>
  </table>
</div>
<!-- Blurred hero section -->
<div style="position:relative;width:600px;height:740px;overflow:hidden;">
  ${heroImgUrl
    ? `<img src="${heroImgUrl}" style="position:absolute;top:-30px;left:-30px;width:660px;height:800px;object-fit:cover;object-position:calc(50% + ${heroX}px) calc(50% + ${heroY}px);filter:blur(36px) saturate(1.4) brightness(0.82);display:block;"/>`
    : `<div style="position:absolute;inset:0;background:linear-gradient(160deg,#7ab5d8,#6ba87a);"></div>`}
  <!-- Inset image card -->
  <div style="position:absolute;left:28px;top:22px;right:28px;">
    <div style="position:relative;width:544px;height:480px;overflow:hidden;border-radius:20px;box-shadow:0 6px 40px rgba(0,0,0,0.3);border:2px solid rgba(255,255,255,0.55);">
      ${heroImgUrl ? `<img src="${heroImgUrl}" style="position:absolute;top:${Math.min(0,Math.max(480*(1-heroScale),-(480*(heroScale-1)/2)+heroY))}px;left:${Math.min(0,Math.max(544*(1-heroScale),-(544*(heroScale-1)/2)+heroX))}px;width:${544*heroScale}px;height:${480*heroScale}px;object-fit:cover;display:block;"/>` : ''}
      <div style="position:absolute;top:0;left:0;right:0;height:72%;background:linear-gradient(to bottom,rgba(0,0,0,0.52) 0%,rgba(0,0,0,0.16) 65%,rgba(0,0,0,0) 100%);"></div>
      <div style="position:absolute;top:0;left:0;right:0;padding:${textTop}px ${textLeft}px 0;line-height:normal;font-size:initial;text-align:center;">
        <div style="font-family:'Lora',serif;font-size:${textSize}px;font-weight:700;color:#fff;line-height:1.0;text-shadow:0 2px 16px rgba(0,0,0,.3);">${w6Body}</div>
        ${w6Last ? `<div style="font-family:'Lora',serif;font-style:italic;font-weight:400;font-size:${Math.round(textSize * 1.17)}px;color:#fff;line-height:1.0;text-shadow:0 2px 16px rgba(0,0,0,.3);">${w6Last}</div>` : ''}
      </div>
    </div>
  </div>
  <!-- Subhead on gradient — close to CTA -->
  <div style="position:absolute;top:548px;left:44px;right:44px;text-align:center;line-height:normal;font-size:initial;">
    <p style="font-family:'Lora',serif;font-size:17px;font-style:italic;line-height:1.6;color:#fff;margin:0;text-shadow:0 1px 8px rgba(0,0,0,.25);">${generatedCopy?.subhead || ''}</p>
  </div>
  <!-- CTA on gradient + arrow below -->
  <div style="position:absolute;top:610px;left:0;right:0;text-align:center;line-height:normal;font-size:initial;">
    <div style="display:inline-block;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.85);border-radius:100px;padding:14px 44px;">
      <span style="font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#fff;letter-spacing:.03em;white-space:nowrap;">${generatedCopy?.ctaText || ''}</span>
    </div>
    <div style="margin-top:0;line-height:0;font-size:0;text-align:center;">
      <div style="display:inline-block;width:2px;height:22px;background:rgba(255,255,255,0.7);vertical-align:top;"></div>
      <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:10px solid rgba(255,255,255,0.7);margin:0 auto;"></div>
    </div>
  </div>
</div>
</body></html>`

    // ── Week 6 grid: 2-up top row (277+6+277) + 1 full-width bottom (560), padded ──
    const w6grid1Fp = selectedImages?.[1]?.focalX != null ? `${selectedImages[1].focalX}% ${selectedImages[1].focalY}%` : '50% 50%'
    const w6grid2Fp = selectedImages?.[2]?.focalX != null ? `${selectedImages[2].focalX}% ${selectedImages[2].focalY}%` : '50% 50%'
    const w6grid3Fp = selectedImages?.[3]?.focalX != null ? `${selectedImages[3].focalX}% ${selectedImages[3].focalY}%` : '50% 50%'
    const w6HasTopRow = !!(img1Url || img2Url)
    const w6HasBottom = !!(img3Url || img1Url)
    const w6TopPad = w6HasTopRow ? 32 : 12
    const week6GridHeight = w6TopPad + (w6HasTopRow ? 240 : 0) + (w6HasTopRow && w6HasBottom ? 12 : 0) + (w6HasBottom ? 300 : 0)
    const week6GridHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:transparent;}</style>
</head><body>
<div style="padding:${w6TopPad}px 20px 0;background:transparent;width:600px;">
  ${w6HasTopRow ? `<table width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;border-collapse:collapse;">
    <tr>
      <td width="277" style="width:277px;vertical-align:top;line-height:0;font-size:0;">
        ${img1Url ? `<div style="overflow:hidden;width:277px;height:240px;border-radius:12px;"><img src="${img1Url}" alt="" width="277" style="width:277px;height:240px;object-fit:cover;display:block;object-position:${w6grid1Fp};transform:translate(${img1X}px,${img1Y}px) scale(${img1Scale});transform-origin:center center;"/></div>` : `<div style="width:277px;height:240px;background:#e0e4ea;border-radius:12px;"></div>`}
      </td>
      <td width="6" style="width:6px;line-height:0;font-size:0;"></td>
      <td width="277" style="width:277px;vertical-align:top;line-height:0;font-size:0;">
        ${img2Url ? `<div style="overflow:hidden;width:277px;height:240px;border-radius:12px;"><img src="${img2Url}" alt="" width="277" style="width:277px;height:240px;object-fit:cover;display:block;object-position:${w6grid2Fp};transform:translate(${img2X}px,${img2Y}px) scale(${img2Scale});transform-origin:center center;"/></div>` : `<div style="width:277px;height:240px;background:#e0e4ea;border-radius:12px;"></div>`}
      </td>
    </tr>
  </table>` : ''}
  ${w6HasBottom ? `<div style="padding-top:${w6HasTopRow ? 12 : 0}px;line-height:0;font-size:0;"><div style="overflow:hidden;width:560px;height:300px;border-radius:12px;"><img src="${img3Url || img1Url}" alt="" width="560" style="width:560px;height:300px;object-fit:cover;display:block;object-position:${img3Url ? w6grid3Fp : w6grid1Fp};transform:translate(${img3X}px,${img3Y}px) scale(${img3Scale});transform-origin:center center;"/></div></div>` : ''}
</div>
</body></html>`

    // ── Week 4 v2b Puppeteer HTML — Week 4 inset-card hero style, grid from Week 6 v2 ──
    const week4v2bHeroHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@700&display=swap" rel="stylesheet"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:transparent;}</style>
</head><body>
<div style="padding:20px 20px 0;background:transparent;line-height:0;font-size:0;">
  <div style="position:relative;width:560px;height:720px;overflow:hidden;border-radius:16px;background:#1a1a1a;">
    ${heroImgUrl ? `<img src="${heroImgUrl}" style="position:absolute;top:${Math.min(0,Math.max(720*(1-heroScale),-(720*(heroScale-1)/2)+heroY))}px;left:${Math.min(0,Math.max(560*(1-heroScale),-(560*(heroScale-1)/2)+heroX))}px;width:${560*heroScale}px;height:${720*heroScale}px;object-fit:cover;display:block;"/>` : `<div style="width:560px;height:720px;background:#2a2a2a;"></div>`}
    <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0.78) 0%,rgba(0,0,0,0.38) 45%,rgba(0,0,0,0.05) 75%,rgba(0,0,0,0) 100%);line-height:normal;font-size:initial;">
      <div style="text-align:center;padding-top:${logoTop}px;">${logoHtml}</div>
      <div style="text-align:center;padding:${textTop}px ${textLeft}px 0;">
        <div style="font-family:'Lora',Georgia,serif;font-size:${textSize}px;font-weight:700;line-height:1.12;color:#fff;">${headline}</div>
      </div>
    </div>
  </div>
</div>
</body></html>`
    // ── Week 4 v2b: sec PNG = img2 stacked card (ghost+main style) ──
    const w4v2bImg2Fp = selectedImages?.[2]?.focalX != null ? `${selectedImages[2].focalX}% ${selectedImages[2].focalY}%` : '50% 50%'
    const week4v2bGridHeight = 548
    const week4v2bGridHtml = img2Url ? `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:transparent;}</style>
</head><body>
<div style="padding:20px 72px 0;background:transparent;">
  <div style="position:relative;height:508px;">
    <div style="position:absolute;top:24px;left:24px;right:24px;bottom:24px;border-radius:16px;transform:rotate(5deg);transform-origin:center;background:url('${img2Url}') ${w4v2bImg2Fp}/cover no-repeat;opacity:0.45;"></div>
    <div style="position:absolute;top:24px;left:24px;right:24px;bottom:24px;border-radius:16px;overflow:hidden;z-index:1;background:url('${img2Url}') ${w4v2bImg2Fp}/cover no-repeat;"></div>
  </div>
</div>
</body></html>` : null

    // ── Week 4 v2b: stacked single-card (Week 4 ghost+main style, ter PNG) ──
    const w4v2bFp1 = selectedImages?.[1]?.focalX != null ? `${selectedImages[1].focalX}% ${selectedImages[1].focalY}%` : '50% 50%'
    const week4v2bStackedHtml = img1Url ? `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:transparent;}</style>
</head><body>
<div style="padding:20px 72px 0;background:transparent;">
  <div style="position:relative;height:508px;">
    <div style="position:absolute;top:24px;left:24px;right:24px;bottom:24px;border-radius:16px;transform:rotate(5deg);transform-origin:center;background:url('${img1Url}') ${w4v2bFp1}/cover no-repeat;opacity:0.45;"></div>
    <div style="position:absolute;top:24px;left:24px;right:24px;bottom:24px;border-radius:16px;overflow:hidden;z-index:1;background:url('${img1Url}') ${w4v2bFp1}/cover no-repeat;"></div>
  </div>
</div>
</body></html>` : null

    // ── Test template: map-pin hero PNG + stamp card PNG ──
    const testPinBg     = clientFooter?.bgColor    || '#cde8cd'
    const testPinAccent = clientFooter?.buttonColor || '#1a4a3a'
    const testHeroFp    = selectedImages?.[0]?.focalX != null ? `${selectedImages[0].focalX}% ${selectedImages[0].focalY}%` : '50% 50%'
    const testPinHl     = (generatedCopy?.headlineText || '').replace(/\.$/, '')
    const testHeroHtml  = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,700&display=swap" rel="stylesheet"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:transparent;-webkit-font-smoothing:antialiased;}</style>
</head><body>
<div style="width:600px;height:520px;background:${testPinBg};position:relative;overflow:hidden;">
  <svg style="position:absolute;width:0;height:0;overflow:hidden;"><defs>
    <clipPath id="pinClip" clipPathUnits="userSpaceOnUse">
      <path d="M265,510 C235,460 171,378 133,273 A140,140 0 1,1 397,273 C359,378 295,460 265,510 Z"/>
    </clipPath>
  </defs></svg>
  <div style="position:absolute;top:0;left:0;width:600px;height:520px;clip-path:url(#pinClip);">
    ${heroImgUrl ? `<img src="${heroImgUrl}" style="position:absolute;left:125px;top:85px;width:280px;height:425px;object-fit:cover;object-position:${testHeroFp};display:block;"/>` : `<div style="position:absolute;left:125px;top:85px;width:280px;height:425px;background:#8a9e8a;"></div>`}
  </div>
  <div style="position:absolute;left:225px;top:185px;width:80px;height:80px;border-radius:50%;background:${testPinBg};"></div>
</div>
</body></html>`

    const testFp1 = selectedImages?.[1]?.focalX != null ? `${selectedImages[1].focalX}% ${selectedImages[1].focalY}%` : '50% 50%'
    const testStampCP = (() => {
      const bR = 8, bStep = 16, nH = 15, nV = 19, eW = 256, eH = 320
      let d = `M ${bR},${bR} `
      for (let i = 0; i < nH; i++) d += `A ${bR} ${bR} 0 0 1 ${bR + (i + 1) * bStep},${bR} `
      for (let i = 0; i < nV; i++) d += `A ${bR} ${bR} 0 0 1 ${eW - bR},${bR + (i + 1) * bStep} `
      for (let i = 0; i < nH; i++) d += `A ${bR} ${bR} 0 0 1 ${eW - bR - (i + 1) * bStep},${eH - bR} `
      for (let i = 0; i < nV; i++) d += `A ${bR} ${bR} 0 0 1 ${bR},${eH - bR - (i + 1) * bStep} `
      return d + 'Z'
    })()
    const stampFrameUrl = `${window.location.origin}/stamp-frame.png`
    const testStampHtml = img1Url ? `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,700;1,400&display=swap" rel="stylesheet"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:transparent;-webkit-font-smoothing:antialiased;}</style>
</head><body>
<div style="width:600px;height:500px;background:${clientFooter?.bgColor || '#f5f4f2'};display:flex;align-items:stretch;">
  <div style="position:relative;width:400px;height:500px;overflow:hidden;background:#c8c0b5;border-radius:12px;margin:0 100px;flex-shrink:0;">
    <img src="${img1Url}" style="position:absolute;top:0;left:0;width:400px;height:500px;object-fit:cover;display:block;object-position:${testFp1};"/>
    <div style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;">
      <div style="position:relative;width:365px;height:478px;">
        <img src="${stampFrameUrl}" style="position:absolute;top:0;left:0;width:365px;height:478px;object-fit:contain;display:block;z-index:1;"/>
        <div style="position:absolute;top:58px;left:42px;right:42px;bottom:48px;overflow:hidden;z-index:2;">
          <img src="${img1Url}" style="width:100%;height:100%;object-fit:cover;display:block;object-position:${testFp1};"/>
        </div>
        <div style="position:absolute;top:72px;left:50px;right:50px;bottom:58px;display:flex;align-items:center;justify-content:center;text-align:center;z-index:3;">
          ${generatedCopy?.bodyBlock2Title ? `<div style="font-family:'Lora',Georgia,serif;font-size:22px;font-weight:700;line-height:1.25;color:${clientFooter?.secondaryColor || clientFooter?.buttonColor || '#1a1a1a'};text-transform:uppercase;letter-spacing:.04em;">${generatedCopy.bodyBlock2Title}</div>` : ''}
        </div>
      </div>
    </div>
  </div>
</div>
</body></html>` : null

    // ── Week 7: full-width hero (720px) + 3-image strip (268px) as one transparent PNG ──
    // NOTE: these w7* consts are consumed by week7v2HeroHtml / week7v2StampHtml
    const w7img1Fp = selectedImages?.[1]?.focalX != null ? `${selectedImages[1].focalX}% ${selectedImages[1].focalY}%` : '50% 50%'
    const w7img2Fp = selectedImages?.[2]?.focalX != null ? `${selectedImages[2].focalX}% ${selectedImages[2].focalY}%` : '50% 50%'
    const w7img3Fp = selectedImages?.[3]?.focalX != null ? `${selectedImages[3].focalX}% ${selectedImages[3].focalY}%` : '50% 50%'
    const w7img4Fp = selectedImages?.[4]?.focalX != null ? `${selectedImages[4].focalX}% ${selectedImages[4].focalY}%` : '50% 50%'
    const w7PageBg = clientFooter?.bgColor || '#1e2a4a'
    const w7Subhead = generatedCopy?.subhead || ''
    const w7CtaText = generatedCopy?.ctaText || ''
    const w7CtaUrl  = generatedCopy?.ctaUrl  || '#'

    // ── Week 7v2 — own copy of Week 7's full-bleed hero + 3-up strip ──
    const week7v2HeroHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@700;900&family=Lora:ital@1&display=swap" rel="stylesheet"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:transparent;}</style>
</head><body>
<div style="width:600px;background:transparent;">
  <div style="position:relative;width:600px;height:720px;overflow:hidden;background:#1a1a1a;">
    ${heroImgUrl ? `<img src="${heroImgUrl}" style="position:absolute;top:${Math.min(0,Math.max(720*(1-heroScale),-(720*(heroScale-1)/2)+heroY))}px;left:${Math.min(0,Math.max(600*(1-heroScale),-(600*(heroScale-1)/2)+heroX))}px;width:${600*heroScale}px;height:${720*heroScale}px;object-fit:cover;display:block;"/>` : `<div style="width:600px;height:720px;background:#2a2a2a;"></div>`}
    <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0.55) 0%,rgba(0,0,0,0.2) 40%,rgba(0,0,0,0.1) 65%,rgba(0,0,0,0.55) 100%);display:flex;flex-direction:column;justify-content:space-between;">
      <div style="text-align:center;padding-top:${logoTop}px;">${logoHtml}</div>
      <div style="padding:0 ${textLeft}px ${textTop}px;">
        <div style="font-family:'Lato',Arial,sans-serif;font-size:${textSize}px;font-weight:900;line-height:1.12;color:#fff;text-align:left;">${headline}</div>
        ${w7Subhead ? `<div style="font-family:'Lora',Georgia,serif;font-size:24px;font-style:italic;font-weight:700;line-height:1.55;color:rgba(255,255,255,0.9);margin-top:14px;text-align:left;max-width:520px;">${w7Subhead}</div>` : ''}
        ${w7CtaText ? `<div style="margin-top:20px;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:rgba(0,0,0,0.4);border:2px solid rgba(255,255,255,0.85);border-radius:100px;"><a href="${w7CtaUrl}" style="display:inline-block;padding:14px 44px;font-family:Arial,sans-serif;font-size:22px;font-weight:700;letter-spacing:.04em;color:#fff;text-decoration:none;white-space:nowrap;">${w7CtaText}</a></td></tr></table></div>` : ''}
      </div>
    </div>
  </div>
  ${(img1Url || img2Url || img3Url) ? `<div style="padding:8px 0 0;background-color:${w7PageBg};line-height:0;font-size:0;">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;border-collapse:collapse;line-height:0;font-size:0;">
      <tr>
        <td width="196" style="width:196px;padding:0;line-height:0;font-size:0;">${img1Url ? `<div style="position:relative;width:196px;height:260px;overflow:hidden;line-height:0;font-size:0;"><img src="${img1Url}" alt="" width="196" style="width:196px;height:260px;object-fit:cover;object-position:${w7img1Fp};transform:translate(${img1X}px,${img1Y}px) scale(${img1Scale});transform-origin:center center;"/></div>` : `<div style="width:196px;height:260px;background:#2a2a2a;"></div>`}</td>
        <td width="6" style="width:6px;padding:0;background-color:${w7PageBg};line-height:0;font-size:0;"> </td>
        <td width="196" style="width:196px;padding:0;line-height:0;font-size:0;">${img2Url ? `<div style="position:relative;width:196px;height:260px;overflow:hidden;line-height:0;font-size:0;"><img src="${img2Url}" alt="" width="196" style="width:196px;height:260px;object-fit:cover;object-position:${w7img2Fp};transform:translate(${img2X}px,${img2Y}px) scale(${img2Scale});transform-origin:center center;"/></div>` : `<div style="width:196px;height:260px;background:#2a2a2a;"></div>`}</td>
        <td width="6" style="width:6px;padding:0;background-color:${w7PageBg};line-height:0;font-size:0;"> </td>
        <td width="196" style="width:196px;padding:0;line-height:0;font-size:0;">${(img3Url || img1Url) ? `<div style="position:relative;width:196px;height:260px;overflow:hidden;line-height:0;font-size:0;"><img src="${img3Url || img1Url}" alt="" width="196" style="width:196px;height:260px;object-fit:cover;object-position:${img3Url ? w7img3Fp : w7img1Fp};transform:translate(${img3X}px,${img3Y}px) scale(${img3Scale});transform-origin:center center;"/></div>` : `<div style="width:196px;height:260px;background:#2a2a2a;"></div>`}</td>
      </tr>
    </table>
  </div>` : ''}
</div>
</body></html>`


    // ── Week 2 v2: img1 (long) and img2/img3 (strip) as separate transparent PNGs ──
    const w2img1Fp = selectedImages?.[1]?.focalX != null ? `${selectedImages[1].focalX}% ${selectedImages[1].focalY}%` : '50% 50%'
    const w2img2Fp = selectedImages?.[2]?.focalX != null ? `${selectedImages[2].focalX}% ${selectedImages[2].focalY}%` : '50% 50%'
    const w2img3Fp = selectedImages?.[3]?.focalX != null ? `${selectedImages[3].focalX}% ${selectedImages[3].focalY}%` : '50% 50%'
    // ── Week 7v2 — own stamp generator ──
    // Week 7v2 stamp — same construction as Week 7's, sourced from Sub Image 4
    const week7v2StampHtml = img4Url ? `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:400px;background:transparent;}</style>
</head><body>
<div style="position:relative;width:400px;height:500px;overflow:hidden;background:#c8c0b5;">
  <img src="${img4Url}" alt="" style="position:absolute;top:0;left:0;width:400px;height:500px;object-fit:cover;display:block;object-position:${w7img4Fp};transform:translate(${img4X}px,${img4Y}px) scale(${img4Scale});transform-origin:center center;"/>
  <div style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;">
    <div style="position:relative;width:365px;height:478px;">
      <img src="${stampFrameUrl}" alt="" style="position:absolute;top:0;left:0;width:365px;height:478px;object-fit:contain;display:block;"/>
      <div style="position:absolute;top:116px;left:94px;width:178px;height:245px;overflow:hidden;">
        <img src="${img4Url}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;object-position:${w7img4Fp};"/>
      </div>
    </div>
  </div>
</div>
</body></html>` : null

    const week2LongImgHtml = img1Url ? `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:transparent;}</style>
</head><body>
<div style="padding:0 36px 16px;line-height:0;font-size:0;background:transparent;">
  <div style="overflow:hidden;border-radius:8px;height:360px;"><img src="${img1Url}" alt="" style="width:100%;height:360px;object-fit:cover;display:block;object-position:${w2img1Fp};transform:translate(${img1X}px,${img1Y}px) scale(${img1Scale});transform-origin:center center;"/></div>
</div>
</body></html>` : null
    const week2StripHtml = img2Url ? `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:transparent;}</style>
</head><body>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background:transparent;">
  <tr>
    <td style="padding:0 4px 24px 36px;vertical-align:top;"><div style="overflow:hidden;border-radius:6px;height:220px;"><img src="${img2Url}" alt="" style="width:100%;height:220px;object-fit:cover;display:block;object-position:${w2img2Fp};transform:translate(${img2X}px,${img2Y}px) scale(${img2Scale});transform-origin:center center;"/></div></td>
    ${img3Url ? `<td style="padding:0 36px 24px 4px;vertical-align:top;"><div style="overflow:hidden;border-radius:6px;height:220px;"><img src="${img3Url}" alt="" style="width:100%;height:220px;object-fit:cover;display:block;object-position:${w2img3Fp};transform:translate(${img3X}px,${img3Y}px) scale(${img3Scale});transform-origin:center center;"/></div></td>` : ''}
  </tr>
</table>
</body></html>` : null


    // NOTE: these w8* consts are consumed by week8v2HeroHtml / PinHtml / GridHtml
    const w8HeroFp  = selectedImages?.[0]?.focalX != null ? `${selectedImages[0].focalX}% ${selectedImages[0].focalY}%` : '50% 50%'
    const w8CtaText = generatedCopy?.ctaText || 'Shop Now'

    // ── Week 8v2 — own copy of Week 8's framed hero ──
    const week8v2HeroHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@700;900&display=swap" rel="stylesheet"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:#1a1a1a;-webkit-font-smoothing:antialiased;}</style>
</head><body>
<div style="width:600px;height:680px;position:relative;overflow:hidden;background:#1a1a1a;">
  ${heroImgUrl ? `<img src="${heroImgUrl}" style="position:absolute;top:0;left:0;width:600px;height:680px;object-fit:cover;object-position:${w8HeroFp};display:block;"/>` : `<div style="position:absolute;inset:0;background:#2a2a2a;"></div>`}
  <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.35) 0%,rgba(0,0,0,0) 35%,rgba(0,0,0,0) 48%,rgba(0,0,0,0.55) 75%,rgba(0,0,0,0.72) 100%);"></div>
  <div style="position:absolute;top:64px;left:14px;right:44px;bottom:14px;border-left:1px solid rgba(255,255,255,0.55);border-right:1px solid rgba(255,255,255,0.55);border-bottom:1px solid rgba(255,255,255,0.55);"></div>
  <table cellpadding="0" cellspacing="0" border="0" style="position:absolute;top:28px;left:28px;right:52px;width:calc(100% - 80px);border-collapse:collapse;"><tr><td style="white-space:nowrap;padding-right:16px;vertical-align:middle;line-height:0;font-size:0;">${logoHtml}</td><td style="width:100%;vertical-align:middle;"><div style="height:1px;background:rgba(255,255,255,0.55);font-size:0;line-height:0;"></div></td></tr></table>
  <div style="position:absolute;bottom:34px;left:24px;right:60px;">
    <div style="font-family:'Lato',Arial,sans-serif;font-size:${textSize}px;font-weight:900;line-height:1.12;color:#fff;margin-bottom:12px;">${headline}</div>
    <div style="width:320px;height:56px;background:#fff;display:flex;align-items:center;justify-content:center;padding:0 16px;"><span style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:0.06em;color:#1a1a1a;text-transform:uppercase;white-space:nowrap;">${w8CtaText.toUpperCase()}</span></div>
  </div>
</div>
</body></html>`

    const w8img2Fp = selectedImages?.[2]?.focalX != null ? `${selectedImages[2].focalX}% ${selectedImages[2].focalY}%` : '50% 50%'
    const w8img3Fp = selectedImages?.[3]?.focalX != null ? `${selectedImages[3].focalX}% ${selectedImages[3].focalY}%` : '50% 50%'
    const w8img4Fp = selectedImages?.[4]?.focalX != null ? `${selectedImages[4].focalX}% ${selectedImages[4].focalY}%` : '50% 50%'

    // ── Week 8v2 — own copy of Week 8's 3-photo grid generator ──
    const week8v2GridHtml = (img2Url || img3Url || img4Url) ? `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:578px;background:transparent;-webkit-font-smoothing:antialiased;}</style>
</head><body>
<table width="578" cellpadding="0" cellspacing="0" border="0" style="width:578px;border-collapse:collapse;background:transparent;">
  <tr>
    <td style="padding:0 4px 0 0;vertical-align:top;line-height:0;font-size:0;"><div style="position:relative;width:190px;height:290px;border-radius:24px;overflow:hidden;">${img2Url ? `<img src="${img2Url}" alt="" style="position:absolute;top:0;left:0;width:190px;height:290px;object-fit:cover;display:block;object-position:${w8img2Fp};transform:translate(${img2X}px,${img2Y}px) scale(${img2Scale});transform-origin:center center;"/>` : `<div style="width:190px;height:290px;background:#d0d0d0;border-radius:24px;"></div>`}</div></td>
    <td style="padding:0 4px;vertical-align:top;line-height:0;font-size:0;"><div style="position:relative;width:190px;height:290px;border-radius:24px;overflow:hidden;">${img3Url ? `<img src="${img3Url}" alt="" style="position:absolute;top:0;left:0;width:190px;height:290px;object-fit:cover;display:block;object-position:${w8img3Fp};transform:translate(${img3X}px,${img3Y}px) scale(${img3Scale});transform-origin:center center;"/>` : `<div style="width:190px;height:290px;background:#d0d0d0;border-radius:24px;"></div>`}</div></td>
    <td style="padding:0 0 0 4px;vertical-align:top;line-height:0;font-size:0;"><div style="position:relative;width:190px;height:290px;border-radius:24px;overflow:hidden;">${img4Url ? `<img src="${img4Url}" alt="" style="position:absolute;top:0;left:0;width:190px;height:290px;object-fit:cover;display:block;object-position:${w8img4Fp};transform:translate(${img4X}px,${img4Y}px) scale(${img4Scale});transform-origin:center center;"/>` : `<div style="width:190px;height:290px;background:#d0d0d0;border-radius:24px;"></div>`}</div></td>
  </tr>
</table>
</body></html>` : null

    const w8img1Fp = selectedImages?.[1]?.focalX != null ? `${selectedImages[1].focalX}% ${selectedImages[1].focalY}%` : '50% 50%'

    // ── Week 8v2 — own copy of Week 8's map-pin generator ──
    const week8v2PinHtml = img1Url ? `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;height:435px;background:transparent;overflow:hidden;-webkit-font-smoothing:antialiased;}</style>
</head><body>
<div style="width:600px;overflow:hidden;height:435px;background:transparent;">
  <div style="position:relative;width:600px;height:520px;margin-left:55px;top:-82px;">
    <svg style="position:absolute;width:0;height:0;overflow:hidden;">
      <defs>
        <clipPath id="w8v2PinBaked" clipPathUnits="userSpaceOnUse">
          <path clip-rule="evenodd" d="M265,510 C235,460 171,378 133,273 A140,140 0 1,1 397,273 C359,378 295,460 265,510 Z M225,225 a40,40 0 1,0 80,0 a40,40 0 1,0 -80,0 Z"/>
        </clipPath>
      </defs>
    </svg>
    <div style="position:absolute;top:0;left:0;width:600px;height:520px;clip-path:url(#w8v2PinBaked);">
      <img src="${img1Url}" alt="" style="position:absolute;left:125px;top:85px;width:280px;height:425px;object-fit:cover;object-position:${w8img1Fp};transform:translate(${img1X}px,${img1Y}px) scale(${img1Scale});transform-origin:center center;display:block;"/>
    </div>
  </div>
</div>
</body></html>` : null

    // ── Week 9: full-bleed hero with decorative frame ──
    const w9HeroFp = selectedImages?.[0]?.focalX != null ? `${selectedImages[0].focalX}% ${selectedImages[0].focalY}%` : '50% 50%'
    const w9Subhead = generatedCopy?.subhead || ''
    const w9hLines  = (generatedCopy?.headlineText||'').replace(/\.$/, '').split('\n')
    const w9hLine1  = w9hLines[0] || ''
    const w9hLine2  = w9hLines[1] || ''
    const w9TaglineSize = Math.max(14, Math.round(textSize * 0.26))
    const w9Indent      = Math.round(textSize * 0.55)
    const w9g1Fp = selectedImages?.[1]?.focalX != null ? `${selectedImages[1].focalX}% ${selectedImages[1].focalY}%` : '50% 50%'
    const w9g2Fp = selectedImages?.[2]?.focalX != null ? `${selectedImages[2].focalX}% ${selectedImages[2].focalY}%` : '50% 50%'
    const w9g3Fp = selectedImages?.[3]?.focalX != null ? `${selectedImages[3].focalX}% ${selectedImages[3].focalY}%` : '50% 50%'
    const w9g4Fp = selectedImages?.[4]?.focalX != null ? `${selectedImages[4].focalX}% ${selectedImages[4].focalY}%` : '50% 50%'
    const week9GridHtml = isWeek9 && (img1Url || img2Url || img3Url || img4Url) ? `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;height:564px;overflow:hidden;background:transparent;}</style>
</head><body>
<table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;border-collapse:collapse;background:transparent;">
  <tr>
    <td width="298" style="width:298px;vertical-align:top;line-height:0;font-size:0;padding:0;">
      <div style="position:relative;overflow:hidden;width:298px;height:280px;background:#1a3050;">
        ${img1Url ? `<img src="${img1Url}" style="position:absolute;top:0;left:0;width:298px;height:280px;object-fit:cover;display:block;object-position:${w9g1Fp};transform:translate(${img1X}px,${img1Y}px) scale(${img1Scale});transform-origin:center center;"/>` : `<div style="width:298px;height:280px;background:#1a3050;"></div>`}
        <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0) 50%,rgba(0,0,0,0.5) 100%);"></div>
      </div>
    </td>
    <td width="4" style="width:4px;background:transparent;padding:0;line-height:0;font-size:0;"></td>
    <td style="vertical-align:top;line-height:0;font-size:0;padding:0;">
      <div style="position:relative;overflow:hidden;width:298px;height:280px;background:#1a3050;">
        ${img2Url ? `<img src="${img2Url}" style="position:absolute;top:0;left:0;width:298px;height:280px;object-fit:cover;display:block;object-position:${w9g2Fp};transform:translate(${img2X}px,${img2Y}px) scale(${img2Scale});transform-origin:center center;"/>` : `<div style="width:298px;height:280px;background:#1a3050;"></div>`}
        <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0) 50%,rgba(0,0,0,0.5) 100%);"></div>
      </div>
    </td>
  </tr>
  <tr><td colspan="3" style="height:4px;line-height:0;font-size:0;background:transparent;padding:0;"></td></tr>
  <tr>
    <td width="298" style="width:298px;vertical-align:top;line-height:0;font-size:0;padding:0;">
      <div style="position:relative;overflow:hidden;width:298px;height:280px;background:#1a3050;">
        ${img3Url ? `<img src="${img3Url}" style="position:absolute;top:0;left:0;width:298px;height:280px;object-fit:cover;display:block;object-position:${w9g3Fp};transform:translate(${img3X}px,${img3Y}px) scale(${img3Scale});transform-origin:center center;"/>` : `<div style="width:298px;height:280px;background:#1a3050;"></div>`}
        <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0) 50%,rgba(0,0,0,0.5) 100%);"></div>
      </div>
    </td>
    <td width="4" style="width:4px;background:transparent;padding:0;line-height:0;font-size:0;"></td>
    <td style="vertical-align:top;line-height:0;font-size:0;padding:0;">
      <div style="position:relative;overflow:hidden;width:298px;height:280px;background:#1a3050;">
        ${img4Url ? `<img src="${img4Url}" style="position:absolute;top:0;left:0;width:298px;height:280px;object-fit:cover;display:block;object-position:${w9g4Fp};transform:translate(${img4X}px,${img4Y}px) scale(${img4Scale});transform-origin:center center;"/>` : `<div style="width:298px;height:280px;background:#1a3050;"></div>`}
        <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0) 50%,rgba(0,0,0,0.5) 100%);"></div>
      </div>
    </td>
  </tr>
</table>
</body></html>` : null

    const week9HeroHtml = isWeek9 ? `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@1,700&display=swap" rel="stylesheet"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;height:720px;overflow:hidden;background:#1a3050;}</style>
</head><body>
<div style="position:relative;width:600px;height:720px;overflow:hidden;">
  ${heroImgUrl ? `<img src="${heroImgUrl}" alt="" style="position:absolute;top:${Math.min(0,Math.max(720*(1-heroScale),-(720*(heroScale-1)/2)+heroY))}px;left:${Math.min(0,Math.max(600*(1-heroScale),-(600*(heroScale-1)/2)+heroX))}px;width:${600*heroScale}px;height:${720*heroScale}px;object-fit:cover;display:block;"/>` : `<div style="width:600px;height:720px;background:linear-gradient(135deg,#3d5a80,#1a3050);"></div>`}
  <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0.06) 0%,rgba(0,0,0,0) 35%,rgba(0,0,0,0.15) 65%,rgba(0,0,0,0.52) 100%);">
    ${logoUrl ? `<div style="position:absolute;top:${logoTop}px;right:${logoRight}px;"><img src="${logoUrl}" alt="" style="height:${logoSize}px;width:auto;max-width:${logoSize*6}px;display:block;filter:brightness(0) invert(1);"/></div>` : `<div style="position:absolute;top:${logoTop}px;right:${logoRight}px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#fff;">${clientName}</div>`}
    <div style="position:absolute;top:168px;left:56px;width:392px;height:512px;border:2.5px solid rgba(255,255,255,0.82);border-radius:0 48px 0 0;"></div>
    <div style="position:absolute;bottom:${textTop}px;left:${textLeft}px;">
      ${w9Subhead ? `<div style="font-family:Arial,sans-serif;font-size:${w9TaglineSize}px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,0.92);margin-bottom:8px;text-shadow:0 1px 6px rgba(0,0,0,.3);">${w9Subhead}</div>` : ''}
      <div style="font-family:'Lora',Georgia,serif;font-size:${textSize}px;font-weight:700;font-style:italic;line-height:1.0;color:#fff;text-shadow:0 2px 14px rgba(0,0,0,.38);">${w9hLine1}${w9hLine2 ? `<br/><span style="padding-left:${w9Indent}px;">${w9hLine2}</span>` : ''}</div>
    </div>
  </div>
</div>
</body></html>` : null

    const heroHeight = isWeek9 ? 720 : isWeek2 ? 580 : isWeek1WF ? 772 : isWeek8v2 ? 680 : isWeek7v2 ? ((img1Url || img2Url || img3Url) ? 988 : 720) : isWeek2v2 ? (logoTop + logoSize + 18 + 680) : (isWeek3 || isWeek3v2) ? 600 : isWeek5 ? 720 : isWeek6v2 ? 820 : isWeek4v2b ? 740 : isTest ? 520 : 400
    const secondaryPromise = isWeek1WF && week1wfStoryHtml
      ? renderImage({ html: week1wfStoryHtml, width: 600, height: 360, transparent: true })
      : isWeek9 && week9GridHtml
      ? renderImage({ html: week9GridHtml, width: 600, height: 564, transparent: true })
      : isWeek2v2 && img1Url
      ? renderImage({ html: week2LongImgHtml, width: 600, height: 376, transparent: true })
      : isWeek8v2 && week8v2GridHtml
      ? renderImage({ html: week8v2GridHtml, width: 578, height: 290, transparent: true })
      : isWeek3v2 && (img1Url || img2Url)
      ? renderImage({ html: w3v2StackedHtml, width: 600, height: 420, transparent: true })
      : isWeek3 && (img1Url || img2Url)
      ? renderImage({ html: stackedHtml, width: 600, height: 420 })
      : isWeek5 && (img1Url || img2Url)
          ? renderImage({ html: week5GridHtml, width: 600, height: 530, transparent: true })
          : isWeek6v2 && (img1Url || img2Url || img3Url)
            ? renderImage({ html: week6GridHtml, width: 600, height: week6GridHeight, transparent: true })
            : isWeek4v2b && week4v2bGridHtml
            ? renderImage({ html: week4v2bGridHtml, width: 600, height: week4v2bGridHeight, transparent: true })
            : isTest && testStampHtml
            ? renderImage({ html: testStampHtml, width: 600, height: 500, transparent: true })
            : (!isWeek2 && !isWeek2v2 && !isWeek7v2 && !isWeek8v2 && !isWeek3 && !isWeek5 && !isTest && (img1Url || img2Url))
              ? renderImage({ html: polaroidHtml, width: 600, height: 340 })
              : Promise.resolve(null)

    const tertiaryPromise = isWeek8v2 && week8v2PinHtml
      ? renderImage({ html: week8v2PinHtml, width: 600, height: 435, transparent: true })
      : isWeek7v2 && img4Url
      ? renderImage({ html: week7v2StampHtml, width: 400, height: 500, transparent: true })
      : isWeek2v2 && img2Url
      ? renderImage({ html: week2StripHtml, width: 600, height: 244, transparent: true })
      : isWeek3v2 && (img3Url || img1Url)
      ? renderImage({ html: w3v2BodyHtml, width: 600, height: 340, transparent: true })
      : isWeek3 && (img3Url || img1Url)
      ? renderImage({ html: week3BodyHtml, width: 600, height: 340 })
      : isWeek4v2b && week4v2bStackedHtml
          ? renderImage({ html: week4v2bStackedHtml, width: 600, height: 548, transparent: true })
          : Promise.resolve(null)

    const buttonPromise = isWeek1WF && week1wfMainBtnHtml
      ? renderImage({ html: week1wfMainBtnHtml, width: 600, height: 88, transparent: true })
      : isWeek8v2 && w8v2ButtonHtml
      ? renderImage({ html: w8v2ButtonHtml, width: 600, height: 88, transparent: true })
      : isWeek7v2 && w7v2ButtonHtml
      ? renderImage({ html: w7v2ButtonHtml, width: 600, height: 88, transparent: true })
      : (isWeek2v2 || isWeek6v2 || isWeek4v2b || isWeek9 || isWeek1WF) && w2v2ButtonHtml
      ? renderImage({ html: w2v2ButtonHtml, width: 600, height: 88, transparent: true })
      : isWeek3v2 && w3v2ButtonHtml
      ? renderImage({ html: w3v2ButtonHtml, width: 600, height: 88, transparent: true })
      : isWeek5 && w5ButtonHtml
      ? renderImage({ html: w5ButtonHtml, width: 600, height: 88, transparent: true })
      : Promise.resolve(null)

    // Intro CTA and card CTA say different things from the main CTA, so each
    // gets its own render rather than sharing buttonPromise's single slot.
    // These are THUNKS, not promises — Week 1 WF bakes 9 images in total now
    // (hero, story, 3 card photos, 3 buttons, main CTA), and firing all 9 at
    // once means the local dev server tries to launch 9 headless Chromium
    // instances at the same moment. On a laptop that starves for CPU and a
    // couple miss the 30s function timeout. Calling these AFTER wave 1
    // resolves keeps peak concurrency at ~4 Puppeteer launches, matching what
    // every other template has always done.
    const introBtnThunk = () => isWeek1WF && week1wfIntroBtnHtml
      ? renderImage({ html: week1wfIntroBtnHtml, width: 600, height: 88, transparent: true })
      : Promise.resolve(null)
    const cardBtnThunk = () => isWeek1WF && week1wfCardBtnHtml
      ? renderImage({ html: week1wfCardBtnHtml, width: 400, height: 76, transparent: true })
      : Promise.resolve(null)
    const card1Thunk = () => isWeek1WF && week1wfCard1Html
      ? renderImage({ html: week1wfCard1Html, width: 600, height: 320, transparent: false })
      : Promise.resolve(null)
    const card2Thunk = () => isWeek1WF && week1wfCard2Html
      ? renderImage({ html: week1wfCard2Html, width: 600, height: 320, transparent: false })
      : Promise.resolve(null)
    const card3Thunk = () => isWeek1WF && week1wfCard3Html
      ? renderImage({ html: week1wfCard3Html, width: 600, height: 320, transparent: false })
      : Promise.resolve(null)

    const heroHtmlToUse = isWeek9 ? week9HeroHtml : isWeek8v2 ? week8v2HeroHtml : isWeek7v2 ? week7v2HeroHtml : isTest ? testHeroHtml : isWeek5 ? week5HeroHtml : isWeek6v2 ? week6HeroHtml : isWeek4v2b ? week4v2bHeroHtml : heroHtml

    ;(async () => {
      try {
        // wave 1 — unchanged from every other template: hero, story/stamp/pin, main CTA
        const [heroRes, secRes, terRes, btnRes] = await Promise.all([
          renderImage({ html: heroHtmlToUse, width: 600, height: heroHeight, transparent: isWeek7v2 || isWeek3v2 || isWeek5 || isWeek6v2 || isWeek4v2b }),
          secondaryPromise,
          tertiaryPromise,
          buttonPromise,
        ])

        // wave 2 — Week 1 WF only, and only started once wave 1 has finished
        const [introBtnRes, cardBtnRes, card1Res, card2Res, card3Res] = isWeek1WF
          ? await Promise.all([introBtnThunk(), cardBtnThunk(), card1Thunk(), card2Thunk(), card3Thunk()])
          : [null, null, null, null, null]

        console.log('[WeekGen] both waves resolved:', { tplId: tpl?.id, heroRes, secRes, terRes, btnRes })
        const urls = {
          hero: heroRes?.url || null, sec: secRes?.url || null, ter: terRes?.url || null, btn: btnRes?.url || null,
          introBtn: introBtnRes?.url || null, cardBtn: cardBtnRes?.url || null,
          card1: card1Res?.url || null, card2: card2Res?.url || null, card3: card3Res?.url || null,
        }
        console.log('[WeekGen] Calling setWeekGenUrls with:', urls)
        setWeekGenUrls(prev => {
          const next = { ...prev, [tpl?.id]: urls }
          console.log('[WeekGen] weekGenUrls updated to:', next)
          return next
        })
      } catch (err) {
        console.error('[WeekGen] Error:', err)
        setWeekGenError(err.message)
      } finally {
        setWeekGenLoading(false)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekGenTrigger, renderImage])

  const handleAiRecommend = async () => {
    setAiLoading(true)
    setAiError(null)
    setAiApplied(false)
    try {
      const result = await recommendTemplate({ copy: generatedCopy })
      console.log('[Auto-style] result:', result)
      setTemplateStyle({
        headerStyle: result.headerStyle,
        imageStyle:  result.imageStyle,
        aiReasoning: result.reasoning,
        boldedCopy:  result.boldedCopy,
      })
      setAiApplied(true)
      setTimeout(() => setAiApplied(false), 3000)
    } catch (err) {
      setAiError(err.message)
    } finally {
      setAiLoading(false)
    }
  }

  const accent = dark ? '#f59e0b' : '#3b82f6'

  const HEADER_STYLES = [
    { id: 1, label: '🏔 Mountain',     color: '#2c4a6e' },
    { id: 2, label: '🌲 Forest',       color: '#2d5a27' },
    { id: 3, label: '🌊 Ocean/Water',  color: '#3d2314' },
    { id: 4, label: '🏜 Desert',       color: '#b5622a' },
  ]

  const IMAGE_STYLES = [
    { id: 1, label: '▦ Grid 2×2'  },
    { id: 2, label: '📸 Polaroids' },
    { id: 3, label: '🌀 Overlap'   },
    { id: 4, label: '⭕ Circle'    },
  ]

  if (!previewHtml && !isHcti) {
    return <p style={{ fontSize: 13, color: dark ? 'rgba(255,255,255,0.3)' : '#9ca3af', padding: '16px 0' }}>No copy generated yet — go back and generate copy first.</p>
  }

  const isHeroHeader = visibleTemplates[active]?.label === 'Hero Header'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 860, margin: '0 auto' }}>

      {/* Template switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: dark ? 'rgba(255,255,255,0.28)' : '#a0a6b1', marginRight: 4 }}>
          Layout:
        </span>
        {visibleTemplates.map((t, i) => {
          const sel = active === i
          return (
            <button
              key={t.id}
              onClick={() => { setActive(i); setMobileView(false); }}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                fontFamily: 'Inter, sans-serif', cursor: 'pointer', transition: 'all 0.15s',
                background: sel ? accent : (dark ? 'rgba(255,255,255,0.05)' : '#fff'),
                color: sel ? (dark ? '#111827' : '#fff') : (dark ? 'rgba(255,255,255,0.55)' : '#6b7280'),
                border: `1.5px solid ${sel ? accent : (dark ? 'rgba(255,255,255,0.1)' : '#e2e4e7')}`,
                boxShadow: sel ? `0 2px 10px ${dark ? 'rgba(245,158,11,0.25)' : 'rgba(59,130,246,0.2)'}` : 'none',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Generate Images button — all week templates */}
      {isWeekTemplate && (
        <>
        <style>{`
          @keyframes hb-pulse {
            0%   { transform: scale(1); }
            25%  { transform: scale(1.12); box-shadow: 0 4px 20px rgba(212,0,106,0.55); }
            50%  { transform: scale(1); }
            75%  { transform: scale(1.12); box-shadow: 0 4px 20px rgba(212,0,106,0.55); }
            100% { transform: scale(1); }
          }
          .gen-btn-pulse { animation: hb-pulse 0.6s ease-in-out 3; }
        `}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            key={pulseGenBtn ? 'pulse' : 'idle'}
            className={pulseGenBtn ? 'gen-btn-pulse' : ''}
            onClick={() => setWeekGenTrigger(t => t + 1)}
            disabled={weekGenLoading}
            style={{
              padding: '7px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              fontFamily: 'Inter, sans-serif', cursor: weekGenLoading ? 'wait' : 'pointer',
              background: weekGenLoading ? (dark ? '#2a2a2a' : '#f3f4f6') : 'linear-gradient(135deg,#e85d26,#d4006a)',
              color: weekGenLoading ? (dark ? '#666' : '#aaa') : '#fff',
              border: 'none',
              boxShadow: weekGenLoading ? 'none' : '0 2px 10px rgba(212,0,106,0.3)',
              transition: 'all 0.2s',
            }}
          >
            {weekGenLoading ? '🎨 Generating…' : '🎨 Generate Images'}
          </button>
          {weekGenUrls[tpl?.id]?.hero && !weekGenLoading && (
            <span style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.4)' : '#9ca3af', fontFamily: 'Inter, sans-serif' }}>
              ✅ Hero
              {weekGenUrls[tpl?.id]?.sec ? ' · Card 1' : ''}
              {weekGenUrls[tpl?.id]?.ter ? ' · Card 2' : ''}
              {' generated'}
            </span>
          )}
          {weekGenError && (
            <span style={{ fontSize: 11, color: '#ef4444', fontFamily: 'Inter, sans-serif' }}>
              Error: {weekGenError}
            </span>
          )}
        </div>
        </>
      )}

      {/* Header + Image style pickers + AI button — only for Hero Header */}
      {isHeroHeader && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Row 1 — Header style */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: dark ? 'rgba(255,255,255,0.28)' : '#a0a6b1', width: 52 }}>
              Header:
            </span>
            {HEADER_STYLES.map(h => {
              const sel = headerStyle === h.id
              return (
                <button key={h.id} onClick={() => setHeaderStyle(h.id)} style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  fontFamily: 'Inter, sans-serif', cursor: 'pointer', transition: 'all 0.15s',
                  background: sel ? h.color : (dark ? 'rgba(255,255,255,0.05)' : '#fff'),
                  color: sel ? '#fff' : (dark ? 'rgba(255,255,255,0.55)' : '#6b7280'),
                  border: `1.5px solid ${sel ? h.color : (dark ? 'rgba(255,255,255,0.1)' : '#e2e4e7')}`,
                }}>
                  {h.label}
                </button>
              )
            })}
          </div>

          {/* Row 2 — Image style */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: dark ? 'rgba(255,255,255,0.28)' : '#a0a6b1', width: 52 }}>
              Images:
            </span>
            {IMAGE_STYLES.map(im => {
              const sel = imageStyle === im.id
              return (
                <button key={im.id} onClick={() => setImageStyle(im.id)} style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  fontFamily: 'Inter, sans-serif', cursor: 'pointer', transition: 'all 0.15s',
                  background: sel ? accent : (dark ? 'rgba(255,255,255,0.05)' : '#fff'),
                  color: sel ? (dark ? '#111827' : '#fff') : (dark ? 'rgba(255,255,255,0.55)' : '#6b7280'),
                  border: `1.5px solid ${sel ? accent : (dark ? 'rgba(255,255,255,0.1)' : '#e2e4e7')}`,
                  boxShadow: sel ? `0 2px 8px ${dark ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.18)'}` : 'none',
                }}>
                  {im.label}
                </button>
              )
            })}

            {/* AI recommend button */}
            <button
              onClick={handleAiRecommend}
              disabled={aiLoading}
              style={{
                marginLeft: 8, padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                fontFamily: 'Inter, sans-serif', cursor: aiLoading ? 'wait' : 'pointer',
                background: aiApplied ? '#16a34a' : aiLoading ? (dark ? '#2a2a2a' : '#f3f4f6') : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                color: aiLoading ? (dark ? '#666' : '#aaa') : '#fff',
                border: 'none',
                boxShadow: aiApplied ? '0 2px 10px rgba(22,163,74,0.35)' : aiLoading ? 'none' : '0 2px 10px rgba(79,70,229,0.35)',
                transition: 'all 0.2s',
              }}
            >
              {aiLoading ? '✨ Thinking…' : aiApplied ? '✅ Applied!' : '✨ Auto-style'}
            </button>
          </div>

          {/* AI reasoning chip */}
          {aiRecommendDone && aiReasoning && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '8px 14px', borderRadius: 8,
              background: dark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.06)',
              border: `1px solid ${dark ? 'rgba(124,58,237,0.25)' : 'rgba(124,58,237,0.18)'}`,
              fontSize: 12, color: dark ? 'rgba(255,255,255,0.55)' : '#6b7280',
              fontFamily: 'Inter, sans-serif', lineHeight: 1.5,
            }}>
              <span style={{ fontSize: 14 }}>🤖</span>
              <span>{aiReasoning}</span>
            </div>
          )}

          {/* AI error */}
          {aiError && (
            <div style={{ fontSize: 11, color: '#ef4444', fontFamily: 'Inter, sans-serif' }}>
              AI error: {aiError}
            </div>
          )}

        </div>
      )}

      {/* ── Editor side panel — Canva-style, floats left ── */}
      {isEditable && (
        <>
        {/* Collapsed: small floating toggle button */}
        {!editorOpen && (
          <button onClick={() => setEditorOpen(true)} title="Adjust Design" style={{
            position: 'fixed', left: 28, top: 280, zIndex: 100,
            width: 38, height: 38, borderRadius: 10, border: 'none',
            background: dark ? '#1e1e1e' : '#fff',
            boxShadow: dark ? '0 4px 16px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.12)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={dark ? '#a78bfa' : '#7c3aed'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </button>
        )}

        {/* Expanded panel */}
        {editorOpen && (
        <div style={{
          position: 'fixed', left: 28, top: 280,
          width: 220, zIndex: 100,
          maxHeight: 'calc(100vh - 124px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          background: dark ? '#1e1e1e' : '#ffffff',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : '#e8eaed'}`,
          borderRadius: 16,
          boxShadow: dark ? '0 12px 40px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.12)',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          {/* Panel header */}
          <div style={{
            padding: '12px 16px 10px',
            borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : '#f0f1f3'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={dark ? '#a78bfa' : '#7c3aed'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: dark ? '#e5e7eb' : '#111827', letterSpacing: '-0.01em' }}>
                Adjust Design
              </span>
            </div>
            {/* Collapse button */}
            <button onClick={() => setEditorOpen(false)} title="Hide panel" style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: dark ? 'rgba(255,255,255,0.3)' : '#9ca3af',
              borderRadius: 4,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          </div>

          <div style={{ padding: '10px 16px 16px', display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Section builder */}
          {[
            {
              icon: (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
              ),
              key: 'image', label: 'Image', color: '#2563eb', bg: dark ? 'rgba(37,99,235,0.15)' : '#eff6ff',
              controls: [
                { name: 'Left', min: -200, max: 200, step: 4, val: heroX,     set: setHeroX,     unit: 'px' },
                { name: 'Top', min: -200, max: 200, step: 4, val: heroY,     set: setHeroY,     unit: 'px' },
                { name: 'Zoom',  min: 1,    max: 2.5, step: 0.05, val: heroScale, set: setHeroScale, unit: 'x', toDisplay: v => v.toFixed(2) },
              ]
            },
            {
              icon: (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
                </svg>
              ),
              key: 'headline', label: 'Headline', color: '#059669', bg: dark ? 'rgba(5,150,105,0.15)' : '#ecfdf5',
              controls: [
                { name: 'Size',  min: 18, max: 56,  step: 1, val: textSize, set: setTextSize, unit: 'px' },
                { name: 'Top',   min: 10, max: 500, step: 4, val: textTop,  set: setTextTop,  unit: 'px' },
                { name: 'Left',  min: 0,  max: 580, step: 4, val: textLeft, set: setTextLeft, unit: 'px' },
              ]
            },
          ].map((section, si) => (
            <div key={section.label} style={{ marginBottom: 4 }}>
              {/* Section pill — clickable accordion toggle */}
              <div onClick={() => setEditorSection(s => s === section.key ? null : section.key)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: editorSection === section.key ? section.bg : (dark ? 'rgba(255,255,255,0.04)' : '#f9fafb'),
                  color: editorSection === section.key ? section.color : (dark ? '#9ca3af' : '#6b7280'),
                  borderRadius: 10, padding: '7px 10px',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                  textTransform: 'uppercase', marginBottom: editorSection === section.key ? 10 : 0,
                  marginTop: si === 0 ? 0 : 4,
                  cursor: 'pointer', userSelect: 'none',
                  border: `1.5px solid ${editorSection === section.key ? section.color + '44' : (dark ? 'rgba(255,255,255,0.07)' : '#e8eaed')}`,
                  transition: 'all 0.15s',
                }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{section.icon} {section.label}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  style={{ transform: editorSection === section.key ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              {editorSection === section.key && section.controls.map(ctrl => (
                <div key={ctrl.name} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: dark ? '#9ca3af' : '#6b7280', fontWeight: 500 }}>{ctrl.name}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      background: dark ? 'rgba(255,255,255,0.08)' : '#f3f4f6',
                      color: dark ? '#e5e7eb' : '#374151',
                      borderRadius: 5, padding: '1px 6px',
                    }}>
                      {ctrl.toDisplay ? ctrl.toDisplay(ctrl.val) : ctrl.val}{ctrl.unit}
                    </span>
                  </div>
                  <input type="range" min={ctrl.min} max={ctrl.max} step={ctrl.step} value={ctrl.val}
                    onChange={e => ctrl.set(Number(e.target.value))}
                    style={{ width: '100%', accentColor: section.color, cursor: 'pointer', height: 3 }}
                  />
                </div>
              ))}
            </div>
          ))}

          {/* Logo section — accordion */}
          <div style={{ marginTop: 4 }}>
            <div onClick={() => setEditorSection(s => s === 'logo' ? null : 'logo')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: editorSection === 'logo' ? (dark ? 'rgba(245,158,11,0.15)' : '#fffbeb') : (dark ? 'rgba(255,255,255,0.04)' : '#f9fafb'),
                color: editorSection === 'logo' ? '#d97706' : (dark ? '#9ca3af' : '#6b7280'),
                borderRadius: 10, padding: '7px 10px',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                textTransform: 'uppercase', marginBottom: editorSection === 'logo' ? 10 : 0,
                cursor: 'pointer', userSelect: 'none',
                border: `1.5px solid ${editorSection === 'logo' ? '#d9770644' : (dark ? 'rgba(255,255,255,0.07)' : '#e8eaed')}`,
                transition: 'all 0.15s',
              }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/>
                </svg>
                Logo
              </span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                style={{ transform: editorSection === 'logo' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
            {editorSection === 'logo' && <>
              {[
                { name: 'Size',  min: 20, max: 160, step: 2,  val: logoSize,  set: setLogoSize,  unit: 'px' },
                { name: 'Top',   min: 0,  max: 60,  step: 2,  val: logoTop,   set: setLogoTop,   unit: 'px' },
                ...(tpl?.id !== 18 && tpl?.id !== 19 ? [{ name: 'Right', min: 0, max: 580, step: 4, val: logoRight, set: setLogoRight, unit: 'px' }] : []),
              ].map(ctrl => (
                <div key={ctrl.name} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: dark ? '#9ca3af' : '#6b7280', fontWeight: 500 }}>{ctrl.name}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      background: dark ? 'rgba(255,255,255,0.08)' : '#f3f4f6',
                      color: dark ? '#e5e7eb' : '#374151',
                      borderRadius: 5, padding: '1px 6px',
                    }}>
                      {ctrl.val}{ctrl.unit}
                    </span>
                  </div>
                  <input type="range" min={ctrl.min} max={ctrl.max} step={ctrl.step} value={ctrl.val}
                    onChange={e => ctrl.set(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#d97706', cursor: 'pointer', height: 3 }}
                  />
                </div>
              ))}

              {/* Header logo color tint */}
              <div style={{ fontSize: 10, fontWeight: 600, color: dark ? '#9ca3af' : '#6b7280', marginBottom: 6, marginTop: 2 }}>Color tint</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {[
                  { key: 'original', label: 'Original', bg: dark ? '#2d2d2d' : '#f9fafb', fg: dark ? '#d1d5db' : '#374151', dot: null },
                  { key: 'white',    label: 'White',    bg: '#1f1f1f',  fg: '#fff',     dot: '#fff' },
                  { key: 'black',    label: 'Black',    bg: '#f5f5f5',  fg: '#000',     dot: '#000' },
                ].map(c => (
                  <button key={c.key} onClick={() => setLogoColor(c.key)} style={{
                    flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 10, fontWeight: 600,
                    cursor: 'pointer',
                    border: `1.5px solid ${logoColor === c.key ? '#d97706' : (dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb')}`,
                    background: logoColor === c.key ? (dark ? 'rgba(217,119,6,0.15)' : '#fffbeb') : c.bg,
                    color: logoColor === c.key ? '#d97706' : c.fg,
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}>
                    {c.dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, border: '1px solid rgba(128,128,128,0.3)', flexShrink: 0 }} />}
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Footer logo size */}
              <div style={{ marginBottom: 8, marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: dark ? '#9ca3af' : '#6b7280', fontWeight: 500 }}>Footer size</span>
                  <span style={{ fontSize: 10, fontWeight: 600, background: dark ? 'rgba(255,255,255,0.08)' : '#f3f4f6', color: dark ? '#e5e7eb' : '#374151', borderRadius: 5, padding: '1px 6px' }}>{footerLogoSize}px</span>
                </div>
                <input type="range" min={16} max={100} step={2} value={footerLogoSize}
                  onChange={e => setFooterLogoSize(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#d97706', cursor: 'pointer', height: 3 }}
                />
              </div>

              {/* Footer logo color tint */}
              <div style={{ fontSize: 10, fontWeight: 600, color: dark ? '#9ca3af' : '#6b7280', marginBottom: 6, marginTop: 2 }}>Footer color tint</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {[
                  { key: 'original', label: 'Original', bg: dark ? '#2d2d2d' : '#f9fafb', fg: dark ? '#d1d5db' : '#374151', dot: null },
                  { key: 'white',    label: 'White',    bg: '#1f1f1f',  fg: '#fff',     dot: '#fff' },
                  { key: 'black',    label: 'Black',    bg: '#f5f5f5',  fg: '#000',     dot: '#000' },
                ].map(c => (
                  <button key={c.key} onClick={() => setFooterLogoColor(c.key)} style={{
                    flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 10, fontWeight: 600,
                    cursor: 'pointer',
                    border: `1.5px solid ${footerLogoColor === c.key ? '#d97706' : (dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb')}`,
                    background: footerLogoColor === c.key ? (dark ? 'rgba(217,119,6,0.15)' : '#fffbeb') : c.bg,
                    color: footerLogoColor === c.key ? '#d97706' : c.fg,
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}>
                    {c.dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, border: '1px solid rgba(128,128,128,0.3)', flexShrink: 0 }} />}
                    {c.label}
                  </button>
                ))}
              </div>
            </>}
          </div>

          {/* Sub-image adjusters — shown for templates that have sub-images */}
          {[10, 11, 13, 16, 17, 18, 24, 25, 31].includes(tpl?.id) && [
            { key: 'sub1', label: 'Sub Image 1', color: '#7c3aed', bg: dark ? 'rgba(124,58,237,0.15)' : '#f5f3ff',
              controls: [
                { name: 'Left', min: -200, max: 200, step: 4, val: img1X,     set: setImg1X,     unit: 'px' },
                { name: 'Top', min: -200, max: 200, step: 4, val: img1Y,     set: setImg1Y,     unit: 'px' },
                { name: 'Zoom',  min: 1,    max: 2.5, step: 0.05, val: img1Scale, set: setImg1Scale, unit: 'x', toDisplay: v => v.toFixed(2) },
              ]
            },
            { key: 'sub2', label: 'Sub Image 2', color: '#db2777', bg: dark ? 'rgba(219,39,119,0.15)' : '#fdf2f8',
              controls: [
                { name: 'Left', min: -200, max: 200, step: 4, val: img2X,     set: setImg2X,     unit: 'px' },
                { name: 'Top', min: -200, max: 200, step: 4, val: img2Y,     set: setImg2Y,     unit: 'px' },
                { name: 'Zoom',  min: 1,    max: 2.5, step: 0.05, val: img2Scale, set: setImg2Scale, unit: 'x', toDisplay: v => v.toFixed(2) },
              ]
            },
            ...(tpl?.id !== 19 ? [{ key: 'sub3', label: 'Sub Image 3', color: '#ea580c', bg: dark ? 'rgba(234,88,12,0.15)' : '#fff7ed',
              controls: [
                { name: 'Left', min: -200, max: 200, step: 4, val: img3X,     set: setImg3X,     unit: 'px' },
                { name: 'Top', min: -200, max: 200, step: 4, val: img3Y,     set: setImg3Y,     unit: 'px' },
                { name: 'Zoom',  min: 1,    max: 2.5, step: 0.05, val: img3Scale, set: setImg3Scale, unit: 'x', toDisplay: v => v.toFixed(2) },
              ]
            }] : []),
            ...([13, 23, 24, 25].includes(tpl?.id) ? [{ key: 'sub4', label: 'Sub Image 4', color: '#0891b2', bg: dark ? 'rgba(8,145,178,0.15)' : '#ecfeff',
              controls: [
                { name: 'Left', min: -200, max: 200, step: 4, val: img4X,     set: setImg4X,     unit: 'px' },
                { name: 'Top', min: -200, max: 200, step: 4, val: img4Y,     set: setImg4Y,     unit: 'px' },
                { name: 'Zoom',  min: 1,    max: 2.5, step: 0.05, val: img4Scale, set: setImg4Scale, unit: 'x', toDisplay: v => v.toFixed(2) },
              ]
            }] : []),
          ].map(section => (
            <div key={section.key} style={{ marginBottom: 4 }}>
              <div onClick={() => setEditorSection(s => s === section.key ? null : section.key)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: editorSection === section.key ? section.bg : (dark ? 'rgba(255,255,255,0.04)' : '#f9fafb'),
                  color: editorSection === section.key ? section.color : (dark ? '#9ca3af' : '#6b7280'),
                  borderRadius: 10, padding: '7px 10px',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                  textTransform: 'uppercase', marginBottom: editorSection === section.key ? 10 : 0,
                  marginTop: 4,
                  cursor: 'pointer', userSelect: 'none',
                  border: `1.5px solid ${editorSection === section.key ? section.color + '44' : (dark ? 'rgba(255,255,255,0.07)' : '#e8eaed')}`,
                  transition: 'all 0.15s',
                }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                  {section.label}
                </span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  style={{ transform: editorSection === section.key ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              {editorSection === section.key && section.controls.map(ctrl => (
                <div key={ctrl.name} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: dark ? '#9ca3af' : '#6b7280', fontWeight: 500 }}>{ctrl.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, background: dark ? 'rgba(255,255,255,0.08)' : '#f3f4f6', color: dark ? '#e5e7eb' : '#374151', borderRadius: 5, padding: '1px 6px' }}>
                      {ctrl.toDisplay ? ctrl.toDisplay(ctrl.val) : ctrl.val}{ctrl.unit}
                    </span>
                  </div>
                  <input type="range" min={ctrl.min} max={ctrl.max} step={ctrl.step} value={ctrl.val}
                    onChange={e => ctrl.set(Number(e.target.value))}
                    style={{ width: '100%', accentColor: section.color, cursor: 'pointer', height: 3 }}
                  />
                </div>
              ))}
            </div>
          ))}

          {/* Divider + Reset */}
          <div style={{ height: 1, background: dark ? 'rgba(255,255,255,0.07)' : '#f0f1f3', margin: '12px 0 8px' }} />
          <button onClick={() => {
            setHeroScale(1); setHeroX(0); setHeroY(0); setFooterLogoColor('original'); setFooterLogoSize(40)
            setImg1Scale(1); setImg1X(0); setImg1Y(0); setImg2Scale(1); setImg2X(0); setImg2Y(0); setImg3Scale(1); setImg3X(0); setImg3Y(0); setImg4Scale(1); setImg4X(0); setImg4Y(0)
            if (tpl?.id === 10 || tpl?.id === 17) { setTextSize(38); setTextTop(32);  setTextLeft(24);  setLogoColor('original'); setLogoTop(32); setLogoRight(200); setLogoSize(40) }
            if (tpl?.id === 11) { setTextSize(40); setTextTop(14);  setTextLeft(52);  setLogoColor('white');    setLogoTop(40); setLogoRight(36);  setLogoSize(44) }
            if (tpl?.id === 13) { setTextSize(52); setTextTop(32);  setTextLeft(36);  setLogoColor('white');    setLogoTop(28); setLogoRight(36);  setLogoSize(40) }
            if (tpl?.id === 16) { setTextSize(40); setTextTop(14);  setTextLeft(52);  setLogoColor('white');    setLogoTop(40); setLogoRight(36);  setLogoSize(44) }
            if (tpl?.id === 18 || tpl?.id === 19) { setTextSize(38); setTextTop(32);  setTextLeft(24);  setLogoColor('original'); setLogoTop(12); setLogoRight(24);  setLogoSize(40) }
            if (tpl?.id === 24) { setTextSize(54); setTextTop(60);  setTextLeft(24);  setLogoColor('original'); setLogoTop(48); setLogoRight(200); setLogoSize(40) }
            if (tpl?.id === 23) { setTextSize(68); setTextTop(80);  setTextLeft(64);  setLogoColor('white');    setLogoTop(28); setLogoRight(28);  setLogoSize(44) }
            if (tpl?.id === 31) { setTextSize(44); setTextTop(34);  setTextLeft(52);  setLogoColor('original'); setLogoTop(64); setLogoRight(200); setLogoSize(44) }
          }} style={{
            width: '100%', padding: '7px 0', borderRadius: 8, fontSize: 11, fontWeight: 600,
            cursor: 'pointer',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
            background: dark ? 'rgba(255,255,255,0.04)' : '#f9fafb',
            color: dark ? '#9ca3af' : '#6b7280',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            transition: 'all 0.15s',
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.02"/>
            </svg>
            Reset all
          </button>

          </div>
        </div>
        )}
        </>
      )}

      {/* Browser chrome + iframe */}
      <div style={{
        border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e4e7'}`,
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: dark ? '0 8px 40px rgba(0,0,0,0.5)' : '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        {/* Title bar + zoom controls */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px',
          background: dark ? '#111111' : '#f3f4f5',
          borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e4e7'}`,
        }}>
          {/* Traffic lights + label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#febc2e' }} />
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#28c840' }} />
            <span style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.3)' : '#a0a6b1', marginLeft: 8, fontFamily: 'Inter, sans-serif' }}>
              {selectedClient?.name} · {tpl.label}
            </span>
          </div>

          {/* Zoom + view controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Send test email — admin only */}
            {isAdmin && (
              <>
                {testResult && (
                  <span style={{
                    fontSize: 11, fontFamily: 'Inter, sans-serif', maxWidth: 260,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: testResult.ok ? '#16a34a' : '#dc2626',
                  }} title={testResult.msg}>
                    {testResult.ok ? '✓ ' : '✕ '}{testResult.msg}
                  </span>
                )}
                <button
                  onClick={handleSendTest}
                  disabled={sendingTest || !baseHtml}
                  title={baseHtml ? 'Send this email to the test inbox' : 'Generate a template first'}
                  style={{
                    height: 26, padding: '0 10px', borderRadius: 6, border: 'none',
                    cursor: (sendingTest || !baseHtml) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: dark ? 'rgba(59,130,246,0.35)' : '#dbeafe',
                    color: '#3b82f6', opacity: (sendingTest || !baseHtml) ? 0.5 : 1,
                    fontSize: 11, fontWeight: 600, fontFamily: 'Inter, sans-serif',
                    marginRight: 4,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  {sendingTest ? 'Sending…' : 'Send test'}
                </button>
              </>
            )}
            {/* Mobile view toggle */}
            <button
              onClick={() => setMobileView(v => !v)}
              title={mobileView ? 'Switch to desktop view' : 'Switch to mobile view'}
              style={{
                width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: mobileView ? (dark ? 'rgba(59,130,246,0.35)' : '#dbeafe') : (dark ? 'rgba(255,255,255,0.08)' : '#e5e6e8'),
                color: mobileView ? '#3b82f6' : (dark ? 'rgba(255,255,255,0.7)' : '#555'),
                marginRight: 4,
              }}
            >
              {/* Phone icon SVG */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                <line x1="12" y1="18" x2="12.01" y2="18"/>
              </svg>
            </button>
            {[
              { label: '−', action: () => setZoom(z => Math.max(0.4, +(z - 0.1).toFixed(1))) },
              { label: '+', action: () => setZoom(z => Math.min(1.0, +(z + 0.1).toFixed(1))) },
            ].map(({ label, action }) => (
              <button key={label} onClick={action} style={{
                width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: dark ? 'rgba(255,255,255,0.08)' : '#e5e6e8',
                color: dark ? 'rgba(255,255,255,0.7)' : '#555',
                fontSize: 16, fontWeight: 700, lineHeight: 1, fontFamily: 'Inter, sans-serif',
              }}>{label}</button>
            ))}
            <button onClick={() => setZoom(1)} style={{
              minWidth: 42, padding: '3px 6px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: dark ? 'rgba(255,255,255,0.06)' : '#e5e6e8',
              color: dark ? 'rgba(255,255,255,0.5)' : '#666',
              fontSize: 11, fontWeight: 600, fontFamily: 'Inter, sans-serif',
            }}>{Math.round(zoom * 100)}%</button>
          </div>
        </div>

        {isHcti ? (
          hctiLoading ? (
            /* ── Image Gen: loading ── */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '80px 0', background: dark ? '#111' : '#fff', color: dark ? 'rgba(255,255,255,0.4)' : '#9ca3af', fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`, borderTopColor: accent, animation: 'spin 0.8s linear infinite' }} />
              <span>Generating images via html2image.net…</span>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : hctiError ? (
            /* ── Image Gen: error ── */
            <div style={{ padding: '40px 32px', background: dark ? '#111' : '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 32 }}>⚠️</span>
              <p style={{ color: '#ef4444', fontSize: 13, fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>{hctiError}</p>
              <button onClick={() => setHctiTrigger(t => t + 1)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', background: accent, color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                Try again
              </button>
            </div>
          ) : hctiEmail ? (
            /* ── Image Gen: result ── */
            <div style={{ position: 'relative' }}>
              <iframe
                key="hcti-email"
                title="Image Gen Email Preview"
                srcDoc={hctiEmail}
                style={{ width: '100%', height: 860, border: 'none', display: 'block' }}
                sandbox="allow-same-origin"
              />
              {/* Regenerate button bottom-right */}
              <div style={{ position: 'absolute', bottom: 16, right: 16 }}>
                <button onClick={() => setHctiTrigger(t => t + 1)} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', color: dark ? 'rgba(255,255,255,0.6)' : '#555', fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif', backdropFilter: 'blur(4px)' }}>
                  ↻ Regenerate
                </button>
              </div>
            </div>
          ) : (
            /* ── Image Gen: idle — show Generate button ── */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '80px 0', background: dark ? '#111' : '#fff', fontFamily: 'Inter, sans-serif' }}>
              <span style={{ fontSize: 40 }}>🖼</span>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: dark ? 'rgba(255,255,255,0.7)' : '#374151', marginBottom: 4 }}>
                  Ready to generate
                </div>
                <div style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.3)' : '#9ca3af', marginBottom: 20 }}>
                  Creates a hero image + polaroid gallery via html2image.net
                </div>
                <button
                  onClick={() => setHctiTrigger(t => t + 1)}
                  disabled={!generatedCopy?.headlineText}
                  style={{
                    padding: '10px 28px', borderRadius: 8, border: 'none',
                    cursor: generatedCopy?.headlineText ? 'pointer' : 'not-allowed',
                    background: generatedCopy?.headlineText ? accent : (dark ? '#2a2a2a' : '#e5e7eb'),
                    color: generatedCopy?.headlineText ? '#fff' : (dark ? '#555' : '#aaa'),
                    fontSize: 13, fontWeight: 700,
                  }}
                >
                  Generate Images
                </button>
              </div>
            </div>
          )
        ) : mobileView ? (
          /* ── Mobile view: phone frame at 390px ── */
          <div style={{
            background: dark ? '#111' : '#f0f2f5',
            padding: '32px 0 40px',
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
            minHeight: 860,
          }}>
            <div style={{
              width: 410, borderRadius: 40,
              background: dark ? '#1a1a1a' : '#1a1a1a',
              boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
              padding: '14px 10px',
              position: 'relative',
            }}>
              {/* Notch */}
              <div style={{
                width: 120, height: 28, borderRadius: 20,
                background: '#000', margin: '0 auto 10px',
              }} />
              {/* Screen */}
              <div style={{
                borderRadius: 28, overflow: 'hidden',
                width: 390, height: 780,
                background: '#fff',
                position: 'relative',
              }}>
                <iframe
                  key={`${active}-mobile-${weekGenUrls[tpl?.id]?.hero || 'none'}`}
                  title="Email Preview Mobile"
                  srcDoc={previewHtml}
                  style={{
                    width: 600,
                    height: Math.ceil(780 / (390 / 600)),
                    border: 'none',
                    display: 'block',
                    transform: `scale(${390 / 600})`,
                    transformOrigin: 'top left',
                  }}
                  sandbox="allow-same-origin"
                />
              </div>
              {/* Home bar */}
              <div style={{
                width: 120, height: 4, borderRadius: 4,
                background: 'rgba(255,255,255,0.3)', margin: '10px auto 0',
              }} />
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            key={`${active}-${weekGenUrls[tpl?.id]?.hero || 'none'}`}
            title="Email Preview"
            style={{ width: '100%', height: 860, border: 'none', display: 'block' }}
            sandbox="allow-same-origin"
          />
        )}
      </div>

    </div>
  )
}
