# Instructions for AI agents and contributors

Several people and agents work on this repository. Before changing anything:

1. Read [`project/README.md`](project/README.md): it indexes the framing documents (vision, scope, decisions, architecture, roadmap, conventions) and the work log.
2. If `project/private/` exists in your checkout, read its `README.md` too. It holds business and legal context that must **never** be committed, quoted in issues, commit messages, code, docs or pull requests (the folder is git-ignored; the repository is public).
3. Check [`project/roadmap.md`](project/roadmap.md) for what is planned and who is on what, and the latest entry in [`project/worklog/`](project/worklog/) for the current state.

## Hard rules

- **Original templates only.** Never copy, trace or adapt templates, palettes, icons or geometry from another product, slide pack or company template. See `docs/authoring-templates.md`.
- **No hard-coded colours or fonts in templates.** Use theme tokens.
- **Zero runtime dependencies in `@mplate/core`.** Dev dependencies are fine.
- **The studio stays account-free** (ADR-013): the design is never sent to a server, no login, no feature from the commercial list. Its UI is the maintainer's editor (ADR-019); never bring back the prototype's templates, its employer palette or icon set.
- **Tests stay green**: `npm run typecheck && npm test`. New templates are covered automatically by the 1/4/10/30-element layout tests.
- **Regenerate the gallery** (`npm run gallery`) when templates change; CI fails if `docs/` is stale.
- Code conventions: [`project/conventions.md`](project/conventions.md). Code, docs and commits in English.

## When you finish a piece of work

- Add a dated entry in `project/worklog/` (what changed, why, open questions).
- Record any structural choice as a new ADR in `project/decisions.md`.
- Update `project/roadmap.md` checkboxes.

## Commands

```bash
npm install
npm run typecheck
npm test
npm run build
npm run gallery
npm run studio:dev      # studio on http://localhost:5173
node packages/core/dist/cli/main.js render examples/roadmap.mplate -o /tmp/roadmap.svg
```
