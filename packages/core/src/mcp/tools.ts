import { describeTemplate, formatCard, listTemplates, syntaxGuide } from '../describe.js'
import { svgToPng } from '../export/png.js'
import { render } from '../render/render.js'
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
      },
      required: ['dsl'],
      additionalProperties: false,
    },
    run: async (argumentsObject, environment) => {
      const theme = stringArgument(argumentsObject, 'theme')
      const width = typeof argumentsObject.width === 'number' ? argumentsObject.width : undefined
      const result = render(stringArgument(argumentsObject, 'dsl') ?? '', { ...(theme ? { theme } : {}), ...(width ? { width } : {}) })
      const diagnostics = result.diagnostics.map(formatDiagnostic)
      if (!result.ok) return { content: [text(['Render failed.', ...diagnostics].join('\n'))], isError: true }
      const format = stringArgument(argumentsObject, 'format') ?? 'svg'
      const outputPath = stringArgument(argumentsObject, 'output_path')
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
