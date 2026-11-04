# 2026-11-04 — Initial engine, CLI, MCP and 14 templates

Agent: Claude (Cowork session), at the maintainer's request.

## Done

- Repository scaffold: TypeScript strict, ES modules, zero runtime dependencies, Vitest, CI (Node 20 and 22), Apache 2.0 with `NOTICE` and Lucide attribution.
- DSL v0.1 (`src/dsl/`): header `@family [style:name] "Title" [theme:] [width:] [background:none]`, positional values, `key:value` attributes (quoted values allowed), flags, `#hex` colours, indentation children, `//` and `# ` comments, line-level diagnostics with hints.
- Engine: theme tokens and four built-in themes; palette shades beyond the palette length; `textOn` (best-contrast text on fills) and `ink` (accent text darkened to 3:1); text measurement, wrapping, shrink-to-fit and ellipsis; SVG builder with stable `data-mplate-id`; optional PNG through `@resvg/resvg-js`.
- 14 original templates in 11 families: `process:chevrons`, `process:steps`, `timeline:axis`, `timeline:vertical`, `funnel:stack`, `pyramid:layers`, `cycle:ring`, `brain:spokes`, `brain:arc` (alias `@brain2`), `cards:grid`, `kpi:tiles`, `comparison:columns`, `matrix:quadrant`, `org:tree`.
- Identity card per template; `mplate describe`, `mplate guide` and `docs/llm-guide.md` are generated from them.
- CLI `mplate`: `render` (SVG/PNG, theme name or JSON file, width, no-background, strict), `validate`, `list`, `describe`, `guide`, `themes`, `icons`.
- MCP server `mplate-mcp` (stdio, hand-written JSON-RPC): `mplate_guide`, `mplate_list_templates`, `mplate_describe_template`, `mplate_validate`, `mplate_render` (inline SVG, file output, PNG preview).
- Docs: README, DSL reference, theming, MCP, template authoring, generated catalogue and gallery, CONTRIBUTING (DCO), CHANGELOG, `AGENTS.md`, and this `project/` folder.

## Results

- `npm run typecheck`: clean. `npm test`: 7 files, all tests passing, including every template rendered with 1, 4, 10 and 30 elements (clipped to each template's range) with no overlapping or clipped text, every built-in theme, and an 800 px width.
- End-to-end checks: CLI renders SVG and PNG from stdin and files; the MCP server answers `initialize`, `tools/list` and `tools/call` over stdio.
- Gallery reviewed visually as PNG (default and dark themes, examples and maximum element counts).

## Open questions and follow-ups

- npm name: `mplate` is taken on npm (an unrelated text-templating CLI, single release in 2018). Decided: scoped `@mplate/core` (ADR-011).
- Text widths are estimated (ADR-007). Check rendering with the real fonts used in slides; add a metric table if text gets clipped in practice.
- `render()` always uses the built-in registry; downstream products will need an injectable registry (backlog).
- Manual adjustments by element id are specified but not implemented (backlog).
- Next templates: see the Phase 2 backlog in `roadmap.md` (11 more to reach 25).

## Addendum — npm name

- Package renamed from `mplate-core` to `@mplate/core` in `package.json`, README and MCP docs; ADR-011 added; roadmap updated (create the npm organisation, ask for the unscoped name).
