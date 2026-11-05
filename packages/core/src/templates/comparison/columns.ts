import type { Canvas } from '../../render/canvas.js'
import { roundedTopPath } from '../../svg/paths.js'
import type { Item, TemplateDefinition } from '../types.js'

const POSITIVE_FLAGS = ['yes', 'pro', 'plus']
const NEGATIVE_FLAGS = ['no', 'con', 'minus']

function pointMarker(canvas: Canvas, point: Item, parent: Item): { icon: string; color: string } | undefined {
  if (point.flags.some((flag) => POSITIVE_FLAGS.includes(flag))) return { icon: 'check', color: canvas.theme.colors.positive }
  if (point.flags.some((flag) => NEGATIVE_FLAGS.includes(flag))) return { icon: 'x', color: canvas.theme.colors.negative }
  if (point.icon) return { icon: point.icon, color: point.hasExplicitColor ? point.color : parent.color }
  return undefined
}

export const comparisonColumns: TemplateDefinition = {
  card: {
    id: 'comparison:columns',
    family: 'comparison',
    style: 'columns',
    isDefaultStyle: true,
    aliases: ['compare', 'versus', 'comparison1'],
    name: 'Comparison columns',
    description: 'Two to four options side by side, each with a coloured header and a list of points. Mark points with `yes` or `no` for ticks and crosses.',
    useCases: ['option analysis', 'before / after', 'pros and cons', 'offer tiers'],
    items: { min: 1, max: 4, recommended: [2, 3] },
    elements: [{
      keyword: 'column',
      aliases: ['option', 'side'],
      description: 'One option; its points are indented below it',
      positional: ['title', 'subtitle'],
      child: { keyword: 'point', aliases: ['item', 'bullet'], description: 'One point of the option', positional: ['title'], flags: [...POSITIVE_FLAGS, ...NEGATIVE_FLAGS] },
    }],
    settings: [],
    example: `@comparison "Build or buy?"
  column "Build" "In-house team"
    point "Full control of the roadmap" yes
    point "Twelve months to first value" no
    point "Hiring risk" no
  column "Buy" "SaaS platform"
    point "Live in six weeks" yes
    point "Vendor lock-in" no
    point "Predictable subscription" yes`,
    tags: ['versus', 'options', 'pros-cons'],
  },
  render(canvas, input) {
    const { items } = input
    const count = items.length
    const gap = 28
    const columnWidth = (canvas.contentWidth - gap * (count - 1)) / count
    const padding = 22
    const textWidth = columnWidth - padding * 2
    const headerHeights = items.map((item) => {
      const title = canvas.measure({ text: item.title, x: 0, y: 0, width: textWidth, size: 22, minSize: 16, weight: 800, maxLines: 2 }).height
      const subtitle = item.subtitle ? canvas.measure({ text: item.subtitle, x: 0, y: 0, width: textWidth, size: 15, maxLines: 2 }).height + 4 : 0
      return title + subtitle
    })
    const headerHeight = Math.max(...headerHeights) + padding * 2
    const pointHeights = items.map((item) => item.children.reduce((sum, point) => sum + canvas.measure({ text: point.title, x: 0, y: 0, width: textWidth - 34, size: 16, minSize: 13, maxLines: 3 }).height + 16, 0))
    const bodyHeight = Math.max(60, ...pointHeights) + padding * 2
    items.forEach((item, index) => {
      canvas.group(item.id, () => {
        const x = canvas.left + index * (columnWidth + gap)
        const y = canvas.top
        const radius = canvas.theme.shape.radius
        canvas.rect({ x, y, width: columnWidth, height: headerHeight + bodyHeight }, { rx: radius, fill: canvas.theme.colors.surface })
        canvas.path(roundedTopPath({ x, y, width: columnWidth, height: headerHeight }, radius), { fill: item.color })
        const foreground = canvas.theme.textOn(item.color)
        const title = canvas.text({ text: item.title, x: x + padding, y: y + padding, width: textWidth, size: 22, minSize: 16, weight: 800, maxLines: 2, color: foreground, font: 'heading' })
        if (item.subtitle) canvas.text({ text: item.subtitle, x: x + padding, y: title.y + title.height + 4, width: textWidth, size: 15, maxLines: 2, color: foreground })
        let cursor = y + headerHeight + padding
        item.children.forEach((point) => {
          canvas.group(point.id, () => {
            const marker = pointMarker(canvas, point, item)
            if (marker) canvas.icon(marker.icon, x + padding + 10, cursor + 11, 20, marker.color)
            else canvas.circle(x + padding + 10, cursor + 11, 5, { fill: item.color })
            const box = canvas.text({ text: point.title, x: x + padding + 34, y: cursor, width: textWidth - 34, size: 16, minSize: 13, maxLines: 3 })
            cursor = box.y + box.height + 16
          })
        })
      })
    })
    canvas.extendHeight(canvas.top + headerHeight + bodyHeight)
  },
}
