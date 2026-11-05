# mplate studio

Free, open-source web editor for mplate. Write the DSL on the left, see the visual on the right.

- Live preview with the engine from `packages/core`
- Line-level errors and warnings, click to jump to the line
- Template gallery generated from the identity cards
- Built-in themes and width presets
- Export SVG or PNG, copy the SVG
- Click an element to adjust it: drag or arrow keys to move, colour picker, jump to its DSL line (see `docs/adjustments.md`)
- Share links: the design is encoded in the URL fragment, nothing is sent to a server
- Drafts saved in the browser (`localStorage`); no account

```bash
npm install            # at the repository root
npm run studio:dev     # http://localhost:5173
npm run studio:build   # static site in apps/studio/dist
```

Deployed to GitHub Pages by `.github/workflows/studio.yml`. Scope rules: see ADR-013 in `project/decisions.md`.
