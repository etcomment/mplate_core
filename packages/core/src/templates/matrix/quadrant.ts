import { tint } from '../shared.js'
import type { TemplateDefinition } from '../types.js'

const QUADRANT_ORDER = ['top-left', 'top-right', 'bottom-left', 'bottom-right']

export const matrixQuadrant: TemplateDefinition = {
  card: {
    id: 'matrix:quadrant',
    family: 'matrix',
    style: 'quadrant',
    isDefaultStyle: true,
    aliases: ['matrix2x2', 'quadrant', 'swot'],
    name: '2×2 matrix',
    description: 'Four quadrants on two labelled axes, filled top-left, top-right, bottom-left, bottom-right. Indent items under a quadrant to list them inside it.',
    useCases: ['prioritisation (impact / effort)', 'SWOT', 'positioning map'],
    items: { min: 1, max: 4, recommended: [4, 4] },
    elements: [{
      keyword: 'quadrant',
      aliases: ['zone', 'box'],
      description: 'One quadrant, in reading order',
      positional: ['title', 'subtitle'],
      child: { keyword: 'item', aliases: ['point', 'bullet'], description: 'One entry listed inside the quadrant', positional: ['title'] },
    }],
    settings: [
      { keyword: 'x', description: 'Horizontal axis: name, then optional low and high labels', arguments: ['name', 'low', 'high'] },
      { keyword: 'y', description: 'Vertical axis: name, then optional low and high labels', arguments: ['name', 'low', 'high'] },
    ],
    example: `@matrix "Prioritisation"
  x "Effort" "Low" "High"
  y "Impact" "Low" "High"
  quadrant "Quick wins" "Do now"
    item "Self-service export"
  quadrant "Big bets" "Plan carefully"
    item "New data platform"
  quadrant "Fill-ins" "When time allows"
  quadrant "Money pits" "Avoid"`,
    tags: ['2x2', 'prioritisation', 'swot'],
  },
  render(canvas, input) {
    const axisLabelWidth = 40
    const gap = 12
    const gridLeft = canvas.left + axisLabelWidth
    const gridWidth = canvas.contentWidth - axisLabelWidth
    const cellWidth = (gridWidth - gap) / 2
    const cellHeight = Math.max(200, Math.min(260, cellWidth * 0.5))
    const radius = canvas.theme.shape.radius
    input.items.forEach((item, index) => {
      canvas.group(`${item.id}`, () => {
        const column = index % 2
        const row = Math.floor(index / 2)
        const x = gridLeft + column * (cellWidth + gap)
        const y = canvas.top + row * (cellHeight + gap)
        canvas.rect({ x, y, width: cellWidth, height: cellHeight }, { rx: radius, fill: tint(canvas, item.color, 0.84), stroke: item.color, 'stroke-width': canvas.theme.shape.strokeWidth, 'data-position': QUADRANT_ORDER[index] })
        const padding = 22
        const title = canvas.text({ text: item.title, x: x + padding, y: y + padding, width: cellWidth - padding * 2, size: 22, minSize: 15, weight: 800, maxLines: 1, color: canvas.theme.ink(item.color, tint(canvas, item.color, 0.84)), font: 'heading' })
        let cursor = title.y + title.height + 4
        if (item.subtitle) {
          const subtitle = canvas.text({ text: item.subtitle, x: x + padding, y: cursor, width: cellWidth - padding * 2, size: 15, maxLines: 2, color: canvas.theme.colors.textMuted })
          cursor = subtitle.y + subtitle.height
        }
        cursor += 12
        const bottomLimit = y + cellHeight - padding
        for (const entry of item.children) {
          if (cursor + 20 > bottomLimit) {
            canvas.diagnostics.push({ severity: 'warning', line: entry.line, message: `Quadrant "${item.title}" is full; "${entry.title}" not shown` })
            continue
          }
          canvas.group(entry.id, () => {
            canvas.circle(x + padding + 5, cursor + 10, 4, { fill: item.color })
            const box = canvas.text({ text: entry.title, x: x + padding + 18, y: cursor, width: cellWidth - padding * 2 - 18, height: bottomLimit - cursor, size: 16, minSize: 12, maxLines: 2 })
            cursor = box.y + box.height + 8
          })
        }
      })
    })
    const gridHeight = cellHeight * 2 + gap
    const [xName, xLow, xHigh] = input.settings.x ?? []
    const [yName, yLow, yHigh] = input.settings.y ?? []
    const axisColor = canvas.theme.colors.textMuted
    const axisY = canvas.top + gridHeight + 14
    if (xName || xLow || xHigh) {
      canvas.line(gridLeft, axisY, gridLeft + gridWidth, axisY, { stroke: canvas.theme.colors.line, 'stroke-width': 2 })
      if (xLow) canvas.text({ text: xLow, x: gridLeft, y: axisY + 8, width: cellWidth / 2, size: 14, maxLines: 1, color: axisColor })
      if (xName) canvas.text({ text: xName, x: gridLeft + cellWidth / 2, y: axisY + 8, width: gridWidth - cellWidth, size: 16, weight: 700, align: 'middle', maxLines: 1, color: canvas.theme.colors.text })
      if (xHigh) canvas.text({ text: xHigh, x: gridLeft + gridWidth - cellWidth / 2, y: axisY + 8, width: cellWidth / 2, size: 14, align: 'end', maxLines: 1, color: axisColor })
    }
    if (yName || yLow || yHigh) {
      const axisX = canvas.left + 14
      if (yHigh) canvas.verticalText(yHigh, axisX - 2, canvas.top + cellHeight / 2, 14, axisColor, 400)
      if (yName) canvas.verticalText(yName, axisX - 2, canvas.top + cellHeight + gap / 2, 16, canvas.theme.colors.text)
      if (yLow) canvas.verticalText(yLow, axisX - 2, canvas.top + cellHeight * 1.5 + gap, 14, axisColor, 400)
    }
    canvas.extendHeight(xName || xLow || xHigh ? axisY + 32 : canvas.top + gridHeight)
  },
}
