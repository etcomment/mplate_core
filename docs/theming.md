# Theming

Templates never hard-code colours or fonts. They read **theme tokens**, so the same document can be rendered in any brand.

## Tokens

```ts
interface Theme {
  name: string
  description: string
  palette: string[]          // ordered accent colours, one per element
  colors: {
    background, surface, surfaceAlt,   // canvas, cards, tracks
    text, textMuted, textInverse,      // main text, secondary text, text on dark fills
    line,                              // connectors and axes
    positive, negative, warning        // semantic colours
  }
  fonts: { heading: string; body: string }   // CSS font-family lists
  shape: { radius: number; strokeWidth: number }
}
```

## Rules the engine applies

- **Palette order**: element *n* takes `palette[n]`. Beyond the palette length, the engine generates lighter and darker shades of the palette, so 30 elements never repeat the exact same colour.
- **Readable text on fills**: text drawn on a coloured shape uses whichever of `textInverse` or `text` has the best contrast with that fill.
- **Accent text on light surfaces**: when an accent colour is used as text (numbers, titles), it is darkened (or lightened on dark themes) until it reaches a 3:1 contrast ratio.

## Built-in themes

| Name | Description |
| --- | --- |
| `default` | Balanced, high-contrast palette for slides and documents |
| `ocean` | Cool blues and teals, calm and corporate |
| `mono` | Grayscale with a single accent, for print and sober decks |
| `dark` | Dark background with luminous accents |

## Custom themes

In a document:

```mplate
@cards "Our values"
  theme palette:"#004e89,#ff6b35,#1a936f" font:"Montserrat, Arial, sans-serif"
  card "Care"
  card "Craft"
  card "Courage"
```

From the CLI, with a JSON file containing a partial theme:

```json
{ "name": "default", "palette": ["#004e89", "#ff6b35", "#1a936f"], "fonts": { "heading": "Montserrat, Arial, sans-serif" } }
```

```bash
mplate render values.mplate --theme brand.json -o values.svg
```

From code:

```ts
render(source, { theme: { palette: ['#004e89', '#ff6b35'], colors: { text: '#111827' } } })
```

Fonts are referenced by name; the viewer (browser, PowerPoint, resvg) must have them installed or embedded.
