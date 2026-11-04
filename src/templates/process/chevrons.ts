import { chevronPath } from '../../svg/paths.js'
import { balancedColumns, chunk, drawTextStack } from '../shared.js'
import type { TemplateDefinition } from '../types.js'

const STEP = {
  keyword: 'step',
  aliases: ['stage', 'phase'],
  description: 'One stage of the process',
  positional: ['title' as const, 'subtitle' as const],
}

export const processChevrons: TemplateDefinition = {
  card: {
    id: 'process:chevrons',
    family: 'process',
    style: 'chevrons',
    isDefaultStyle: true,
    aliases: ['process1'],
    name: 'Chevron process',
    description: 'Sequential stages drawn as interlocking arrows, with a description under each stage. Wraps onto several rows beyond five stages.',
    useCases: ['delivery phases', 'customer journey', 'project lifecycle'],
    items: { min: 1, max: 20, recommended: [3, 6] },
    elements: [STEP],
    settings: [],
    example: `@process style:chevrons "Delivery approach"
  step "Discover" "Interviews and current-state review" icon:search
  step "Design" "Target operating model" icon:pen-tool
  step "Build" "Iterative sprints" icon:hammer
  step "Run" "Hypercare and handover" icon:rocket`,
    tags: ['sequence', 'flow', 'steps'],
  },
  render(canvas, input) {
    const { items } = input
    const columns = balancedColumns(items.length, 5)
    const overlap = 10
    const chevronWidth = (canvas.contentWidth + overlap * (columns - 1)) / columns
    const chevronHeight = columns <= 4 ? 92 : 80
    const notch = Math.min(30, chevronWidth * 0.16)
    const hasIcons = items.some((item) => item.icon)
    let y = canvas.top
    for (const row of chunk(items, columns)) {
      let rowBottom = y
      row.forEach((item, column) => {
        canvas.group(item.id, () => {
          const x = canvas.left + column * (chevronWidth - overlap)
          const top = y
          canvas.path(chevronPath({ x, y: top, width: chevronWidth, height: chevronHeight }, notch, column === 0), { fill: item.color })
          const foreground = canvas.theme.textOn(item.color)
          const innerLeft = x + (column === 0 ? 18 : notch + 12)
          const innerWidth = x + chevronWidth - notch - 6 - innerLeft
          let textLeft = innerLeft
          let textWidth = innerWidth
          if (hasIcons && item.icon && innerWidth > 150) {
            canvas.icon(item.icon, innerLeft + 14, top + chevronHeight / 2, 26, foreground)
            textLeft = innerLeft + 38
            textWidth = innerWidth - 38
          }
          canvas.text({ text: item.title, x: textLeft, y: top + 8, width: textWidth, height: chevronHeight - 16, size: columns <= 4 ? 19 : 16, minSize: 11, weight: 700, valign: 'middle', maxLines: 2, color: foreground, font: 'heading' })
          const stackBottom = drawTextStack(canvas, { ...item, title: '' }, {
            x: x + (column === 0 ? 4 : notch),
            y: top + chevronHeight + 16,
            width: column === 0 ? chevronWidth - notch - 4 : chevronWidth - notch * 2,
            subtitleSize: columns <= 4 ? 15 : 13,
            subtitleLines: 5,
            showValue: true,
          })
          rowBottom = Math.max(rowBottom, stackBottom, top + chevronHeight)
        })
      })
      y = rowBottom + 40
    }
    canvas.extendHeight(y - 40)
  },
}
