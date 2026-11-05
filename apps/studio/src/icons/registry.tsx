import { createElement, type ComponentType, type ReactElement } from 'react'
import * as LucideIcons from 'lucide-react'
import { listIcons } from '@mplate/core'

export interface IconProps { size?: number; color?: string; fill?: string }

export type IconRenderer = (props: IconProps) => ReactElement

export type IconSource = 'mplate' | 'lucide'

export interface IconEntry {
  id: string
  source: IconSource
}

type LucideComponent = ComponentType<{ size?: number; color?: string }>

const lucideMap = LucideIcons as unknown as Record<string, unknown>

function toPascalCase(name: string): string {
  const camel = name.trim().replace(/[-_\s]+([a-z0-9])/gi, (_, character: string) => character.toUpperCase())
  return camel.charAt(0).toUpperCase() + camel.slice(1)
}

function toKebabCase(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Za-z])([0-9])/g, '$1-$2').toLowerCase()
}

function isLucideComponent(value: unknown): value is LucideComponent {
  return typeof value === 'function' || (typeof value === 'object' && value !== null && '$$typeof' in value)
}

function findLucideComponent(name: string): LucideComponent | undefined {
  const pascal = toPascalCase(name)
  const candidate = lucideMap[pascal] ?? lucideMap[name] ?? lucideMap[`${pascal}Icon`]
  return isLucideComponent(candidate) ? candidate : undefined
}

const rendererCache = new Map<string, IconRenderer | undefined>()

export function resolveIcon(name?: string): IconRenderer | undefined {
  if (!name) return undefined
  const clean = name.trim()
  if (!clean) return undefined
  if (rendererCache.has(clean)) return rendererCache.get(clean)
  const component = findLucideComponent(clean)
  const renderer: IconRenderer | undefined = component
    ? function LucideIcon(props: IconProps): ReactElement {
        return createElement(component, { size: props.size ?? 24, color: props.color ?? props.fill ?? 'currentColor' })
      }
    : undefined
  rendererCache.set(clean, renderer)
  return renderer
}

export const TEMPLATE_ICONS: Record<string, IconRenderer> = new Proxy({} as Record<string, IconRenderer>, {
  get(_target, property) {
    return typeof property === 'string' ? resolveIcon(property) : undefined
  },
  has(_target, property) {
    return typeof property === 'string' && Boolean(resolveIcon(property))
  },
})

function listLucideIconNames(): string[] {
  const names = new Set<string>()
  for (const key of Object.keys(lucideMap)) {
    if (!/^[A-Z]/.test(key) || key.endsWith('Icon') || key.startsWith('Lucide') || key.endsWith('Context') || key.endsWith('Provider')) continue
    if (!isLucideComponent(lucideMap[key])) continue
    names.add(toKebabCase(key))
  }
  return [...names].sort()
}

let catalogue: IconEntry[] | undefined

export function iconCatalogue(): IconEntry[] {
  if (catalogue) return catalogue
  const mplateIcons = listIcons().filter((name) => resolveIcon(name))
  const seen = new Set(mplateIcons)
  catalogue = [
    ...mplateIcons.map((id): IconEntry => ({ id, source: 'mplate' })),
    ...listLucideIconNames().filter((id) => !seen.has(id)).map((id): IconEntry => ({ id, source: 'lucide' })),
  ]
  return catalogue
}
