export type EditableField = 'title' | 'subtitle' | 'value'

interface LineToken {
  start: number
  end: number
  text: string
  isQuoted: boolean
}

function tokenize(line: string): LineToken[] {
  const tokens: LineToken[] = []
  let index = 0
  while (index < line.length) {
    const character = line[index]
    if (character === ' ' || character === '\t') {
      index++
      continue
    }
    const start = index
    if (character === '"' || character === "'") {
      index++
      while (index < line.length && line[index] !== character) index += line[index] === '\\' ? 2 : 1
      index = Math.min(line.length, index + 1)
      tokens.push({ start, end: index, text: line.slice(start + 1, index - 1), isQuoted: true })
      continue
    }
    while (index < line.length && line[index] !== ' ' && line[index] !== '\t') {
      const current = line[index]
      if ((current === '"' || current === "'") && line[index - 1] === ':') {
        index++
        while (index < line.length && line[index] !== current) index += line[index] === '\\' ? 2 : 1
      }
      index++
    }
    tokens.push({ start, end: Math.min(index, line.length), text: line.slice(start, index), isQuoted: false })
  }
  return tokens
}

function isPositional(token: LineToken, flags: readonly string[]): boolean {
  if (token.isQuoted) return true
  if (token.text.startsWith('#')) return false
  if (/^[A-Za-z][\w-]*:/.test(token.text)) return false
  return !flags.includes(token.text.toLowerCase())
}

export function quoteDslText(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
}

function replaceRange(line: string, start: number, end: number, replacement: string): string {
  return `${line.slice(0, start)}${replacement}${line.slice(end)}`
}

function rewritePositional(line: string, tokens: LineToken[], position: number, value: string, flags: readonly string[]): string {
  const positional = tokens.slice(1).filter((token) => isPositional(token, flags))
  const existing = positional[position]
  if (existing) return replaceRange(line, existing.start, existing.end, quoteDslText(value))
  if (value === '') return line
  const missing = position - positional.length
  const filler = Array.from({ length: missing }, () => '""').join(' ')
  const anchor = positional[positional.length - 1] ?? tokens[0]!
  const insertion = ` ${filler ? `${filler} ` : ''}${quoteDslText(value)}`
  return replaceRange(line, anchor.end, anchor.end, insertion)
}

function rewriteAttribute(line: string, tokens: LineToken[], name: string, value: string): string {
  const existing = tokens.find((token) => !token.isQuoted && token.text.startsWith(`${name}:`))
  if (existing) {
    if (value === '') {
      const start = line.slice(0, existing.start).replace(/[ \t]+$/, '').length
      return replaceRange(line, start, existing.end, '')
    }
    return replaceRange(line, existing.start, existing.end, `${name}:${quoteDslText(value)}`)
  }
  if (value === '') return line
  return `${line.replace(/[ \t]+$/, '')} ${name}:${quoteDslText(value)}`
}

export interface FieldEdit {
  line: number
  field: EditableField
  value: string
  positional: readonly string[]
  flags?: readonly string[]
}

export function rewriteElementLine(source: string, edit: FieldEdit): string {
  const lines = source.split('\n')
  const index = edit.line - 1
  const line = lines[index]
  if (line === undefined) return source
  const tokens = tokenize(line)
  if (tokens.length === 0) return source
  const flags = edit.flags ?? []
  const position = edit.positional.indexOf(edit.field)
  const hasValueAttribute = edit.field === 'value' && tokens.some((token) => !token.isQuoted && token.text.startsWith('val:'))
  lines[index] = position >= 0 && !hasValueAttribute
    ? rewritePositional(line, tokens, position, edit.value, flags)
    : edit.field === 'value'
      ? rewriteAttribute(line, tokens, 'val', edit.value)
      : line
  return lines.join('\n')
}

export function readHeaderTitle(source: string): { line: number; title: string } | undefined {
  const lines = source.split('\n')
  const index = lines.findIndex((line) => line.trim().startsWith('@'))
  if (index < 0) return undefined
  const quoted = tokenize(lines[index]!).find((token) => token.isQuoted)
  return { line: index + 1, title: quoted?.text ?? '' }
}

function insertAfterStyle(line: string, tokens: LineToken[], insertion: string): string {
  const anchor = tokens.filter((token, index) => index === 0 || token.text.startsWith('style:')).pop()!
  return replaceRange(line, anchor.end, anchor.end, insertion)
}

export function rewriteHeaderTitle(source: string, title: string): string {
  const header = readHeaderTitle(source)
  if (!header) return source
  const lines = source.split('\n')
  const line = lines[header.line - 1]!
  const tokens = tokenize(line)
  const quoted = tokens.find((token) => token.isQuoted)
  lines[header.line - 1] = quoted
    ? replaceRange(line, quoted.start, quoted.end, quoteDslText(title))
    : insertAfterStyle(line, tokens, ` ${quoteDslText(title)}`)
  return lines.join('\n')
}
