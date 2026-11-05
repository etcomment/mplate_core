# Roadmap

Phases follow the project plan. Dates are targets; when a milestone slips, scope is cut rather than the date moved.

## Phase 1 — Foundations (Nov 2026)

- [x] Fresh public repository, Apache 2.0
- [x] DSL v0.1: parser, diagnostics, `@family style:name`, legacy aliases
- [x] Engine: theme tokens, text layout, SVG output, optional PNG
- [x] CLI and MCP server
- [x] Layout tests (1/4/10/30 elements, overlap, clipping, themes)
- [x] 14 original templates, identity cards, generated catalogue
- [x] Create the free `mplate` organisation on npm (2026-11-04)
- [x] Publish `@mplate/core` 0.1.0 (ADR-011, 2026-11-04)
- [ ] Ask the owner of the unscoped `mplate` npm package whether he would transfer the name
- [x] Monorepo: `packages/core` and `apps/studio` (ADR-012)
- [x] Studio MVP without account: DSL editor with line diagnostics, live preview, template gallery, themes, SVG/PNG export, share link (ADR-013)
- [ ] Enable GitHub Pages (Settings → Pages → Source: GitHub Actions) so `studio.yml` publishes the studio
- [ ] Pick the five showcase visuals for the README; record the "15 lines → a roadmap" animation

## Phase 2 — Open engine (Dec 2026 – Feb 2027)

Goal: 25 original templates (14 shipped; pick 11 from the backlog below), all driven by theme tokens, each with its identity card.

Template backlog (one line = one template; tick when merged with gallery and tests):

- [ ] `timeline:swimlanes` — milestones on several lanes (product roadmap by team)
- [ ] `timeline:gantt` — bars with start/end dates
- [ ] `process:loop` — steps with a return arrow
- [ ] `process:vertical` — stacked steps for long descriptions
- [ ] `funnel:bars` — horizontal bars with conversion rates
- [ ] `cycle:orbit` — nodes on a circle around a centre
- [ ] `pyramid:inverted`
- [ ] `cards:icons` — large icon tiles
- [ ] `kpi:gauges` — radial gauges with `pct:`
- [ ] `comparison:table` — feature matrix with ticks
- [ ] `matrix:swot` — four labelled boxes with bullets
- [ ] `org:horizontal` — left-to-right tree
- [ ] `stack:layers` — architecture layers
- [ ] `venn:circles` — 2–3 overlapping sets
- [ ] `agenda:list` — time slots

Engine backlog:

- [x] Manual adjustments API: `render(source, { overrides })` by element id, with `unusedOverrides` (ADR-015, 2026-11-05)
- [ ] Publish `@mplate/core` 0.1.1 (when the maintainer decides)
- [ ] Injectable registry in `render()` (custom template sets)
- [ ] `packages/server` — `@mplate/server`, open-source HTTP API: `POST /render` (SVG or PNG), `POST /validate`, `GET /templates`; stateless, with size and rate limits (ADR-014). After the overrides API.
- [ ] Font metric tables per theme font (optional) — see ADR-007
- [ ] `mplate init` to scaffold a document from a template example
- [ ] JSON Schema for themes

## Phase 3 — MCP and launch (Mar – Apr 2027)

- [x] Studio: select an element, drag or nudge it, change its colour, jump to its line; adjustments in drafts and share links (2026-11-05)
- [ ] Studio: edit an element's text from the canvas (rewrite the DSL line rather than storing a text override)
- [ ] Studio: autocomplete and syntax highlighting for the DSL
- [ ] Studio: custom domain for the public studio
- [ ] List the MCP server in MCP directories and "awesome" lists
- [ ] Launch day (Show HN, Reddit, LinkedIn, X) with the demo and the gallery
- [ ] One visual a week published with its source

## Later (not in this repository)

Accounts, organisations, saving and versions, brand kits, sharing and team libraries, PPTX export and master import, locked templates, SSO. The engine provides the generic hooks (theme tokens, element ids, identity cards).
