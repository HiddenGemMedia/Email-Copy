# CRITIQUE — Known Errors, Causes & Fixes

A reference log of problems we actually hit while building templates, what caused
them, and what fixed them.

**How to use this:** when something breaks, find the symptom in the index below and
read that section before debugging from scratch. Most of these have bitten us more
than once.

**How to add to it:** when a new bug is found and fixed, add a section using the same
shape — *Symptom → What we did → Why it broke → Fix → How to check*. Keep it plain.

---

## Symptom index

| What you see | Go to |
|---|---|
| Mobile font sizes changed after adding/removing a section | [1. Fixed-width card + font boosting](#1-mobile-fonts-change-when-you-add-a-section) |
| Preview goes blank when you select a template | [2. Undefined identifiers](#2-preview-goes-blank-when-selecting-a-template) |
| Preview goes blank when you click Generate Images | [3. Temporal dead zone](#3-preview-goes-blank-on-generate-images) |
| Headline renders in the wrong font (Arial instead of Lato) | [4. Missing font in the `<link>`](#4-wrong-font-after-porting-a-hero) |
| Zoom slider stretches the whole grid / images overlap | [5. transform:scale with no clip box](#5-zoom-slider-blows-out-the-layout) |
| Sliders do nothing | [6. Section has no transform](#6-sliders-do-nothing) |
| Logo missing in the email / broken icon in preview | [7. Dead logo URL](#7-logo-missing-or-broken) |
| Stamp/pin frame missing in the baked PNG | [8. localhost can't be reached by the render box](#8-baked-frame-missing-when-generating-locally) |
| Text baked into a PNG looks tiny | [9. 1:1 PNGs don't compensate](#9-text-inside-a-baked-png-is-too-small) |
| An edit changed Week 2 (or another protected template) | [10. Byte-identical blocks](#10-edit-hit-the-wrong-template) |
| A title/section renders twice | [11. Ported section brought its own title](#11-something-renders-twice) |
| A fluid template still overflows on mobile by a few px | [12. `white-space:nowrap` on the CTA](#12-fluid-card-still-overflows-a-little) |
| Media library / images fail with a 401 in one workflow only | [13. `undefined` serialised into a query string](#13-undefined-sent-as-an-api-key) |

---

## 1. Mobile fonts change when you add a section

**This is the big one. Read this first if font sizes look wrong on a phone.**

### Symptom
Mobile font sizes were fine. We added the 3-photo grid to Week 8v2. Suddenly all the
text below it was much smaller on a phone — but the desktop preview looked fine, and
the `@media` block was untouched.

### Why it broke
Chain of three things:

1. The card was `width:600px; max-width:600px` — a hard 600px. A ~390px phone can't
   lay that out, so the mail client **zooms the whole email down to fit** (~0.59).
2. That zoom would make 17px text render at ~10px, so **WebKit inflates it back up**
   ("font boosting" / text auto-sizing). Gmail iOS and Apple Mail both do this.
3. Boosting is calculated **per block, from the surrounding layout**. Adding the grid
   changed the layout, so the boost factor changed, so the text size changed.

The `@media` CSS was never the problem. On a fixed-width card, mobile font size is
decided by the mail client, not by us.

**Tell-tale sign:** two blocks using the *same* class at the *same* px render at
different sizes in one screenshot. No stylesheet can do that — only client boosting.

### Fix
Make the card fluid, the way Week 5 does:

```html
<table class="w8v2-outer" style="width:100%;max-width:600px;...">
```
```css
.w8v2-outer { width:100%!important; max-width:600px!important; }
```

Then a 390px phone lays out at 390px, there is no zoom, declared sizes render as
declared, and boosting has nothing to correct.

**You must also guard every fixed-width child**, or it will overflow once the card can
shrink:

| Child | Before | After |
|---|---|---|
| Grid table | `578px` | `width:100%;max-width:578px` |
| Grid cells | three fixed `190px` = 586px rigid | `td width:33.33%`, box/img `width:100%;max-width:190px` |
| Baked composite PNG | `max-width:578px` | `max-width:100%` |
| Button PNG | `max-width:375px` | `max-width:100%` |
| Hero CTA box | `280px` | add `max-width:100%` |

### What NOT to do
Adding `text-size-adjust:100%` stops the boosting, so sizes become *consistent* — but
consistently **small** (17px × 0.59 ≈ 10px optical). That pins the bug instead of
fixing it. Only reach for it if the card is already fluid and text still shifts.

### How to check
Render the email in a 390px-wide iframe and measure:

```js
d.documentElement.scrollWidth        // want 390, not 600
Math.max(0, scrollWidth - 390)       // want 0 overflow
```

Before the fix: 600px wide, 210px overflow. After: 390px, 0 overflow.

### Status per template
Only **Week 5** and **Week 8** (the fluid rebuild, id 25) are fluid. Week 2, 3, 4, 6, 7
are still fixed 600px and still subject to this.

---

## 2. Preview goes blank when selecting a template

### Symptom
Click the template tab, the whole preview pane goes white. Console shows a React
unmount stack but no obvious message.

### Why it broke
We ported a section from a Week 7/8-family template into a Week 2-derived one. The
ported markup references variables the Week 2 shell never declared, so they're
**undefined identifiers** → `ReferenceError` → React unmounts.

Week 2 never positioned `img4`, so a Week 2 copy has **none** of these:

- `img4Obj` (Week 2 only declares a bare `img4` url)
- `img4Scale`, `img4X`, `img4Y` in the signature
- `stampImgUrl`, `pinImgUrl` in the signature
- `heroFp`

### Fix
Add whatever the ported section needs:

```js
// signature
img4Scale=1, img4X=0, img4Y=0,
stampImgUrl = null,
pinImgUrl = null,

// locals
const img4Obj  = images?.[4]; const img4 = img4Obj?.url||''
const heroFp   = heroObj?.focalX != null ? `${heroObj.focalX}% ${heroObj.focalY}%` : '50% 50%'
```

### How to check
Before committing a ported section, list every `${...}` identifier in it and confirm
each is in the signature or a local. Anything unbound = guaranteed blank screen.

**Rule of thumb: any section moved from Week 7/8 into a Week 2 copy needs the `img4`
bindings.** This caught us on Week 7v2's stamp and again on Week 8v2's grid.

---

## 3. Preview goes blank on Generate Images

### Symptom
Template renders fine. Click **Generate Images** → blank. Error:
`Cannot access 'week8v2HeroHtml' before initialization`.

### Why it broke
JavaScript **temporal dead zone**. All the Puppeteer generators are `const` inside one
big effect. A `const` cannot be read on a line above where it's declared.

Two ways to get this wrong, and we hit **both**:

1. **Generator too high** — it reads `w8HeroFp` / `w8CtaText` / `w8img*Fp`, which are
   declared far down the effect. Putting a copied generator next to its Week 2
   counterpart near the top breaks it.
2. **Generator too low** — moving it down to fix (1) put it *below* `heroHtml`, which
   is what reads it. Fixing one direction created the mirror-image bug.

### Fix
- Declare the generator **immediately after the one it was copied from** (so its
  `w7*`/`w8*` dependencies are already in scope).
- Select it in **`heroHtmlToUse`**, not `heroHtml`. `heroHtmlToUse` sits near the end
  of the effect, so it's always below the declaration.

### How to check
Check **both directions**. A one-way check ("are my dependencies above me?") passed
while `week8v2GridHtml` was still broken.

```
for each generator:
  every const it reads      -> must be declared ABOVE it
  every reference to it     -> must be BELOW its declaration   (ignore comments)
```

---

## 4. Wrong font after porting a hero

### Symptom
Ported hero renders in Arial faux-bold instead of Lato. Baked PNG looks right, preview
looks wrong — or the two disagree.

### Why it broke
The template's Google Fonts `<link>` is inherited from whatever it was copied from.
Week 2's loads **Lora only**. A hero ported from Week 7/8 uses `'Lato'` at weight 900
and Lora *italic* 400 — neither is in that link, so both fall back.

The Puppeteer generator has its **own** `<link>` and was correct, which is why the
baked PNG looked fine while the preview didn't.

### Fix
Match the source template's link:

```html
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@700;900&family=Lora:ital,wght@0,700;1,400&display=swap" rel="stylesheet"/>
```

### How to check
List every `'Lato'` / `'Lora'` used in the template and confirm the `<link>` covers
those families **and weights and styles** (italic is separate!).

---

## 5. Zoom slider blows out the layout

### Symptom
Turning up a sub-image Zoom makes the image spill over its neighbours and stretches the
whole grid.

### Why it broke
`transform: scale()` **does not clip**. We put the transform straight on a bare `<img>`
sitting in a `<td>`, so the scaled image painted outside its cell.

Week 2's strip already wrapped its images in an `overflow:hidden` div — that got lost
when porting Week 7's markup, which has no wrapper because it had no transforms.

### Fix
Wrap the image in a fixed box that clips, same as the hero does:

```html
<div style="width:196px;height:260px;overflow:hidden;">
  <img style="width:196px;height:260px;object-fit:cover;transform:translate(..) scale(..)"/>
</div>
```

### How to check
At `scale(1.6)` the container's bounding box must be unchanged while the image paints
larger. Measured: box stayed `196×260`, image painted `314×416`, table stayed 600px.

---

## 6. Sliders do nothing

### Symptom
Left / Top / Zoom sliders move but nothing happens on screen.

### Why it broke
The section's markup only sets `object-position` — there's no
`transform:translate(...) scale(...)` for the sliders to drive. Week 7's 3-up strip is
like this; Week 2's strip is not.

### Fix
Add the transform (and the clip box from §5) to both the template markup **and** the
Puppeteer generator, so preview and baked PNG agree.

### How to check
Full chain must be intact:
`slider → editorProps → baseHtml useMemo deps → template markup → generator`.
Missing any link = dead slider.

---

## 7. Logo missing or broken

### Symptom
Preview shows a broken-image icon with alt text; the baked PNG shows **nothing** where
the logo should be.

### Why it broke
The client's `logo_url` in Supabase pointed at a deleted file (`404 NoSuchKey`). A
broken image still shows a placeholder in a browser, but Puppeteer rasterises it as
empty — which is why it "disappears after Generate".

### Fix
Re-upload via **↑ Replace** under CLIENT LOGO (goes through `upload-logo.js`, which
uploads to GHL media and writes the URL back to Supabase).

### Also
Prefer PNG over SVG — several email clients don't render SVG at all.

### How to check
`curl -I <logo_url>` before blaming the template.

---

## 8. Baked frame missing when generating locally

### Symptom
Generate the stamp/pin from `localhost` and the decorative frame is missing — just the
bare photo.

### Why it broke
`stampFrameUrl` is built as `${window.location.origin}/stamp-frame.png`. Rendering
happens **remotely** (the VPS at `2.24.211.60:3001`), and it can't reach your machine's
localhost.

### Fix
Generate on the deployed site. Not a template bug.

If it needs to work locally, inline the frame as a base64 data URI so the render box
needs no network access.

---

## 9. Text inside a baked PNG is too small

### Symptom
Text baked into a hero/button PNG is unreadable on a phone.

### Why it broke
Apparent size = `source_font × (display_width ÷ render_width) × client_zoom`.

The hero PNG is rendered at 600px and displayed at 600px — **1:1, no downscale** — so
13px stays 13px, then the client zoom takes it to ~8px.

Standalone button PNGs are different: rendered 600px, displayed 375px, so their source
font is already being shrunk ~0.62.

### Fix
Raise the source font, and grow its box so it isn't cramped and longer copy doesn't
overflow the canvas. Week 8v2's hero CTA went `13px → 18px` with the box `280×48 →
320×56`.

### Watch out
Don't raise the source font *and* the display width at once — the effects multiply.
Pick one lever.

---

## 10. Edit hit the wrong template

### Symptom
A change intended for one template also changed Week 2 (or another protected one).

### Why it broke
Duplicated templates have **byte-identical blocks**. A find-and-replace on the block
text matches every copy.

### Fix
Edit by line range, and assert the target is inside the intended function before
writing:

```python
before = '\n'.join(L[:lineIndex])
assert before.rindex('function buildTemplateWeek8v2') > before.rindex('function buildTemplateWeek2v2')
```

### How to check
After the edit, confirm every diff hunk falls inside the intended function's line
range, and that the source template still has its own copy.

---

## 11. Something renders twice

### Symptom
The body-block-2 title appears twice.

### Why it broke
Week 8's `LOCATION TITLE + 3-PHOTO GRID` section **includes its own title**. Porting it
into a Week 2 copy — which already has a title inside the B2 inner box — renders both.

### Fix
Remove the title from the B2 inner box; leave that box as body2 + closing + CTA.

### How to check
Count `class="mobile-b2title"` **elements** in the template. Should be exactly 1. (The
`@media` rule `.mobile-b2title { }` also matches a naive grep — don't count it.)

---

## General lessons

1. **Static checks are not enough.** Every blank-screen bug passed a build and my
   reading of the code. Reproduce in the browser with an error listener armed:
   ```js
   window.__e=[]; window.addEventListener('error', e => window.__e.push(String(e.message||e.error)))
   ```
   React only prints a component stack; the real message is on the error event.

2. **Check both directions.** One-way checks gave false "all clear" twice (§3).

3. **Measure, don't reason, about layout.** The zoom theory in §1 was wrong at first —
   measuring `scrollWidth` at 390px is what found the real cause.

4. **Preview ≠ email.** The preview iframe renders at 600px then CSS-scales by 0.65.
   That is *not* how a mail client behaves. Font boosting and `@media` behaviour can
   only be confirmed by a real send.

5. **Gmail strips `<style>`.** `@media` rules never apply in Gmail web. Anything that
   must hold there has to be an inline style.
