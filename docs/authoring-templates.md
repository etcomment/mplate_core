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

## 4. Register and test

Add the template to `packages/core/src/templates/registry.ts`. The test suite then automatically renders it with 1, 4, 10 and 30 elements (clipped to its range), with every theme and at a narrow width, and fails on overlapping text, text outside the canvas, `NaN`, or diagnostics on the example.

Run `npm test`, then `npm run gallery` to refresh `docs/templates.md` and `docs/gallery/`.
