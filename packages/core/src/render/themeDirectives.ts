import type { Diagnostic, DslNode } from '../dsl/types.js'
import { isHexColor } from '../theme/color.js'
import { findTheme, type ThemeCatalog } from '../theme/resolve.js'
import type { ThemeOverride } from '../theme/types.js'

const COLOR_ATTRIBUTES: Record<string, string> = { background: 'background', surface: 'surface', text: 'text', muted: 'textMuted', line: 'line' }
const SAFE_FONT_PATTERN = /^[^\x00-\x1f<>{};]{1,200}$/

function readSafeFont(value: string | undefined, line: number, diagnostics: Diagnostic[]): string | undefined {
  if (value === undefined) return undefined
  if (SAFE_FONT_PATTERN.test(value)) return value
  diagnostics.push({ severity: 'warning', line, message: `Invalid font "${value}" ignored` })
  return undefined
}

function directiveOverride(node: DslNode, catalog: ThemeCatalog, diagnostics: Diagnostic[]): ThemeOverride {
  const name = node.attributes.name ?? node.values[0]?.text
  const named = name ? findTheme(name, catalog) : undefined
  const override: ThemeOverride = named ? { ...named, colors: { ...named.colors }, fonts: { ...named.fonts }, shape: { ...named.shape } } : {}
  if (name && !named) diagnostics.push({ severity: 'warning', line: node.line, message: `Unknown theme "${name}"`, hint: `Available themes: ${Object.keys(catalog).join(', ')}` })
  const palette = node.attributes.palette?.split(/[\s,]+/).filter((color) => color.length > 0)
  if (palette) {
    const invalid = palette.filter((color) => !isHexColor(color))
    if (invalid.length > 0) diagnostics.push({ severity: 'warning', line: node.line, message: `Invalid palette colors: ${invalid.join(', ')}` })
    override.palette = palette.filter((color) => isHexColor(color))
  }
  const fonts: ThemeOverride['fonts'] = {}
  const sharedFont = readSafeFont(node.attributes.font, node.line, diagnostics)
  if (sharedFont) {
    fonts.heading = sharedFont
    fonts.body = sharedFont
  }
  const headingFont = readSafeFont(node.attributes.heading, node.line, diagnostics)
  if (headingFont) fonts.heading = headingFont
  const bodyFont = readSafeFont(node.attributes.body, node.line, diagnostics)
  if (bodyFont) fonts.body = bodyFont
  if (Object.keys(fonts).length > 0) override.fonts = fonts
  const colors: Record<string, string> = {}
  for (const [attribute, token] of Object.entries(COLOR_ATTRIBUTES)) {
    const value = node.attributes[attribute]
    if (value && isHexColor(value)) colors[token] = value
  }
  if (Object.keys(colors).length > 0) override.colors = colors
  return override
}

export function themeDirectives(nodes: DslNode[], catalog: ThemeCatalog, diagnostics: Diagnostic[]): ThemeOverride[] {
  return nodes.filter((node) => node.keyword === 'theme').map((node) => directiveOverride(node, catalog, diagnostics))
}
