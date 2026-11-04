# mplate DSL reference (v0.1)

An mplate document is plain text: one header line, then one line per element. Indentation nests elements. The same document renders whatever the number of elements, within the range of the chosen template.

## Header

```mplate
@<family>[<digits>] [style:<style>] ["Title"] [theme:<name>] [width:<px>] [background:none]
```

| Part | Meaning |
| --- | --- |
| `@family` | Template family: `process`, `timeline`, `funnel`, `pyramid`, `cycle`, `brain`, `cards`, `kpi`, `comparison`, `matrix`, `org`. |
| `style:` | Named style inside the family (`@process style:steps`). Without it, the family's default style is used. |
| `@family2` | Legacy numbered alias, kept for compatibility (`@brain2` = `@brain style:arc`). Prefer named styles. |
| `"Title"` | Optional heading drawn above the visual. |
| `theme:` | Built-in theme: `default`, `ocean`, `mono`, `dark`. |
| `width:` | Canvas width in pixels (480–3000, default 1200). The height always adapts to the content. |
| `background:none` | Transparent background. |

## Element lines

```mplate
  <keyword> "value 1" "value 2" … [key:value …] [flag …] [#hex]
```

- **Keyword**: one of the template's element keywords (or aliases), e.g. `step`, `level`, `milestone`, `node`.
- **Values**: quoted with `"…"` or `'…'`, or bare words without spaces. Their meaning is positional and given by the template's identity card, usually `"title" "subtitle"`. `\n` inserts a line break, `\"` a quote.
- **Attributes** (`key:value`, value quoted when it contains spaces) accepted on any element:

| Attribute | Meaning |
| --- | --- |
| `val:` / `value:` | A figure displayed prominently (`val:"€1.2M"`). |
| `pct:` / `percent:` | A percentage 0–100 (`pct:72` or `pct:"72%"`), used for bars and gauges. |
| `icon:` | Icon name (`icon:rocket`); kebab-case, camelCase and common aliases are accepted. `mplate icons` lists them. |
| `date:` | A date or period label (`date:"Q3 2027"`). |
| `delta:` | A change indicator (`delta:"+12%"`). |
| `label:` | Replaces the automatic number or label. |
| `sub:` | Subtitle, when it is easier than a positional value. |
| `color:` | A palette slot (`color:accent2`), a theme token (`color:negative`) or a hex colour. |

- **Flags**: bare words declared by the template, such as `done` and `current` on milestones, `yes` / `no` on comparison points, `good` / `bad` on KPIs.
- **Colour**: a trailing `#hex` sets the element colour. Prefer theme colours; hard-code only when the colour carries meaning.

## Children

Indent a line under an element to make it a child. Only templates that declare a child keyword accept children (comparison points, matrix items, org units).

```mplate
@comparison
  column "Build"
    point "Full control" yes
    point "Slow to start" no
```

## Settings and reserved lines

- **Settings** are template-specific one-off lines, such as `center "Text"` for cycles and mind maps, or `x "Effort" "Low" "High"` for the matrix.
- `subtitle "…"` adds a subtitle under the title, for every template.
- `theme [name] [palette:"#a,#b,…"] [font:"Family"] [heading:"Family"] [body:"Family"] [background:#hex] [text:#hex] [muted:#hex] [surface:#hex] [line:#hex]` adjusts the theme for this document.

## Comments

Lines starting with `//` or with `# ` (hash and a space) are ignored.

## Diagnostics

Parsing and rendering never throw on bad input. They return diagnostics with a line number, a severity and usually a hint:

- **errors** stop the render: missing header, unknown family or style, unknown keyword, unterminated string, too few elements;
- **warnings** still render: unknown icon or attribute, extra values, elements beyond the template maximum, text truncated to fit.

`mplate validate file.mplate` prints them; the MCP tools return them to the assistant so it can fix its own output.

## Stable element ids

Each element is rendered inside `<g data-mplate-id="…">` with an id derived from its keyword and position (`step-0`, `column-1-point-2`). Editors use these ids to attach manual adjustments to elements across re-renders.
