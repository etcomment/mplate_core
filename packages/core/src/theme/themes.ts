import type { Theme } from './types.js'

const SANS = "Inter, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"

export const DEFAULT_THEME: Theme = {
  name: 'default',
  description: 'Balanced, high-contrast palette for slides and documents',
  palette: ['#4361d8', '#13a389', '#f0a202', '#e4572e', '#7d5bd0', '#2b9ed8'],
  colors: {
    background: '#ffffff',
    surface: '#f4f6fb',
    surfaceAlt: '#e6eaf4',
    text: '#1b2133',
    textMuted: '#5b6478',
    textInverse: '#ffffff',
    line: '#c9cfdc',
    positive: '#138a52',
    negative: '#c9372c',
    warning: '#b7791f',
  },
  fonts: { heading: SANS, body: SANS },
  shape: { radius: 10, strokeWidth: 2 },
}

export const OCEAN_THEME: Theme = {
  name: 'ocean',
  description: 'Cool blues and teals, calm and corporate',
  palette: ['#0b4f6c', '#01baef', '#20bf55', '#0c7c8c', '#5c80bc', '#93b7be'],
  colors: { ...DEFAULT_THEME.colors, surface: '#f1f7fa', surfaceAlt: '#dcebf1', text: '#0f2430', textMuted: '#4e6672' },
  fonts: { heading: SANS, body: SANS },
  shape: { radius: 12, strokeWidth: 2 },
}

export const MONO_THEME: Theme = {
  name: 'mono',
  description: 'Grayscale with a single accent, for print and sober decks',
  palette: ['#1f2937', '#4b5563', '#6b7280', '#9ca3af', '#374151', '#d14d41'],
  colors: { ...DEFAULT_THEME.colors, surface: '#f5f5f5', surfaceAlt: '#e5e5e5', text: '#111111', textMuted: '#555555', line: '#bdbdbd' },
  fonts: { heading: SANS, body: SANS },
  shape: { radius: 4, strokeWidth: 1.5 },
}

export const DARK_THEME: Theme = {
  name: 'dark',
  description: 'Dark background with luminous accents',
  palette: ['#6c8cff', '#2dd4bf', '#fbbf24', '#fb7185', '#a78bfa', '#38bdf8'],
  colors: {
    background: '#12151f',
    surface: '#1c2130',
    surfaceAlt: '#262c3f',
    text: '#eef1f8',
    textMuted: '#a3abc2',
    textInverse: '#12151f',
    line: '#3a4258',
    positive: '#34d399',
    negative: '#f87171',
    warning: '#fbbf24',
  },
  fonts: { heading: SANS, body: SANS },
  shape: { radius: 10, strokeWidth: 2 },
}

export const BUILT_IN_THEMES: Record<string, Theme> = {
  default: DEFAULT_THEME,
  ocean: OCEAN_THEME,
  mono: MONO_THEME,
  dark: DARK_THEME,
}
