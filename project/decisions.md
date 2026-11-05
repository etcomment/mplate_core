# Architecture decision records

Format: context → decision → consequences. Append new records at the end; never delete one, mark it superseded instead.

## ADR-001 — Fresh repository, clean-room templates (2026-11-04)

**Context.** An earlier private prototype proved the idea (DSL, canvas editor, many templates), but its code base was not designed for publication.
**Decision.** Start a new repository with no history. Rewrite the parser and engine from scratch. Ship only templates designed for this repository. No code, template geometry, palette or icon set is imported from the prototype.
**Consequences.** Every template must be original (see `docs/authoring-templates.md`); pull requests adding templates state that the design is original. The DSL keeps the spirit of the prototype's grammar so existing users can migrate.

## ADR-002 — Apache 2.0 and DCO (2026-11-04)

**Decision.** The DSL, engine, CLI and MCP server are licensed under Apache 2.0. External contributions are accepted under the Developer Certificate of Origin (`git commit -s`).
**Consequences.** Permissive licence suited to companies; patent grant included. `NOTICE` and `THIRD_PARTY_NOTICES.md` must stay up to date.

## ADR-003 — Zero runtime dependencies (2026-11-04)

**Decision.** The engine produces SVG strings with its own small builder, text metrics and colour maths. PNG export uses `@resvg/resvg-js` as an optional peer dependency, loaded dynamically.
**Consequences.** Works in Node and browsers, installs instantly, no supply-chain surface. We maintain our own text measurement (see ADR-007).

## ADR-004 — `@family style:name` headers with legacy aliases (2026-11-04)

**Context.** The prototype used numbered variants (`@brain2`, `@roadmap7`), which say nothing about the design.
**Decision.** Templates are identified as `family:style`. The header is `@family [style:name]`; each family has exactly one default style. Numbered names are kept only as aliases (`@brain2` → `brain:arc`).
**Consequences.** LLMs choose styles by name and description. Lookup suggests the closest family or style on typos.

## ADR-005 — Theme tokens only, no colours in templates (2026-11-04)

**Decision.** Templates read colours from `item.color` (palette order or explicit), `theme.colors.*`, `theme.accent(i)`, `theme.textOn(fill)` and `theme.ink(color)`. Fonts come from `theme.fonts`. Beyond the palette length, shades are generated.
**Consequences.** A brand kit is just a theme. Contrast rules are enforced by the engine, not by each template.

## ADR-006 — Identity card per template (2026-11-04)

**Decision.** Each template declares an identity card: id, family, style, aliases, name, description, use cases, element range, element keywords with positional fields and flags, settings, and an example that renders with zero diagnostics.
**Consequences.** The same data drives validation, `mplate describe`, the MCP guide, the docs catalogue and the automatic layout tests.

## ADR-007 — Approximate text metrics (2026-11-04)

**Decision.** Text width is estimated from a Helvetica-like width table with a safety factor, instead of a font engine.
**Consequences.** Layout is deterministic and fast everywhere. Real fonts can be slightly narrower or wider; the safety factor and generous padding absorb the difference. A font-specific metric table can be added to the theme later.

## ADR-008 — Hand-written MCP server over stdio (2026-11-04)

**Decision.** Implement the small subset of MCP needed (initialize, ping, tools/list, tools/call) directly, instead of depending on an SDK.
**Consequences.** Keeps ADR-003. Supported protocol versions are listed in `packages/core/src/mcp/server.ts` and must be reviewed when the protocol evolves.

## ADR-009 — Stable element ids (2026-11-04)

**Decision.** Every element is rendered inside `<g data-mplate-id="keyword-index">`; children use `parent-keyword-index`.
**Consequences.** Downstream editors can store manual adjustments by element id and re-apply them after the DSL changes. Changing the id scheme is a breaking change.

## ADR-010 — Layout quality is tested, not reviewed (2026-11-04)

**Decision.** The test suite renders every template with 1, 4, 10 and 30 elements (clipped to its range), with every built-in theme and at a narrow width, and fails on overlapping text boxes, text outside the canvas, non-finite numbers, or diagnostics on the example.
**Consequences.** A template is "done" when it passes these tests and looks right in the gallery.

## ADR-011 — npm package `@mplate/core` (2026-11-04)

**Context.** The unscoped name `mplate` is taken on npm by an unrelated, inactive package.
**Decision.** Publish under the `mplate` npm organisation: `@mplate/core` for the engine, CLI and MCP server. Further packages (for example a browser bundle) use the same scope. The binaries keep the names `mplate` and `mplate-mcp`.
**Consequences.** Install with `npm install @mplate/core`; run the MCP server with `npx -y -p @mplate/core mplate-mcp`. If the unscoped name becomes available, it can be published later as an alias.

## ADR-012 — Monorepo with npm workspaces (2026-11-05)

**Decision.** One repository: `packages/core` (`@mplate/core`, published) and `apps/studio` (`@mplate/studio`, private, deployed as a static site). `docs/`, `examples/` and `project/` stay at the root. The root `package.json` is private and only orchestrates workspaces.
**Consequences.** The studio always uses the engine from the same commit. CI builds the core first, then type-checks, tests and builds every workspace. `LICENSE`, `NOTICE` and `THIRD_PARTY_NOTICES.md` live at the root and are copied into `packages/core` at pack time.

## ADR-013 — The studio is free and open source (2026-11-05)

**Decision.** The studio (web editor without account) is part of the open-source project under Apache 2.0. It is written from scratch on top of `@mplate/core`; no code is copied from the earlier prototype. Commercial offerings, if any, are built separately and cover: accounts and cloud saving, brand kits, team sharing and libraries, and native PPTX export.
**Consequences.** The studio must work fully offline from the engine: drafts in `localStorage`, sharing through the URL fragment (the design is encoded in the link, nothing is sent to a server). Features in the commercial list above are not added to the open-source studio. Vanilla TypeScript and Vite for now; the framework choice is revisited when canvas editing arrives.

## ADR-014 — What runs on the user's side is free; hosted services have quotas (2026-11-05)

**Decision.** Everything that runs on the user's machine or browser is free and open source without limits: `@mplate/core`, the CLI, the MCP server and the studio. An HTTP server package, `@mplate/server` (`POST /render`, `POST /validate`, `GET /templates`), will also be open source so anyone can self-host it. A hosted instance run by the project, if any, uses API keys and a free quota; usage beyond the quota belongs to the commercial offering.
**Consequences.** `@mplate/server` must be stateless and configurable (port, allowed origins, request size and rate limits) so it is safe to expose. Quota, keys and billing are not part of this repository. Brand kits and PPTX export applied by a hosted API follow ADR-013.

## ADR-015 — Manual adjustments live outside the DSL (2026-11-05)

**Decision.** Adjustments are a JSON object keyed by element id (`{ "step-1": { "color": "#7a1fa2", "dy": 20 } }`) passed to `render()`. Fields: `title`, `subtitle`, `value`, `label`, `icon`, `color`, `dx`, `dy`. Content fields are applied to the items before layout; `dx`/`dy` translate the element's group after layout. An adjustment whose id no longer exists is ignored, reported as a warning and returned in `unusedOverrides`.
**Consequences.** The DSL stays clean and portable; editors store adjustments next to it (the studio keeps them in the draft and the share link). Ids are positional (ADR-009), so inserting a line shifts the ids of later elements; a stable explicit id attribute in the DSL may be added later if this proves painful. In the studio, text is edited in the DSL rather than through overrides, so the DSL remains the single source of truth for content.

## ADR-016 — No explicit element ids: element order is line order (2026-11-05)

**Context.** Positional ids (`step-2`) shift when a line is inserted before an element, which can move a manual adjustment to the wrong element. An explicit `id:` attribute in the DSL was considered.
**Decision.** Rejected to keep the DSL simple. Elements are identified by their order, which is the order of their lines. ADR-009 and ADR-015 stand as they are.
**Consequences.** Editors that store adjustments must re-map them when they insert, delete or reorder lines themselves (the studio can do this because it knows the edit). Adjustments of elements that no longer exist are dropped with a warning.

## ADR-017 — Brand kit format v1 is open (2026-11-05)

**Decision.** A brand kit is a JSON document (`kind: "mplate-brand-kit"`, `version: 1`) with `name`, `extends`, `palette`, `colors`, `fonts`, `shape`, `logo` and `styles`. The format, its JSON Schema, its validation (`parseBrandKit`) and its rendering are part of the open-source engine. Logos must be inline SVG or `data:` URIs; remote URLs are refused. Fonts are referenced by name, not embedded.
**Consequences.** Anyone can write a kit by hand. Managing kits for a team (import from a PowerPoint master, locking, sharing, per-organisation storage) is outside this repository (ADR-013). The version number in the file allows later formats to stay readable.

## ADR-018 — Pluggable templates and themes (2026-11-05)

**Decision.** `createRenderer({ templates, themes, includeBuiltInTemplates, includeBuiltInThemes })` returns a renderer with its own registry and theme catalogue. The module-level `render()` keeps using the built-in set. Templates are validated at creation: `family:style` ids, unique ids and aliases, one default style per family.
**Consequences.** Premium or company-specific templates can be shipped as separate packages that depend on `@mplate/core`. Internally, rendering goes through an `Engine` (`registry` + `themes`); new features must take it as a parameter rather than importing the built-in registry.
