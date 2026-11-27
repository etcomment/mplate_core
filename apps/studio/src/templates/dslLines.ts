export type EditableField = 'title' | 'subtitle' | 'value' | 'delta' | 'date' | 'percent' | 'from' | 'to' | 'label' | 'icon'

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

const BARE_ATTRIBUTE_NAMES = new Set(['pct', 'percent', 'from', 'to', 'date', 'icon'])

function formatAttributeValue(name: string, value: string): string {
  if (BARE_ATTRIBUTE_NAMES.has(name) && /^[A-Za-z0-9._%+-]+$/.test(value)) return `${name}:${value}`
  return `${name}:${quoteDslText(value)}`
}

function rewriteAttribute(line: string, tokens: LineToken[], name: string, value: string): string {
  const existing = tokens.find((token) => !token.isQuoted && token.text.startsWith(`${name}:`))
  if (existing) {
    if (value === '') {
      const start = line.slice(0, existing.start).replace(/[ \t]+$/, '').length
      return replaceRange(line, start, existing.end, '')
    }
    return replaceRange(line, existing.start, existing.end, formatAttributeValue(name, value))
  }
  if (value === '') return line
  return `${line.replace(/[ \t]+$/, '')} ${formatAttributeValue(name, value)}`
}

function findAttributeName(tokens: LineToken[], names: readonly string[]): string | undefined {
  for (const token of tokens) {
    if (token.isQuoted) continue
    const match = names.find((name) => token.text.startsWith(`${name}:`))
    if (match) return match
  }
  return undefined
}

const ATTRIBUTE_FIELD_NAMES: Partial<Record<EditableField, readonly string[]>> = {
  value: ['val', 'value'],
  delta: ['delta'],
  date: ['date'],
  percent: ['pct', 'percent'],
  from: ['from'],
  to: ['to'],
  label: ['label'],
  icon: ['icon'],
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
  const positionalCount = tokens.slice(1).filter((token) => isPositional(token, flags)).length

  if (edit.field === 'subtitle') {
    const existingSub = findAttributeName(tokens, ['sub'])
    if (existingSub) {
      lines[index] = rewriteAttribute(line, tokens, existingSub, edit.value)
    } else if (position >= 0 && position <= positionalCount) {
      lines[index] = rewritePositional(line, tokens, position, edit.value, flags)
    } else {
      lines[index] = rewriteAttribute(line, tokens, 'sub', edit.value)
    }
    return lines.join('\n')
  }

  const attrNames = ATTRIBUTE_FIELD_NAMES[edit.field]
  if (attrNames) {
    const existingAttr = findAttributeName(tokens, attrNames)
    if (existingAttr) {
      lines[index] = rewriteAttribute(line, tokens, existingAttr, edit.value)
    } else if (position >= 0 && position <= positionalCount) {
      lines[index] = rewritePositional(line, tokens, position, edit.value, flags)
    } else {
      lines[index] = rewriteAttribute(line, tokens, attrNames[0]!, edit.value)
    }
    return lines.join('\n')
  }

  lines[index] = position >= 0 ? rewritePositional(line, tokens, position, edit.value, flags) : line
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
  if (title === '') {
    if (!quoted) return source
    const start = line.slice(0, quoted.start).replace(/[ \t]+$/, '').length
    lines[header.line - 1] = replaceRange(line, start, quoted.end, '')
    return lines.join('\n')
  }
  lines[header.line - 1] = quoted
    ? replaceRange(line, quoted.start, quoted.end, quoteDslText(title))
    : insertAfterStyle(line, tokens, ` ${quoteDslText(title)}`)
  return lines.join('\n')
}

export function readDocumentSubtitle(source: string): { line: number; subtitle: string } | undefined {
  const lines = source.split('\n')
  const index = lines.findIndex((line) => /^\s*subtitle\b/.test(line))
  if (index < 0) return undefined
  const tokens = tokenize(lines[index]!).slice(1)
  return { line: index + 1, subtitle: tokens.map((token) => token.text).join(' ') }
}

export function rewriteDocumentSubtitle(source: string, subtitle: string): string {
  const existing = readDocumentSubtitle(source)
  const lines = source.split('\n')
  if (subtitle === '') {
    if (!existing) return source
    lines.splice(existing.line - 1, 1)
    return lines.join('\n')
  }
  if (existing) {
    const indent = /^\s*/.exec(lines[existing.line - 1]!)?.[0] ?? '  '
    lines[existing.line - 1] = `${indent}subtitle ${quoteDslText(subtitle)}`
    return lines.join('\n')
  }
  const headerIndex = lines.findIndex((line) => line.trim().startsWith('@'))
  if (headerIndex < 0) return source
  lines.splice(headerIndex + 1, 0, `  subtitle ${quoteDslText(subtitle)}`)
  return lines.join('\n')
}
