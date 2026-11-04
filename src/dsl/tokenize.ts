import type { Token } from './types.js'

const ESCAPES: Record<string, string> = { n: '\n', t: '\t', '"': '"', "'": "'", '\\': '\\' }

export interface TokenizeResult {
  tokens: Token[]
  unterminatedQuoteColumn?: number
}

function isWhitespace(character: string | undefined): boolean {
  return character === ' ' || character === '\t'
}

function readQuoted(line: string, start: number): { value: string; end: number; isTerminated: boolean } {
  const quote = line[start]
  let value = ''
  let index = start + 1
  while (index < line.length) {
    const character = line[index]!
    if (character === '\\' && index + 1 < line.length) {
      const next = line[index + 1]!
      value += ESCAPES[next] ?? next
      index += 2
      continue
    }
    if (character === quote) return { value, end: index + 1, isTerminated: true }
    value += character
    index++
  }
  return { value, end: index, isTerminated: false }
}

export function tokenizeLine(line: string): TokenizeResult {
  const tokens: Token[] = []
  let index = 0
  while (index < line.length) {
    const character = line[index]
    if (isWhitespace(character)) {
      index++
      continue
    }
    if (character === '"' || character === "'") {
      const quoted = readQuoted(line, index)
      tokens.push({ text: quoted.value, quoted: true, column: index + 1 })
      if (!quoted.isTerminated) return { tokens, unterminatedQuoteColumn: index + 1 }
      index = quoted.end
      continue
    }
    const start = index
    let text = ''
    while (index < line.length && !isWhitespace(line[index])) {
      const current = line[index]!
      const isQuoteInsideAttribute = (current === '"' || current === "'") && text.endsWith(':')
      if (isQuoteInsideAttribute) {
        const quoted = readQuoted(line, index)
        text += quoted.value
        index = quoted.end
        if (!quoted.isTerminated) {
          tokens.push({ text, quoted: false, column: start + 1 })
          return { tokens, unterminatedQuoteColumn: start + 1 }
        }
        continue
      }
      text += current
      index++
    }
    tokens.push({ text, quoted: false, column: start + 1 })
  }
  return { tokens }
}

export function measureIndent(line: string): number {
  let width = 0
  for (const character of line) {
    if (character === ' ') width += 1
    else if (character === '\t') width += 2
    else break
  }
  return width
}

export function isCommentOrBlank(line: string): boolean {
  const trimmed = line.trim()
  return trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('# ') || trimmed === '#'
}
