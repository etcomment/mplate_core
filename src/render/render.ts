import { parseDsl } from '../dsl/parse.js'
import type { Diagnostic, DslDocument, DslNode } from '../dsl/types.js'
import { element, serialize } from '../svg/node.js'
import { isHexColor } from '../theme/color.js'
import { findTheme, resolveTheme, type ResolvedTheme, type ThemeInput } from '../theme/resolve.js'
import type { ThemeOverride } from '../theme/types.js'
import { registry } from '../templates/registry.js'
import type { IdentityCard, TemplateDefinition } from '../templates/types.js'
import { Canvas, type TextBox } from './canvas.js'
import { buildTemplateInput } from './items.js'

export interface RenderOptions {
  theme?: ThemeInput
  width?: number
  background?: boolean
}

export interface RenderResult {
  ok: boolean
  svg: string
  width: number
  height: number
  template?: IdentityCard
  diagnostics: Diagnostic[]
  layout: { textBoxes: TextBox[]; elementIds: string[] }
}

const DEFAULT_WIDTH = 1200

function themeOverrideFrom(nodes: DslNode[], diagnostics: Diagnostic[]): ThemeOverride[] {
  return nodes
    .filter((node) => node.keyword === 'theme')
    .map((node) => {
      const name = node.attributes.name ?? node.values[0]?.text
      const named = name ? findTheme(name) : undefined
      const override: ThemeOverride = named ? { ...named, colors: { ...named.colors }, fonts: { ...named.fonts }, shape: { ...named.shape } } : {}
      if (name) {
        if (!named) diagnostics.push({ severity: 'warning', line: node.line, message: `Unknown theme "${name}"`, hint: 'Built-in themes: default, ocean, mono, dark' })
      }
      const palette = node.attributes.palette?.split(/[\s,]+/).filter((color) => color.length > 0)
      if (palette) {
        const invalid = palette.filter((color) => !isHexColor(color))
        if (invalid.length > 0) diagnostics.push({ severity: 'warning', line: node.line, message: `Invalid palette colors: ${invalid.join(', ')}` })
        override.palette = palette.filter((color) => isHexColor(color))
      }
      const fonts: ThemeOverride['fonts'] = {}
      if (node.attributes.font) {
        fonts.heading = node.attributes.font
        fonts.body = node.attributes.font
      }
      if (node.attributes.heading) fonts.heading = node.attributes.heading
      if (node.attributes.body) fonts.body = node.attributes.body
      if (Object.keys(fonts).length > 0) override.fonts = fonts
      const colors: Record<string, string> = {}
      for (const key of ['background', 'surface', 'text', 'muted', 'line']) {
        const value = node.attributes[key]
        if (value && isHexColor(value)) colors[key === 'muted' ? 'textMuted' : key] = value
      }
      if (Object.keys(colors).length > 0) override.colors = colors
      return override
    })
}

function failure(diagnostics: Diagnostic[], template?: TemplateDefinition): RenderResult {
  const result: RenderResult = { ok: false, svg: '', width: 0, height: 0, diagnostics, layout: { textBoxes: [], elementIds: [] } }
  if (template) result.template = template.card
  return result
}

function drawHeading(canvas: Canvas, title: string | undefined, subtitle: string | undefined): void {
  if (!title && !subtitle) return
  let bottom = canvas.top
  if (title) {
    const box = canvas.text({ text: title, x: canvas.left, y: bottom, width: canvas.contentWidth, size: 30, minSize: 22, maxLines: 2, weight: 700, font: 'heading', owner: 'heading' })
    bottom = box.y + box.height + 6
  }
  if (subtitle) {
    const box = canvas.text({ text: subtitle, x: canvas.left, y: bottom, width: canvas.contentWidth, size: 17, maxLines: 2, color: canvas.theme.colors.textMuted, owner: 'heading' })
    bottom = box.y + box.height
  }
  canvas.top = bottom + 32
}

function resolveDocumentTheme(document: DslDocument, options: RenderOptions, diagnostics: Diagnostic[]): ResolvedTheme {
  const headerTheme = document.header.attributes.theme
  const base = options.theme ?? (headerTheme && findTheme(headerTheme) ? headerTheme : undefined)
  return resolveTheme(base, ...themeOverrideFrom(document.nodes, diagnostics))
}

export function renderDocument(document: DslDocument, options: RenderOptions = {}, initialDiagnostics: Diagnostic[] = []): RenderResult {
  const diagnostics = [...initialDiagnostics]
  const { header } = document
  const lookup = registry.find(header.family, header.variant, header.style)
  if (!lookup.template) {
    diagnostics.push({ severity: 'error', line: header.line, message: lookup.message ?? 'Unknown template', ...(lookup.hint ? { hint: lookup.hint } : {}) })
    return failure(diagnostics)
  }
  const template = lookup.template
  const theme = resolveDocumentTheme(document, options, diagnostics)
  const input = buildTemplateInput(document.nodes, template.card, theme, diagnostics, header.title)
  const { min, max } = template.card.items
  if (input.items.length < min) {
    diagnostics.push({ severity: 'error', line: header.line, message: `${template.card.id} needs at least ${min} element(s), got ${input.items.length}`, hint: `Example:\n${template.card.example}` })
    return failure(diagnostics, template)
  }
  if (input.items.length > max) {
    diagnostics.push({ severity: 'warning', line: input.items[max]!.line, message: `${template.card.id} supports up to ${max} elements; ${input.items.length - max} ignored`, hint: 'Split the content or pick another style' })
    input.items = input.items.slice(0, max)
  }
  if (diagnostics.some((diagnostic) => diagnostic.severity === 'error')) return failure(diagnostics, template)
  const requestedWidth = options.width ?? Number(header.attributes.width ?? DEFAULT_WIDTH)
  const width = Number.isFinite(requestedWidth) ? Math.min(3000, Math.max(480, requestedWidth)) : DEFAULT_WIDTH
  const canvas = new Canvas(theme, width, diagnostics)
  drawHeading(canvas, input.title, input.subtitle)
  template.render(canvas, input)
  const height = Math.ceil(canvas.height)
  const hasBackground = options.background ?? header.attributes.background !== 'none'
  const children = [
    element('title', {}, [input.title ?? template.card.name]),
    ...(hasBackground ? [element('rect', { width, height, fill: theme.colors.background })] : []),
    canvas.content,
  ]
  const root = element(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: `0 0 ${width} ${height}`,
      width,
      height,
      'font-family': theme.fonts.body,
      'data-mplate-template': template.card.id,
      'data-mplate-theme': theme.name,
    },
    children,
  )
  for (const box of canvas.textBoxes.filter((textBox) => textBox.isTruncated)) {
    diagnostics.push({ severity: 'warning', line: header.line, message: `Text truncated in ${box.owner}: "${box.text.slice(0, 40)}"`, hint: 'Shorten the text or reduce the number of elements' })
  }
  return {
    ok: true,
    svg: serialize(root) + '\n',
    width,
    height,
    template: template.card,
    diagnostics,
    layout: { textBoxes: canvas.textBoxes, elementIds: canvas.elementIds },
  }
}

export function render(source: string, options: RenderOptions = {}): RenderResult {
  const parsed = parseDsl(source)
  if (!parsed.document) return failure(parsed.diagnostics)
  return renderDocument(parsed.document, options, parsed.diagnostics)
}
