import { formatNumber as n } from '../../svg/node.js'
import { polarPoint } from '../../svg/paths.js'
import { chunk, drawTextStack, measureTextStack } from '../shared.js'
import type { TemplateDefinition } from '../types.js'

const SWEEP = 240

function arcPath(center: { x: number; y: number }, radius: number, startAngle: number, endAngle: number): string {
  const start = polarPoint(center, radius, startAngle)
  const end = polarPoint(center, radius, endAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M${n(start.x)} ${n(start.y)} A${n(radius)} ${n(radius)} 0 ${largeArc} 1 ${n(end.x)} ${n(end.y)}`
}

export const kpiGauges: TemplateDefinition = {
  card: {
    id: 'kpi:gauges',
    family: 'kpi',
    style: 'gauges',
    isDefaultStyle: false,
    aliases: ['gauges', 'kpi2'],
    name: 'Gauges',
    description: 'Radial gauges filled to pct:, with the figure in the centre and a label below. Ideal for completion, satisfaction or targets reached.',
    useCases: ['project completion', 'objectives reached', 'survey scores'],
    items: { min: 1, max: 18, recommended: [3, 6] },
    elements: [{ keyword: 'gauge', aliases: ['metric', 'kpi'], description: 'One gauge; pct: sets the fill (0–100)', positional: ['title', 'subtitle', 'value'] }],
    settings: [],
    example: `@kpi style:gauges "Programme health"
  gauge "Scope delivered" "Features in production" pct:72
  gauge "Budget used" "Of the yearly budget" pct:58
  gauge "Team satisfaction" "Quarterly survey" pct:81 val:"8.1/10"
  gauge "Risks closed" "Since kick-off" pct:44`,
    tags: ['dashboard', 'percent', 'progress'],
  },
  render(canvas, input) {
    const { items } = input
    const count = items.length
    const columns = count <= 4 ? count : count <= 6 ? 3 : count <= 8 ? 4 : count <= 12 ? 4 : 6
    const gap = 24
    const cellWidth = (canvas.contentWidth - gap * (columns - 1)) / columns
    const radius = Math.min(84, cellWidth * 0.36)
    const thickness = Math.max(10, radius * 0.2)
    const textOptions = { width: cellWidth - 16, titleSize: columns > 4 ? 15 : 17, subtitleSize: 13, titleLines: 2, subtitleLines: 2 }
    let y = canvas.top
    for (const row of chunk(items, columns)) {
      const textHeight = Math.max(...row.map((item) => measureTextStack(canvas, item, { ...textOptions, x: 0, y: 0 })))
      row.forEach((item, column) => {
        canvas.group(item.id, () => {
          const center = { x: canvas.left + column * (cellWidth + gap) + cellWidth / 2, y: y + radius + thickness / 2 }
          const start = -SWEEP / 2
          canvas.path(arcPath(center, radius, start, start + SWEEP), { fill: 'none', stroke: canvas.theme.colors.surfaceAlt, 'stroke-width': thickness, 'stroke-linecap': 'round' })
          const ratio = Math.min(1, Math.max(0, (item.percent ?? 0) / 100))
          if (ratio > 0.005) canvas.path(arcPath(center, radius, start, start + SWEEP * ratio), { fill: 'none', stroke: item.color, 'stroke-width': thickness, 'stroke-linecap': 'round' })
          const figure = item.value ?? item.percentLabel ?? '—'
          const inner = radius * 1.3
          canvas.text({ text: figure, x: center.x - inner / 2, y: center.y - radius * 0.45, width: inner, height: radius * 0.8, size: Math.round(radius * 0.42), minSize: 12, weight: 800, align: 'middle', valign: 'middle', maxLines: 1, font: 'heading' })
          drawTextStack(canvas, item, { ...textOptions, x: center.x - textOptions.width / 2, y: center.y + radius * 0.72 + 10, align: 'middle' })
        })
      })
      y += radius * 1.72 + thickness / 2 + 10 + textHeight + gap * 1.5
    }
    canvas.extendHeight(y - gap * 1.5)
  },
}
