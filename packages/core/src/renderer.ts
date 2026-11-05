import { parseBrandKit, type BrandKitResult } from './brand/parse.js'
import { describeTemplate, listTemplates, syntaxGuide } from './describe.js'
import type { Engine } from './render/engine.js'
import { renderWith, type RenderOptions, type RenderResult } from './render/render.js'
import { TemplateRegistry } from './templates/lookup.js'
import { BUILT_IN_TEMPLATES } from './templates/registry.js'
import type { IdentityCard, TemplateDefinition } from './templates/types.js'
import type { ThemeCatalog } from './theme/resolve.js'
import { BUILT_IN_THEMES } from './theme/themes.js'
import type { Theme } from './theme/types.js'
import { validate, type ValidationResult } from './validate.js'

export interface RendererConfig {
  templates?: TemplateDefinition[]
  themes?: Theme[]
  includeBuiltInTemplates?: boolean
  includeBuiltInThemes?: boolean
}

export interface Renderer {
  readonly engine: Engine
  render(source: string, options?: RenderOptions): RenderResult
  validate(source: string, options?: RenderOptions): ValidationResult
  listTemplates(): IdentityCard[]
  describeTemplate(id: string): IdentityCard | undefined
  listThemes(): Theme[]
  syntaxGuide(): string
  parseBrandKit(value: unknown): BrandKitResult
}

function templateNames(template: TemplateDefinition): string[] {
  return [template.card.id, ...template.card.aliases].map((name) => name.toLowerCase())
}

export function checkTemplates(templates: TemplateDefinition[]): void {
  const seen = new Map<string, string>()
  const defaults = new Map<string, string>()
  for (const template of templates) {
    if (!/^[a-z][a-zA-Z]*:[a-z][a-zA-Z0-9-]*$/.test(template.card.id) || template.card.id !== `${template.card.family}:${template.card.style}`) {
      throw new Error(`Template id "${template.card.id}" must be "family:style" and match its family and style`)
    }
    for (const name of templateNames(template)) {
      const owner = seen.get(name)
      if (owner) throw new Error(`Template name "${name}" is used by both ${owner} and ${template.card.id}`)
      seen.set(name, template.card.id)
    }
    if (template.card.isDefaultStyle) {
      const existing = defaults.get(template.card.family)
      if (existing) throw new Error(`Family "${template.card.family}" has two default styles: ${existing} and ${template.card.id}`)
      defaults.set(template.card.family, template.card.id)
    }
  }
}

function buildCatalog(config: RendererConfig): ThemeCatalog {
  const catalog: ThemeCatalog = config.includeBuiltInThemes === false ? {} : { ...BUILT_IN_THEMES }
  for (const theme of config.themes ?? []) catalog[theme.name.toLowerCase()] = theme
  return catalog
}

export function createRenderer(config: RendererConfig = {}): Renderer {
  const custom = config.templates ?? []
  const customIds = new Set(custom.map((template) => template.card.id))
  const builtIns = config.includeBuiltInTemplates === false ? [] : BUILT_IN_TEMPLATES.filter((template) => !customIds.has(template.card.id))
  const customFamilies = new Set(custom.filter((template) => template.card.isDefaultStyle).map((template) => template.card.family))
  const inherited = builtIns.map((template) =>
    customFamilies.has(template.card.family) && template.card.isDefaultStyle ? { ...template, card: { ...template.card, isDefaultStyle: false } } : template,
  )
  const templates = [...inherited, ...custom]
  checkTemplates(templates)
  const engine: Engine = { registry: new TemplateRegistry(templates), themes: buildCatalog(config) }
  return {
    engine,
    render: (source, options = {}) => renderWith(engine, source, options),
    validate: (source, options = {}) => validate(source, options, engine),
    listTemplates: () => listTemplates(engine.registry),
    describeTemplate: (id) => describeTemplate(id, engine.registry),
    listThemes: () => Object.values(engine.themes),
    syntaxGuide: () => syntaxGuide(engine.registry, engine.themes),
    parseBrandKit: (value) => parseBrandKit(value, engine.themes),
  }
}

export function defineTemplate(template: TemplateDefinition): TemplateDefinition {
  return template
}
