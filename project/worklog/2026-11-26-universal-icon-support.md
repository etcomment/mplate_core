# 2026-11-26 — Universal dynamic icon support across all templates and studio properties

Agent: Antigravity, at the maintainer's request.

## Done

- **Universal `icon:` rendering across all 25 templates (`packages/core`)**:
  - Added `icon:` support to every template that ignored `item.icon`: `org:tree`, `timeline:axis`, `timeline:gantt`, `timeline:swimlanes`, `timeline:vertical`, `matrix:quadrant`, `matrix:swot`, `kpi:gauges`, `funnel:bars`, `venn:circles`, and `comparison:table` (row icons).
  - Extended partial icon templates so every element and child item respects `icon:` simultaneously with numbers, flags or headers: `comparison:columns` (column header icons and explicit `point.icon` precedence over `yes`/`no` flags), `stack:layers` (layer header icons), `funnel:stack` & `pyramid:layers` (side icon beside explanation when `val:`/`pct:` occupies the layer centre), and `process:chevrons` (scaled or body-placed icons on 5-column and narrow widths).
- **Studio dynamic icon picker (`apps/studio`)**:
  - Added `'icon'` to `dslLines.ts`, `elementFields.ts`, and `TemplateElementProperties.tsx` with a searchable picker grid (`listIcons()`) and live preview so selecting any element lets users set, swap, or remove `icon:` directly from the properties panel.
- **Automated coverage & docs (`packages/core`, `apps/studio`, `docs`)**:
  - Added parametric `icon:` rendering (zero overlaps/clipping, exact count) and `overrides` live icon-swap tests across all 25 templates in `packages/core/tests/templates.test.ts`.
  - Added icon add/swap/read/remove tests in `apps/studio/tests/dslLines.test.ts`.
  - Updated [`docs/authoring-templates.md`](../../docs/authoring-templates.md) checklist and regenerated `docs/`.

## Verification

- `npm run typecheck && npm test && npm run gallery && npm run build` pass after all edits.
