<p align="center"><img src="src/icon.svg" width="100" height="100" alt="Nightingale icon"></p>

<h1 align="center">Nightingale</h1>

Per-page accessibility auditing for Craft CMS editors — axe-core powered, no context switching required.

Named after **Florence Nightingale** — who pioneered the use of data collection, statistical analysis, and visual reporting to audit conditions and drive improvements. If you're surfacing accessibility issues so editors can act on them, Nightingale seems like the right name.

---

## What it does

- **Entry sidebar widget** — a "Run Nightingale" button appears on every entry edit page in the CP
- **axe-core audit** — runs the industry-standard accessibility engine against the entry's live URL via a hidden iframe, no page navigation required
- **WCAG level selector** — choose A, AA, or AAA conformance (default: AA)
- **Desktop / mobile** — run the audit at a desktop or mobile screen size, so viewport-dependent issues (reflow, tap-target size) get caught too
- **Opt-in per entry type** — Nightingale only appears on the entry types you switch on in settings, so it stays out of the way where it isn't needed
- **Content area scope** — audits the content area by default (selector configurable in settings, default `<main>`), ignoring shared nav and footer noise; falls back to the whole page with a notice if no match is found
- **Template-level scoping** — mark the audit root with `data-nightingale` and carve out regions (sidebars, embeds) with `data-nightingale-ignore` directly in your templates; the markup wins over the global selector
- **Best practices toggle** — optionally include axe-core's best practice rules alongside WCAG
- **Results panel** — violations grouped by impact (critical, serious, moderate, minor), each with a plain-English failure summary, HTML snippet, and a "Learn more" link
- **Needs review** — axe's "can't decide" findings are shown in their own bucket, separate from clear failures, so a person knows what to check by hand
- **Copy fix prompt** — each issue has a one-click button that copies a ready-made prompt (rule, snippet, failure detail) to paste into an AI assistant
- **Run again** — re-run the same audit from the results panel after a fix, without reopening
- **Passes section** — collapsible list of rules that passed, so editors can see the good news too
- **Last-run column** — opt-in "Accessibility" column on the entry index shows each entry's most recent issue count at a glance
- **Settings** — configure the content-area selector and the default conformance level, screen size, and best-practices toggle

---

## Requirements

- Craft CMS 5.x
- PHP 8.2+

---

## Installation

```bash
composer require pepperdigital/nightingale
php craft plugin/install nightingale
```

---

## Part of the Pepper Digital plugin suite

Nightingale is one of a set of Craft CMS plugins built by [Pepper Digital](https://pepper.digital). Each is standalone and useful on its own, but they're designed to work well together — for example, Braille (when released) will handle developer-facing accessibility checks at build time, leaving Nightingale to focus on the editor's pre-publish workflow.
