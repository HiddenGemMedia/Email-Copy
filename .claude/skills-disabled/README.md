# Parked skills — not active

Skills in this folder are downloaded but deliberately NOT installed. Claude Code
only auto-discovers skills under `.claude/skills/`, so nothing here can trigger.

## email-html-mjml

Third-party skill (Framix, MIT) for generating responsive HTML email with MJML.
Downloaded 2026-08-20 from:
https://github.com/framix-team/skill-email-html-mjml

Parked rather than installed because its trigger description covers "create,
generate, design, or build an email template — including welcome emails", which
matches almost every request in this project. Installed, it would load itself on
routine template work.

### To activate

    mkdir -p .claude/skills
    mv .claude/skills-disabled/email-html-mjml .claude/skills/

### To deactivate again

    mv .claude/skills/email-html-mjml .claude/skills-disabled/

### Note before activating

This project builds email HTML at runtime in TemplatePreview.jsx — from n8n copy,
picked images and slider positions — and bakes anything HTML cannot do into PNGs
with Puppeteer. MJML is a compile-time authoring approach, so it does not map onto
that loop directly. Its component docs are still useful as an Outlook-safety
reference. See the conversation of 2026-08-20 for the fuller assessment.

## find-skills — MOVED, now ACTIVE

Activated 2026-08-20 at Pooja's request. It lives in `.claude/skills/find-skills/`.
Effectiveness is being tracked in `.claude/skills/find-skills-EFFECTIVENESS.md`.

To park it again:

    mv .claude/skills/find-skills .claude/skills-disabled/
