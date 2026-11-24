import { parseDsl, type DslNode, type ElementSpec, type IdentityCard, type ItemField } from '@mplate/core'
import type { EditableField } from './dslLines'

export interface ElementFields {
  title: string
  subtitle: string
  value: string
  delta: string
  date: string
  percent: string
  from: string
  to: string
  label: string
  editable: EditableField[]
  spec?: ElementSpec
}

export function findElementSpec(card: IdentityCard | undefined, keyword: string): ElementSpec | undefined {
  if (!card) return undefined
  const visited = new Set<ElementSpec>()
  const search = (specs: ElementSpec[]): ElementSpec | undefined => {
    for (const spec of specs) {
      if (visited.has(spec)) continue
      visited.add(spec)
      if (spec.keyword === keyword || spec.aliases?.includes(keyword)) return spec
      if (spec.child) {
        const found = search([spec.child])
        if (found) return found
      }
    }
    return undefined
  }
  return search(card.elements)
}

function findNode(nodes: DslNode[], line: number): DslNode | undefined {
  for (const node of nodes) {
    if (node.line === line) return node
    const found = findNode(node.children, line)
    if (found) return found
  }
  return undefined
}

export function readElementFields(source: string, line: number, card: IdentityCard | undefined): ElementFields {
  const node = findNode(parseDsl(source).document?.nodes ?? [], line)
  const spec = node ? findElementSpec(card, node.keyword) : undefined
  const positional = spec?.positional ?? ['title', 'subtitle']
  const flags = spec?.flags ?? []
  const values = (node?.values ?? []).filter(value => value.quoted || !flags.includes(value.text.toLowerCase())).map(value => value.text)
  const at = (field: ItemField) => {
    const index = positional.indexOf(field)
    return index >= 0 ? values[index] ?? '' : ''
  }
  const editable: EditableField[] = ['title']
  if (positional.includes('subtitle') || node?.attributes.sub !== undefined) editable.push('subtitle')
  editable.push('value')
  if (positional.includes('delta') || node?.attributes.delta !== undefined) editable.push('delta')
  if (positional.includes('date') || node?.attributes.date !== undefined || spec?.keyword === 'milestone') editable.push('date')
  if (node?.attributes.pct !== undefined || node?.attributes.percent !== undefined || card?.family === 'kpi' || card?.id === 'timeline:gantt' || card?.id === 'funnel:bars') editable.push('percent')
  if (spec?.attributes?.includes('from') || node?.attributes.from !== undefined || node?.attributes.to !== undefined) editable.push('from', 'to')
  if (positional.includes('label') || node?.attributes.label !== undefined || card?.id === 'cards:grid') editable.push('label')
  const fields: ElementFields = {
    title: at('title'),
    subtitle: node?.attributes.sub ?? at('subtitle'),
    value: node?.attributes.val ?? node?.attributes.value ?? at('value'),
    delta: node?.attributes.delta ?? at('delta'),
    date: node?.attributes.date ?? at('date'),
    percent: node?.attributes.pct ?? node?.attributes.percent ?? at('percent'),
    from: node?.attributes.from ?? '',
    to: node?.attributes.to ?? '',
    label: node?.attributes.label ?? at('label'),
    editable,
  }
  if (spec) fields.spec = spec
  return fields
}
