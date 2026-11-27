# Writing a template

A template is a TypeScript object with an **identity card** (what it is and what it accepts) and a **render function** (how it draws). Look at `packages/core/src/templates/funnel/stack.ts` for a compact example.

## 1. Originality first

Every template in this repository must be an **original design**. Generic concepts (a funnel, a timeline, a 2×2 matrix) are free to use; a specific existing design (a vendor's slide template, a stock infographic pack, a company's brand template) is not. Do not trace, copy coordinates or reproduce the distinctive look of an existing template. If in doubt, open an issue before writing code.

## 2. Identity card

```ts
card: {
  id: 'funnel:stack',            // family:style, unique
  family: 'funnel',
  style: 'stack',
  isDefaultStyle: true,          // exactly one default per family
  aliases: ['funnel1'],          // legacy or convenience names, unique across the registry
  name: 'Stacked funnel',
  description: 'One or two sentences an LLM can use to choose this template.',
  useCases: ['sales pipeline', 'conversion'],
  items: { min: 1, max: 10, recommended: [3, 6] },
  elements: [{ keyword: 'level', aliases: ['stage'], description: '…', positional: ['title', 'subtitle', 'value'] }],
  settings: [],                  // one-off lines such as `center "Text"`
  example: `@funnel "Sales pipeline"\n  level …`,   // must render with zero diagnostics
  tags: ['conversion'],
}
```

## 3. Render function

`render(canvas, input)` receives:

- `input.items`: parsed elements with `title`, `subtitle`, `value`, `percent`, `icon`, `date`, `flags`, `children` and a resolved `color`;
- `input.settings`: values of the template's setting lines;
- `canvas`: drawing primitives (`rect`, `path`, `circle`, `line`, `icon`, `text`, `measure`, `group`), the resolved `theme`, and the drawing area (`left`, `top`, `contentWidth`).

Rules:

1. **No hard-coded colours or fonts.** Use `item.color`, `canvas.theme.colors.*`, `canvas.theme.accent(i)`, `canvas.theme.textOn(fill)` and `canvas.theme.ink(color)`.
2. **Draw each element inside `canvas.group(item.id, …)`** so it keeps a stable id.
3. **Lay out from the count.** Compute sizes from `items.length` and measured text; never assume a fixed number of elements.
4. **Use `canvas.text`** for all text: it wraps, shrinks down to `minSize`, truncates with an ellipsis and records the text box for overlap tests.
5. **Call `canvas.extendHeight(bottom)`** with the lowest point drawn; the canvas height follows the content.
6. **Keep files under ~300 lines**, no `any`, no comments (see `project/conventions.md`).

## 4. Template quality checklist

Before marking a template ready, verify each point:

1. **Transparency and framing**: never draw an opaque background inside a template (`render.ts` owns the optional document background), and never hard-code default slide titles, footers or logos.
2. **DSL fidelity**: every declared attribute, positional field, flag or setting on the identity card must have a visible effect, and empty/optional values must fall back cleanly.
3. **Parametric N-element layout**: compute geometry dynamically from `items.length` (with `Math.max(1, count)` guards) and avoid accidental overlaps across the full `items.min`–`items.max` range.
4. **Multi-line text and auto-resize**:
   - Never slice strings manually; let `canvas.text` / `canvas.measure` wrap words and preserve explicit `\n` line breaks.
   - On templates with vertically extensible cards, rows or lists, do not impose an arbitrary `maxLines` cap on descriptions (`subtitleLines: Infinity`): containers must grow when lines are added and shrink immediately back to their nominal height when lines are removed.
5. **Elastic connectors**: templates that connect elements (`brain:spokes`, `brain:arc`, `org:tree`, `process:steps`, `process:vertical`, `timeline:vertical`) emit `data-mplate-connector`, `data-mplate-from`, `data-mplate-to` and origin endpoint coordinates (`data-mplate-from-x/y`, `data-mplate-to-x/y`) so editors can stretch connectors when elements move.
6. **Theme cascade and strict types**: all colours and fonts come from theme tokens (overridable by DSL `#hex` and engine `overrides`), zero `any`, zero `NaN` in SVG output.
7. **Dynamic icons**: every element (and child element) supports `icon:<name>` via `canvas.icon(...)` with theme-aware contrast (`textOn` / `ink`) and reserved layout space so icons never clip or overlap text. Verified automatically across all templates in `templates.test.ts`.

## 5. Register and test

Add the template to `packages/core/src/templates/registry.ts`. The test suite then automatically renders it with 1, 4, 10 and 30 elements (clipped to its range), with every theme and at a narrow width, and fails on overlapping text, text outside the canvas, `NaN`, or diagnostics on the example.

Run `npm test`, then `npm run gallery` to refresh `docs/templates.md` and `docs/gallery/`.

## 6. Use your own templates

Templates do not have to live in this repository. Build a renderer with your own templates and themes:

```ts
import { createRenderer, defineTemplate } from '@mplate/core'

const ribbon = defineTemplate({ card: { id: 'ribbon:plain', family: 'ribbon', style: 'plain', isDefaultStyle: true, /* … */ }, render(canvas, input) { /* … */ } })

const mplate = createRenderer({ templates: [ribbon], themes: [myTheme] })
mplate.render('@ribbon\n  band "Hello"')
mplate.syntaxGuide()   // includes your templates, ready for an LLM
```

Options: `includeBuiltInTemplates: false` keeps only your templates; `includeBuiltInThemes: false` keeps only your themes. A custom template with the same id as a built-in one replaces it; a custom default style takes over its family. Duplicate names and malformed ids throw at creation time.
