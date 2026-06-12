<p align="center"><img src="src/icon.svg" width="100" height="100" alt="Nightingale icon"></p>

<h1 align="center">Nightingale</h1>

Per-page accessibility auditing for Craft CMS editors — axe-core powered, no context switching required.

Named after **Florence Nightingale** — who pioneered the use of data collection, statistical analysis, and visual reporting to audit conditions and drive improvements. If you're surfacing accessibility issues so editors can act on them, Nightingale seems like the right name.

---

## What it does

- **Entry sidebar widget** — a "Run Nightingale" button appears on every entry edit page in the CP
- **axe-core audit** — runs the industry-standard accessibility engine against the entry's live URL via a hidden iframe, no page navigation required
- **WCAG level selector** — choose A, AA, or AAA conformance (default: AA)
- **Content area scope** — audits the `<main>` element by default, ignoring shared nav and footer noise; falls back to the whole page with a notice if no `<main>` is found
- **Best practices toggle** — optionally include axe-core's best practice rules alongside WCAG
- **Results panel** — violations grouped by impact (critical, serious, moderate, minor), each with a plain-English failure summary, HTML snippet, and a "Learn more" link
- **Passes section** — collapsible list of rules that passed, so editors can see the good news too

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
