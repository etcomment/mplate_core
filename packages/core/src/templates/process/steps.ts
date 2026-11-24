import { balancedColumns, chunk, drawBadge, drawTextStack } from '../shared.js'
import type { TemplateDefinition } from '../types.js'

export const processSteps: TemplateDefinition = {
  card: {
    id: 'process:steps',
    family: 'process',
    style: 'steps',
    isDefaultStyle: false,
    aliases: ['process2'],
    name: 'Numbered steps',
    description: 'Numbered (or iconed) circles on a connecting line, with title and description below each step.',
    useCases: ['how it works', 'onboarding steps', 'method overview'],
    items: { min: 1, max: 24, recommended: [3, 6] },
    elements: [{ keyword: 'step', aliases: ['stage', 'phase'], description: 'One step', positional: ['title', 'subtitle'] }],
    settings: [],
    example: `@process style:steps "How it works"
  step "Write" "One line per element"
  step "Render" "The layout adapts to the count"
  step "Theme" "Apply your brand tokens"
  step "Export" "SVG for slides and documents"`,
    tags: ['sequence', 'steps', 'numbered'],
  },
  render(canvas, input) {
    const columns = balancedColumns(input.items.length, 6)
    const cellWidth = canvas.contentWidth / columns
    const radius = Math.min(32, cellWidth * 0.2)
    let y = canvas.top
    for (const row of chunk(input.items, columns)) {
      const centerY = y + radius
      for (let column = 0; column < row.length - 1; column++) {
        const startX = canvas.left + cellWidth * (column + 0.5)
        const endX = canvas.left + cellWidth * (column + 1.5)
        canvas.line(startX, centerY, endX, centerY, {
          stroke: canvas.theme.colors.line,
          'stroke-width': 3,
          'data-mplate-connector': 'line',
          'data-mplate-from': row[column]!.id,
          'data-mplate-to': row[column + 1]!.id,
          'data-mplate-from-x': startX,
          'data-mplate-from-y': centerY,
          'data-mplate-to-x': endX,
          'data-mplate-to-y': centerY,
        })
      }
      let rowBottom = centerY + radius
      row.forEach((item, column) => {
        canvas.group(item.id, () => {
          const centerX = canvas.left + cellWidth * (column + 0.5)
          canvas.circle(centerX, centerY, radius + 6, { fill: canvas.theme.colors.background })
          drawBadge(canvas, item, centerX, centerY, radius)
          const bottom = drawTextStack(canvas, item, {
            x: centerX - cellWidth / 2 + 10,
            y: centerY + radius + 18,
            width: cellWidth - 20,
            align: 'middle',
            titleSize: columns <= 4 ? 19 : 16,
            subtitleSize: columns <= 4 ? 15 : 13,
            subtitleLines: Infinity,
            showValue: true,
          })
          rowBottom = Math.max(rowBottom, bottom)
        })
      })
      y = rowBottom + 44
    }
    canvas.extendHeight(y - 44)
  },
}
