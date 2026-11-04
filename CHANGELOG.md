# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/) (0.x: breaking changes may happen in minor versions).

## [Unreleased]

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
