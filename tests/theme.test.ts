import { describe, expect, it } from 'vitest'
import { contrastRatio } from '../src/theme/color.js'
import { paletteColor, resolveTheme } from '../src/theme/resolve.js'
import { BUILT_IN_THEMES } from '../src/theme/themes.js'

describe('themes', () => {
  it('generates distinct shades beyond the palette length', () => {
    const palette = ['#336699', '#993366']
    const colors = Array.from({ length: 8 }, (_, index) => paletteColor(palette, index))
    expect(colors.slice(0, 2)).toEqual(palette)
    expect(new Set(colors).size).toBe(8)
  })

  it('resolves colour references', () => {
    const theme = resolveTheme('default')
    expect(theme.color('#123456', 0)).toBe('#123456')
    expect(theme.color('accent2', 0)).toBe(theme.palette[1])
    expect(theme.color('negative', 0)).toBe(theme.colors.negative)
    expect(theme.color('', 3)).toBe(theme.palette[3])
  })

  it('picks readable text on every palette colour of every built-in theme', () => {
    for (const name of Object.keys(BUILT_IN_THEMES)) {
      const theme = resolveTheme(name)
      for (const color of theme.palette) expect(contrastRatio(color, theme.textOn(color))).toBeGreaterThanOrEqual(3)
    }
  })

  it('darkens accent colours used as text until they are legible', () => {
    const theme = resolveTheme('default')
    const ink = theme.ink('#f0a202')
    expect(contrastRatio(ink, theme.colors.surface)).toBeGreaterThanOrEqual(3)
  })

  it('merges overrides on top of a named theme', () => {
    const theme = resolveTheme({ name: 'dark', palette: ['#ff0000'] })
    expect(theme.colors.background).toBe(BUILT_IN_THEMES.dark!.colors.background)
    expect(theme.accent(0)).toBe('#ff0000')
  })
})
