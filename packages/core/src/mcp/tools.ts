import { describeTemplate, formatCard, listTemplates, syntaxGuide } from '../describe.js'
import { svgToPng } from '../export/png.js'
import { render } from '../render/render.js'
import type { ElementOverride, Overrides } from '../render/overrides.js'
import { parseBrandKit } from '../brand/parse.js'
import { BUILT_IN_THEMES } from '../theme/themes.js'
import { formatDiagnostic, validate } from '../validate.js'

export type ToolContent = { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }

export interface ToolResult {
  content: ToolContent[]
  isError?: boolean
}

export interface JsonSchema {
  type: 'object'
  properties: Record<string, Record<string, unknown>>
  required?: string[]
  additionalProperties?: boolean
}

export interface ToolDefinition {
  name: string
  title: string
  description: string
  inputSchema: JsonSchema
  run(argumentsObject: Record<string, unknown>, environment: ToolEnvironment): Promise<ToolResult>
}

export interface ToolEnvironment {
  writeFile(path: string, content: string | Uint8Array): Promise<void>
}

function text(value: string): ToolContent {
  return { type: 'text', text: value }
}

function stringArgument(argumentsObject: Record<string, unknown>, name: string): string | undefined {
  const value = argumentsObject[name]
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

const DSL_PROPERTY = { type: 'string', description: 'mplate DSL source, starting with a header line such as @process' }

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sanitizeOverridesArgument(value: unknown): Overrides | undefined {
  if (!isPlainRecord(value)) return undefined
  const clean: Overrides = {}
  for (const [id, entry] of Object.entries(value)) {
    if (DANGEROUS_KEYS.has(id) || !isPlainRecord(entry)) continue
    clean[id] = entry as ElementOverride
  }
  return Object.keys(clean).length > 0 ? clean : undefined
}

function normalizePathSegments(input: string): { root: string; segments: string[] } {
  const unified = input.replace(/\\/g, '/')
  const driveMatch = /^([a-zA-Z]:)\//.exec(unified)
  const root = driveMatch ? driveMatch[1]! + '/' : unified.startsWith('/') ? '/' : ''
  const body = root ? unified.slice(root.length) : unified
  const segments: string[] = []
  for (const part of body.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (segments.length > 0 && segments[segments.length - 1] !== '..') segments.pop()
      else if (!root) segments.push('..')
    } else {
      segments.push(part)
    }
  }
  return { root, segments }
}

function isInsideBaseDirectory(baseDirectory: string, outputPath: string): boolean {
  const parsedBase = normalizePathSegments(baseDirectory)
  const workingDirectory = typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '/'
  const base = parsedBase.root ? parsedBase : normalizePathSegments(`${workingDirectory}/${baseDirectory}`)
  if (!base.root) return false
  const parsedTarget = normalizePathSegments(outputPath)
  const resolved = parsedTarget.root
    ? parsedTarget
    : normalizePathSegments(`${base.root}${base.segments.join('/')}/${outputPath}`)
  if (resolved.root.toLowerCase() !== base.root.toLowerCase()) return false
  if (resolved.segments.length <= base.segments.length) return false
  return base.segments.every((segment, index) => resolved.segments[index] === segment)
}

function validateOutputPath(outputPath: string, format: 'svg' | 'png'): string | undefined {
  if (outputPath.includes('\0')) return 'Invalid output_path: null bytes are not allowed.'
  const expectedExtension = format === 'png' ? '.png' : '.svg'
  if (!outputPath.toLowerCase().endsWith(expectedExtension)) {
    return `Invalid output_path "${outputPath}": expected a ${expectedExtension} file for format "${format}".`
  }
  const baseDirectory = typeof process !== 'undefined' ? process.env?.MPLATE_MCP_OUT_DIR?.trim() : undefined
  if (baseDirectory && !isInsideBaseDirectory(baseDirectory, outputPath)) {
    return `Invalid output_path "${outputPath}": must stay inside MPLATE_MCP_OUT_DIR.`
  }
  return undefined
}

export const TOOLS: ToolDefinition[] = [
  {
    name: 'mplate_guide',
    title: 'mplate DSL guide',
    description: 'Returns the complete mplate DSL reference: grammar, themes, icons and every template identity card with an example. Read it once before writing mplate DSL.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: async () => ({ content: [text(syntaxGuide())] }),
  },
  {
    name: 'mplate_list_templates',
    title: 'List mplate templates',
    description: 'Lists available infographic templates (family:style) with what each is good for and how many elements it accepts.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: async () => {
      const lines = listTemplates().map((card) => `- ${card.id}${card.isDefaultStyle ? ' (default for @' + card.family + ')' : ''}: ${card.name}. ${card.description} Elements: ${card.items.min}-${card.items.max}. Good for: ${card.useCases.join(', ')}.`)
      return { content: [text(lines.join('\n'))] }
    },
  },
  {
    name: 'mplate_describe_template',
    title: 'Describe an mplate template',
    description: 'Returns the identity card of one template: header syntax, element keywords, settings, limits and a working example.',
    inputSchema: { type: 'object', properties: { template: { type: 'string', description: 'Template id such as "process:chevrons" or a family such as "funnel"' } }, required: ['template'], additionalProperties: false },
    run: async (argumentsObject) => {
      const id = stringArgument(argumentsObject, 'template') ?? ''
      const card = describeTemplate(id)
      if (!card) return { content: [text(`Unknown template "${id}". Call mplate_list_templates.`)], isError: true }
      return { content: [text(formatCard(card))] }
    },
  },
  {
    name: 'mplate_validate',
    title: 'Validate mplate DSL',
    description: 'Checks mplate DSL without rendering it and returns errors and warnings with line numbers and hints.',
    inputSchema: { type: 'object', properties: { dsl: DSL_PROPERTY }, required: ['dsl'], additionalProperties: false },
    run: async (argumentsObject) => {
      const result = validate(stringArgument(argumentsObject, 'dsl') ?? '')
      const summary = result.isValid ? `Valid: ${result.template} with ${result.elementCount} element(s).` : 'Invalid document.'
      return { content: [text([summary, ...result.diagnostics.map(formatDiagnostic)].join('\n'))], isError: !result.isValid }
    },
  },
  {
    name: 'mplate_render',
    title: 'Render mplate DSL',
    description: 'Renders mplate DSL to a standalone SVG (or PNG). Returns the SVG markup, or writes it to output_path when given. Fix reported warnings, such as truncated text, by shortening the text or choosing another style.',
    inputSchema: {
      type: 'object',
      properties: {
        dsl: DSL_PROPERTY,
        theme: { type: 'string', enum: Object.keys(BUILT_IN_THEMES), description: 'Built-in theme (overrides the theme in the DSL header)' },
        width: { type: 'number', minimum: 480, maximum: 3000, description: 'Canvas width in pixels; the height adapts to the content. Default 1200.' },
        format: { type: 'string', enum: ['svg', 'png'], description: 'Output format. PNG needs the optional @resvg/resvg-js package.' },
        output_path: { type: 'string', description: 'Absolute file path to write the result to instead of returning it inline' },
        preview: { type: 'boolean', description: 'Also return a PNG preview image (needs @resvg/resvg-js)' },
        brand_kit: { type: 'object', description: 'Brand kit JSON (kind "mplate-brand-kit", version 1): palette, colors, fonts, shape, logo, default styles. See docs/brand-kits.md.' },
        overrides: { type: 'object', description: 'Manual adjustments keyed by element id (e.g. "step-1"): { title?, subtitle?, value?, label?, icon?, color?, dx?, dy? }', additionalProperties: { type: 'object' } },
      },
      required: ['dsl'],
      additionalProperties: false,
    },
    run: async (argumentsObject, environment) => {
      const rawFormat = stringArgument(argumentsObject, 'format')
      if (rawFormat !== undefined && rawFormat !== 'svg' && rawFormat !== 'png') {
        return { content: [text(`Invalid format "${rawFormat}": expected "svg" or "png".`)], isError: true }
      }
      const format: 'svg' | 'png' = rawFormat ?? 'svg'
      const outputPath = stringArgument(argumentsObject, 'output_path')
      if (outputPath !== undefined) {
        const pathError = validateOutputPath(outputPath, format)
        if (pathError) return { content: [text(pathError)], isError: true }
      }
      const theme = stringArgument(argumentsObject, 'theme')
      const width = typeof argumentsObject.width === 'number' && Number.isFinite(argumentsObject.width) ? argumentsObject.width : undefined
      const overrides = sanitizeOverridesArgument(argumentsObject.overrides)
      const kitResult = argumentsObject.brand_kit === undefined ? undefined : parseBrandKit(argumentsObject.brand_kit)
      if (kitResult && !kitResult.kit) return { content: [text(['Invalid brand kit.', ...kitResult.diagnostics.map(formatDiagnostic)].join('\n'))], isError: true }
      const brandKit = kitResult?.kit
      const result = render(stringArgument(argumentsObject, 'dsl') ?? '', { ...(theme ? { theme } : {}), ...(width !== undefined ? { width } : {}), ...(overrides ? { overrides } : {}), ...(brandKit ? { brandKit } : {}) })
      const diagnostics = [...(kitResult?.diagnostics ?? []), ...result.diagnostics].map(formatDiagnostic)
      if (!result.ok) return { content: [text(['Render failed.', ...diagnostics].join('\n'))], isError: true }
      const summary = `Rendered ${result.template?.id} at ${result.width}×${result.height}px.`
      const content: ToolContent[] = []
      const needsPng = format === 'png' || argumentsObject.preview === true
      let png: Uint8Array | undefined
      if (needsPng) {
        try {
          png = await svgToPng(result.svg, { scale: format === 'png' ? 2 : 1 })
        } catch (error) {
          if (format === 'png') throw error
          diagnostics.push(`preview unavailable: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
      if (outputPath) {
        await environment.writeFile(outputPath, format === 'png' && png ? png : result.svg)
        content.push(text([`${summary} Written to ${outputPath}.`, ...diagnostics].join('\n')))
      } else {
        content.push(text([summary, ...diagnostics].join('\n')))
        if (format === 'svg') content.push(text(result.svg))
      }
      if (png && (format === 'png' ? !outputPath : true)) content.push({ type: 'image', data: Buffer.from(png).toString('base64'), mimeType: 'image/png' })
      return { content }
    },
  },
]
