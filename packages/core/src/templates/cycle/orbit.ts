import { polarPoint, polygonPath } from '../../svg/paths.js'
import { drawRadialLabel, radialLabelHeight } from '../radial.js'
import { drawBadge } from '../shared.js'
import type { TemplateDefinition } from '../types.js'

export const cycleOrbit: TemplateDefinition = {
  card: {
    id: 'cycle:orbit',
    family: 'cycle',
    style: 'orbit',
    isDefaultStyle: false,
    aliases: ['cycle2'],
    name: 'Orbit cycle',
    description: 'Stages as badges on a circular track with arrows showing the direction, around a central label. Lighter than the ring for long labels.',
    useCases: ['customer lifecycle', 'learning loop', 'annual planning cycle'],
    items: { min: 1, max: 10, recommended: [4, 8] },
    elements: [{ keyword: 'stage', aliases: ['step', 'segment'], description: 'One stage, clockwise from the top', positional: ['title', 'subtitle'] }],
    settings: [{ keyword: 'center', description: 'Text in the middle', arguments: ['text'] }],
    example: `@cycle style:orbit "Customer lifecycle"
  center "Customer"
  stage "Discover" "Finds us through content" icon:search
  stage "Try" "Free studio, no account" icon:play
  stage "Adopt" "Team plan and brand kit" icon:users
  stage "Expand" "More teams, more kits" icon:trending-up
  stage "Advocate" "Shares visuals publicly" icon:megaphone`,
    tags: ['loop', 'circular', 'lifecycle'],
  },
  render(canvas, input) {
    const { items } = input
    const count = items.length
    const orbit = Math.min(190, canvas.contentWidth * 0.17)
    const badgeRadius = 28
    const labelWidth = Math.min(230, canvas.contentWidth * 0.22)
    const stack = { width: labelWidth, titleSize: 17, subtitleSize: 14, titleLines: 2, subtitleLines: count > 6 ? 2 : 3 }
    const labelHeight = radialLabelHeight(canvas, items, stack)
    const center = { x: canvas.left + canvas.contentWidth / 2, y: canvas.top + labelHeight + badgeRadius + 18 + orbit }
    const lineColor = canvas.theme.colors.line
    canvas.circle(center.x, center.y, orbit, { fill: 'none', stroke: lineColor, 'stroke-width': 3, 'stroke-dasharray': '2 7', 'stroke-linecap': 'round' })
    const step = 360 / count
    if (count > 1) {
      for (let index = 0; index < count; index++) {
        const angle = index * step + step / 2
        const tip = polarPoint(center, orbit, angle + 3)
        const left = polarPoint(center, orbit - 7, angle - 3)
        const right = polarPoint(center, orbit + 7, angle - 3)
        canvas.path(polygonPath([tip, left, right]), { fill: lineColor })
      }
    }
    canvas.circle(center.x, center.y, orbit * 0.45, { fill: canvas.theme.colors.surface })
    const centerText = input.settings.center?.join(' ')
    if (centerText) {
      const side = orbit * 0.6
      canvas.text({ text: centerText, x: center.x - side / 2, y: center.y - side / 2, width: side, height: side, size: 21, minSize: 11, weight: 800, align: 'middle', valign: 'middle', maxLines: 3, font: 'heading', owner: 'center' })
    }
    let bottom = center.y + orbit + badgeRadius
    items.forEach((item, index) => {
      canvas.group(item.id, () => {
        const angle = index * step
        const position = polarPoint(center, orbit, angle)
        canvas.circle(position.x, position.y, badgeRadius + 5, { fill: canvas.theme.colors.background })
        drawBadge(canvas, item, position.x, position.y, badgeRadius)
        const isVertical = Math.abs(position.x - center.x) <= 12
        const offset = badgeRadius + (isVertical ? 10 : 14)
        const anchorX = isVertical ? position.x : position.x + (position.x > center.x ? offset : -offset)
        const anchorY = isVertical ? position.y + (position.y < center.y ? -offset : offset) : position.y
        const label = drawRadialLabel(canvas, item, anchorX, anchorY, center.x, center.y, stack)
        bottom = Math.max(bottom, label.bottom)
      })
    })
    canvas.extendHeight(bottom)
  },
}
