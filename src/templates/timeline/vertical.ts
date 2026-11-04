import { drawTextStack, measureTextStack } from '../shared.js'
import type { TemplateDefinition } from '../types.js'
import { MILESTONE } from './axis.js'

export const timelineVertical: TemplateDefinition = {
  card: {
    id: 'timeline:vertical',
    family: 'timeline',
    style: 'vertical',
    isDefaultStyle: false,
    aliases: ['timeline2'],
    name: 'Vertical timeline',
    description: 'Dates on the left, milestones on the right of a vertical line. Handles long lists (up to 30 entries).',
    useCases: ['detailed plan', 'changelog', 'meeting agenda'],
    items: { min: 1, max: 30, recommended: [4, 12] },
    elements: [MILESTONE],
    settings: [],
    example: `@timeline style:vertical "Workshop agenda"
  milestone "Welcome" "Goals of the day" date:09:00 done
  milestone "Current state" "What works, what hurts" date:09:30 current
  milestone "Target state" "Design in small groups" date:11:00
  milestone "Plan" "Owners and next steps" date:14:00`,
    tags: ['agenda', 'list', 'dates'],
  },
  render(canvas, input) {
    const { items } = input
    const dateWidth = Math.min(170, canvas.contentWidth * 0.18)
    const lineX = canvas.left + dateWidth + 28
    const textLeft = lineX + 30
    const textWidth = canvas.left + canvas.contentWidth - textLeft
    const isCompact = items.length > 10
    const textOptions = { width: textWidth, titleSize: isCompact ? 16 : 18, subtitleSize: isCompact ? 13 : 14, titleLines: 2, subtitleLines: isCompact ? 1 : 3, showValue: false }
    const rowGap = isCompact ? 14 : 26
    const heights = items.map((item) => Math.max(28, measureTextStack(canvas, item, { ...textOptions, x: 0, y: 0 })))
    const totalHeight = heights.reduce((sum, height) => sum + height, 0) + rowGap * (items.length - 1)
    canvas.line(lineX, canvas.top + 8, lineX, canvas.top + totalHeight - 8, { stroke: canvas.theme.colors.line, 'stroke-width': 3 })
    const progressIndex = items.reduce((last, item, index) => (item.flags.includes('done') || item.flags.includes('current') ? index : last), -1)
    let y = canvas.top
    items.forEach((item, index) => {
      canvas.group(item.id, () => {
        const height = heights[index]!
        const isFuture = progressIndex >= 0 && index > progressIndex
        const color = isFuture && !item.hasExplicitColor ? canvas.theme.colors.textMuted : item.color
        const dotY = y + Math.min(14, height / 2)
        canvas.circle(lineX, dotY, item.flags.includes('current') ? 10 : 8, { fill: color, stroke: canvas.theme.colors.background, 'stroke-width': 3 })
        const label = item.date ?? item.label ?? item.value
        if (label) canvas.text({ text: label, x: canvas.left, y: dotY - 12, width: dateWidth, height: 24, size: isCompact ? 14 : 16, minSize: 10, weight: 800, align: 'end', valign: 'middle', maxLines: 1, color: canvas.theme.ink(color, canvas.theme.colors.background), font: 'heading' })
        drawTextStack(canvas, item, { ...textOptions, x: textLeft, y })
        y += height + rowGap
      })
    })
    canvas.extendHeight(canvas.top + totalHeight)
  },
}
