import { roundedTopPath } from '../../svg/paths.js'
import { chunk, drawTextStack, itemNumber, measureTextStack } from '../shared.js'
import type { TemplateDefinition } from '../types.js'

export const cardsGrid: TemplateDefinition = {
  card: {
    id: 'cards:grid',
    family: 'cards',
    style: 'grid',
    isDefaultStyle: true,
    aliases: ['strategy', 'pillars', 'cards1'],
    name: 'Card grid',
    description: 'Numbered cards in a balanced grid with an accent bar, icon, title and description. Good default for lists of 2 to 30 items.',
    useCases: ['strategic pillars', 'services', 'key messages', 'team values'],
    items: { min: 1, max: 30, recommended: [3, 8] },
    elements: [{ keyword: 'card', aliases: ['block', 'pillar', 'item'], description: 'One card', positional: ['title', 'subtitle'] }],
    settings: [],
    example: `@cards "Four strategic pillars"
  card "Operational excellence" "Simplify and automate core processes" icon:settings
  card "Customer intimacy" "Know each client by name" icon:handshake
  card "Innovation" "Ship one new capability per quarter" icon:lightbulb
  card "People" "Grow skills and careers" icon:users`,
    tags: ['grid', 'list', 'pillars'],
  },
  render(canvas, input) {
    const { items } = input
    const count = items.length
    const columns = count <= 4 ? count : count <= 6 ? 3 : count <= 8 ? 4 : count <= 15 ? 5 : 6
    const gap = columns >= 5 ? 16 : 24
    const cardWidth = (canvas.contentWidth - gap * (columns - 1)) / columns
    const padding = columns >= 5 ? 16 : 22
    const isDense = columns >= 5
    const textOptions = { width: cardWidth - padding * 2, titleSize: isDense ? 15 : 19, subtitleSize: isDense ? 12 : 14, titleLines: 3, subtitleLines: isDense ? 4 : 5, showValue: true }
    const headerHeight = isDense ? 40 : 52
    const radius = canvas.theme.shape.radius
    let y = canvas.top
    for (const row of chunk(items, columns)) {
      const contentHeight = Math.max(...row.map((item) => measureTextStack(canvas, item, { ...textOptions, x: 0, y: 0 })))
      const cardHeight = padding + headerHeight + contentHeight + padding
      row.forEach((item, column) => {
        canvas.group(item.id, () => {
          const x = canvas.left + column * (cardWidth + gap)
          canvas.rect({ x, y, width: cardWidth, height: cardHeight }, { rx: radius, fill: canvas.theme.colors.surface })
          canvas.path(roundedTopPath({ x, y, width: cardWidth, height: 6 }, radius), { fill: item.color })
          canvas.text({ text: item.label ?? itemNumber(item), x: x + padding, y: y + padding, width: cardWidth / 2, height: headerHeight - 8, size: isDense ? 22 : 30, minSize: 14, weight: 800, valign: 'middle', maxLines: 1, color: canvas.theme.ink(item.color), font: 'heading' })
          if (item.icon) canvas.icon(item.icon, x + cardWidth - padding - 16, y + padding + (headerHeight - 8) / 2, isDense ? 24 : 30, canvas.theme.ink(item.color))
          drawTextStack(canvas, item, { ...textOptions, x: x + padding, y: y + padding + headerHeight })
        })
      })
      y += cardHeight + gap
    }
    canvas.extendHeight(y - gap)
  },
}
