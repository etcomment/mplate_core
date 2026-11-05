# Manual adjustments

The DSL describes the content; the template computes the layout. **Adjustments** let a person (or an editor) fine-tune one element without touching the layout rules: change its text, colour or icon, or move it by a few pixels.

Adjustments are kept **outside** the DSL, as a JSON object keyed by element id. The DSL stays clean and portable, and the same adjustments are re-applied every time the document is rendered.

## Element ids

Every element is drawn inside `<g data-mplate-id="…">`. Ids come from the keyword and the position:

| Element | Id |
| --- | --- |
| first `step` | `step-0` |
| third `milestone` | `milestone-2` |
| first `point` of the second `column` | `column-1-point-0` |

`render()` returns the list in `result.layout.elements`, each with its `id`, `keyword`, `title`, DSL `line` and `parentId`.

## Format

```json
{
  "step-1": { "title": "Ship it", "color": "#7a1fa2" },
  "step-3": { "dx": 0, "dy": 40 },
  "column-0-point-2": { "icon": "rocket" }
}
```

| Field | Effect |
| --- | --- |
| `title`, `subtitle`, `value`, `label` | Replace the text of that field |
| `icon` | Replace the icon (same names as `icon:` in the DSL) |
| `color` | A hex colour, a palette slot (`accent2`) or a theme token (`negative`, `positive`, `textMuted`…) |
| `dx`, `dy` | Move the element, in pixels of the canvas (1200 px wide by default) |

## Using them

```ts
const result = render(source, { overrides: { 'step-1': { color: '#7a1fa2', dy: 20 } } })
result.unusedOverrides // ids that no longer match an element
```

```bash
mplate render plan.mplate --overrides plan.adjustments.json -o plan.svg
```

The MCP tool `mplate_render` accepts the same object in its `overrides` argument.

## Merge rule

An adjustment stays attached to its element id as long as that element exists. When the DSL changes so that an id disappears (a line was deleted), the adjustment is ignored, reported with a warning and listed in `result.unusedOverrides`, so the editor can drop it. Ids follow positions: inserting a line before an element shifts the ids of the elements after it.

In the studio, click an element to select it, then drag it, resize it with the corner handles or rotate it with the top handle. The properties panel edits its text (by rewriting its DSL line), its fill colour (an override as above), its stroke and its geometry. Canvas positions, sizes, rotations, strokes and hidden elements are studio adjustments: they are kept in the draft and the share link, and are part of the SVG exported from the studio, but `render()` does not know them.
