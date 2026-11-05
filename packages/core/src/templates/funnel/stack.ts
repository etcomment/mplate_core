import { polygonPath } from '../../svg/paths.js'
import { drawTextStack, measureTextStack } from '../shared.js'
import type { TemplateDefinition } from '../types.js'

export const funnelStack: TemplateDefinition = {
  card: {
    id: 'funnel:stack',
    family: 'funnel',
    style: 'stack',
    isDefaultStyle: true,
    aliases: ['funnel1'],
    name: 'Stacked funnel',
    description: 'Narrowing layers with the key figure inside each layer and the explanation on the right.',
    useCases: ['sales pipeline', 'conversion', 'prioritisation from many to few'],
    items: { min: 1, max: 10, recommended: [3, 6] },
    elements: [{ keyword: 'level', aliases: ['stage', 'layer'], description: 'One funnel layer, widest first', positional: ['title', 'subtitle', 'value'] }],
    settings: [],
    example: `@funnel "Sales pipeline"
  level "Visitors" "Unique visitors per month" val:"48,000"
  level "Leads" "Signed up for the newsletter" val:"6,200"
  level "Opportunities" "Qualified by sales" val:"940"
  level "Customers" "Signed a contract" val:"210"`,
    tags: ['conversion', 'pipeline', 'narrowing'],
  },
  render(canvas, input) {
    const { items } = input
    const count = items.length
    const funnelWidth = Math.min(canvas.contentWidth * 0.5, 600)
    const textLeft = canvas.left + funnelWidth + 56
    const textWidth = canvas.left + canvas.contentWidth - textLeft
    const subtitleLines = count > 6 ? 1 : 2
    const measured = items.map((item) => measureTextStack(canvas, item, { x: 0, y: 0, width: textWidth, titleSize: 18, subtitleSize: 14, titleLines: 1, subtitleLines }))
    const layerHeight = Math.max(52, Math.min(96, 420 / count), ...measured.map((height) => height + 6))
    const gap = 6
    const centerX = canvas.left + funnelWidth / 2
    const narrowest = 0.3
    const widthAt = (position: number): number => funnelWidth * (1 - (1 - narrowest) * (position / count))
    items.forEach((item, index) => {
      canvas.group(item.id, () => {
        const top = canvas.top + index * (layerHeight + gap)
        const bottom = top + layerHeight
        const topHalf = widthAt(index) / 2
        const bottomHalf = widthAt(index + 1) / 2
        canvas.path(
          polygonPath([
            { x: centerX - topHalf, y: top },
            { x: centerX + topHalf, y: top },
            { x: centerX + bottomHalf, y: bottom },
            { x: centerX - bottomHalf, y: bottom },
          ]),
          { fill: item.color },
        )
        const foreground = canvas.theme.textOn(item.color)
        const figure = item.value ?? item.percentLabel
        const innerWidth = bottomHalf * 2 - 24
        if (figure) {
          canvas.text({ text: figure, x: centerX - innerWidth / 2, y: top, width: innerWidth, height: layerHeight, size: 22, minSize: 12, weight: 800, align: 'middle', valign: 'middle', maxLines: 1, color: foreground, font: 'heading' })
        } else if (item.icon) canvas.icon(item.icon, centerX, top + layerHeight / 2, Math.min(28, layerHeight * 0.5), foreground)
        const leaderStart = centerX + (topHalf + bottomHalf) / 2 + 8
        canvas.line(leaderStart, top + layerHeight / 2, textLeft - 12, top + layerHeight / 2, { stroke: canvas.theme.colors.line, 'stroke-width': 1.5, 'stroke-dasharray': '4 4' })
        canvas.circle(textLeft - 12, top + layerHeight / 2, 3.5, { fill: item.color })
        const stackHeight = measured[index] ?? 0
        drawTextStack(canvas, item, { x: textLeft, y: top + (layerHeight - stackHeight) / 2, width: textWidth, titleSize: 18, subtitleSize: 14, titleLines: 1, subtitleLines })
      })
    })
    canvas.extendHeight(canvas.top + count * (layerHeight + gap) - gap)
  },
}
