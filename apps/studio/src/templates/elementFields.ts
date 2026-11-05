import { parseDsl, type DslNode, type ElementSpec, type IdentityCard } from '@mplate/core'
import type { EditableField } from './dslLines'

export interface ElementFields {
  title: string
  subtitle: string
  value: string
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
  const at = (field: EditableField) => {
    const index = positional.indexOf(field)
    return index >= 0 ? values[index] ?? '' : ''
  }
  const editable: EditableField[] = ['title']
  if (positional.includes('subtitle')) editable.push('subtitle')
  editable.push('value')
  const fields: ElementFields = {
    title: at('title'),
    subtitle: at('subtitle'),
    value: node?.attributes.val ?? node?.attributes.value ?? at('value'),
    editable,
  }
  if (spec) fields.spec = spec
  return fields
}
