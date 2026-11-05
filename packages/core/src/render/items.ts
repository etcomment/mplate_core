import type { Diagnostic, DslNode } from '../dsl/types.js'
import { resolveIconName } from '../icons/index.js'
import type { ResolvedTheme } from '../theme/resolve.js'
import type { ElementSpec, IdentityCard, Item, ItemField, SettingSpec, TemplateInput } from '../templates/types.js'

export const RESERVED_KEYWORDS = ['theme', 'subtitle']

const COMMON_ATTRIBUTES = ['val', 'value', 'pct', 'percent', 'icon', 'date', 'delta', 'color', 'label', 'sub']

const ATTRIBUTE_FIELDS: Record<string, ItemField> = {
  val: 'value',
  value: 'value',
  pct: 'percent',
  percent: 'percent',
  date: 'date',
  delta: 'delta',
  label: 'label',
  sub: 'subtitle',
}

export function parsePercent(raw: string): number | undefined {
  const match = /-?\d+(?:[.,]\d+)?/.exec(raw)
  if (!match) return undefined
  const value = Number(match[0].replace(',', '.'))
  if (!Number.isFinite(value)) return undefined
  const isRatio = !raw.includes('%') && value > 0 && value < 1 && match[0].includes('.')
  return isRatio ? value * 100 : value
}

function findSpec(specs: ElementSpec[], keyword: string): ElementSpec | undefined {
  return specs.find((spec) => spec.keyword === keyword || spec.aliases?.includes(keyword))
}

function assignField(item: Item, field: ItemField, raw: string): void {
  if (field === 'title') item.title = raw
  else if (field === 'percent') {
    const percent = parsePercent(raw)
    if (percent !== undefined) {
      item.percent = percent
      item.percentLabel = raw.includes('%') ? raw : `${raw}%`
    }
  } else item[field] = raw
}

interface BuildContext {
  theme: ResolvedTheme
  diagnostics: Diagnostic[]
  counter: Map<string, number>
}

function buildItem(node: DslNode, spec: ElementSpec, context: BuildContext, index: number, parentId?: string): Item {
  const count = context.counter.get(spec.keyword) ?? 0
  context.counter.set(spec.keyword, count + 1)
  const id = parentId ? `${parentId}-${spec.keyword}-${index}` : `${spec.keyword}-${count}`
  const colorReference = node.color ?? node.attributes.color
  const item: Item = {
    id,
    keyword: spec.keyword,
    index,
    title: '',
    color: context.theme.color(colorReference ?? '', index),
    hasExplicitColor: colorReference !== undefined,
    flags: [],
    values: [],
    attributes: { ...node.attributes },
    children: [],
    line: node.line,
  }
  const flags = spec.flags ?? []
  const positionalValues = node.values.filter((value) => {
    if (!value.quoted && flags.includes(value.text.toLowerCase())) {
      item.flags.push(value.text.toLowerCase())
      return false
    }
    return true
  })
  positionalValues.forEach((value, position) => {
    const field = spec.positional[position]
    if (field) assignField(item, field, value.text)
    else if (spec.acceptsExtraValues) item.values.push(value.text)
    else context.diagnostics.push({ severity: 'warning', line: node.line, message: `Extra value "${value.text}" ignored for ${spec.keyword}`, hint: `${spec.keyword} accepts: ${spec.positional.join(', ')}` })
  })
  for (const [name, raw] of Object.entries(node.attributes)) {
    const field = ATTRIBUTE_FIELDS[name]
    if (field) assignField(item, field, raw)
    else if (name === 'icon') {
      if (resolveIconName(raw)) item.icon = raw
      else context.diagnostics.push({ severity: 'warning', line: node.line, message: `Unknown icon "${raw}"`, hint: 'Run `mplate icons` to list available icons' })
    } else if (name === 'status' && flags.includes(raw.toLowerCase())) item.flags.push(raw.toLowerCase())
    else if (!COMMON_ATTRIBUTES.includes(name) && !(spec.attributes ?? []).includes(name)) {
      context.diagnostics.push({ severity: 'warning', line: node.line, message: `Unknown attribute "${name}" on ${spec.keyword}` })
    }
  }
  if (!item.title) context.diagnostics.push({ severity: 'warning', line: node.line, message: `${spec.keyword} has no title`, hint: `Example: ${spec.keyword} "Title"` })
  node.children.forEach((childNode, childIndex) => {
    if (!spec.child || (childNode.keyword !== spec.child.keyword && !spec.child.aliases?.includes(childNode.keyword))) {
      context.diagnostics.push({ severity: 'warning', line: childNode.line, message: `"${childNode.keyword}" is not allowed under ${spec.keyword}`, hint: spec.child ? `Use ${spec.child.keyword}` : `${spec.keyword} has no children` })
      return
    }
    item.children.push(buildItem(childNode, spec.child, context, childIndex, id))
  })
  return item
}

function findSetting(settings: SettingSpec[], keyword: string): SettingSpec | undefined {
  return settings.find((setting) => setting.keyword === keyword)
}

export function buildTemplateInput(nodes: DslNode[], card: IdentityCard, theme: ResolvedTheme, diagnostics: Diagnostic[], title?: string): TemplateInput {
  const input: TemplateInput = { settings: {}, items: [] }
  if (title) input.title = title
  const context: BuildContext = { theme, diagnostics, counter: new Map() }
  let index = 0
  for (const node of nodes) {
    if (node.keyword === 'theme') continue
    if (node.keyword === 'subtitle') {
      input.subtitle = node.values.map((value) => value.text).join(' ')
      continue
    }
    const setting = findSetting(card.settings, node.keyword)
    if (setting) {
      input.settings[setting.keyword] = node.values.map((value) => value.text)
      continue
    }
    const spec = findSpec(card.elements, node.keyword)
    if (!spec) {
      const allowed = [...card.elements.map((element) => element.keyword), ...card.settings.map((entry) => entry.keyword)]
      diagnostics.push({ severity: 'error', line: node.line, message: `Unknown keyword "${node.keyword}" for ${card.id}`, hint: `Allowed: ${allowed.join(', ')}` })
      continue
    }
    input.items.push(buildItem(node, spec, context, index))
    index++
  }
  return input
}
