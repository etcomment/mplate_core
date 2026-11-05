import { drawBadge, drawTextStack, measureTextStack } from '../shared.js'
import type { TemplateDefinition } from '../types.js'

export const processVertical: TemplateDefinition = {
  card: {
    id: 'process:vertical',
    family: 'process',
    style: 'vertical',
    isDefaultStyle: false,
    aliases: ['process3'],
    name: 'Vertical steps',
    description: 'Steps stacked top to bottom with a numbered badge, a connecting line and room for long descriptions. A figure (val:) is shown on the right.',
    useCases: ['procedure', 'method with detailed steps', 'onboarding checklist'],
    items: { min: 1, max: 20, recommended: [3, 8] },
    elements: [{ keyword: 'step', aliases: ['stage', 'phase'], description: 'One step', positional: ['title', 'subtitle', 'value'] }],
    settings: [],
    example: `@process style:vertical "Incident procedure"
  step "Detect" "Monitoring raises an alert or a user calls the service desk" val:"5 min"
  step "Qualify" "Assess impact and urgency, open a ticket with the right priority" val:"15 min"
  step "Resolve" "Apply the known fix or escalate to the expert team" val:"4 h"
  step "Close" "Confirm with the user and record the root cause" val:"1 day"`,
    tags: ['sequence', 'procedure', 'list'],
  },
  render(canvas, input) {
    const { items } = input
    const isCompact = items.length > 8
    const radius = isCompact ? 18 : 24
    const badgeX = canvas.left + radius + 4
    const hasValues = items.some((item) => item.value)
    const valueWidth = hasValues ? Math.min(180, canvas.contentWidth * 0.18) : 0
    const textLeft = badgeX + radius + 22
    const textWidth = canvas.left + canvas.contentWidth - textLeft - (hasValues ? valueWidth + 20 : 0)
    const textOptions = { width: textWidth, titleSize: isCompact ? 16 : 19, subtitleSize: isCompact ? 13 : 15, titleLines: 2, subtitleLines: isCompact ? 2 : 3 }
    const gap = isCompact ? 14 : 24
    const heights = items.map((item) => Math.max(radius * 2, measureTextStack(canvas, item, { ...textOptions, x: 0, y: 0 })))
    const total = heights.reduce((sum, height) => sum + height, 0) + gap * (items.length - 1)
    if (items.length > 1) canvas.line(badgeX, canvas.top + radius, badgeX, canvas.top + total - (heights[heights.length - 1] ?? 0) + radius, { stroke: canvas.theme.colors.line, 'stroke-width': 3 })
    let y = canvas.top
    items.forEach((item, index) => {
      canvas.group(item.id, () => {
        const height = heights[index]!
        canvas.circle(badgeX, y + radius, radius + 5, { fill: canvas.theme.colors.background })
        drawBadge(canvas, item, badgeX, y + radius, radius)
        const stackHeight = measureTextStack(canvas, item, { ...textOptions, x: 0, y: 0 })
        const textTop = stackHeight < radius * 2 ? y + radius - stackHeight / 2 : y
        drawTextStack(canvas, item, { ...textOptions, x: textLeft, y: textTop })
        if (item.value) {
          canvas.text({ text: item.value, x: canvas.left + canvas.contentWidth - valueWidth, y, width: valueWidth, height: radius * 2, size: isCompact ? 18 : 22, minSize: 12, weight: 800, align: 'end', valign: 'middle', maxLines: 1, color: canvas.theme.ink(item.color, canvas.theme.colors.background), font: 'heading' })
        }
        y += height + gap
      })
    })
    canvas.extendHeight(canvas.top + total)
  },
}
