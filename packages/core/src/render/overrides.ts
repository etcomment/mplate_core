import type { Diagnostic } from '../dsl/types.js'
import { resolveIconName } from '../icons/index.js'
import { isHexColor } from '../theme/color.js'
import type { ResolvedTheme } from '../theme/resolve.js'
import type { Item } from '../templates/types.js'

export interface ElementOverride {
  title?: string
  subtitle?: string
  value?: string
  label?: string
  icon?: string
  color?: string
  dx?: number
  dy?: number
}

export type Overrides = Record<string, ElementOverride>

export interface ElementInfo {
  id: string
  keyword: string
  line: number
  title: string
  parentId?: string
}

export interface Offset {
  dx: number
  dy: number
}

const TEXT_FIELDS = ['title', 'subtitle', 'value', 'label'] as const
const MAX_OFFSET = 10_000
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function isPlainOverride(value: unknown): value is ElementOverride {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function clampOffset(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.min(MAX_OFFSET, Math.max(-MAX_OFFSET, value))
}

function isValidColor(theme: ResolvedTheme, color: string): boolean {
  return isHexColor(color) || /^(?:accent|palette)?\d+$/.test(color) || Object.prototype.hasOwnProperty.call(theme.colors, color)
}

function applyToItem(item: Item, override: ElementOverride, theme: ResolvedTheme, diagnostics: Diagnostic[]): void {
  for (const field of TEXT_FIELDS) {
    const value = override[field]
    if (typeof value === 'string') item[field] = value
  }
  if (typeof override.icon === 'string') {
    if (resolveIconName(override.icon)) item.icon = override.icon
    else diagnostics.push({ severity: 'warning', line: item.line, message: `Override: unknown icon "${override.icon}" on ${item.id}` })
  }
  if (typeof override.color === 'string') {
    if (isValidColor(theme, override.color)) {
      item.color = theme.color(override.color, item.index)
      item.hasExplicitColor = true
    } else diagnostics.push({ severity: 'warning', line: item.line, message: `Override: invalid colour "${override.color}" on ${item.id}` })
  }
}

export function applyContentOverrides(items: Item[], overrides: Overrides, theme: ResolvedTheme, diagnostics: Diagnostic[]): void {
  for (const item of items) {
    const override = Object.hasOwn(overrides, item.id) ? overrides[item.id] : undefined
    if (isPlainOverride(override)) applyToItem(item, override, theme, diagnostics)
    applyContentOverrides(item.children, overrides, theme, diagnostics)
  }
}

export function collectElements(items: Item[], parentId?: string): ElementInfo[] {
  return items.flatMap((item) => {
    const info: ElementInfo = { id: item.id, keyword: item.keyword, line: item.line, title: item.title }
    if (parentId) info.parentId = parentId
    return [info, ...collectElements(item.children, item.id)]
  })
}

export function offsetsFrom(overrides: Overrides): Map<string, Offset> {
  const offsets = new Map<string, Offset>()
  for (const [id, override] of Object.entries(overrides)) {
    if (DANGEROUS_KEYS.has(id) || !isPlainOverride(override)) continue
    const dx = clampOffset(override.dx)
    const dy = clampOffset(override.dy)
    if (dx !== 0 || dy !== 0) offsets.set(id, { dx, dy })
  }
  return offsets
}

export function reportUnusedOverrides(overrides: Overrides, elementIds: Set<string>, diagnostics: Diagnostic[]): string[] {
  const unused = Object.keys(overrides).filter((id) => !DANGEROUS_KEYS.has(id) && !elementIds.has(id))
  for (const id of unused) diagnostics.push({ severity: 'warning', line: 1, message: `Adjustment for "${id}" ignored: that element no longer exists`, hint: 'Remove the adjustment or restore the element' })
  return unused
}
