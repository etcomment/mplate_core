import type { Canvas } from '../../render/canvas.js'
import type { Item } from '../types.js'

export function collectPeriods(declared: string[] | undefined, labels: (string | undefined)[]): string[] {
  if (declared && declared.length > 0) return declared
  const seen: string[] = []
  for (const label of labels) {
    if (label && !/^\d+$/.test(label) && !seen.some((entry) => entry.toLowerCase() === label.toLowerCase())) seen.push(label)
  }
  if (seen.length > 0) return seen
  const highest = Math.max(1, ...labels.map((label) => (label && /^\d+$/.test(label) ? Number(label) : 1)))
  return Array.from({ length: highest }, (_, index) => String(index + 1))
}

export function periodIndex(periods: string[], label: string | undefined): number | undefined {
  if (!label) return undefined
  const exact = periods.findIndex((period) => period.toLowerCase() === label.toLowerCase())
  if (exact >= 0) return exact
  if (/^\d+$/.test(label)) {
    const index = Number(label) - 1
    if (index >= 0 && index < periods.length) return index
  }
  return undefined
}

export function warnUnknownPeriod(canvas: Canvas, item: Item, label: string | undefined, periods: string[]): void {
  canvas.diagnostics.push({
    severity: 'warning',
    line: item.line,
    message: label ? `"${label}" is not one of the periods; "${item.title}" placed in the first one` : `"${item.title}" has no period; placed in the first one`,
    hint: `Periods: ${periods.join(', ')}`,
  })
}

export function drawPeriodHeader(canvas: Canvas, periods: string[], left: number, columnWidth: number, top: number): number {
  const height = 34
  periods.forEach((period, index) => {
    const x = left + index * columnWidth
    canvas.rect({ x: x + 2, y: top, width: columnWidth - 4, height }, { rx: 6, fill: canvas.theme.colors.surfaceAlt })
    canvas.text({ text: period, x: x + 6, y: top, width: columnWidth - 12, height, size: 14, minSize: 9, weight: 700, align: 'middle', valign: 'middle', maxLines: 1, color: canvas.theme.colors.textMuted, owner: 'periods' })
  })
  return top + height
}
