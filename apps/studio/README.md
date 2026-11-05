# mplate studio

Free, open-source web editor for mplate. No account, and the design is never sent to a server.

The editor shell (toolbar, canvas, shapes, layers, properties, code drawer) is the maintainer's editor UI (ADR-019). Templates come from `@mplate/core`.

- **Templates tab**: the 25 mplate templates grouped by family, with search, theme and width. Templates are drawn without a background, directly on the canvas.
- **Code drawer** (terminal icon): the mplate DSL in CodeMirror with highlighting, autocomplete (`@` headers, element keywords, `val:` `pct:` `icon:` …) and line diagnostics from the engine. *Live* re-renders while you type.
- **Canvas**: click a template element to select it (Ctrl/Cmd-click for several, Ctrl/Cmd+G to group). Drag to move, corner handles to resize, top handle to rotate (Shift snaps to 15°). Child elements (a point in a column, a unit in an org chart) are selected on click and follow their parent.
- **Properties**: title, subtitle and value of the element (the DSL line is rewritten, so the DSL stays the source of truth), fill colour (through engine overrides), stroke, geometry, rotation, reset.
- **Layers**: the element tree of the template and the canvas shapes; hide, reorder, select.
- **Shapes tab**: basic shapes, Lucide icons, Mermaid import, connections.
- **Export**: SVG, PNG, JPG, copy as image. SVG export may download the font from Google Fonts to embed it.
- **Share**: copies a link that carries the DSL, theme, width and canvas adjustments in the URL fragment. Drafts are saved in `localStorage`.

```bash
npm install            # at the repository root
npm run studio:dev     # http://localhost:5173
npm run studio:build   # static site in apps/studio/dist
```

Deployed to GitHub Pages by `.github/workflows/studio.yml`. Scope rules: ADR-013 and ADR-019 in `project/decisions.md`.
