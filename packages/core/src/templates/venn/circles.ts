import { drawTextStack, measureTextStack } from '../shared.js'
import type { TemplateDefinition } from '../types.js'

interface CircleLayout {
  x: number
  y: number
  labelX: number
  labelY: number
  align: 'start' | 'middle' | 'end'
  isAbove: boolean
}

export const vennCircles: TemplateDefinition = {
  card: {
    id: 'venn:circles',
    family: 'venn',
    style: 'circles',
    isDefaultStyle: true,
    aliases: ['venn1'],
    name: 'Venn diagram',
    description: 'Two or three overlapping sets with their labels outside the circles and an optional label for the shared centre.',
    useCases: ['sweet spot', 'skills overlap', 'product–market fit'],
    items: { min: 1, max: 3, recommended: [2, 3] },
    elements: [{ keyword: 'set', aliases: ['circle', 'group'], description: 'One set', positional: ['title', 'subtitle'] }],
    settings: [{ keyword: 'center', description: 'Label of the area shared by all sets', arguments: ['text'] }],
    example: `@venn "Where innovation happens"
  center "Innovation"
  set "Desirable" "People want it"
  set "Feasible" "We can build it"
  set "Viable" "It makes money"`,
    tags: ['overlap', 'sets', 'intersection'],
  },
  render(canvas, input) {
    const { items } = input
    const count = items.length
    const radius = Math.min(170, canvas.contentWidth * 0.17)
    const labelWidth = Math.min(240, canvas.contentWidth * 0.22)
    const stack = { width: labelWidth, titleSize: 19, subtitleSize: 14, titleLines: 2, subtitleLines: 2 }
    const labelHeight = Math.max(0, ...items.map((item) => measureTextStack(canvas, item, { ...stack, x: 0, y: 0 })))
    const centerX = canvas.left + canvas.contentWidth / 2
    const distance = radius * 0.62
    const top = canvas.top + labelHeight + 20
    let layouts: CircleLayout[]
    if (count === 1) layouts = [{ x: centerX, y: top + radius, labelX: centerX, labelY: top - 16, align: 'middle', isAbove: true }]
    else if (count === 2) {
      const y = top + radius
      layouts = [
        { x: centerX - distance, y, labelX: centerX - distance - radius - 20, labelY: y, align: 'end', isAbove: false },
        { x: centerX + distance, y, labelX: centerX + distance + radius + 20, labelY: y, align: 'start', isAbove: false },
      ]
    } else {
      const upperY = top + radius
      const lowerY = upperY + distance * 1.5
      layouts = [
        { x: centerX - distance, y: upperY, labelX: centerX - distance - radius * 0.7, labelY: top - 16, align: 'end', isAbove: true },
        { x: centerX + distance, y: upperY, labelX: centerX + distance + radius * 0.7, labelY: top - 16, align: 'start', isAbove: true },
        { x: centerX, y: lowerY, labelX: centerX, labelY: lowerY + radius + 16, align: 'middle', isAbove: false },
      ]
    }
    let bottom = Math.max(...layouts.map((layout) => layout.y + radius))
    items.forEach((item, index) => {
      const layout = layouts[index]!
      canvas.group(item.id, () => {
        canvas.circle(layout.x, layout.y, radius, { fill: item.color, 'fill-opacity': 0.28, stroke: item.color, 'stroke-width': canvas.theme.shape.strokeWidth + 1 })
        const height = measureTextStack(canvas, item, { ...stack, x: 0, y: 0 })
        const x = layout.align === 'middle' ? layout.labelX - labelWidth / 2 : layout.align === 'end' ? layout.labelX - labelWidth : layout.labelX
        const y = count === 2 ? layout.labelY - height / 2 : layout.isAbove ? layout.labelY - height : layout.labelY
        drawTextStack(canvas, item, { ...stack, x, y, align: layout.align, titleColor: canvas.theme.ink(item.color, canvas.theme.colors.background) })
        bottom = Math.max(bottom, y + height)
      })
    })
    const centerText = input.settings.center?.join(' ')
    if (centerText && count > 1) {
      const middleY = layouts.reduce((sum, layout) => sum + layout.y, 0) / count
      const width = count === 2 ? radius * 0.6 : radius * 0.7
      canvas.text({ text: centerText, x: centerX - width / 2, y: middleY - 30, width, height: 60, size: 17, minSize: 10, weight: 800, align: 'middle', valign: 'middle', maxLines: 2, font: 'heading', owner: 'center' })
    }
    canvas.extendHeight(bottom)
  },
}
