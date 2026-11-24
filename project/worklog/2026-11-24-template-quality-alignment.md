# 2026-11-24 — Template quality alignment, multi-line auto-resize and elastic connectors

Agent: Antigravity, at the maintainer's request.

## Done

- **Unbounded multi-line auto-resize (`packages/core`)**: removed restrictive `maxLines` caps on descriptions and dynamic rows across `kpi:tiles`, `kpi:gauges`, `cards:grid`, `process:chevrons`, `process:steps`, `process:vertical`, `process:loop`, `timeline:vertical`, `timeline:axis`, `timeline:swimlanes`, `comparison:columns`, `comparison:table`, `matrix:swot`, `stack:layers`, and `org:tree`.
- **Elastic connector metadata (`packages/core`, `apps/studio`)**: emitted `data-mplate-connector`, `data-mplate-from`, `data-mplate-to` and endpoint anchor attributes on `brain:spokes`, `brain:arc`, `org:tree`, `process:steps`, `process:vertical`, and `timeline:vertical` (ADR-020), and wired live connector updates in `TemplateRenderer.tsx` / `geometry.ts`.
- **Studio properties & auto-resize (`apps/studio`)**:
  - Read and rewrite `sub:`, `val:`/`value:`, `delta:`, `date:`, `pct:`, `from:`, `to:` and `label:` fields in `elementFields.ts`, `dslLines.ts`, and `TemplateElementProperties.tsx`.
  - Added diagram-level header title (with 1-click removal) and subtitle controls in `PropertiesPanel.tsx` when no element is selected.
  - Added `resizedTemplateElementIds` tracking in `store.ts` so moved-only elements adopt new natural text heights without `scaleY` distortion.
- **Docs & tests**: added the Template quality checklist to [`docs/authoring-templates.md`](../../docs/authoring-templates.md), recorded ADR-020 in [`project/decisions.md`](../decisions.md), updated `CHANGELOG.md`, added regression tests in `packages/core/tests/render.test.ts` and `apps/studio/tests/*.test.ts`, and regenerated `docs/`.

## Results

- `npm run gallery`, `npm run typecheck`, `npm test` and `npm run build` pass after all edits.
