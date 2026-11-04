import type { Canvas, TextAlign } from '../render/canvas.js'
import { mix } from '../theme/color.js'
import type { Item } from './types.js'

export function balancedColumns(count: number, maxColumns: number): number {
  if (count <= maxColumns) return Math.max(1, count)
  const rows = Math.ceil(count / maxColumns)
  return Math.ceil(count / rows)
}

export function chunk<T>(values: T[], size: number): T[][] {
  const rows: T[][] = []
  for (let index = 0; index < values.length; index += size) rows.push(values.slice(index, index + size))
  return rows
}

export function itemNumber(item: Item): string {
  return String(item.index + 1).padStart(2, '0')
}

export function tint(canvas: Canvas, color: string, amount: number): string {
  return mix(color, canvas.theme.colors.background, amount)
}

export interface StackOptions {
  x: number
  y: number
  width: number
  align?: TextAlign
  titleSize?: number
  subtitleSize?: number
  titleLines?: number
  subtitleLines?: number
  titleColor?: string
  subtitleColor?: string
  valueColor?: string
  showValue?: boolean
  gap?: number
}

export function drawTextStack(canvas: Canvas, item: Item, options: StackOptions): number {
  const align = options.align ?? 'start'
  const titleSize = options.titleSize ?? 18
  const subtitleSize = options.subtitleSize ?? 14
  const gap = options.gap ?? 4
  let bottom = options.y
  if (options.showValue && item.value) {
    const box = canvas.text({ text: item.value, x: options.x, y: bottom, width: options.width, size: titleSize + 4, weight: 800, align, maxLines: 1, minSize: titleSize - 2, color: options.valueColor ?? canvas.theme.ink(item.color, canvas.theme.colors.background), font: 'heading' })
    bottom = box.y + box.height + gap
  }
  if (item.title) {
    const box = canvas.text({ text: item.title, x: options.x, y: bottom, width: options.width, size: titleSize, minSize: Math.max(11, titleSize - 4), weight: 700, align, maxLines: options.titleLines ?? 2, color: options.titleColor ?? canvas.theme.colors.text, font: 'heading' })
    bottom = box.y + box.height + gap
  }
  if (item.subtitle) {
    const box = canvas.text({ text: item.subtitle, x: options.x, y: bottom, width: options.width, size: subtitleSize, minSize: Math.max(10, subtitleSize - 2), align, maxLines: options.subtitleLines ?? 3, color: options.subtitleColor ?? canvas.theme.colors.textMuted })
    bottom = box.y + box.height + gap
  }
  return bottom - gap
}

export function measureTextStack(canvas: Canvas, item: Item, options: StackOptions): number {
  const titleSize = options.titleSize ?? 18
  const subtitleSize = options.subtitleSize ?? 14
  const gap = options.gap ?? 4
  const parts: number[] = []
  if (options.showValue && item.value) parts.push(canvas.measure({ text: item.value, x: 0, y: 0, width: options.width, size: titleSize + 4, weight: 800, maxLines: 1, minSize: titleSize - 2 }).height)
  if (item.title) parts.push(canvas.measure({ text: item.title, x: 0, y: 0, width: options.width, size: titleSize, minSize: Math.max(11, titleSize - 4), weight: 700, maxLines: options.titleLines ?? 2 }).height)
  if (item.subtitle) parts.push(canvas.measure({ text: item.subtitle, x: 0, y: 0, width: options.width, size: subtitleSize, minSize: Math.max(10, subtitleSize - 2), maxLines: options.subtitleLines ?? 3 }).height)
  const visible = parts.filter((height) => height > 0)
  return visible.reduce((sum, height) => sum + height, 0) + gap * Math.max(0, visible.length - 1)
}

export function drawBadge(canvas: Canvas, item: Item, cx: number, cy: number, radius: number, fill: string = item.color): void {
  canvas.circle(cx, cy, radius, { fill })
  const foreground = canvas.theme.textOn(fill)
  if (item.icon && canvas.icon(item.icon, cx, cy, radius * 0.95, foreground)) return
  const label = item.label ?? String(item.index + 1)
  canvas.text({ text: label, x: cx - radius, y: cy - radius, width: radius * 2, height: radius * 2, size: Math.round(radius * 0.75), minSize: 9, weight: 800, align: 'middle', valign: 'middle', maxLines: 1, color: foreground, font: 'heading' })
}

export function scaleFor(columns: number, wide: number, narrow: number, threshold: number = 4): number {
  return columns <= threshold ? wide : narrow
}
