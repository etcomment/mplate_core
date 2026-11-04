import { element, type SvgElement } from '../svg/node.js'
import { LUCIDE_ICONS } from './lucide.generated.js'

const ICON_ALIASES: Record<string, string> = {
  people: 'users',
  team: 'users',
  gear: 'settings',
  cog: 'cog',
  chart: 'chart-column',
  'bar-chart': 'chart-bar',
  'pie-chart': 'chart-pie',
  'line-chart': 'chart-line',
  money: 'banknote',
  dollar: 'dollar-sign',
  chat: 'message-circle',
  message: 'message-circle',
  'water-drop': 'droplet',
  home: 'house',
  idea: 'lightbulb',
  bulb: 'lightbulb',
  ok: 'check',
  done: 'circle-check',
  cross: 'x',
  close: 'x',
  location: 'map-pin',
  pin: 'map-pin',
  email: 'mail',
  time: 'clock',
  security: 'shield',
  growth: 'trending-up',
  decline: 'trending-down',
  launch: 'rocket',
  goal: 'target',
  money_bag: 'wallet',
  ai: 'sparkles',
  robot: 'bot',
  document: 'file-text',
  doc: 'file-text',
  cart: 'shopping-cart',
  deal: 'handshake',
  law: 'scale',
  bank: 'landmark',
  company: 'building',
}

export function normalizeIconName(name: string): string {
  return name
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

export function resolveIconName(name: string): string | undefined {
  const normalized = normalizeIconName(name)
  if (LUCIDE_ICONS[normalized]) return normalized
  const alias = ICON_ALIASES[normalized] ?? ICON_ALIASES[name]
  if (alias && LUCIDE_ICONS[alias]) return alias
  return undefined
}

export function listIcons(): string[] {
  return Object.keys(LUCIDE_ICONS).sort()
}

export function renderIcon(name: string, centerX: number, centerY: number, size: number, color: string): SvgElement | undefined {
  const resolved = resolveIconName(name)
  if (!resolved) return undefined
  const icon = LUCIDE_ICONS[resolved]!
  const scale = size / 24
  const children = icon.map(([tag, attributes]) => element(tag, { ...attributes }))
  return element(
    'g',
    {
      transform: `translate(${(centerX - size / 2).toFixed(2)} ${(centerY - size / 2).toFixed(2)}) scale(${scale.toFixed(4)})`,
      fill: 'none',
      stroke: color,
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'data-icon': resolved,
    },
    children,
  )
}
