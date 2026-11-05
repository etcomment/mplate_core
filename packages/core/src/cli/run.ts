import { describeTemplate, formatCard, listTemplates, syntaxGuide } from '../describe.js'
import { svgToPng } from '../export/png.js'
import { listIcons } from '../icons/index.js'
import { render } from '../render/render.js'
import type { ThemeInput } from '../theme/resolve.js'
import { BUILT_IN_THEMES } from '../theme/themes.js'
import type { ThemeOverride } from '../theme/types.js'
import { formatDiagnostic, validate } from '../validate.js'
import { VERSION } from '../version.js'
import { parseArguments } from './args.js'

export interface CliIo {
  stdout(text: string): void
  stderr(text: string): void
  readText(path: string): Promise<string>
  readStdin(): Promise<string>
  writeFile(path: string, content: string | Uint8Array): Promise<void>
}

const USAGE = `mplate ${VERSION} — parametric infographics from text

Usage:
  mplate render <file|-> [-o out.svg|out.png] [--theme name|theme.json] [--width 1200] [--scale 2] [--no-background]
  mplate validate <file|-> [--json]
  mplate list [--json]              List templates
  mplate describe <family[:style]>  Show a template identity card [--json]
  mplate guide                      Print the full DSL guide (for humans and LLMs)
  mplate themes | icons             List built-in themes or icon names

Examples:
  echo '@process\\n  step "Plan"\\n  step "Do"' | mplate render - -o process.svg
  mplate render roadmap.mplate --theme dark -o roadmap.png`

async function readSource(io: CliIo, path: string | undefined): Promise<string> {
  if (!path || path === '-') return io.readStdin()
  return io.readText(path)
}

async function loadTheme(io: CliIo, value: string | boolean | undefined): Promise<ThemeInput | undefined> {
  if (typeof value !== 'string' || value === '') return undefined
  if (!value.endsWith('.json')) return value
  const parsed: unknown = JSON.parse(await io.readText(value))
  if (typeof parsed !== 'object' || parsed === null) throw new Error(`${value} must contain a JSON object`)
  return parsed as ThemeOverride
}

async function runRender(io: CliIo, positionals: string[], options: Record<string, string | boolean>): Promise<number> {
  const source = await readSource(io, positionals[0])
  const output = typeof options.output === 'string' ? options.output : undefined
  const format = typeof options.format === 'string' ? options.format : output?.toLowerCase().endsWith('.png') ? 'png' : 'svg'
  const width = typeof options.width === 'string' ? Number(options.width) : undefined
  const theme = await loadTheme(io, options.theme)
  const result = render(source, { ...(theme ? { theme } : {}), ...(width ? { width } : {}), ...(options.background === false ? { background: false } : {}) })
  for (const diagnostic of result.diagnostics) io.stderr(formatDiagnostic(diagnostic) + '\n')
  if (!result.ok) return 1
  if (options.strict && result.diagnostics.length > 0) return 1
  if (format === 'png') {
    const png = await svgToPng(result.svg, { scale: typeof options.scale === 'string' ? Number(options.scale) : 2 })
    if (!output) {
      io.stderr('PNG output needs -o <file.png>\n')
      return 2
    }
    await io.writeFile(output, png)
  } else if (output) await io.writeFile(output, result.svg)
  else io.stdout(result.svg)
  if (output) io.stderr(`Wrote ${output} (${result.template?.id}, ${result.width}×${result.height})\n`)
  return 0
}

async function runValidate(io: CliIo, positionals: string[], options: Record<string, string | boolean>): Promise<number> {
  const result = validate(await readSource(io, positionals[0]))
  if (options.json) io.stdout(JSON.stringify(result, null, 2) + '\n')
  else {
    for (const diagnostic of result.diagnostics) io.stdout(formatDiagnostic(diagnostic) + '\n')
    io.stdout(result.isValid ? `OK: ${result.template} with ${result.elementCount} element(s)\n` : 'Invalid document\n')
  }
  return result.isValid ? 0 : 1
}

function runList(io: CliIo, options: Record<string, string | boolean>): number {
  const cards = listTemplates()
  if (options.json) {
    io.stdout(JSON.stringify(cards, null, 2) + '\n')
    return 0
  }
  for (const card of cards) {
    const header = `${card.id}${card.isDefaultStyle ? ' (default)' : ''}`
    io.stdout(`${header.padEnd(30)} ${card.items.min}-${String(card.items.max).padEnd(4)} ${card.name}\n`)
  }
  return 0
}

function runDescribe(io: CliIo, positionals: string[], options: Record<string, string | boolean>): number {
  const id = positionals[0]
  const card = id ? describeTemplate(id) : undefined
  if (!card) {
    io.stderr(`Unknown template "${id ?? ''}". Run \`mplate list\`.\n`)
    return 1
  }
  io.stdout((options.json ? JSON.stringify(card, null, 2) : formatCard(card)) + '\n')
  return 0
}

export async function runCli(argv: string[], io: CliIo): Promise<number> {
  const { command, positionals, options } = parseArguments(argv)
  if (options.version) {
    io.stdout(VERSION + '\n')
    return 0
  }
  try {
    switch (command) {
      case 'render':
        return await runRender(io, positionals, options)
      case 'validate':
        return await runValidate(io, positionals, options)
      case 'list':
        return runList(io, options)
      case 'describe':
        return runDescribe(io, positionals, options)
      case 'guide':
        io.stdout(syntaxGuide() + '\n')
        return 0
      case 'themes':
        for (const theme of Object.values(BUILT_IN_THEMES)) io.stdout(`${theme.name.padEnd(10)} ${theme.description}\n`)
        return 0
      case 'icons':
        io.stdout(listIcons().join('\n') + '\n')
        return 0
      case undefined:
      case 'help':
        io.stdout(USAGE + '\n')
        return 0
      default:
        io.stderr(`Unknown command "${command}"\n\n${USAGE}\n`)
        return 2
    }
  } catch (error) {
    io.stderr(`${error instanceof Error ? error.message : String(error)}\n`)
    return 1
  }
}
