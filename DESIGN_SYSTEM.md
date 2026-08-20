# Email Design System — For Pooja

Received 2026-08-20. This is the reference for new email work. Where it conflicts
with TEMPLATE_SPEC.md, this document is the intent and TEMPLATE_SPEC.md records
what the existing Week 2–9 templates actually do.

Colours are deliberately NOT captured yet — Pooja said to ignore them for now.
Brand and secondary ramps change per client; the neutral ramp is fixed. Revisit
when we wire colours to the brand board.

## Basic

| | Value |
|---|---|
| Desktop width | 600px, fixed |
| Mobile width | 320–420px, fluid |

## Text scale

All Arial. Sizes are px, line-height is px (not a ratio).

| Role | Mobile | Desktop |
|---|---|---|
| Heading 1 | 32 / 38 | 36 / 44 |
| Heading 2 | 26 / 32 | 30 / 38 |
| Heading 3 | 20 / 26 | 24 / 32 |
| Body large | 18 / 28 | 18 / 28 |
| Body regular | 16 / 24 | 16 / 24 |
| Body small | 14 / 20 | 14 / 20 |

Body sizes do not change between mobile and desktop — only headings do.

## Chips

| | Chip small | Chip medium |
|---|---|---|
| Font size | 12px | 14px |
| Line height | 12px | 14px |
| Padding L/R | 14px | 14px |
| Padding T/B | 6px | 6px |
| Background | brand 200 | #F0F0F0 |
| Text | brand 900 | #3A3A3A |
| Border | brand 400 | #DEDEDE |

Same on mobile and desktop.

## Buttons

| | Mobile | Desktop |
|---|---|---|
| Font size | 16px | 16px |
| Line height | 16px | 16px |
| Padding L/R | **Fill** (full width) | 40px |
| Padding T/B | 12px | 12px |
| Background | brand 500 | brand 500 |
| Text | brand 950 | brand 950 |

The mobile "Fill" is the notable one: buttons go edge to edge on phones and are
hug-width on desktop.

## Email elements (first screenshot)

A component library to draw from, not yet built:

- **Body part 1 — general information.** Promo code eyebrow, heading, body, button.
  Two variants: image above text, or text only.
- **Body part 2 — amenities, 3 up.** Heading + subhead, then three rows pairing a
  thumbnail with body text. A 2-column variant also shown.
- **Body part 3 — 4 images.** Heading + subhead over a 2x2 image grid.
- **Body part 4 — testimonials.** "Hear From Our Guests", star rating, quote,
  attribution. Single column and 2-column variants.
- **Body part 5 — general information, rounded image.** Same as part 1 but with a
  soft blob/rounded image treatment.
- **Footer.** Social icons row, copyright, address, long legal paragraph,
  unsubscribe.

Pooja may ask for any one of these to be recreated as a template section.
