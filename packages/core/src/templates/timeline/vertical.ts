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
    const anyIcon = items.some((item) => item.icon !== undefined)
    const lineX = canvas.left + dateWidth + (anyIcon ? 34 : 28)
    const textLeft = lineX + (anyIcon ? 34 : 30)
    const textWidth = canvas.left + canvas.contentWidth - textLeft
    const isCompact = items.length > 10
    const textOptions = { width: textWidth, titleSize: isCompact ? 16 : 18, subtitleSize: isCompact ? 13 : 14, titleLines: 2, subtitleLines: Infinity, showValue: false }
    const rowGap = isCompact ? 14 : 26
    const minRowHeight = anyIcon ? (isCompact ? 30 : 36) : 28
    const heights = items.map((item) => Math.max(minRowHeight, measureTextStack(canvas, item, { ...textOptions, x: 0, y: 0 })))
    const rowTops: number[] = []
    let cursorY = canvas.top
    for (const height of heights) {
      rowTops.push(cursorY)
      cursorY += height + rowGap
    }
    const dotYs = heights.map((height, index) => rowTops[index]! + Math.min(anyIcon ? 18 : 14, height / 2))
    const totalHeight = heights.reduce((sum, height) => sum + height, 0) + rowGap * (items.length - 1)
    for (let index = 0; index < items.length - 1; index++) {
      canvas.line(lineX, dotYs[index]!, lineX, dotYs[index + 1]!, {
        stroke: canvas.theme.colors.line,
        'stroke-width': 3,
        'data-mplate-connector': 'line',
        'data-mplate-from': items[index]!.id,
        'data-mplate-to': items[index + 1]!.id,
        'data-mplate-from-x': lineX,
        'data-mplate-from-y': dotYs[index]!,
        'data-mplate-to-x': lineX,
        'data-mplate-to-y': dotYs[index + 1]!,
      })
    }
    const progressIndex = items.reduce((last, item, index) => (item.flags.includes('done') || item.flags.includes('current') ? index : last), -1)
    items.forEach((item, index) => {
      canvas.group(item.id, () => {
        const y = rowTops[index]!
        const isFuture = progressIndex >= 0 && index > progressIndex
        const color = isFuture && !item.hasExplicitColor ? canvas.theme.colors.textMuted : item.color
        const dotY = dotYs[index]!
        const dotRadius = item.icon ? (isCompact ? 13 : 16) : (item.flags.includes('current') ? 10 : 8)
        canvas.circle(lineX, dotY, dotRadius, { fill: color, stroke: canvas.theme.colors.background, 'stroke-width': 3 })
        if (item.icon) canvas.icon(item.icon, lineX, dotY, dotRadius * 1.1, canvas.theme.textOn(color))
        const label = item.date ?? item.label ?? item.value
        if (label) canvas.text({ text: label, x: canvas.left, y: dotY - 12, width: dateWidth, height: 24, size: isCompact ? 14 : 16, minSize: 10, weight: 800, align: 'end', valign: 'middle', maxLines: 1, color: canvas.theme.ink(color, canvas.theme.colors.background), font: 'heading' })
        drawTextStack(canvas, item, { ...textOptions, x: textLeft, y })
      })
    })
    canvas.extendHeight(canvas.top + totalHeight)
  },
}
