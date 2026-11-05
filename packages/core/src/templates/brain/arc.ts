import { formatNumber as n } from '../../svg/node.js'
import { drawBadge, drawTextStack, measureTextStack } from '../shared.js'
import type { TemplateDefinition } from '../types.js'
import { BRAIN_CENTER, BRAIN_NODE } from './spokes.js'

export const brainArc: TemplateDefinition = {
  card: {
    id: 'brain:arc',
    family: 'brain',
    style: 'arc',
    isDefaultStyle: false,
    aliases: ['brain2'],
    name: 'Hub with arc',
    description: 'A central idea on the left with related ideas fanned out along an arc to the right. Reads well with long descriptions.',
    useCases: ['pillars of a strategy', 'workstreams of a programme', 'benefits of an offer'],
    items: { min: 1, max: 12, recommended: [3, 7] },
    elements: [BRAIN_NODE],
    settings: [BRAIN_CENTER],
    example: `@brain style:arc "Why customers choose us"
  center "Our offer"
  node "Fast" "Live in two weeks, not two quarters" icon:zap
  node "Simple" "One line of text per element" icon:sparkles
  node "On brand" "Your colours and fonts everywhere" icon:palette
  node "Open" "Apache 2.0 engine you can self-host" icon:globe`,
    tags: ['mindmap', 'fan', 'hub'],
  },
  render(canvas, input) {
    const { items } = input
    const count = items.length
    const hubRadius = Math.min(96, canvas.contentWidth * 0.09)
    const nodeRadius = 26
    const textOptions = { titleSize: 18, subtitleSize: 14, titleLines: 2, subtitleLines: 2 }
    const minimumSpacing = 92
    const maxAngle = 64
    const span = (count - 1) * minimumSpacing
    const arcRadius = Math.max(240, span / 2 / Math.sin((maxAngle * Math.PI) / 180))
    const offsets = items.map((_, index) => (count > 1 ? -span / 2 + index * minimumSpacing : 0))
    const hub = { x: canvas.left + hubRadius + 8, y: canvas.top + Math.max(hubRadius, span / 2 + nodeRadius + 12) }
    const positions = offsets.map((offset) => ({ x: hub.x + Math.sqrt(arcRadius * arcRadius - offset * offset) * 0.75, y: hub.y + offset }))
    positions.forEach((position, index) => {
      const controlX = hub.x + (position.x - hub.x) * 0.35
      canvas.path(`M${n(hub.x)} ${n(hub.y)} Q${n(controlX)} ${n(position.y)} ${n(position.x)} ${n(position.y)}`, { fill: 'none', stroke: items[index]!.color, 'stroke-width': 2.5, 'stroke-opacity': 0.6 })
    })
    canvas.circle(hub.x, hub.y, hubRadius, { fill: canvas.theme.colors.text })
    const centerText = input.settings.center?.join(' ')
    if (centerText) {
      const side = hubRadius * 1.45
      canvas.text({ text: centerText, x: hub.x - side / 2, y: hub.y - side / 2, width: side, height: side, size: 21, minSize: 11, weight: 800, align: 'middle', valign: 'middle', maxLines: 3, color: canvas.theme.textOn(canvas.theme.colors.text), font: 'heading', owner: 'center' })
    }
    let bottom = hub.y + hubRadius
    items.forEach((item, index) => {
      canvas.group(item.id, () => {
        const position = positions[index]!
        canvas.circle(position.x, position.y, nodeRadius + 5, { fill: canvas.theme.colors.background })
        drawBadge(canvas, item, position.x, position.y, nodeRadius)
        const textLeft = position.x + nodeRadius + 16
        const width = canvas.left + canvas.contentWidth - textLeft
        const height = measureTextStack(canvas, item, { ...textOptions, x: 0, y: 0, width })
        const top = position.y - height / 2
        drawTextStack(canvas, item, { ...textOptions, x: textLeft, y: top, width })
        bottom = Math.max(bottom, top + height, position.y + nodeRadius)
      })
    })
    canvas.extendHeight(bottom)
  },
}
