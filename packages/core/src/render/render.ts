import { brandKitTheme } from '../brand/parse.js'
import type { BrandKit } from '../brand/types.js'
import { parseDsl } from '../dsl/parse.js'
import type { Diagnostic, DslDocument } from '../dsl/types.js'
import { element, serialize } from '../svg/node.js'
import { registry as builtInRegistry } from '../templates/registry.js'
import type { IdentityCard, TemplateDefinition } from '../templates/types.js'
import { findTheme, resolveThemeIn, type ResolvedTheme, type ThemeInput } from '../theme/resolve.js'
import { BUILT_IN_THEMES } from '../theme/themes.js'
import { Canvas, type TextBox } from './canvas.js'
import type { Engine } from './engine.js'
import { drawHeading, drawLogo } from './frame.js'
import { buildTemplateInput } from './items.js'
import { applyContentOverrides, collectElements, offsetsFrom, reportUnusedOverrides, type ElementInfo, type Overrides } from './overrides.js'
import { themeDirectives } from './themeDirectives.js'

export interface RenderOptions {
  theme?: ThemeInput
  width?: number
  background?: boolean
  overrides?: Overrides
  brandKit?: BrandKit
}

export interface RenderResult {
  ok: boolean
  svg: string
  width: number
  height: number
  template?: IdentityCard
  diagnostics: Diagnostic[]
  layout: { textBoxes: TextBox[]; elementIds: string[]; elements: ElementInfo[] }
  unusedOverrides: string[]
}

const DEFAULT_WIDTH = 1200

export const DEFAULT_ENGINE: Engine = { registry: builtInRegistry, themes: BUILT_IN_THEMES }

function failure(diagnostics: Diagnostic[], template?: TemplateDefinition): RenderResult {
  const result: RenderResult = { ok: false, svg: '', width: 0, height: 0, diagnostics, layout: { textBoxes: [], elementIds: [], elements: [] }, unusedOverrides: [] }
  if (template) result.template = template.card
  return result
}

function resolveDocumentTheme(engine: Engine, document: DslDocument, options: RenderOptions, diagnostics: Diagnostic[]): ResolvedTheme {
  const headerTheme = document.header.attributes.theme
  const kit = options.brandKit
  const base = options.theme ?? (headerTheme && findTheme(headerTheme, engine.themes) ? headerTheme : kit?.extends)
  const layers = [...(kit ? [brandKitTheme(kit)] : []), ...themeDirectives(document.nodes, engine.themes, diagnostics)]
  return resolveThemeIn(engine.themes, base, layers)
}

function lookupTemplate(engine: Engine, document: DslDocument, options: RenderOptions, diagnostics: Diagnostic[]): TemplateDefinition | undefined {
  const { header } = document
  const kitStyle = !header.style && !header.variant ? options.brandKit?.styles?.[header.family] : undefined
  const lookup = engine.registry.find(header.family, header.variant, header.style ?? kitStyle)
  if (lookup.template) return lookup.template
  if (kitStyle) {
    diagnostics.push({ severity: 'warning', line: header.line, message: `Brand kit default style "${kitStyle}" does not exist for @${header.family}; using the family default` })
    return engine.registry.find(header.family).template
  }
  diagnostics.push({ severity: 'error', line: header.line, message: lookup.message ?? 'Unknown template', ...(lookup.hint ? { hint: lookup.hint } : {}) })
  return undefined
}

export function renderDocumentWith(engine: Engine, document: DslDocument, options: RenderOptions = {}, initialDiagnostics: Diagnostic[] = []): RenderResult {
  const diagnostics = [...initialDiagnostics]
  const { header } = document
  const template = lookupTemplate(engine, document, options, diagnostics)
  if (!template) return failure(diagnostics)
  const theme = resolveDocumentTheme(engine, document, options, diagnostics)
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
  const overrides = options.overrides ?? {}
  applyContentOverrides(input.items, overrides, theme, diagnostics)
  const canvas = new Canvas(theme, width, diagnostics, 48, offsetsFrom(overrides))
  const logo = options.brandKit?.logo
  drawHeading(canvas, input.title, input.subtitle, logo)
  template.render(canvas, input)
  if (logo) drawLogo(canvas, logo, canvas.height - canvas.padding)
  const elements = collectElements(input.items)
  const unusedOverrides = reportUnusedOverrides(overrides, new Set(elements.map((entry) => entry.id)), diagnostics)
  const height = Math.ceil(canvas.height)
  const hasBackground = options.background ?? header.attributes.background !== 'none'
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
    [
      element('title', {}, [input.title ?? template.card.name]),
      ...(hasBackground ? [element('rect', { width, height, fill: theme.colors.background })] : []),
      canvas.content,
    ],
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
    layout: { textBoxes: canvas.textBoxes, elementIds: canvas.elementIds, elements },
    unusedOverrides,
  }
}

export function renderWith(engine: Engine, source: string, options: RenderOptions = {}): RenderResult {
  const parsed = parseDsl(source)
  if (!parsed.document) return failure(parsed.diagnostics)
  return renderDocumentWith(engine, parsed.document, options, parsed.diagnostics)
}

export function renderDocument(document: DslDocument, options: RenderOptions = {}, initialDiagnostics: Diagnostic[] = []): RenderResult {
  return renderDocumentWith(DEFAULT_ENGINE, document, options, initialDiagnostics)
}

export function render(source: string, options: RenderOptions = {}): RenderResult {
  return renderWith(DEFAULT_ENGINE, source, options)
}
