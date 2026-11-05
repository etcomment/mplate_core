export type AttributeValue = string | number | undefined

export type Attributes = Record<string, AttributeValue>

export interface SvgElement {
  tag: string
  attributes: Attributes
  children: SvgChild[]
}

export type SvgChild = SvgElement | string

export function element(tag: string, attributes: Attributes = {}, children: SvgChild[] = []): SvgElement {
  return { tag, attributes, children }
}

export function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) throw new Error(`Non-finite number in SVG output: ${value}`)
  const rounded = Math.round(value * 100) / 100
  return Object.is(rounded, -0) ? '0' : String(rounded)
}

function formatAttribute(value: AttributeValue): string | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'number') return formatNumber(value)
  return escapeXml(value)
}

function serializeAttributes(attributes: Attributes): string {
  return Object.entries(attributes)
    .map(([name, value]) => {
      const formatted = formatAttribute(value)
      return formatted === undefined ? '' : ` ${name}="${formatted}"`
    })
    .join('')
}

export function serialize(node: SvgChild, depth: number = 0): string {
  if (typeof node === 'string') return escapeXml(node)
  const indent = '  '.repeat(depth)
  const attributes = serializeAttributes(node.attributes)
  if (node.children.length === 0) return `${indent}<${node.tag}${attributes}/>`
  const hasOnlyText = node.children.every((child) => typeof child === 'string')
  if (hasOnlyText) return `${indent}<${node.tag}${attributes}>${node.children.map((child) => serialize(child)).join('')}</${node.tag}>`
  const inner = node.children.map((child) => serialize(child, depth + 1)).join('\n')
  return `${indent}<${node.tag}${attributes}>\n${inner}\n${indent}</${node.tag}>`
}
