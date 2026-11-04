import type { Canvas } from '../render/canvas.js'

export type ItemField = 'title' | 'subtitle' | 'value' | 'percent' | 'delta' | 'date' | 'label'

export interface ElementSpec {
  keyword: string
  aliases?: string[]
  description: string
  positional: ItemField[]
  flags?: string[]
  attributes?: string[]
  child?: ElementSpec
}

export interface SettingSpec {
  keyword: string
  description: string
  arguments: string[]
}

export interface ItemRange {
  min: number
  max: number
  recommended: [number, number]
}

export interface IdentityCard {
  id: string
  family: string
  style: string
  isDefaultStyle: boolean
  aliases: string[]
  name: string
  description: string
  useCases: string[]
  items: ItemRange
  elements: ElementSpec[]
  settings: SettingSpec[]
  example: string
  tags: string[]
}

export interface Item {
  id: string
  keyword: string
  index: number
  title: string
  subtitle?: string
  value?: string
  percent?: number
  percentLabel?: string
  delta?: string
  date?: string
  label?: string
  icon?: string
  color: string
  hasExplicitColor: boolean
  flags: string[]
  attributes: Record<string, string>
  children: Item[]
  line: number
}

export interface TemplateInput {
  title?: string
  subtitle?: string
  settings: Record<string, string[]>
  items: Item[]
}

export interface TemplateDefinition {
  card: IdentityCard
  render(canvas: Canvas, input: TemplateInput): void
}
