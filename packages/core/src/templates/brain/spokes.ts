import { drawRadialLabel, radialLabelHeight } from '../radial.js'
import { drawBadge } from '../shared.js'
import type { ElementSpec, SettingSpec, TemplateDefinition } from '../types.js'

export const BRAIN_NODE: ElementSpec = { keyword: 'node', aliases: ['idea', 'branch', 'topic'], description: 'One idea connected to the centre', positional: ['title', 'subtitle'] }
export const BRAIN_CENTER: SettingSpec = { keyword: 'center', description: 'The central idea', arguments: ['text'] }

export const brainSpokes: TemplateDefinition = {
  card: {
    id: 'brain:spokes',
    family: 'brain',
    style: 'spokes',
    isDefaultStyle: true,
    aliases: ['brain1', 'hub', 'mindmap'],
    name: 'Hub and spokes',
    description: 'A central idea with related ideas arranged all around it.',
    useCases: ['capabilities around a product', 'stakeholder map', 'brainstorm summary'],
    items: { min: 1, max: 10, recommended: [4, 8] },
    elements: [BRAIN_NODE],
    settings: [BRAIN_CENTER],
    example: `@brain style:spokes "Platform capabilities"
  center "Data platform"
  node "Ingestion" "Batch and streaming" icon:database
  node "Quality" "Rules and monitoring" icon:shield-check
  node "Catalogue" "Find and trust data" icon:search
  node "Access" "Policies and roles" icon:lock
  node "Analytics" "Dashboards and notebooks" icon:chart-line`,
    tags: ['mindmap', 'radial', 'hub'],
  },
  render(canvas, input) {
    const { items } = input
    const count = items.length
    const labelWidth = Math.min(210, canvas.contentWidth * 0.2)
    const nodeRadius = 30
    const hubRadius = Math.min(84, canvas.contentWidth * 0.08)
    const radiusX = Math.min(300, canvas.contentWidth / 2 - labelWidth - nodeRadius - 24)
    const radiusY = count <= 2 ? 130 : 190
    const stack = { width: labelWidth, titleSize: 17, subtitleSize: 14, titleLines: 2, subtitleLines: count > 6 ? 2 : 3 }
    const labelHeight = radialLabelHeight(canvas, items, stack)
    const center = { x: canvas.left + canvas.contentWidth / 2, y: canvas.top + labelHeight + nodeRadius + 14 + radiusY }
    const positions = items.map((_, index) => {
      const angle = ((index * 360) / count - 90) * (Math.PI / 180)
      return { x: center.x + radiusX * Math.cos(angle), y: center.y + radiusY * Math.sin(angle) }
    })
    positions.forEach((position, index) => {
      canvas.line(center.x, center.y, position.x, position.y, { stroke: items[index]!.color, 'stroke-width': 2.5, 'stroke-opacity': 0.55 })
    })
    canvas.circle(center.x, center.y, hubRadius, { fill: canvas.theme.colors.text })
    const centerText = input.settings.center?.join(' ')
    if (centerText) {
      const side = hubRadius * 1.45
      canvas.text({ text: centerText, x: center.x - side / 2, y: center.y - side / 2, width: side, height: side, size: 20, minSize: 11, weight: 800, align: 'middle', valign: 'middle', maxLines: 3, color: canvas.theme.textOn(canvas.theme.colors.text), font: 'heading', owner: 'center' })
    }
    let bottom = center.y + radiusY + nodeRadius
    items.forEach((item, index) => {
      canvas.group(item.id, () => {
        const position = positions[index]!
        canvas.circle(position.x, position.y, nodeRadius + 5, { fill: canvas.theme.colors.background })
        drawBadge(canvas, item, position.x, position.y, nodeRadius)
        const isVertical = Math.abs(position.x - center.x) <= 12
        const offset = nodeRadius + (isVertical ? 10 : 14)
        const anchorX = isVertical ? position.x : position.x + (position.x > center.x ? offset : -offset)
        const anchorY = isVertical ? position.y + (position.y < center.y ? -offset : offset) : position.y
        const label = drawRadialLabel(canvas, item, anchorX, anchorY, center.x, center.y, stack)
        bottom = Math.max(bottom, label.bottom)
      })
    })
    canvas.extendHeight(bottom)
  },
}
