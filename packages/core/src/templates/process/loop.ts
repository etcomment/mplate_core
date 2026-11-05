import { formatNumber as n } from '../../svg/node.js'
import { polygonPath } from '../../svg/paths.js'
import { drawBadge, drawTextStack, measureTextStack } from '../shared.js'
import type { TemplateDefinition } from '../types.js'

export const processLoop: TemplateDefinition = {
  card: {
    id: 'process:loop',
    family: 'process',
    style: 'loop',
    isDefaultStyle: false,
    aliases: ['process4'],
    name: 'Process loop',
    description: 'Steps on a closed track: left to right on the top, back right to left on the bottom, so the last step leads into the first.',
    useCases: ['sprint cycle', 'continuous delivery loop', 'feedback loop'],
    items: { min: 1, max: 10, recommended: [4, 8] },
    elements: [{ keyword: 'step', aliases: ['stage', 'phase'], description: 'One step, in order around the loop', positional: ['title', 'subtitle'] }],
    settings: [{ keyword: 'center', description: 'Label in the middle of the loop', arguments: ['text'] }],
    example: `@process style:loop "Sprint cycle"
  center "Two weeks"
  step "Plan" "Pick the sprint goal"
  step "Build" "Develop and test"
  step "Review" "Demo to stakeholders"
  step "Improve" "Retrospective"`,
    tags: ['loop', 'cycle', 'iteration'],
  },
  render(canvas, input) {
    const { items } = input
    const topCount = Math.ceil(items.length / 2)
    const bottomCount = items.length - topCount
    const radius = 26
    const trackHeight = bottomCount > 0 ? 170 : 0
    const sideInset = bottomCount > 0 ? trackHeight / 2 + 12 : 20
    const trackLeft = canvas.left + sideInset
    const trackRight = canvas.left + canvas.contentWidth - sideInset
    const slot = (trackRight - trackLeft) / Math.max(1, topCount)
    const textOptions = { width: Math.min(260, slot - 16), titleSize: 17, subtitleSize: 14, titleLines: 2, subtitleLines: 2 }
    const heights = items.map((item) => measureTextStack(canvas, item, { ...textOptions, x: 0, y: 0 }))
    const topLabel = Math.max(0, ...heights.slice(0, topCount))
    const topY = canvas.top + topLabel + 18 + radius
    const bottomY = topY + trackHeight
    const lineColor = canvas.theme.colors.line
    const strokeWidth = 6
    if (bottomCount > 0) {
      const bend = trackHeight / 2
      canvas.path(`M${n(trackLeft)} ${n(topY)} L${n(trackRight)} ${n(topY)} A${n(bend)} ${n(bend)} 0 0 1 ${n(trackRight)} ${n(bottomY)} L${n(trackLeft)} ${n(bottomY)} A${n(bend)} ${n(bend)} 0 0 1 ${n(trackLeft)} ${n(topY)}`, { fill: 'none', stroke: lineColor, 'stroke-width': strokeWidth })
      const arrowX = trackRight + bend
      const arrowY = topY + bend
      canvas.path(polygonPath([{ x: arrowX - 9, y: arrowY - 4 }, { x: arrowX + 9, y: arrowY - 4 }, { x: arrowX, y: arrowY + 10 }]), { fill: lineColor })
      const returnX = trackLeft - bend
      canvas.path(polygonPath([{ x: returnX - 9, y: arrowY + 4 }, { x: returnX + 9, y: arrowY + 4 }, { x: returnX, y: arrowY - 10 }]), { fill: lineColor })
      const centerText = input.settings.center?.join(' ')
      if (centerText) canvas.text({ text: centerText, x: trackLeft + 40, y: topY + radius, width: trackRight - trackLeft - 80, height: trackHeight - radius * 2, size: 20, minSize: 12, weight: 800, align: 'middle', valign: 'middle', maxLines: 2, color: canvas.theme.colors.textMuted, font: 'heading', owner: 'center' })
    } else canvas.line(trackLeft, topY, trackRight, topY, { stroke: lineColor, 'stroke-width': strokeWidth, 'stroke-linecap': 'round' })
    let bottom = topY + radius
    items.forEach((item, index) => {
      canvas.group(item.id, () => {
        const isTop = index < topCount
        const position = isTop ? index : items.length - 1 - index
        const rowCount = isTop ? topCount : bottomCount
        const rowSlot = (trackRight - trackLeft) / Math.max(1, rowCount)
        const x = trackLeft + rowSlot * (position + 0.5)
        const y = isTop ? topY : bottomY
        canvas.circle(x, y, radius + 6, { fill: canvas.theme.colors.background })
        drawBadge(canvas, item, x, y, radius)
        const height = heights[index] ?? 0
        const width = Math.min(textOptions.width, rowSlot - 16)
        const labelTop = isTop ? y - radius - 14 - height : y + radius + 14
        drawTextStack(canvas, item, { ...textOptions, width, x: x - width / 2, y: labelTop, align: 'middle' })
        bottom = Math.max(bottom, labelTop + height, y + radius)
      })
    })
    canvas.extendHeight(bottom)
  },
}
