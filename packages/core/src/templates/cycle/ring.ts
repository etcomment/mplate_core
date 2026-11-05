import { polarPoint, ringSegmentPath } from '../../svg/paths.js'
import { drawRadialLabel, radialLabelHeight } from '../radial.js'
import { drawBadge } from '../shared.js'
import type { TemplateDefinition } from '../types.js'

export const cycleRing: TemplateDefinition = {
  card: {
    id: 'cycle:ring',
    family: 'cycle',
    style: 'ring',
    isDefaultStyle: true,
    aliases: ['circle', 'cycle1'],
    name: 'Ring cycle',
    description: 'A ring split into equal segments around a central label, for continuous or repeating processes.',
    useCases: ['continuous improvement', 'product lifecycle', 'operating rhythm'],
    items: { min: 1, max: 10, recommended: [3, 6] },
    elements: [{ keyword: 'segment', aliases: ['step', 'stage'], description: 'One segment of the cycle, clockwise from the top', positional: ['title', 'subtitle'] }],
    settings: [{ keyword: 'center', description: 'Text in the middle of the ring', arguments: ['text'] }],
    example: `@cycle "Continuous improvement"
  center "Quality"
  segment "Plan" "Set objectives" icon:target
  segment "Do" "Run the change" icon:play
  segment "Check" "Measure results" icon:chart-line
  segment "Act" "Standardise what works" icon:refresh-cw`,
    tags: ['loop', 'circular', 'pdca'],
  },
  render(canvas, input) {
    const { items } = input
    const count = items.length
    const labelWidth = Math.min(240, canvas.contentWidth * 0.24)
    const outerRadius = Math.min(170, canvas.contentWidth * 0.16)
    const innerRadius = outerRadius * 0.62
    const labelRadius = outerRadius + 30
    const stack = { width: labelWidth, titleSize: 17, subtitleSize: 14, titleLines: 2, subtitleLines: count > 6 ? 2 : 3 }
    const labelHeight = radialLabelHeight(canvas, items, stack)
    const center = { x: canvas.left + canvas.contentWidth / 2, y: canvas.top + labelHeight + labelRadius }
    const sweep = 360 / count
    const gap = count > 1 ? 2 : 0
    let bottom = center.y + outerRadius
    items.forEach((item, index) => {
      canvas.group(item.id, () => {
        const start = index * sweep - sweep / 2 + gap / 2
        const end = start + sweep - gap
        canvas.path(ringSegmentPath(center, innerRadius, outerRadius, start, end), { fill: item.color })
        const middle = (start + end) / 2
        const badgeCenter = polarPoint(center, (innerRadius + outerRadius) / 2, middle)
        drawBadge(canvas, item, badgeCenter.x, badgeCenter.y, (outerRadius - innerRadius) * 0.32, item.color)
        const anchor = polarPoint(center, labelRadius, middle)
        const label = drawRadialLabel(canvas, item, anchor.x, anchor.y, center.x, center.y, stack)
        bottom = Math.max(bottom, label.bottom)
      })
    })
    const centerText = input.settings.center?.join(' ')
    canvas.circle(center.x, center.y, innerRadius - 10, { fill: canvas.theme.colors.surface })
    if (centerText) {
      const side = (innerRadius - 18) * 1.4
      canvas.text({ text: centerText, x: center.x - side / 2, y: center.y - side / 2, width: side, height: side, size: 22, minSize: 12, weight: 800, align: 'middle', valign: 'middle', maxLines: 3, font: 'heading', owner: 'center' })
    }
    canvas.extendHeight(bottom)
  },
}
