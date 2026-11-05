# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/) (0.x: breaking changes may happen in minor versions).

## [Unreleased]

Planned as 0.1.1.

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
