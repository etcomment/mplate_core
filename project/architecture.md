# Architecture

## Repository layout

```
packages/core/   @mplate/core — DSL, engine, templates, CLI, MCP server (published to npm)
apps/studio/     @mplate/studio — free web editor, React + Vite, deployed to GitHub Pages
docs/            user documentation and the generated gallery
examples/        sample documents and a brand theme
project/         framing documents and work log
```

Commands run from the root with npm workspaces: `npm run build`, `npm test`, `npm run typecheck`, `npm run gallery`, `npm run studio:dev`.

## Engine pipeline

```
source text
   │  dsl/tokenize.ts, dsl/parse.ts
   ▼
DslDocument (header + nodes, with line numbers)  ──► diagnostics
   │  templates/lookup.ts       family / style / alias → TemplateDefinition
   │  render/render.ts          theme resolution (options, header, `theme` lines)
   │  render/items.ts           nodes → typed Items via the identity card
   ▼
TemplateInput (title, settings, items with resolved colours)
   │  template.render(canvas, input)
   ▼
Canvas (svg/node.ts tree, text boxes, element ids, height)
   │  svg/node.ts serialize
   ▼
RenderResult { ok, svg, width, height, template, diagnostics, layout }
```

## Modules

Paths below are relative to `packages/core/`.

| Path | Responsibility |
| --- | --- |
| `src/dsl/` | Tokenizer and indentation-aware parser. Knows nothing about templates. |
| `src/theme/` | Theme types, built-in themes, colour maths, contrast, palette shades, `resolveTheme`. |
| `src/text/` | Width estimation, wrapping, shrink-to-fit and truncation. |
| `src/svg/` | Minimal SVG element tree and serializer; path helpers (polygons, ring segments, chevrons). |
| `src/icons/` | Generated Lucide subset (`npm run icons:generate`) and name resolution with aliases. |
| `src/render/` | `Canvas` drawing API, item building and validation against the identity card, the render pipeline. |
| `src/templates/` | One folder per family, one file per style; `registry.ts` lists them; `shared.ts` and `radial.ts` hold layout helpers. |
| `src/describe.ts` | Identity-card formatting and the LLM guide. |
| `src/validate.ts` | Validation result and diagnostic formatting. |
| `src/export/png.ts` | Optional PNG export through `@resvg/resvg-js`. |
| `src/cli/` | `mplate` command (I/O injected for tests). |
| `src/mcp/` | MCP server (`server.ts`), tool definitions (`tools.ts`), stdio transport (`main.ts`). |

## Extension points

- **New template**: add `src/templates/<family>/<style>.ts` and register it (see `docs/authoring-templates.md`).
- **New theme**: add it to `src/theme/themes.ts`, or pass a `ThemeOverride` at render time.
- **New icon**: add its Lucide name to `scripts/generate-icons.mjs` and regenerate.
- **Custom registry**: `new TemplateRegistry([...])` is exported for downstream products; the default `render` uses the built-in registry (making the registry injectable into `render` is on the backlog).

## Coordinates

All templates draw on a canvas of fixed width (default 1200 px) with 48 px padding; the height grows with the content. The heading (title, subtitle) is drawn by the pipeline, and `canvas.top` points below it.

## Studio

React app (ADR-019). The editor shell is the maintainer's prototype UI; the template layer is an adapter around `@mplate/core`.

| Path | Responsibility |
| --- | --- |
| `src/App.tsx` | Layout: toolbar, left tabs (shapes, templates), canvas, layers and properties, code drawer, status bar; keyboard shortcuts |
| `src/editor/`, `src/core/`, `src/store/diagramStore.ts` | Canvas, shapes and connections model, commands (undo/redo), smart guides |
| `src/mermaid/` | Mermaid import into canvas shapes |
| `src/panels/` | Toolbar, shape library, icon panel (Lucide), layers, properties, code drawer |
| `src/templates/store.ts` | Template state: DSL, theme, width, render result, colours, positions, rotations, stroke, hidden elements, groups |
| `src/templates/TemplateRenderer.tsx` | Puts the engine's SVG on the canvas, measures each `data-mplate-id` group, applies move/resize/rotate transforms, selection |
| `src/templates/dslLines.ts`, `elementFields.ts` | Read and rewrite one element line of the DSL (text edits from the properties panel) |
| `src/templates/session.ts`, `src/share.ts` | Draft in `localStorage`, share links (`#dsl=` + base64url JSON with colours and canvas adjustments) |
| `src/lib/codemirror/` | DSL highlighting, autocomplete (headers, keywords, attributes, icons) and diagnostics from `validate()` |

No server receives the design. SVG export may download the font from Google Fonts to embed it in the file.
