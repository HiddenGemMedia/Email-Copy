# find-skills — is it helping or getting in the way?

Activated 2026-08-20 at Pooja's request, with an explicit instruction to track
whether it improves or degrades the work.

**How to read this:** one row per time the skill actually fires. "Helped" means it
surfaced something we used or correctly warned us off something. "Cost" means it
added a detour, an interruption, or a recommendation we had to talk down.

| Date | What triggered it | What it did | Helped or cost | Notes |
|------|-------------------|-------------|----------------|-------|
| | | | | |

## Baseline — the two cases before it was active

Worth recording, because they are the closest thing to a control group.

- **MJML skill (2026-08-20).** The real question was whether a compile-time
  authoring tool fits a runtime template builder. That is a judgement about this
  codebase's architecture. A search tool would not have answered it. → no help.
- **email-design skill (2026-08-20).** The repo name was wrong, adoption was low,
  and it depended on a paid CLI duplicating our Puppeteer setup. This skill's
  Step 4 vetting (install count, source reputation, repo stars) would have caught
  all three. → would have helped.

So 1 of 2 on the evidence so far.

## What to watch for

Reasons this could end up costing more than it returns:

1. **Trigger is very broad.** It fires on "how do I do X" and "can you do X",
   which describes most requests here. Risk of interrupting normal work.
2. **This project is unusual.** Runtime HTML assembly, Puppeteer baking, GHL and
   n8n integration. Generic skills tend not to fit it — see the MJML case.
3. **Its own `-g` advice installs user-level**, affecting every project on the
   machine. Prefer project-level installs here.

Reasons it could genuinely pay off:

1. The vetting discipline is sound and catches low-quality packages.
2. Useful for work adjacent to the email pipeline — testing, deploys, review.

## Verdict

Too early. Revisit after it has fired a handful of times, or if it starts
interrupting. Parked alternative stays in `.claude/skills-disabled/`.
