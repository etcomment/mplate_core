# 2026-11-05 — Studio: the maintainer's editor on top of @mplate/core

Agent: Claude (Cowork session), at the maintainer's request: "reuse my code; the only things you may leave out are the base employer palette and all the templates" (ADR-019). The version number was not changed.

## Done

- `apps/studio` is now the maintainer's React editor: toolbar, Shapes/Templates tabs, shape library, icon panel, canvas with zoom and smart guides, connections, Mermaid import, layers, properties, code drawer, status bar, keyboard shortcuts, copy/paste, undo/redo, grouping, SVG/PNG/JPG export and copy as image.
- Left out:
  - the prototype's template components, registry, DSL parser and template geometry;
  - the employer colour palette, replaced by the palette of the core `default` theme;
  - the employer icon set and the hand-drawn template icons, replaced by Lucide;
  - PPTX export, which is on the commercial list (ADR-013);
  - the PPTX import and the admin page for imported templates;
  - the AI assistant, which needed a private API key and server.
- New template layer (`src/templates/`):
  - store with the same API as the prototype's;
  - engine rendering, keeping the last valid visual while the DSL has errors;
  - per-element bounding-box measurement and transforms for move, resize and rotate;
  - stroke and hidden elements through scoped CSS; fill colour through engine overrides;
  - text edits rewrite the DSL line (`dslLines.ts`).
- Gallery from the identity cards, with search, theme and width.
- CodeMirror DSL mode, autocomplete and diagnostics are driven by the core (identity cards, icon list, `validate()`).
- Drafts and share links now also carry the canvas adjustments: positions, rotations, stroke and hidden elements.
- ADR-019; ADR-013, the architecture, AGENTS.md, README, CHANGELOG, roadmap and third-party notices updated.

## Results

- Core: 223 tests. Studio: 26 tests (DSL line rewriting, geometry, store, share links). All passing.
- Typecheck and build pass.
- Checked in Chromium with Playwright, with no page errors:
  - select, drag, resize, recolour and edit the title of a top-level element;
  - select a child element;
  - share-link round trip;
  - SVG export;
  - Mermaid tab;
  - phone width.

## Open questions

- Should PPTX export come back as a paid add-on outside this repository? The prototype's exporter was not copied.
- SVG export embeds the font by fetching it from Google Fonts (the maintainer's code). The design is not sent, but it is still a third-party request. Keep it, or make it optional?
- Children of an element (a point in a column) follow their parent and cannot be moved on their own yet.
