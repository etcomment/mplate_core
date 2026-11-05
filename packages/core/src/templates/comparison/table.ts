import type { Canvas } from '../../render/canvas.js'
import { roundedTopPath } from '../../svg/paths.js'
import { tint } from '../shared.js'
import type { TemplateDefinition } from '../types.js'

const YES = ['yes', 'y', 'true', '✓', 'oui', 'included']
const NO = ['no', 'n', 'false', '-', '—', 'non', 'none']
const PARTIAL = ['partial', '~', 'some', 'limited', 'partiel']

function drawCell(canvas: Canvas, value: string, x: number, y: number, width: number, height: number, accent: string): void {
  const normalized = value.trim().toLowerCase()
  const centerX = x + width / 2
  const centerY = y + height / 2
  if (YES.includes(normalized)) canvas.icon('circle-check', centerX, centerY, 22, canvas.theme.colors.positive)
  else if (NO.includes(normalized)) canvas.icon('x', centerX, centerY, 18, canvas.theme.colors.textMuted)
  else if (PARTIAL.includes(normalized)) canvas.circle(centerX, centerY, 6, { fill: 'none', stroke: accent, 'stroke-width': 2.5 })
  else canvas.text({ text: value, x: x + 8, y, width: width - 16, height, size: 14, minSize: 10, weight: 600, align: 'middle', valign: 'middle', maxLines: 2 })
}

export const comparisonTable: TemplateDefinition = {
  card: {
    id: 'comparison:table',
    family: 'comparison',
    style: 'table',
    isDefaultStyle: false,
    aliases: ['features', 'comparison2'],
    name: 'Feature table',
    description: 'A comparison matrix: options as columns, one row per criterion. Cells accept yes, no, partial or any short text. highlight names the recommended column.',
    useCases: ['offer tiers', 'vendor comparison', 'capability matrix'],
    items: { min: 1, max: 30, recommended: [4, 12] },
    elements: [{ keyword: 'row', aliases: ['feature', 'criterion'], description: 'One criterion followed by one value per column (yes, no, partial or text)', positional: ['title'], acceptsExtraValues: true }],
    settings: [
      { keyword: 'columns', description: 'The options compared, in order', arguments: ['option', '…'] },
      { keyword: 'highlight', description: 'The recommended option', arguments: ['option'] },
    ],
    example: `@comparison style:table "Which plan?"
  columns "Free" "Pro" "Team"
  highlight "Team"
  row "Unlimited visuals" yes yes yes
  row "Brand kit" no partial yes
  row "PowerPoint export" no yes yes
  row "Members" "1" "1" "Up to 25"`,
    tags: ['matrix', 'features', 'pricing'],
  },
  render(canvas, input) {
    const rows = input.items
    const columns = input.settings.columns && input.settings.columns.length > 0 ? input.settings.columns : Array.from({ length: Math.max(1, ...rows.map((row) => row.values.length)) }, (_, index) => `Option ${index + 1}`)
    const highlight = input.settings.highlight?.[0]?.toLowerCase()
    const labelWidth = Math.min(360, canvas.contentWidth * 0.34)
    const columnWidth = (canvas.contentWidth - labelWidth) / columns.length
    const headerHeight = 56
    const rowHeight = rows.length > 15 ? 36 : 44
    const top = canvas.top
    const tableBottom = top + headerHeight + rows.length * rowHeight
    const radius = canvas.theme.shape.radius
    columns.forEach((column, index) => {
      const x = canvas.left + labelWidth + index * columnWidth
      const accent = canvas.theme.accent(index)
      const isHighlighted = column.toLowerCase() === highlight
      if (isHighlighted) canvas.rect({ x: x + 2, y: top, width: columnWidth - 4, height: tableBottom - top + 8 }, { rx: radius, fill: tint(canvas, accent, 0.88) })
      canvas.path(roundedTopPath({ x: x + 2, y: top, width: columnWidth - 4, height: headerHeight - 6 }, radius), { fill: isHighlighted ? accent : tint(canvas, accent, 0.75) })
      canvas.text({ text: column, x: x + 8, y: top, width: columnWidth - 16, height: headerHeight - 6, size: 17, minSize: 11, weight: 800, align: 'middle', valign: 'middle', maxLines: 2, color: canvas.theme.textOn(isHighlighted ? accent : tint(canvas, accent, 0.75)), font: 'heading', owner: 'columns' })
    })
    rows.forEach((row, index) => {
      canvas.group(row.id, () => {
        const y = top + headerHeight + index * rowHeight
        canvas.line(canvas.left, y, canvas.left + canvas.contentWidth, y, { stroke: canvas.theme.colors.line, 'stroke-width': 1 })
        canvas.text({ text: row.title, x: canvas.left + 8, y, width: labelWidth - 16, height: rowHeight, size: 15, minSize: 11, weight: 600, valign: 'middle', maxLines: 2 })
        if (row.values.length > columns.length) canvas.diagnostics.push({ severity: 'warning', line: row.line, message: `"${row.title}" has ${row.values.length} values for ${columns.length} columns; extra values ignored` })
        columns.forEach((_, column) => {
          const value = row.values[column]
          if (value !== undefined) drawCell(canvas, value, canvas.left + labelWidth + column * columnWidth, y, columnWidth, rowHeight, canvas.theme.accent(column))
        })
      })
    })
    canvas.extendHeight(tableBottom + 8)
  },
}
