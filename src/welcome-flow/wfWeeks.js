/**
 * The emails that make up a welcome flow.
 *
 * Each one is its own thing: its own n8n workflow writes the copy, and its own
 * template renders it. Picking the week on the brief is what decides both, so
 * this list is the single place that mapping lives.
 *
 * templateId points at the TEMPLATES registry in TemplatePreview.jsx. A null
 * means that week's template has not been built yet — the week still shows in
 * the dropdown, marked as not ready, so the flow's shape stays visible.
 *
 * Webhook URLs are deliberately NOT here. The browser only ever sends the week
 * number; the server resolves it to N8N_WF_WEEK<n>_WEBHOOK_URL so the URLs stay
 * out of the bundle.
 */

export const WF_WEEKS = [
  { week: 1, templateId: 31 },   // Week 1 WF — the real welcome-offer template
  { week: 2, templateId: null },
  { week: 3, templateId: null },
  { week: 4, templateId: null },
  { week: 5, templateId: null },
  { week: 6, templateId: null },
  { week: 7, templateId: null },
  { week: 8, templateId: null },
  { week: 9, templateId: null },
]

export const wfWeek = (week) => WF_WEEKS.find(w => w.week === Number(week)) || null

/** A week is usable once its template exists. */
export const wfWeekReady = (week) => !!wfWeek(week)?.templateId
