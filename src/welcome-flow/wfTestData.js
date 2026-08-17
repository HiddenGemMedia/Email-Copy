/**
 * Test copy for the Welcome Flow — the Dev-skip path on the brief.
 *
 * Mirrors the Weekly Email Campaign's stub in useCopyGeneration.js: three named
 * variations, same field names, so anything that renders weekly copy renders
 * this too.
 *
 * Source: Starlight Haven Hot Springs, "Welcome: Claim Your Offer", Families.
 * Transcribed verbatim — do not reword. It exists to exercise the pipeline with
 * realistic text, so its length and punctuation are the point.
 *
 * Two fields go beyond what WF — Week 1 renders today:
 *   propertyCards[]  — the 2-up stay cards
 *   campaignEyebrow / sectionEyebrow / sectionHeadline / introCtaText
 * They are carried anyway so a later WF template can pick them up without the
 * test data having to be rewritten. `subhead` is set from Section Subhead, since
 * that is the field the current template actually reads.
 */

export const WF_TEST_CLIENT   = 'Starlight Haven Hot Springs'
export const WF_TEST_THEME    = 'Welcome: Claim Your Offer'
export const WF_TEST_AUDIENCE = 'Families'

const CTA_URL = 'https://example.com/book'

export const WF_TEST_VARIATIONS = [
  {
    id: 1,
    name: 'The Hotel Escape',
    subjectLine:     'Is your family done with boring hotel rooms?',
    previewText:     "Families are trading hotels for Starlight Haven's wild side.",
    campaignEyebrow: 'WELCOME OFFER · BUY3',
    headlineText:    'Nature Unfiltered. Comfort Defined.',
    bodyText:        "You signed up, so here's your reward. Use code BUY3 at checkout and save 30% on any four-night stay. Pick one your kids will actually talk about when school starts back up.",
    introCtaText:    'Claim 30% Off',
    heroCtaText:     'Use code BUY3 at checkout.',
    sectionEyebrow:  'Our Stays',
    sectionHeadline: 'Two Hideaways Built For The Whole Family',
    sectionSubhead:  'Starlight Haven gives families a real hotel alternative.',
    subhead:         'Starlight Haven gives families a real hotel alternative.',
    propertyCards: [
      { name: 'Treehouses',   stats: '2 beds | 1 bath | 4 guests', description: 'Sleep in the treetops, hot tub included.',   ctaText: 'View Dates', ctaUrl: CTA_URL },
      { name: 'Deluxe Domes', stats: '3 beds | 1 bath | 4 guests', description: 'Twin loft for kids, hot tub for parents.',   ctaText: 'View Dates', ctaUrl: CTA_URL },
    ],
    bodyBlock2Title: "Your family trip doesn't have to look like every other one.",
    bodyBlock2:      'Four nights, 30% off, and a private hot tub waiting when you arrive. Use BUY3 and lock it in.',
    closingLine:     'The kids will remember this one. Book with BUY3 and make it happen.',
    ctaText:         'Book With BUY3',
    ctaUrl:          CTA_URL,
  },
  {
    id: 2,
    name: 'The Upgrade Moment',
    subjectLine:     'What if this family trip actually felt different?',
    previewText:     'Starlight Haven gives families something no hotel can match.',
    campaignEyebrow: 'WELCOME OFFER · BUY3',
    headlineText:    'Where Special Moments Find Their Spot',
    bodyText:        "Here's 30% off your stay at Starlight Haven, just for joining. Use code BUY3 at checkout on any four-night booking. These aren't hotel rooms; they're the kind of places your family will keep talking about.",
    introCtaText:    'Use Code BUY3',
    heroCtaText:     'Use code BUY3 at checkout.',
    sectionEyebrow:  'Choose Your Stay',
    sectionHeadline: 'Two Stays That Trade Cramped For Wow',
    sectionSubhead:  'Starlight Haven has the space families have been looking for.',
    subhead:         'Starlight Haven has the space families have been looking for.',
    propertyCards: [
      { name: 'Treehouses',   stats: '2 beds | 1 bath | 4 guests', description: 'A real treehouse with a private hot tub.',   ctaText: 'View Dates', ctaUrl: CTA_URL },
      { name: 'Deluxe Domes', stats: '3 beds | 1 bath | 4 guests', description: 'Three beds, big views, hot tub up top.',     ctaText: 'View Dates', ctaUrl: CTA_URL },
    ],
    bodyBlock2Title: 'Four nights is enough time to actually unwind together.',
    bodyBlock2:      "Code BUY3 takes 30% off when you book four nights or more. That's a real number worth using.",
    closingLine:     "Skip the hotel and bring the family somewhere they'll actually love. BUY3 gets you there.",
    ctaText:         'Book With BUY3',
    ctaUrl:          CTA_URL,
  },
  {
    id: 3,
    name: 'The Screen-Time Swap',
    subjectLine:     "Ready to trade screen time for something they'll never forget?",
    previewText:     'Families find the real thing at Starlight Haven.',
    campaignEyebrow: 'WELCOME OFFER · BUY3',
    headlineText:    'Screens Off, Woods On',
    bodyText:        'Your 30% off code is BUY3. Use it on any four-night stay and bring the family somewhere that pulls everyone away from screens and into the woods. Private hot tubs, hiking trails, and a 24/7 clubhouse are waiting.',
    introCtaText:    'Grab My 30% Off',
    heroCtaText:     'Use code BUY3 at checkout.',
    sectionEyebrow:  'Pick Your Stay',
    sectionHeadline: 'Two Unique Stays For Families Of Four',
    sectionSubhead:  'Starlight Haven gives families the wow factor hotels never could.',
    subhead:         'Starlight Haven gives families the wow factor hotels never could.',
    propertyCards: [
      { name: 'Treehouses',   stats: '2 beds | 1 bath | 4 guests', description: 'Treetop living, fireplace, and a private hot tub.', ctaText: 'View Dates', ctaUrl: CTA_URL },
      { name: 'Deluxe Domes', stats: '3 beds | 1 bath | 4 guests', description: "A kids' loft, a hot tub with views.",               ctaText: 'View Dates', ctaUrl: CTA_URL },
    ],
    bodyBlock2Title: 'Four nights in the woods beats four nights on a couch.',
    bodyBlock2:      'Use BUY3 at checkout and save 30% on your four-night family stay.',
    closingLine:     "This is the trip they'll ask you to do again next year. Start with BUY3.",
    ctaText:         'Book With BUY3',
    ctaUrl:          CTA_URL,
  },
]
