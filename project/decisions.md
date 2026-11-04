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
**Consequences.** Keeps ADR-003. Supported protocol versions are listed in `src/mcp/server.ts` and must be reviewed when the protocol evolves.

## ADR-009 — Stable element ids (2026-11-04)

**Decision.** Every element is rendered inside `<g data-mplate-id="keyword-index">`; children use `parent-keyword-index`.
**Consequences.** Downstream editors can store manual adjustments by element id and re-apply them after the DSL changes. Changing the id scheme is a breaking change.

## ADR-010 — Layout quality is tested, not reviewed (2026-11-04)

**Decision.** The test suite renders every template with 1, 4, 10 and 30 elements (clipped to its range), with every built-in theme and at a narrow width, and fails on overlapping text boxes, text outside the canvas, non-finite numbers, or diagnostics on the example.
**Consequences.** A template is "done" when it passes these tests and looks right in the gallery.
