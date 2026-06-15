# Release Notes for Nightingale

## 1.1.0 - 2026-06-15
- Added a settings page: choose which entry types show the audit widget (opt-in), set the content-area selector, and set the default conformance level, screen size, and best-practices toggle.
- Added a "Needs review" section that surfaces axe-core's incomplete results — the checks a person needs to judge by eye, like text over a hero image.
- Added stored audit results and an opt-in "Accessibility" column on the entry index, showing each entry's most recent issue count.
- Added a desktop/mobile screen-size toggle, so issues that only appear on smaller screens (reflow, tap-target size) get checked too.
- Added template-level scoping: mark the audit area with `data-nightingale` and exclude regions like sidebars with `data-nightingale-ignore`.
- Added a "Run again" button to the results panel and a "Copy fix prompt" button on each issue, which copies a ready-made prompt (including the failing element's HTML) for an AI assistant.
- Changed the bundled axe-core engine to 4.12.1 (from 4.10.0).

## 1.0.0 - 2026-06-12
- Added the "Run Nightingale" accessibility audit button to the entry edit sidebar.
- Added an axe-core audit that runs against the entry's live URL in a hidden iframe, with no page navigation.
- Added a WCAG conformance level selector (A, AA, AAA) and a best-practices toggle.
- Added a content-area scope that audits the `<main>` element and ignores shared nav and footer, falling back to the whole page when no match is found.
- Added a results panel grouping violations by impact, each with a plain-English summary, the failing HTML, and a "Learn more" link.
- Added a collapsible list of the rules that passed.
