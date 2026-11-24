# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/) (0.x: breaking changes may happen in minor versions).

## [Unreleased]

### Added

- Declarative elastic connector metadata (`data-mplate-connector`, `data-mplate-from`, `data-mplate-to`, and origin coordinates) on connected templates (`brain:spokes`, `brain:arc`, `org:tree`, `process:steps`, `process:vertical`, `timeline:vertical`) so editors flex connectors live when elements are dragged (ADR-020).
- Studio properties panel: edit `date:`, `pct:`, `from:`, `to:` and `label:` fields on elements, and edit or remove the diagram header title and subtitle in one click when no element is selected.
- Template quality checklist in `docs/authoring-templates.md`.

### Fixed

- Remove arbitrary `maxLines` description caps across vertically extensible templates (`kpi:tiles`, `kpi:gauges`, `cards:grid`, `process:chevrons`, `process:steps`, `process:vertical`, `process:loop`, `timeline:vertical`, `timeline:axis`, `timeline:swimlanes`, `comparison:columns`, `comparison:table`, `matrix:swot`, `stack:layers`, `org:tree`) so containers grow and shrink dynamically with multi-line text.
- Studio properties panel: read and rewrite `sub:`, `value:` and `delta:` attributes in place (including `kpi:tiles` lines with `sub:"..."` and omitted optional positional slots) instead of inserting an ignored positional string or showing an empty field.
- Studio canvas: keep moved (unresized) template elements auto-resizing with updated text height instead of locking their initial height and squashing text via `scaleY`.

### Security

- **Core (`@mplate/core`)**: validate and sanitize inline and `data:` SVG brand kit logos (blocking `<script>`, `<foreignObject>`, event handlers, `javascript:`/`vbscript:` URIs, `@import`, and external `href`/`url()` references) and enforce a 256 KB logo size cap; validate brand kit and DSL directive font names; enforce DSL bounds (256 KB source, 2,000 lines, 16-level nesting depth); validate SVG tag and attribute names in `serialize()`; bound `svgToPng` scale (`0.25–8`) and `overrides` offsets (`±10,000`); guard all dictionary lookups against `Object.prototype` keys (`__proto__`, `constructor`, `prototype`).
- **MCP server (`mplate-mcp`)**: cap stdio line size (1 MB) and JSON-RPC batch size (20); validate `format`, `width`, `overrides`, and `output_path` (rejecting null bytes, mismatched extensions, and escapes outside `MPLATE_MCP_OUT_DIR` when set).
- **Studio (`@mplate/studio`)**: sanitize `#dsl=` share links and `localStorage` drafts; validate element IDs, stroke colours and stroke widths before generating scoped `<style>` CSS; restrict font-embedding fetches to `fonts.googleapis.com` / `fonts.gstatic.com` with 5 s timeouts and `<`/`>` stripping; cap raster canvas export dimensions at 8192 px; validate clipboard paste payloads; inject a strict production Content-Security-Policy meta tag via Vite build.
- **CI**: add explicit `permissions: contents: read` to `.github/workflows/ci.yml`.

## [0.1.1] - 2026-11-06

### Added

- 11 new original templates (25 in total): `timeline:swimlanes`, `timeline:gantt`, `process:vertical`, `process:loop`, `funnel:bars`, `cycle:orbit`, `kpi:gauges`, `comparison:table`, `matrix:swot`, `stack:layers` and `venn:circles`.
- Elements can accept extra positional values (`row "Feature" yes no "10 GB"` in `comparison:table`).
- Brand kits: an open JSON format (`kind: "mplate-brand-kit"`, version 1) with palette, colours, fonts, shape, logo and default styles per family; `parseBrandKit()` validates it and warns about unreadable colours; `render(source, { brandKit })`, `mplate render --brand kit.json` and the MCP `brand_kit` argument. JSON Schema in `docs/brand-kit.schema.json`. See `docs/brand-kits.md`.
- `createRenderer({ templates, themes })` to add or replace templates and themes without forking; `defineTemplate()` helper; duplicate names are rejected.
- Manual adjustments: `render(source, { overrides })` changes the text, icon or colour of one element, or moves it with `dx`/`dy`, keyed by element id. Unknown ids are reported in `result.unusedOverrides`. Also available as `mplate render --overrides file.json` and in the `mplate_render` MCP tool. See `docs/adjustments.md`.
- `result.layout.elements`: every element with its id, keyword, title, DSL line and parent.
- mplate studio (`apps/studio`): free, account-free web editor, based on the maintainer's editor UI (ADR-019). Canvas with zoom, shapes, icons (Lucide), connections, Mermaid import, layers, properties, smart guides, undo/redo and grouping; the 25 mplate templates in a gallery with themes and widths; a CodeMirror DSL editor with highlighting, autocomplete and line diagnostics; click a template element to edit its text (the DSL line is rewritten), colour, stroke, position, size, rotation or visibility; SVG, PNG and JPG export, copy as image; drafts in the browser and share links that carry the design in the URL.
- GitHub Pages workflow that deploys the studio.

### Changed

- `@swot` now points to `matrix:swot` instead of `matrix:quadrant`.
- The repository is now an npm workspace: the engine moved to `packages/core` (published as `@mplate/core`).

## [0.1.0] - 2026-11-04

### Added

- DSL parser with indentation-based children, attributes, flags, colours, comments and line-level diagnostics with hints.
- Header syntax `@family style:name`, with legacy numbered aliases such as `@brain2`.
- Theme tokens (palette, colours, fonts, shape), four built-in themes, automatic shades beyond the palette length and contrast-aware text colours.
- Text measurement, wrapping, shrink-to-fit and truncation without a browser.
- SVG renderer with stable `data-mplate-id` element ids; optional PNG export through `@resvg/resvg-js`.
- 14 original templates: `process:chevrons`, `process:steps`, `timeline:axis`, `timeline:vertical`, `funnel:stack`, `pyramid:layers`, `cycle:ring`, `brain:spokes`, `brain:arc`, `cards:grid`, `kpi:tiles`, `comparison:columns`, `matrix:quadrant`, `org:tree`.
- Identity card for every template, exposed by `mplate describe` and the MCP server.
- CLI `mplate` (`render`, `validate`, `list`, `describe`, `guide`, `themes`, `icons`).
- Dependency-free MCP server `mplate-mcp` over stdio (`mplate_guide`, `mplate_list_templates`, `mplate_describe_template`, `mplate_validate`, `mplate_render`).
- Layout test suite rendering every template with 1, 4, 10 and 30 elements and checking for overlapping or clipped text.
