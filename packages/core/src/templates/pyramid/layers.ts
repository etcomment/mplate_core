import { polygonPath } from '../../svg/paths.js'
import { drawTextStack, measureTextStack } from '../shared.js'
import type { TemplateDefinition } from '../types.js'

export const pyramidLayers: TemplateDefinition = {
  card: {
    id: 'pyramid:layers',
    family: 'pyramid',
    style: 'layers',
    isDefaultStyle: true,
    aliases: ['pyramid1'],
    name: 'Layered pyramid',
    description: 'A pyramid split into horizontal layers, top layer first, with explanations aligned on the right.',
    useCases: ['hierarchy of needs', 'maturity levels', 'strategy from vision to actions'],
    items: { min: 1, max: 8, recommended: [3, 5] },
    elements: [{ keyword: 'layer', aliases: ['level', 'tier'], description: 'One layer, from the top (narrowest) to the base', positional: ['title', 'subtitle', 'value'] }],
    settings: [],
    example: `@pyramid "From vision to action"
  layer "Vision" "Why we exist"
  layer "Strategy" "Where we play and how we win"
  layer "Objectives" "What we commit to this year"
  layer "Initiatives" "The projects that deliver"`,
    tags: ['hierarchy', 'levels', 'maturity'],
  },
  render(canvas, input) {
    const { items } = input
    const count = items.length
    const pyramidWidth = Math.min(canvas.contentWidth * 0.46, 520)
    const textLeft = canvas.left + pyramidWidth + 64
    const textWidth = canvas.left + canvas.contentWidth - textLeft
    const textOptions = { width: textWidth, titleSize: 18, subtitleSize: 14, titleLines: 1, subtitleLines: count > 5 ? 2 : 3 }
    const measured = items.map((item) => measureTextStack(canvas, item, { ...textOptions, x: 0, y: 0 }))
    const gap = 5
    const layerHeight = Math.max(60, Math.min(110, 440 / count), ...measured.map((height) => height + 8))
    const totalHeight = count * layerHeight + (count - 1) * gap
    const apexX = canvas.left + pyramidWidth / 2
    const halfWidthAt = (y: number): number => (pyramidWidth / 2) * ((y - canvas.top) / totalHeight)
    items.forEach((item, index) => {
      canvas.group(item.id, () => {
        const top = canvas.top + index * (layerHeight + gap)
        const bottom = top + layerHeight
        const topHalf = halfWidthAt(top)
        const bottomHalf = halfWidthAt(bottom)
        const points = index === 0
          ? [{ x: apexX, y: top }, { x: apexX + bottomHalf, y: bottom }, { x: apexX - bottomHalf, y: bottom }]
          : [{ x: apexX - topHalf, y: top }, { x: apexX + topHalf, y: top }, { x: apexX + bottomHalf, y: bottom }, { x: apexX - bottomHalf, y: bottom }]
        canvas.path(polygonPath(points), { fill: item.color })
        const foreground = canvas.theme.textOn(item.color)
        const middleY = top + layerHeight / 2
        const figure = item.value ?? item.percentLabel ?? (item.icon ? undefined : String(index + 1))
        const innerHalf = halfWidthAt(index === 0 ? top + layerHeight * 0.62 : top)
        if (figure && innerHalf > 22) {
          const boxTop = index === 0 ? top + layerHeight * 0.4 : top
          const boxHeight = index === 0 ? layerHeight * 0.6 : layerHeight
          canvas.text({ text: figure, x: apexX - innerHalf + 6, y: boxTop, width: innerHalf * 2 - 12, height: boxHeight, size: 20, minSize: 10, weight: 800, align: 'middle', valign: 'middle', maxLines: 1, color: foreground, font: 'heading' })
        } else if (item.icon) canvas.icon(item.icon, apexX, index === 0 ? top + layerHeight * 0.66 : middleY, Math.min(26, layerHeight * 0.4), foreground)
        const edge = apexX + (topHalf + bottomHalf) / 2
        canvas.line(edge + 10, middleY, textLeft - 14, middleY, { stroke: canvas.theme.colors.line, 'stroke-width': 1.5 })
        canvas.circle(textLeft - 14, middleY, 4, { fill: item.color })
        drawTextStack(canvas, item, { ...textOptions, x: textLeft, y: middleY - (measured[index] ?? 0) / 2 })
      })
    })
    canvas.extendHeight(canvas.top + totalHeight)
  },
}
