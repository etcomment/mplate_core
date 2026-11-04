# Vision and scope

## One sentence

mplate turns a few lines of text into designer-grade infographics that re-flow by themselves from 1 to N elements, written by your AI assistant and rendered in your brand.

## Problem

- Roadmaps, process diagrams, org charts and one-pagers are rebuilt by hand in slide tools, slide after slide.
- Built-in "smart" diagrams adapt to their content but look basic; slide packs look good but are frozen; text-to-diagram tools adapt but draw boxes and arrows.
- AI assistants write text well but produce either frozen images or approximate slides that need rework, and they cannot be trusted with layout.

## Approach

1. **Parametric templates.** A template is a layout algorithm, not a drawing: it accepts a range of elements and recomputes geometry, wrapping and text size.
2. **A small DSL.** One line per element. The author (human or AI) only writes data, so it cannot break the layout.
3. **Theme tokens.** Templates read colours and fonts from a theme, so a brand kit restyles every visual at once.
4. **Be the format AI writes.** An MCP server and an LLM-oriented guide make mplate a tool assistants call, rather than a competitor to them.

## Audiences

| Audience | Pain | What mplate gives |
| --- | --- | --- |
| Developers and advanced AI users | AI visuals are frozen or broken | A reliable, versionable, free text format |
| Project managers, consultants | Hours spent redoing slides | A clean visual in one request, editable later |
| Communication teams | Off-brand visuals everywhere | One theme applied everywhere |
| PMO, IT and transformation leads | No visual standard across teams | A shared library of validated templates |

## Scope of this repository (open source, Apache 2.0)

In scope:

- the DSL and its parser, with diagnostics;
- the rendering engine (layout, text, theming) producing standalone SVG, with optional PNG;
- the template catalogue (original designs only) and their identity cards;
- the CLI and the MCP server;
- documentation, examples and the gallery.

Out of scope (may exist as separate products):

- user accounts, organisations, saving and versioning of designs;
- a hosted editor with manual adjustments on a canvas;
- brand-kit management, locked templates, shared libraries, PowerPoint master import;
- SSO, audit logs, dedicated hosting.

The engine must stay usable without any account or network access. Features needed by downstream products (stable element ids, theme tokens, identity cards) are designed here in a generic way.

## Constraints

- Maintained on less than five hours a week: favour simple, well-tested code over clever code; one priority at a time.
- Zero budget: no paid services in the build or the runtime.
- Zero runtime dependencies for the engine.

## Success indicators

GitHub stars, weekly npm downloads of the engine and MCP server, number of templates, and listing in MCP directories. Targets are tracked privately.
