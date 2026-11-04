export interface ThemeColors {
  background: string
  surface: string
  surfaceAlt: string
  text: string
  textMuted: string
  textInverse: string
  line: string
  positive: string
  negative: string
  warning: string
}

export interface ThemeFonts {
  heading: string
  body: string
}

export interface ThemeShape {
  radius: number
  strokeWidth: number
}

export interface Theme {
  name: string
  description: string
  palette: string[]
  colors: ThemeColors
  fonts: ThemeFonts
  shape: ThemeShape
}

export interface ThemeOverride {
  name?: string
  description?: string
  palette?: string[]
  colors?: Partial<ThemeColors>
  fonts?: Partial<ThemeFonts>
  shape?: Partial<ThemeShape>
}

export type ColorToken = keyof ThemeColors
