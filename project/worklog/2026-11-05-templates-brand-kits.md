# 2026-11-05 — 25 templates, brand kits, custom templates

Agent: Claude (Cowork session), at the maintainer's request. Scope agreed with the maintainer: points 1, 3 and 4 of the 0.2 proposal; point 2 (explicit `id:`) rejected (ADR-016). The version number was not changed.

## Done

- **Templates (25 in 13 families).** New: `timeline:swimlanes` (lanes × periods, milestones as cards), `timeline:gantt` (`from:`/`to:`, `pct:` progress, `milestone` flag), `process:vertical`, `process:loop` (closed track with direction arrows), `funnel:bars` (bars sized by value with stage-to-stage conversion), `cycle:orbit`, `kpi:gauges`, `comparison:table` (yes/no/partial/text cells, `highlight` column), `matrix:swot` (one line per point, `labels` to translate the box titles), `stack:layers` (layers with wrapping component chips), `venn:circles` (2–3 sets). Shared period helpers in `timeline/periods.ts`. `ElementSpec.acceptsExtraValues` collects extra positional values into `item.values`.
- **Brand kit v1** (`packages/core/src/brand/`): `parseBrandKit()` with errors and readability warnings, `render({ brandKit })`, logo in a corner (inline SVG or data URI only), default style per family, CLI `--brand`, MCP `brand_kit`. JSON Schema in `docs/brand-kit.schema.json`, guide in `docs/brand-kits.md`, example `examples/acme.brand.json`.
- **Custom templates and themes**: `createRenderer({ templates, themes, includeBuiltInTemplates, includeBuiltInThemes })`, `defineTemplate()`, `checkTemplates()`. Rendering now goes through an `Engine` (registry + theme catalogue); theme directives and the frame (heading, logo) moved to their own modules.
- ADR-016, ADR-017, ADR-018; roadmap, CHANGELOG, README updated; gallery regenerated.

## Results

- Core: 223 tests, studio: 3 tests, all passing. Every template renders with 1, 4, 10 and 30 elements (clipped to its range) without overlapping or clipped text, with all themes and at 800 px.
- Visual review of the 11 new templates at their example size and at their maximum element count.

## Open questions

- Which templates the maintainer uses most in missions, to prioritise refinements.
- Fonts in logos: resvg does not render text inside an embedded SVG logo without the font; advise vector (outlined) logos.
- Studio: brand kit import is not done yet.
