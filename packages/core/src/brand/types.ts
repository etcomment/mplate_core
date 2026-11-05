import type { ThemeColors, ThemeFonts, ThemeShape } from '../theme/types.js'

export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface BrandLogo {
  src: string
  width: number
  height: number
  position?: LogoPosition
}

export interface BrandKit {
  kind: 'mplate-brand-kit'
  version: 1
  name: string
  extends?: string
  palette?: string[]
  colors?: Partial<ThemeColors>
  fonts?: Partial<ThemeFonts>
  shape?: Partial<ThemeShape>
  logo?: BrandLogo
  styles?: Record<string, string>
}
