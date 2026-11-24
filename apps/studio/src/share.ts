import type { ElementOverride, Overrides } from '@mplate/core'

export interface SharedRect {
  x: number
  y: number
  width: number
  height: number
}

export interface SharedAdjustments {
  strokeColors?: Record<string, string>
  strokeWidths?: Record<string, number>
  positions?: Record<string, SharedRect>
  rotations?: Record<string, number>
  hidden?: string[]
}

export interface StudioState {
  source: string
  theme: string
  width: number
  overrides?: Overrides
  adjustments?: SharedAdjustments
}

const STORAGE_KEY = 'mplate-studio:draft'
const HASH_PREFIX = '#dsl='
const MAX_SHARE_LENGTH = 262_144
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const SAFE_ELEMENT_ID = /^[a-zA-Z0-9_-]+$/
const SAFE_COLOR = /^(?:transparent|none|#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8}))$/i

export function encodeShare(state: StudioState): string {
  const json = JSON.stringify(state)
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function sanitizeOverrides(value: unknown): Overrides | undefined {
  if (!isPlainRecord(value)) return undefined
  const result: Overrides = {}
  for (const [id, entry] of Object.entries(value)) {
    if (DANGEROUS_KEYS.has(id) || !SAFE_ELEMENT_ID.test(id) || !isPlainRecord(entry)) continue
    const clean: ElementOverride = {}
    if (typeof entry.title === 'string') clean.title = entry.title
    if (typeof entry.subtitle === 'string') clean.subtitle = entry.subtitle
    if (typeof entry.value === 'string') clean.value = entry.value
    if (typeof entry.label === 'string') clean.label = entry.label
    if (typeof entry.icon === 'string') clean.icon = entry.icon
    if (typeof entry.color === 'string') clean.color = entry.color
    if (typeof entry.dx === 'number' && Number.isFinite(entry.dx)) clean.dx = clamp(entry.dx, -10_000, 10_000)
    if (typeof entry.dy === 'number' && Number.isFinite(entry.dy)) clean.dy = clamp(entry.dy, -10_000, 10_000)
    if (Object.keys(clean).length > 0) result[id] = clean
  }
  return Object.keys(result).length > 0 ? result : undefined
}

function sanitizeAdjustments(value: unknown): SharedAdjustments | undefined {
  if (!isPlainRecord(value)) return undefined
  const clean: SharedAdjustments = {}
  if (isPlainRecord(value.strokeColors)) {
    const strokeColors: Record<string, string> = {}
    for (const [id, color] of Object.entries(value.strokeColors)) {
      if (!DANGEROUS_KEYS.has(id) && SAFE_ELEMENT_ID.test(id) && typeof color === 'string' && SAFE_COLOR.test(color)) {
        strokeColors[id] = color
      }
    }
    if (Object.keys(strokeColors).length > 0) clean.strokeColors = strokeColors
  }
  if (isPlainRecord(value.strokeWidths)) {
    const strokeWidths: Record<string, number> = {}
    for (const [id, width] of Object.entries(value.strokeWidths)) {
      if (!DANGEROUS_KEYS.has(id) && SAFE_ELEMENT_ID.test(id) && typeof width === 'number' && Number.isFinite(width) && width >= 0 && width <= 100) {
        strokeWidths[id] = width
      }
    }
    if (Object.keys(strokeWidths).length > 0) clean.strokeWidths = strokeWidths
  }
  if (isPlainRecord(value.positions)) {
    const positions: Record<string, SharedRect> = {}
    for (const [id, rect] of Object.entries(value.positions)) {
      if (!DANGEROUS_KEYS.has(id) && SAFE_ELEMENT_ID.test(id) && isPlainRecord(rect)) {
        const { x, y, width, height } = rect
        if (
          typeof x === 'number' && Number.isFinite(x) &&
          typeof y === 'number' && Number.isFinite(y) &&
          typeof width === 'number' && Number.isFinite(width) &&
          typeof height === 'number' && Number.isFinite(height)
        ) {
          positions[id] = { x, y, width, height }
        }
      }
    }
    if (Object.keys(positions).length > 0) clean.positions = positions
  }
  if (isPlainRecord(value.rotations)) {
    const rotations: Record<string, number> = {}
    for (const [id, angle] of Object.entries(value.rotations)) {
      if (!DANGEROUS_KEYS.has(id) && SAFE_ELEMENT_ID.test(id) && typeof angle === 'number' && Number.isFinite(angle) && angle >= -3600 && angle <= 3600) {
        rotations[id] = angle
      }
    }
    if (Object.keys(rotations).length > 0) clean.rotations = rotations
  }
  if (Array.isArray(value.hidden)) {
    const hidden = value.hidden.filter((id): id is string => typeof id === 'string' && SAFE_ELEMENT_ID.test(id))
    if (hidden.length > 0) clean.hidden = hidden
  }
  return Object.keys(clean).length > 0 ? clean : undefined
}

function sanitizeStudioState(value: unknown): StudioState | undefined {
  if (!isPlainRecord(value)) return undefined
  if (typeof value.source !== 'string' || value.source.length > MAX_SHARE_LENGTH) return undefined
  if (typeof value.theme !== 'string' || value.theme.length > 100) return undefined
  if (typeof value.width !== 'number' || !Number.isFinite(value.width)) return undefined
  const clean: StudioState = {
    source: value.source,
    theme: value.theme,
    width: clamp(Math.round(value.width), 480, 3000),
  }
  const overrides = sanitizeOverrides(value.overrides)
  if (overrides) clean.overrides = overrides
  const adjustments = sanitizeAdjustments(value.adjustments)
  if (adjustments) clean.adjustments = adjustments
  return clean
}

export function decodeShare(encoded: string): StudioState | undefined {
  if (encoded.length > MAX_SHARE_LENGTH) return undefined
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes))
    return sanitizeStudioState(parsed)
  } catch {
    return undefined
  }
}

export function shareUrl(state: StudioState, location: Location): string {
  return `${location.origin}${location.pathname}${HASH_PREFIX}${encodeShare(state)}`
}

export function readSharedState(location: Location): StudioState | undefined {
  return location.hash.startsWith(HASH_PREFIX) ? decodeShare(location.hash.slice(HASH_PREFIX.length)) : undefined
}

export function loadDraft(): StudioState | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw || raw.length > MAX_SHARE_LENGTH) return undefined
    const parsed: unknown = JSON.parse(raw)
    return sanitizeStudioState(parsed)
  } catch {
    return undefined
  }
}

export function saveDraft(state: StudioState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    return
  }
}
