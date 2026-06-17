# CLAUDE.md — Nightingale

> This is the **per-plugin orientation file** for Claude Code sessions working on Nightingale.
> Structure follows Turing's `CLAUDE.md` — the suite template.
>
> **What belongs here:** the stuff that *isn't* recoverable from the code — why decisions were
> made, what we rejected, the gotchas that bit us, cross-plugin contracts, plugin-specific
> conventions. **What does NOT belong here:** anything that just re-describes the code. Point
> *at* the code (`src/services/AuditsService.php`), never mirror it — a mirror goes stale and
> then lies to the next session. If you find yourself narrating what a method does, stop and link it.

---

## What Nightingale is

Per-page accessibility auditing for Craft CMS 5 editors — axe-core run against the entry's live URL
in a hidden iframe, results inline in the CP, no context switching. Named after Florence
Nightingale (data collection + visual reporting to drive improvement). Editor-facing and
production-safe — the pre-publish check.

- **Package:** `pepperdigital/nightingale`  ·  **Handle:** `nightingale`  ·  **Namespace:** `pepperdigital\nightingale`
- **Lives at:** `~/Sites/plugins/nightingale` — its **own top-level folder**. (The root `CLAUDE.md`
  still describes a `proper/`+`pepper/` split; that layout is gone — every plugin is top-level now.)
- **Wired into the test site** at `~/Sites/plugins/craft` via a Composer path repo with
  `symlink: true` → **PHP edits are live immediately**, no reinstall.
- Shares lint config: `phpstan.neon` includes `../_shared/phpstan.neon`.
- **Has an npm toolchain** — unusual in this suite (see the axe-core gotcha).

## How it's built (the map — read the code for detail)

- `src/Nightingale.php` — wiring: the entry-sidebar widget (`Entry::EVENT_DEFINE_SIDEBAR_HTML`), the
  opt-in index column, settings, audit controller route.
- `src/controllers/AuditController.php` — the endpoint the JS posts results to for storage.
- `src/services/AuditsService.php` — save/get the per-entry audit summary (upsert one row per element+site).
- `src/models/AuditSummary.php` — the stored summary (issue counts, not the full violation payload).
- `src/models/Settings.php` — `enabledEntryTypes` (opt-in), content selector, default level/viewport/best-practices.
- `src/templates/_components/entry-sidebar.twig` — the "Run Nightingale" widget.
- `src/templates/_components/index-cell.twig` — the opt-in "Accessibility" index column cell.
- `src/templates/cp/_settings-panel.twig` — the layout-free settings partial.
- `src/web/assets/js/nightingale.js` — the runner (iframe + axe + results panel + copy-prompt).
- `src/web/assets/js/axe.min.js` — the vendored axe-core engine (committed; see gotcha).
- `src/migrations/` — `Install.php` + `m260615_090000_create_audits_table.php` (the dated upgrade migration).

## Decisions made, and what we rejected

- **axe-core runs CLIENT-SIDE in a hidden iframe** of the entry's frontend URL — so it works on
  local, staging, and password-protected sites with no public URL. The editor's own browser does
  the work. This is the property that the planned *performance* audit deliberately can't share.
- **Store counts, not the full payload.** `nightingale_audits` holds the issue count per
  element+site, upserted each run — enough for the index column and "last run" line. Re-run for detail.
- **Scope is a MARKUP concern** — `data-nightingale` (audit root) + `data-nightingale-ignore`
  (exclude regions) win over the global content selector, because markup can't drift from the
  template. Precedence: `data-nightingale` → settings selector → whole page; ignores apply in every
  mode. Rejected a per-entry-type settings table mapping type→selector.
- **Opt-in per entry type** (`enabledEntryTypes` stores the *enabled* set) — new types stay off
  until switched on. Andy chose opt-in over opt-out as the Craft-native expectation.
- **Three result buckets** — violations, "Needs review" (axe's `incomplete`), passes — kept
  separate so editors know what needs a human eye vs what's a clear fail.
- **axe-core is vendored, not CDN-loaded** — locked-down/offline installs and no third-party CP
  request. CDN-load and manual-update-with-a-calendar-reminder were both rejected.
- **Performance auditing belongs HERE, not in Berners** (reversed 2026-06-17). Nightingale already
  owns the audit panel + storage + index column; a PageSpeed/Lighthouse audit reuses all of it.
  Berners instead *reads* the last performance score when both are installed.

## Gotchas that have bitten us (read before editing)

- **`settingsHtml()` field names must be BARE** — this bit us here specifically (2026-06-13): the
  entry-type opt-in wouldn't save, and the POST showed `settings[settings][...]`. Use
  `name: 'contentSelector'`, never `name: 'settings[contentSelector]'`. Craft namespaces the
  partial itself. (Memory: `feedback_settingshtml_no_settings_prefix` — diagnosed on Nightingale.)
- **`axe.min.js` is a committed blob, updated via npm — npm is NOT a runtime dependency.**
  `package.json` pins the exact version; `npm run build:axe` copies it into `src/web/assets/js/`.
  Dependabot watches npm and opens a PR on each release, but **the PR only bumps `package.json` — it
  does NOT rebuild the blob.** Taking an update: pull PR → `npm install && npm run build:axe` →
  smoke-test → commit the regenerated blob → merge → tag. `node_modules/` is gitignored.
- **Entry-sidebar uses `Entry::EVENT_DEFINE_SIDEBAR_HTML`** — the Craft 5 API. The old
  `cp.entries.edit.details` Twig hook doesn't fire. (This plugin is the reference for the pattern —
  Brunel was fixed against it.)
- **The index-cell renders one `getSummary()` query per row.** Fine now (the column is opt-in), but
  **batch-load before it ever lands on a large index** — known follow-up.
- **`Install.php` only runs on fresh installs**, which is why the dated `m260615_090000` migration
  exists — so 1.0.0 → 1.1.0 upgraders also get the `nightingale_audits` table. Add a dated migration
  for any future schema change, don't just edit `Install.php`.
- **Copy-prompt runs axe with `elementRef: true`** so the prompt carries each failing element's full
  `outerHTML` (capped 800 chars). Display snippets still use axe's short `node.html`. Don't conflate.

## Conventions (Nightingale-specific; suite-wide ones are in the root CLAUDE.md)

- All CP copy is **editor-facing**: violations get a plain-English failure summary; the editor sees
  impact bands (critical/serious/moderate/minor), not rule IDs in isolation.
- The axe **category split** with Braille is deliberate: Nightingale shows editor-relevant categories
  (text-alternatives, color, structure, forms, tables, time-and-media, language); Braille's
  build-time panel will show developer-relevant ones (aria, parsing, semantics, keyboard,
  name-role-value). Keep Nightingale's surface to what an editor can act on.
- "Copy fix prompt" follows the suite's "Ask Your Agent" pattern. (Memory: `project_ask_your_agent`.)

(Suite-wide rules — PHPStan 8 / ECS / scrutinise, `.collect()` over `.all()` — are in the root `CLAUDE.md`.)

## Cross-plugin contracts (soft integrations — present-and-better-together, never required)

- **Braille (not built yet):** the developer-facing, devMode-only accessibility toolkit. Complementary,
  not overlapping — Braille catches issues as content/templates are built; Nightingale is the
  editor's on-demand pre-publish check. Each bundles its own `axe.min.js`. Replicate this plugin's
  axe-update wiring in Braille. Plan: `docs/braille/plans/plan.md`.
- **Berners (SEO):** the SEO field could surface accessibility/SEO-config-vs-rendered alongside the
  audit; and (per the performance plan) Berners reads Nightingale's last Core Web Vitals score.
  Soft-read only, never required.

## What's NOT built (so you don't go looking for it)

- **The performance audit** — the whole Lighthouse/PageSpeed side. Planned in detail
  (`docs/nightingale/plans/performance-audit.md`), **not started**. v1 engine = Google PSI API
  (server-side), local headless-Chrome rejected for v1. Tabs in the sidebar, `nightingale_performance`
  table (metrics only), unreachable-URL messaging — all spec, none built.
- Bulk/section audit, Slack/email threshold alerts, custom axe rulesets, nearest-landmark element
  location (the last stays in Braille's territory).

## Version state

CHANGELOG is at **1.1.0** (settings page, needs-review bucket, stored results + index column,
viewport toggle, run-again, copy-prompt; 1.0.0 was the sidebar + basic audit). Both v1 and the "v2"
roadmap are shipped — schema bumped to 1.1.0. `composer.json` carries no version field; releases are
git tags. **Not yet visually tested in-browser** — needs a manual pass.

## Pointers

- Core plan: `docs/nightingale/plans/plan.md`  ·  Performance plan: `docs/nightingale/plans/performance-audit.md`
- Braille (sibling): `docs/braille/plans/plan.md`
- Suite UI rules: `docs/plugin-ui-conventions.md`  ·  Root conventions: `~/Sites/plugins/CLAUDE.md`
- Long-lived context also lives in Claude's memory index (the `settingsHtml` gotcha diagnosed here,
  Craft 5 sidebar API, "Ask your agent", build status).
