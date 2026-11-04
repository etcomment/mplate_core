import { measureText } from '../../text/metrics.js'
import { drawTextStack, measureTextStack } from '../shared.js'
import type { ElementSpec, TemplateDefinition } from '../types.js'

export const MILESTONE: ElementSpec = {
  keyword: 'milestone',
  aliases: ['event', 'step'],
  description: 'One dated milestone',
  positional: ['title', 'subtitle'],
  flags: ['done', 'current'],
}

export const timelineAxis: TemplateDefinition = {
  card: {
    id: 'timeline:axis',
    family: 'timeline',
    style: 'axis',
    isDefaultStyle: true,
    aliases: ['roadmap', 'timeline1'],
    name: 'Horizontal timeline',
    description: 'Milestones on a horizontal axis, alternating above and below, with the date on the axis. Flag a milestone `done` or `current` to show progress.',
    useCases: ['project roadmap', 'company history', 'release plan'],
    items: { min: 1, max: 10, recommended: [4, 7] },
    elements: [MILESTONE],
    settings: [],
    example: `@timeline style:axis "Product roadmap"
  milestone "Discovery" "User research and scoping" date:"Q1 2027" done
  milestone "Alpha" "Internal pilot" date:"Q2 2027" current
  milestone "Beta" "Ten design partners" date:"Q3 2027"
  milestone "Launch" "General availability" date:"Q4 2027"`,
    tags: ['roadmap', 'dates', 'history'],
  },
  render(canvas, input) {
    const { items } = input
    const count = items.length
    const slot = canvas.contentWidth / count
    const cardWidth = count === 1 ? Math.min(420, slot) : Math.min(300, slot * 2 - 24, slot + 48)
    const textOptions = { width: cardWidth, titleSize: count > 7 ? 16 : 18, subtitleSize: 14, titleLines: 2, subtitleLines: 3, showValue: true }
    const heights = items.map((item) => measureTextStack(canvas, item, { ...textOptions, x: 0, y: 0 }))
    const aboveHeight = Math.max(0, ...heights.filter((_, index) => index % 2 === 0))
    const belowHeight = Math.max(0, ...heights.filter((_, index) => index % 2 === 1))
    const stemLength = 58
    const axisY = canvas.top + aboveHeight + stemLength
    const currentIndex = items.findIndex((item) => item.flags.includes('current'))
    const lastDone = items.reduce((last, item, index) => (item.flags.includes('done') ? index : last), -1)
    const progressIndex = Math.max(currentIndex, lastDone)
    const axisStart = canvas.left
    const axisEnd = canvas.left + canvas.contentWidth
    canvas.line(axisStart, axisY, axisEnd, axisY, { stroke: canvas.theme.colors.line, 'stroke-width': 6, 'stroke-linecap': 'round' })
    if (progressIndex >= 0) {
      canvas.line(axisStart, axisY, canvas.left + slot * (progressIndex + 0.5), axisY, { stroke: canvas.theme.accent(0), 'stroke-width': 6, 'stroke-linecap': 'round' })
    }
    let bottom = axisY + 40
    items.forEach((item, index) => {
      canvas.group(item.id, () => {
        const x = canvas.left + slot * (index + 0.5)
        const isAbove = index % 2 === 0
        const isCurrent = item.flags.includes('current')
        const isFuture = progressIndex >= 0 && index > progressIndex
        const color = isFuture && !item.hasExplicitColor ? canvas.theme.colors.textMuted : item.color
        const stemEnd = isAbove ? axisY - stemLength + 8 : axisY + stemLength - 8
        canvas.line(x, axisY, x, stemEnd, { stroke: color, 'stroke-width': 2, 'stroke-dasharray': '3 4' })
        canvas.circle(x, axisY, isCurrent ? 13 : 10, { fill: color, stroke: canvas.theme.colors.background, 'stroke-width': 4 })
        const label = item.date ?? item.label
        if (label) {
          const pillWidth = Math.min(slot - 8, measureText(label, 13, 700) + 20)
          const pillTop = isAbove ? axisY + 16 : axisY - 16 - 24
          canvas.rect({ x: x - pillWidth / 2, y: pillTop, width: pillWidth, height: 24 }, { rx: 12, fill: canvas.theme.colors.surface })
          canvas.text({ text: label, x: x - pillWidth / 2, y: pillTop, width: pillWidth, height: 24, size: 13, minSize: 10, weight: 700, align: 'middle', valign: 'middle', maxLines: 1, color: canvas.theme.ink(color) })
        }
        const height = heights[index] ?? 0
        const top = isAbove ? axisY - stemLength - height + 2 : axisY + stemLength - 2
        drawTextStack(canvas, item, { ...textOptions, x: x - cardWidth / 2, y: top, align: 'middle', valueColor: canvas.theme.ink(color, canvas.theme.colors.background) })
        if (!isAbove) bottom = Math.max(bottom, top + height)
      })
    })
    canvas.extendHeight(Math.max(bottom, axisY + stemLength + belowHeight))
  },
}
