# 2026-11-05 — Monorepo and studio MVP

Agent: Claude (Cowork session), at the maintainer's request.

## Context

`@mplate/core` 0.1.0 was published to npm on 2026-11-04. The maintainer decided that the web editor (studio) is free and open source as well, and lives in this repository (ADR-012, ADR-013).

## Done

- npm workspaces: engine moved to `packages/core` (history preserved with `git mv`), studio added in `apps/studio`. Root `package.json` is private and orchestrates `build`, `typecheck`, `test`, `gallery`, `studio:dev`, `studio:build`.
- Legal files stay at the root and are copied into `packages/core` by a `prepack` script; `packages/core/README.md` is the npm page.
- Studio MVP (Vite 6 + TypeScript, no framework): editor with line numbers, Tab and auto-indent, diagnostics list with jump-to-line, debounced live preview, stale preview while there are errors, template gallery dialog with thumbnails, theme and width selectors, SVG and PNG download, copy SVG, share link (`#dsl=` base64url JSON), draft in `localStorage`, dark mode, mobile layout.
- CI updated for workspaces; new `studio.yml` workflow deploys `apps/studio/dist` to GitHub Pages.
- Docs and framing updated: README, CONTRIBUTING, AGENTS, architecture, vision and scope, roadmap, ADR-012 and ADR-013, CHANGELOG.

## Results

- `npm run typecheck`, `npm test` (core 133 tests, studio 3 tests) and `npm run build` pass from the root.
- Studio checked in Chromium with Playwright: initial render, error display, gallery, dark theme, 390 px mobile layout, PNG and SVG downloads, share link reopened in a fresh browser context. No console errors. Bundle: 85 kB JS (31 kB gzipped).

## Open questions and follow-ups

- Maintainer action: enable GitHub Pages with "GitHub Actions" as the source so the studio is published.
- Next engine feature: manual adjustments by element id (overrides API), then canvas editing in the studio.
- Syntax highlighting and autocomplete in the editor (consider CodeMirror 6 when it becomes worth the dependency).
