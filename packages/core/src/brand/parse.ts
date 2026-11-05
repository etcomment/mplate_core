import type { Diagnostic } from '../dsl/types.js'
import { contrastRatio, isHexColor } from '../theme/color.js'
import { findTheme, resolveThemeIn, type ThemeCatalog } from '../theme/resolve.js'
import { BUILT_IN_THEMES } from '../theme/themes.js'
import type { ThemeColors, ThemeOverride } from '../theme/types.js'
import type { BrandKit, BrandLogo, LogoPosition } from './types.js'

export interface BrandKitResult {
  kit?: BrandKit
  diagnostics: Diagnostic[]
}

const COLOR_KEYS: (keyof ThemeColors)[] = ['background', 'surface', 'surfaceAlt', 'text', 'textMuted', 'textInverse', 'line', 'positive', 'negative', 'warning']
const LOGO_POSITIONS: LogoPosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
const DATA_URI_PATTERN = /^data:image\/(?:png|jpeg|webp|svg\+xml)(?:;base64|;utf8|;charset=utf-8)?,/i

type JsonObject = Record<string, unknown>

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function problem(diagnostics: Diagnostic[], severity: Diagnostic['severity'], message: string, hint?: string): void {
  diagnostics.push(hint ? { severity, line: 0, message, hint } : { severity, line: 0, message })
}

function readColors(value: unknown, diagnostics: Diagnostic[]): Partial<ThemeColors> | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) {
    problem(diagnostics, 'error', 'Brand kit: "colors" must be an object')
    return undefined
  }
  const colors: Partial<ThemeColors> = {}
  for (const [key, color] of Object.entries(value)) {
    if (!COLOR_KEYS.includes(key as keyof ThemeColors)) problem(diagnostics, 'warning', `Brand kit: unknown colour token "${key}"`, `Known tokens: ${COLOR_KEYS.join(', ')}`)
    else if (typeof color !== 'string' || !isHexColor(color)) problem(diagnostics, 'error', `Brand kit: colour "${key}" must be a hex colour`)
    else colors[key as keyof ThemeColors] = color
  }
  return colors
}

function readLogo(value: unknown, diagnostics: Diagnostic[]): BrandLogo | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) {
    problem(diagnostics, 'error', 'Brand kit: "logo" must be an object')
    return undefined
  }
  const raw = typeof value.src === 'string' ? value.src.trim() : ''
  const src = raw.startsWith('<svg') ? `data:image/svg+xml;utf8,${encodeURIComponent(raw)}` : raw
  const width = Number(value.width)
  const height = Number(value.height)
  if (!DATA_URI_PATTERN.test(src)) {
    problem(diagnostics, 'error', 'Brand kit: logo "src" must be inline SVG markup or a data: URI (PNG, JPEG, WebP or SVG)', 'Remote URLs are not allowed so that rendering never depends on the network')
    return undefined
  }
  if (!(width > 0 && width <= 600 && height > 0 && height <= 300)) {
    problem(diagnostics, 'error', 'Brand kit: logo needs "width" (1–600) and "height" (1–300) in pixels')
    return undefined
  }
  const position = value.position === undefined ? 'top-right' : value.position
  if (!LOGO_POSITIONS.includes(position as LogoPosition)) {
    problem(diagnostics, 'error', `Brand kit: logo "position" must be one of ${LOGO_POSITIONS.join(', ')}`)
    return undefined
  }
  return { src, width, height, position: position as LogoPosition }
}

function readStrings(value: unknown, field: string, diagnostics: Diagnostic[]): Record<string, string> | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value) || !Object.values(value).every((entry) => typeof entry === 'string')) {
    problem(diagnostics, 'error', `Brand kit: "${field}" must be an object of strings`)
    return undefined
  }
  return value as Record<string, string>
}

function checkContrast(kit: BrandKit, catalog: ThemeCatalog, diagnostics: Diagnostic[]): void {
  const theme = resolveThemeIn(catalog, kit.extends, [brandKitTheme(kit)])
  const { background, text, textMuted } = theme.colors
  if (contrastRatio(text, background) < 4.5) problem(diagnostics, 'warning', `Brand kit: text ${text} on background ${background} is hard to read (contrast ${contrastRatio(text, background).toFixed(1)}:1, 4.5:1 recommended)`)
  if (contrastRatio(textMuted, background) < 3) problem(diagnostics, 'warning', `Brand kit: secondary text ${textMuted} on background ${background} is hard to read (contrast ${contrastRatio(textMuted, background).toFixed(1)}:1, 3:1 recommended)`)
  for (const color of theme.palette) {
    const ratio = contrastRatio(color, theme.textOn(color))
    if (ratio < 3) problem(diagnostics, 'warning', `Brand kit: palette colour ${color} has no readable text colour (best contrast ${ratio.toFixed(1)}:1)`, 'Darken or lighten it, or set colors.text / colors.textInverse')
    if (contrastRatio(color, background) < 1.3) problem(diagnostics, 'warning', `Brand kit: palette colour ${color} is almost invisible on the background ${background}`)
  }
}

export function brandKitTheme(kit: BrandKit): ThemeOverride {
  const override: ThemeOverride = { name: kit.name }
  if (kit.palette) override.palette = kit.palette
  if (kit.colors) override.colors = kit.colors
  if (kit.fonts) override.fonts = kit.fonts
  if (kit.shape) override.shape = kit.shape
  return override
}

export function parseBrandKit(value: unknown, catalog: ThemeCatalog = BUILT_IN_THEMES): BrandKitResult {
  const diagnostics: Diagnostic[] = []
  if (!isRecord(value)) {
    problem(diagnostics, 'error', 'Brand kit: expected a JSON object')
    return { diagnostics }
  }
  if (value.kind !== 'mplate-brand-kit') problem(diagnostics, 'error', 'Brand kit: "kind" must be "mplate-brand-kit"')
  if (value.version !== 1) problem(diagnostics, 'error', 'Brand kit: "version" must be 1')
  if (typeof value.name !== 'string' || value.name.trim() === '') problem(diagnostics, 'error', 'Brand kit: "name" is required')
  const kit: BrandKit = { kind: 'mplate-brand-kit', version: 1, name: typeof value.name === 'string' ? value.name : '' }
  if (value.extends !== undefined) {
    if (typeof value.extends === 'string' && findTheme(value.extends, catalog)) kit.extends = value.extends
    else problem(diagnostics, 'warning', `Brand kit: unknown base theme "${String(value.extends)}"`, `Available: ${Object.keys(catalog).join(', ')}`)
  }
  if (value.palette !== undefined) {
    const palette = Array.isArray(value.palette) ? value.palette : []
    if (palette.length === 0 || !palette.every((color) => typeof color === 'string' && isHexColor(color))) problem(diagnostics, 'error', 'Brand kit: "palette" must be a non-empty list of hex colours')
    else kit.palette = palette as string[]
  }
  const colors = readColors(value.colors, diagnostics)
  if (colors) kit.colors = colors
  const fonts = readStrings(value.fonts, 'fonts', diagnostics)
  if (fonts) kit.fonts = { ...(fonts.heading ? { heading: fonts.heading } : {}), ...(fonts.body ? { body: fonts.body } : {}) }
  if (value.shape !== undefined) {
    const shape = isRecord(value.shape) ? value.shape : {}
    const radius = Number(shape.radius ?? 10)
    const strokeWidth = Number(shape.strokeWidth ?? 2)
    if (!(radius >= 0 && radius <= 40 && strokeWidth >= 0 && strokeWidth <= 10)) problem(diagnostics, 'error', 'Brand kit: "shape.radius" must be 0–40 and "shape.strokeWidth" 0–10')
    else kit.shape = { radius, strokeWidth }
  }
  const logo = readLogo(value.logo, diagnostics)
  if (logo) kit.logo = logo
  const styles = readStrings(value.styles, 'styles', diagnostics)
  if (styles) kit.styles = styles
  if (diagnostics.some((diagnostic) => diagnostic.severity === 'error')) return { diagnostics }
  checkContrast(kit, catalog, diagnostics)
  return { kit, diagnostics }
}
