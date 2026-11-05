import type { Canvas } from '../../render/canvas.js'
import { chunk, tint } from '../shared.js'
import type { Item, TemplateDefinition } from '../types.js'

function deltaColor(canvas: Canvas, item: Item): string {
  const delta = item.delta?.trim() ?? ''
  if (item.flags.includes('good')) return canvas.theme.colors.positive
  if (item.flags.includes('bad')) return canvas.theme.colors.negative
  if (/^[-−–]/.test(delta)) return canvas.theme.colors.negative
  if (delta.startsWith('+')) return canvas.theme.colors.positive
  return canvas.theme.colors.textMuted
}

function deltaIcon(item: Item): string | undefined {
  const delta = item.delta?.trim() ?? ''
  if (/^[-−–]/.test(delta)) return 'trending-down'
  if (delta.startsWith('+')) return 'trending-up'
  return undefined
}

export const kpiTiles: TemplateDefinition = {
  card: {
    id: 'kpi:tiles',
    family: 'kpi',
    style: 'tiles',
    isDefaultStyle: true,
    aliases: ['dashboard', 'metrics', 'kpi1'],
    name: 'KPI tiles',
    description: 'Metric tiles with a label, a large value, a coloured change indicator and an optional progress bar (pct:). Use the flags `good` or `bad` when a negative change is good news.',
    useCases: ['executive dashboard', 'quarterly results', 'project health'],
    items: { min: 1, max: 24, recommended: [3, 8] },
    elements: [{ keyword: 'metric', aliases: ['kpi', 'stat'], description: 'One metric', positional: ['title', 'value', 'delta', 'subtitle'], flags: ['good', 'bad'] }],
    settings: [],
    example: `@kpi "Q3 at a glance"
  metric "Revenue" "€4.2M" "+18%" icon:euro
  metric "Retention" "94%" "+2 pts" icon:users
  metric "Churn" "0.8%" "-0.2 pts" good icon:trending-down
  metric "Roadmap" "72%" pct:72 sub:"of planned items shipped" icon:rocket`,
    tags: ['dashboard', 'numbers', 'metrics'],
  },
  render(canvas, input) {
    const { items } = input
    const count = items.length
    const columns = count <= 4 ? count : count <= 6 ? 3 : count <= 8 ? 4 : count <= 15 ? 5 : 6
    const gap = 20
    const tileWidth = (canvas.contentWidth - gap * (columns - 1)) / columns
    const isDense = columns >= 5
    const padding = isDense ? 16 : 22
    const innerWidth = tileWidth - padding * 2
    const valueSize = isDense ? 28 : 40
    const tileHeight = padding * 2 + (isDense ? 22 : 26) + valueSize * 1.25 + 10 + 22 + (items.some((item) => item.subtitle) ? 38 : 0) + (items.some((item) => item.percent !== undefined) ? 22 : 0)
    let y = canvas.top
    for (const row of chunk(items, columns)) {
      row.forEach((item, column) => {
        canvas.group(item.id, () => {
          const x = canvas.left + column * (tileWidth + gap)
          canvas.rect({ x, y, width: tileWidth, height: tileHeight }, { rx: canvas.theme.shape.radius, fill: canvas.theme.colors.surface })
          canvas.rect({ x, y: y + padding, width: 5, height: tileHeight - padding * 2 }, { rx: 2.5, fill: item.color })
          let cursor = y + padding
          const iconSize = isDense ? 20 : 24
          const hasIcon = item.icon !== undefined
          if (hasIcon) {
            canvas.circle(x + tileWidth - padding - iconSize / 2, cursor + iconSize / 2, iconSize * 0.85, { fill: tint(canvas, item.color, 0.82) })
            canvas.icon(item.icon!, x + tileWidth - padding - iconSize / 2, cursor + iconSize / 2, iconSize, canvas.theme.ink(item.color, tint(canvas, item.color, 0.82)))
          }
          const label = canvas.text({ text: item.title, x: x + padding + 6, y: cursor, width: innerWidth - 6 - (hasIcon ? iconSize + 12 : 0), size: isDense ? 13 : 15, minSize: 10, weight: 600, maxLines: 1, color: canvas.theme.colors.textMuted })
          cursor = Math.max(label.y + label.height, cursor + (isDense ? 18 : 20)) + 8
          const value = canvas.text({ text: item.value ?? item.percentLabel ?? '—', x: x + padding + 6, y: cursor, width: innerWidth - 6, size: valueSize, minSize: 14, weight: 800, maxLines: 1, font: 'heading' })
          cursor = value.y + value.height + 6
          if (item.delta) {
            const color = deltaColor(canvas, item)
            const icon = deltaIcon(item)
            if (icon) canvas.icon(icon, x + padding + 16, cursor + 10, 18, color)
            canvas.text({ text: item.delta, x: x + padding + (icon ? 30 : 6), y: cursor, width: innerWidth - 30, height: 20, size: 15, minSize: 10, weight: 700, valign: 'middle', maxLines: 1, color })
          }
          cursor += 26
          if (item.subtitle) {
            canvas.text({ text: item.subtitle, x: x + padding + 6, y: cursor, width: innerWidth - 6, size: 13, minSize: 10, maxLines: 2, color: canvas.theme.colors.textMuted })
            cursor += 38
          }
          if (item.percent !== undefined) {
            const barWidth = innerWidth - 6
            const ratio = Math.min(1, Math.max(0, item.percent / 100))
            canvas.rect({ x: x + padding + 6, y: cursor + 6, width: barWidth, height: 8 }, { rx: 4, fill: canvas.theme.colors.surfaceAlt })
            canvas.rect({ x: x + padding + 6, y: cursor + 6, width: barWidth * ratio, height: 8 }, { rx: 4, fill: item.color })
          }
        })
      })
      y += tileHeight + gap
    }
    canvas.extendHeight(y - gap)
  },
}
