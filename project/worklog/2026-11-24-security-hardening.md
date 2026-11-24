# 2026-11-24 — Security hardening pass (core, MCP server, studio, CI)

Agent: Antigravity, at the maintainer's request.

## Done

- **Core (`packages/core`)**:
  - Hardened [`brand/parse.ts`](../../packages/core/src/brand/parse.ts): added 256 KB size cap on `logo.src`, strict validation of raster base64 data URIs, full decoding and active/external content rejection for inline and `data:` SVG logos, font value checks, and prototype-key filtering.
  - Hardened [`dsl/parse.ts`](../../packages/core/src/dsl/parse.ts) and [`dsl/tokenize.ts`](../../packages/core/src/dsl/tokenize.ts): bounded source size (256 KB), line count (2,000) and nesting depth (16), and filtered `__proto__`/`constructor`/`prototype` attribute names.
  - Replaced unguarded dictionary lookups with `Object.hasOwn` / dangerous-key filtering in [`icons/index.ts`](../../packages/core/src/icons/index.ts), [`theme/resolve.ts`](../../packages/core/src/theme/resolve.ts), [`render/items.ts`](../../packages/core/src/render/items.ts), [`render/render.ts`](../../packages/core/src/render/render.ts), [`render/overrides.ts`](../../packages/core/src/render/overrides.ts), and [`cli/args.ts`](../../packages/core/src/cli/args.ts).
  - Validated font directives in [`render/themeDirectives.ts`](../../packages/core/src/render/themeDirectives.ts), XML element/attribute names in [`svg/node.ts`](../../packages/core/src/svg/node.ts), and PNG export scale (`0.25–8`) in [`export/png.ts`](../../packages/core/src/export/png.ts).
  - Hardened [`mcp/main.ts`](../../packages/core/src/mcp/main.ts) and [`mcp/tools.ts`](../../packages/core/src/mcp/tools.ts): added 1 MB line / 20-item batch limits, strict format/width/overrides checks, `output_path` extension and null-byte checks, and optional `MPLATE_MCP_OUT_DIR` containment.
- **Studio (`apps/studio`)**:
  - Eliminated CSS injection in [`TemplateRenderer.tsx`](../../apps/studio/src/templates/TemplateRenderer.tsx) (`buildElementCss`) and prototype-chain matches in [`geometry.ts`](../../apps/studio/src/templates/geometry.ts).
  - Sanitized share links and `localStorage` drafts in [`share.ts`](../../apps/studio/src/share.ts) (256 KB limit, strict schema and bounds).
  - Hardened [`generateSvg.ts`](../../apps/studio/src/export/generateSvg.ts) (font allowlist, `fonts.gstatic.com` URL pinning, 5 s fetch timeout, `<`/`>` stripping, finite viewBox fallbacks), [`generateImage.ts`](../../apps/studio/src/export/generateImage.ts) (8192 px canvas cap), and [`App.tsx`](../../apps/studio/src/App.tsx) (clipboard paste shape validation and 200-item cap).
  - Injected a production `Content-Security-Policy` `<meta>` tag in [`vite.config.ts`](../../apps/studio/vite.config.ts) (`apply: 'build'`).
- **CI & Tests**:
  - Added `permissions: contents: read` to [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).
  - Added [`packages/core/tests/security.test.ts`](../../packages/core/tests/security.test.ts) and [`apps/studio/tests/security.test.ts`](../../apps/studio/tests/security.test.ts).

## Results

- `npm run typecheck`, `npm test`, `npm run build`, and `npm run gallery` verified after all edits.

## Open questions

- `npm audit` reports 3 dev-only advisories in `vitest` / `@vitest/mocker` / `tinypool` (test runner only, not shipped in `@mplate/core` or the static studio build). Upgrading to `vitest@5` requires Node `>= 22.12`, while CI currently runs on Node 20 and 22.
- SVG export in the studio still optionally fetches font stylesheets from `fonts.googleapis.com` / `fonts.gstatic.com`; consider adding an offline toggle if strict zero-network export is desired.
