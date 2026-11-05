# Brand kits

A brand kit is a JSON file that carries a company's visual identity: colours, fonts, corner radius, logo and preferred styles. Pass it to the renderer and every visual comes out on brand, whatever template is used.

The format is open and documented here; tools that manage, lock or share brand kits inside a team can build on it.

## Format (version 1)

```json
{
  "$schema": "https://raw.githubusercontent.com/etcomment/mplate_core/main/docs/brand-kit.schema.json",
  "kind": "mplate-brand-kit",
  "version": 1,
  "name": "Acme Consulting",
  "extends": "default",
  "palette": ["#0b5d4b", "#d9822b", "#2f4b7c", "#8c2f39", "#5a8f29"],
  "colors": { "text": "#14213d", "textMuted": "#55607a", "surface": "#f3f5f2" },
  "fonts": { "heading": "Georgia, serif", "body": "Arial, Helvetica, sans-serif" },
  "shape": { "radius": 3, "strokeWidth": 1.5 },
  "logo": { "src": "<svg …>…</svg>", "width": 150, "height": 36, "position": "top-right" },
  "styles": { "process": "steps", "timeline": "vertical" }
}
```

| Field | Meaning |
| --- | --- |
| `kind`, `version` | Always `"mplate-brand-kit"` and `1` |
| `name` | Shown as the theme name in the SVG |
| `extends` | Base theme (`default`, `ocean`, `mono`, `dark`); the kit's values are applied on top |
| `palette` | Ordered accent colours. Element *n* takes colour *n*; shades are generated beyond the list |
| `colors` | Any theme colour token: `background`, `surface`, `surfaceAlt`, `text`, `textMuted`, `textInverse`, `line`, `positive`, `negative`, `warning` |
| `fonts` | `heading` and `body` as CSS font-family lists. Fonts are referenced, not embedded: the viewer must have them |
| `shape` | `radius` (0–40) and `strokeWidth` (0–10) |
| `logo` | Inline SVG markup or a `data:` URI, with `width` and `height` in pixels and a corner `position`. Remote URLs are refused so that rendering never depends on the network |
| `styles` | Default style per family, used when the DSL header names no style |

A JSON Schema is available in [brand-kit.schema.json](brand-kit.schema.json) for editor validation. A complete example is in [`examples/acme.brand.json`](../examples/acme.brand.json).

## Checks

`parseBrandKit(json)` validates the file and returns errors (the kit is rejected) and warnings (the kit is accepted). Warnings flag readability problems: text on background below 4.5:1, secondary text below 3:1, palette colours with no readable text colour, palette colours that disappear on the background.

## Using a kit

```ts
import { parseBrandKit, render } from '@mplate/core'

const { kit, diagnostics } = parseBrandKit(JSON.parse(file))
const { svg } = render(source, { brandKit: kit })
```

```bash
mplate render plan.mplate --brand acme.brand.json -o plan.svg
```

The MCP tool `mplate_render` accepts the same object in its `brand_kit` argument.

Precedence, from lowest to highest: the base theme (`extends`, or the theme named in the header or in the options), the brand kit, then `theme` lines in the document. An explicit `style:` in the header always wins over the kit's default style.
