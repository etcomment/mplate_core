import { DEFAULT_THEME } from '@mplate/core'

export const BRAND_PALETTE: readonly string[] = DEFAULT_THEME.palette

export const INK_COLOR = DEFAULT_THEME.colors.text

export const PRESET_COLORS = [
  '#000000',
  '#ffffff',
  '#e8eaed',
  '#4285f4',
  '#ea4335',
  '#fbbc04',
  '#34a853',
  '#ff6d01',
  '#46bdc6',
] as const

export const theme = {
  color: {
    accent: '#4a90d9',
    accentAlt: '#2563eb',
    danger: '#d32f2f',
    dangerHover: '#b71c1c',
    success: '#34a853',
    warning: '#fbbc04',
    textPrimary: '#1a1a2e',
    textSecondary: '#5f6368',
    textOnPrimary: '#ffffff',
    textOnDark: '#e8eaed',
    border: '#dadce0',
    borderFocus: '#4a90d9',
    bgSurface: '#ffffff',
    bgSurfaceHover: '#f8f9fa',
    bgCanvas: '#f0f4ff',
    bgCanvasConnect: '#f5f0ff',
    bgPanel: '#ffffff',
    bgPanelHover: '#f1f3f4',
    bgOverlay: 'rgba(0, 0, 0, 0.32)',
    toolbar: '#2c2c2c',
    toolbarText: '#e0e0e0',
    accentText: '#4a90d9',
    disabled: '#9aa0a6',
    disabledBg: '#f5f5f5',
    shadow: 'rgba(0, 0, 0, 0.12)',
    shadowStrong: 'rgba(0, 0, 0, 0.24)',
    selection: 'rgba(74, 144, 217, 0.2)',
  },
  font: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    sizeXs: '0.75rem',
    sizeSm: '0.8125rem',
    sizeMd: '0.875rem',
    sizeLg: '1rem',
    sizeXl: '1.125rem',
    size2xl: '1.25rem',
    weightNormal: 400,
    weightMedium: 500,
    weightSemibold: 600,
  },
  radius: {
    xs: '2px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
  },
  shadow: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)',
    md: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
    dropdown: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
  duration: {
    fast: '120ms',
    normal: '200ms',
    slow: '300ms',
  },
  transition: {
    fast: 'all 120ms ease',
    normal: 'all 200ms ease',
    slow: 'all 300ms ease',
  },
  zIndex: {
    dropdown: 100,
    sticky: 200,
    modal: 300,
    tooltip: 400,
    toast: 500,
  },
  layout: {
    toolbarHeight: '44px',
    sidebarMinWidth: '180px',
    sidebarMaxWidth: '420px',
    sidebarDefaultWidth: '280px',
    rightPanelMinWidth: '180px',
    rightPanelMaxWidth: '420px',
    rightPanelDefaultWidth: '280px',
    drawerMinHeight: '200px',
    drawerMaxHeight: '600px',
    drawerDefaultHeight: '350px',
  },
} as const

export type Theme = typeof theme

export function cssVar(name: string): string {
  return `var(--${name})`
}

export function createCssVariables(theme: Theme): Record<string, string> {
  const vars: Record<string, string> = {}
  function flatten(obj: Record<string, unknown>, prefix = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const name = prefix ? `${prefix}-${key}` : key
      if (typeof value === 'object' && value !== null) {
        flatten(value as Record<string, unknown>, name)
      } else {
        vars[name] = String(value)
      }
    }
  }
  flatten(theme as Record<string, unknown>, 'ad')
  return vars
}

export const STANDARD_COLORS = PRESET_COLORS
