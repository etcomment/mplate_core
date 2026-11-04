import { adjustLightness, contrastRatio, isHexColor, pickReadable } from './color.js'
import { BUILT_IN_THEMES, DEFAULT_THEME } from './themes.js'
import type { ColorToken, Theme, ThemeOverride } from './types.js'

export type ThemeInput = string | ThemeOverride | Theme

export interface ResolvedTheme extends Theme {
  accent(index: number): string
  textOn(background: string): string
  ink(color: string, background?: string): string
  color(reference: string, fallbackIndex: number): string
}

const SHADE_STEPS = [0.14, -0.14, 0.26, -0.24]
const MINIMUM_GRAPHIC_CONTRAST = 3

export function paletteColor(palette: string[], index: number): string {
  const size = palette.length
  if (size === 0) return DEFAULT_THEME.palette[index % DEFAULT_THEME.palette.length]!
  const base = palette[index % size]!
  const cycle = Math.floor(index / size)
  if (cycle === 0) return base
  const step = SHADE_STEPS[(cycle - 1) % SHADE_STEPS.length]!
  return adjustLightness(base, step)
}

export function mergeTheme(base: Theme, override: ThemeOverride): Theme {
  return {
    name: override.name ?? base.name,
    description: override.description ?? base.description,
    palette: override.palette && override.palette.length > 0 ? override.palette : base.palette,
    colors: { ...base.colors, ...override.colors },
    fonts: { ...base.fonts, ...override.fonts },
    shape: { ...base.shape, ...override.shape },
  }
}

export function findTheme(name: string): Theme | undefined {
  return BUILT_IN_THEMES[name.toLowerCase()]
}

function toTheme(input: ThemeInput | undefined): Theme {
  if (input === undefined) return DEFAULT_THEME
  if (typeof input === 'string') return findTheme(input) ?? DEFAULT_THEME
  const base = input.name ? findTheme(input.name) ?? DEFAULT_THEME : DEFAULT_THEME
  return mergeTheme(base, input)
}

function isColorToken(theme: Theme, reference: string): reference is ColorToken {
  return Object.prototype.hasOwnProperty.call(theme.colors, reference)
}

export function resolveTheme(input?: ThemeInput, ...overrides: ThemeOverride[]): ResolvedTheme {
  const theme = overrides.reduce<Theme>((current, override) => mergeTheme(current, override), toTheme(input))
  const accent = (index: number): string => paletteColor(theme.palette, index)
  const textOn = (background: string): string =>
    isHexColor(background) ? pickReadable(background, [theme.colors.textInverse, theme.colors.text, '#ffffff', '#111111']) : theme.colors.text
  const color = (reference: string, fallbackIndex: number): string => {
    if (isHexColor(reference)) return reference
    const accentMatch = /^(?:accent|palette)(\d+)$/.exec(reference)
    if (accentMatch) return accent(Math.max(0, Number(accentMatch[1]) - 1))
    if (/^\d+$/.test(reference)) return accent(Math.max(0, Number(reference) - 1))
    if (isColorToken(theme, reference)) return theme.colors[reference]
    return accent(fallbackIndex)
  }
  const ink = (foreground: string, background: string = theme.colors.surface): string => {
    if (!isHexColor(foreground) || !isHexColor(background)) return foreground
    const isDarkBackground = contrastRatio(background, '#000000') < contrastRatio(background, '#ffffff')
    let adjusted = foreground
    for (let step = 0; step < 12 && contrastRatio(adjusted, background) < MINIMUM_GRAPHIC_CONTRAST; step++) {
      adjusted = adjustLightness(adjusted, isDarkBackground ? 0.05 : -0.05)
    }
    return adjusted
  }
  return { ...theme, accent, textOn, ink, color }
}
