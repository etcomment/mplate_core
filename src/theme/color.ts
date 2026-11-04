export interface Rgb {
  red: number
  green: number
  blue: number
}

export interface Hsl {
  hue: number
  saturation: number
  lightness: number
}

const HEX_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i

export function isHexColor(value: string): boolean {
  return HEX_PATTERN.test(value)
}

export function parseHex(hex: string): Rgb {
  if (!isHexColor(hex)) throw new Error(`Invalid hex color: ${hex}`)
  const digits = hex.slice(1)
  const full = digits.length === 3 ? digits.split('').map((digit) => digit + digit).join('') : digits.slice(0, 6)
  return {
    red: parseInt(full.slice(0, 2), 16),
    green: parseInt(full.slice(2, 4), 16),
    blue: parseInt(full.slice(4, 6), 16),
  }
}

function toChannelHex(channel: number): string {
  return Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, '0')
}

export function toHex(rgb: Rgb): string {
  return `#${toChannelHex(rgb.red)}${toChannelHex(rgb.green)}${toChannelHex(rgb.blue)}`
}

export function rgbToHsl({ red, green, blue }: Rgb): Hsl {
  const r = red / 255
  const g = green / 255
  const b = blue / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2
  if (max === min) return { hue: 0, saturation: 0, lightness }
  const delta = max - min
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)
  let hue: number
  if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0)
  else if (max === g) hue = (b - r) / delta + 2
  else hue = (r - g) / delta + 4
  return { hue: hue * 60, saturation, lightness }
}

function hueToChannel(p: number, q: number, t: number): number {
  let wrapped = t
  if (wrapped < 0) wrapped += 1
  if (wrapped > 1) wrapped -= 1
  if (wrapped < 1 / 6) return p + (q - p) * 6 * wrapped
  if (wrapped < 1 / 2) return q
  if (wrapped < 2 / 3) return p + (q - p) * (2 / 3 - wrapped) * 6
  return p
}

export function hslToRgb({ hue, saturation, lightness }: Hsl): Rgb {
  if (saturation === 0) {
    const gray = lightness * 255
    return { red: gray, green: gray, blue: gray }
  }
  const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation
  const p = 2 * lightness - q
  const h = hue / 360
  return {
    red: hueToChannel(p, q, h + 1 / 3) * 255,
    green: hueToChannel(p, q, h) * 255,
    blue: hueToChannel(p, q, h - 1 / 3) * 255,
  }
}

export function adjustLightness(hex: string, amount: number): string {
  const hsl = rgbToHsl(parseHex(hex))
  return toHex(hslToRgb({ ...hsl, lightness: Math.min(0.95, Math.max(0.05, hsl.lightness + amount)) }))
}

export function mix(first: string, second: string, ratio: number): string {
  const a = parseHex(first)
  const b = parseHex(second)
  return toHex({
    red: a.red + (b.red - a.red) * ratio,
    green: a.green + (b.green - a.green) * ratio,
    blue: a.blue + (b.blue - a.blue) * ratio,
  })
}

function linearChannel(channel: number): number {
  const value = channel / 255
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex: string): number {
  const { red, green, blue } = parseHex(hex)
  return 0.2126 * linearChannel(red) + 0.7152 * linearChannel(green) + 0.0722 * linearChannel(blue)
}

export function contrastRatio(first: string, second: string): number {
  const a = relativeLuminance(first)
  const b = relativeLuminance(second)
  const [lighter, darker] = a > b ? [a, b] : [b, a]
  return (lighter + 0.05) / (darker + 0.05)
}

export function pickReadable(background: string, candidates: string[]): string {
  let best = candidates[0] ?? '#000000'
  let bestRatio = 0
  for (const candidate of candidates) {
    const ratio = contrastRatio(background, candidate)
    if (ratio > bestRatio) {
      best = candidate
      bestRatio = ratio
    }
  }
  return best
}
