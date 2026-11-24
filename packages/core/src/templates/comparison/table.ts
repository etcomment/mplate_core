import type { Canvas } from '../../render/canvas.js'
import { roundedTopPath } from '../../svg/paths.js'
import { tint } from '../shared.js'
import type { TemplateDefinition } from '../types.js'

const YES = ['yes', 'y', 'true', '✓', 'oui', 'included']
const NO = ['no', 'n', 'false', '-', '—', 'non', 'none']
const PARTIAL = ['partial', '~', 'some', 'limited', 'partiel']

function isSymbolicCell(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  return YES.includes(normalized) || NO.includes(normalized) || PARTIAL.includes(normalized)
}

function drawCell(canvas: Canvas, value: string, x: number, y: number, width: number, height: number, accent: string): void {
  const normalized = value.trim().toLowerCase()
  const centerX = x + width / 2
  const centerY = y + height / 2
  if (YES.includes(normalized)) canvas.icon('circle-check', centerX, centerY, 22, canvas.theme.colors.positive)
  else if (NO.includes(normalized)) canvas.icon('x', centerX, centerY, 18, canvas.theme.colors.textMuted)
  else if (PARTIAL.includes(normalized)) canvas.circle(centerX, centerY, 6, { fill: 'none', stroke: accent, 'stroke-width': 2.5 })
  else canvas.text({ text: value, x: x + 8, y, width: width - 16, height, size: 14, minSize: 10, weight: 600, align: 'middle', valign: 'middle' })
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
    const minRowHeight = rows.length > 15 ? 36 : 44
    const rowHeights = rows.map((row) => {
      const titleHeight = canvas.measure({ text: row.title, x: 0, y: 0, width: labelWidth - 16, size: 15, minSize: 11, weight: 600 }).height + 16
      const cellHeights = columns.map((_, column) => {
        const value = row.values[column]
        if (value === undefined || isSymbolicCell(value)) return 0
        return canvas.measure({ text: value, x: 0, y: 0, width: columnWidth - 16, size: 14, minSize: 10, weight: 600 }).height + 16
      })
      return Math.max(minRowHeight, titleHeight, ...cellHeights)
    })
    const top = canvas.top
    const totalRowsHeight = rowHeights.reduce((sum, height) => sum + height, 0)
    const tableBottom = top + headerHeight + totalRowsHeight
    const radius = canvas.theme.shape.radius
    columns.forEach((column, index) => {
      const x = canvas.left + labelWidth + index * columnWidth
      const accent = canvas.theme.accent(index)
      const isHighlighted = column.toLowerCase() === highlight
      if (isHighlighted) canvas.rect({ x: x + 2, y: top, width: columnWidth - 4, height: tableBottom - top + 8 }, { rx: radius, fill: tint(canvas, accent, 0.88) })
      canvas.path(roundedTopPath({ x: x + 2, y: top, width: columnWidth - 4, height: headerHeight - 6 }, radius), { fill: isHighlighted ? accent : tint(canvas, accent, 0.75) })
      canvas.text({ text: column, x: x + 8, y: top, width: columnWidth - 16, height: headerHeight - 6, size: 17, minSize: 11, weight: 800, align: 'middle', valign: 'middle', maxLines: 2, color: canvas.theme.textOn(isHighlighted ? accent : tint(canvas, accent, 0.75)), font: 'heading', owner: 'columns' })
    })
    let rowY = top + headerHeight
    rows.forEach((row, index) => {
      const rowHeight = rowHeights[index]!
      canvas.group(row.id, () => {
        canvas.line(canvas.left, rowY, canvas.left + canvas.contentWidth, rowY, { stroke: canvas.theme.colors.line, 'stroke-width': 1 })
        canvas.text({ text: row.title, x: canvas.left + 8, y: rowY, width: labelWidth - 16, height: rowHeight, size: 15, minSize: 11, weight: 600, valign: 'middle' })
        if (row.values.length > columns.length) canvas.diagnostics.push({ severity: 'warning', line: row.line, message: `"${row.title}" has ${row.values.length} values for ${columns.length} columns; extra values ignored` })
        columns.forEach((_, column) => {
          const value = row.values[column]
          if (value !== undefined) drawCell(canvas, value, canvas.left + labelWidth + column * columnWidth, rowY, columnWidth, rowHeight, canvas.theme.accent(column))
        })
      })
      rowY += rowHeight
    })
    canvas.extendHeight(tableBottom + 8)
  },
}
