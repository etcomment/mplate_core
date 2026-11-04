import { isCommentOrBlank, measureIndent, tokenizeLine } from './tokenize.js'
import type { Diagnostic, DslDocument, DslHeader, DslNode, ParseResult, Token } from './types.js'

const HEADER_PATTERN = /^@([a-zA-Z][a-zA-Z_-]*?)(\d+)?$/
const ATTRIBUTE_PATTERN = /^([a-zA-Z][\w-]*):(.*)$/s
const COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
const KEYWORD_PATTERN = /^[a-zA-Z][\w-]*$/

interface ClassifiedTokens {
  values: DslNode['values']
  attributes: Record<string, string>
  color?: string
}

function classifyTokens(tokens: Token[], line: number, diagnostics: Diagnostic[]): ClassifiedTokens {
  const values: DslNode['values'] = []
  const attributes: Record<string, string> = {}
  let color: string | undefined
  for (const token of tokens) {
    if (token.quoted) {
      values.push({ text: token.text, quoted: true })
      continue
    }
    if (COLOR_PATTERN.test(token.text)) {
      color = token.text.toLowerCase()
      continue
    }
    if (token.text.startsWith('#')) {
      diagnostics.push({ severity: 'warning', line, message: `"${token.text}" is not a valid hex color`, hint: 'Use #RGB or #RRGGBB, e.g. #3b82f6' })
      continue
    }
    const attribute = ATTRIBUTE_PATTERN.exec(token.text)
    if (attribute) {
      attributes[attribute[1]!.toLowerCase()] = attribute[2]!
      continue
    }
    values.push({ text: token.text, quoted: false })
  }
  return color === undefined ? { values, attributes } : { values, attributes, color }
}

function parseHeader(tokens: Token[], line: number, diagnostics: Diagnostic[]): DslHeader | undefined {
  const first = tokens[0]
  const match = first && !first.quoted ? HEADER_PATTERN.exec(first.text) : null
  if (!match) {
    diagnostics.push({ severity: 'error', line, message: 'A document must start with a header such as @process', hint: 'Example: @process style:chevrons "Delivery plan"' })
    return undefined
  }
  const classified = classifyTokens(tokens.slice(1), line, diagnostics)
  const { style, ...attributes } = classified.attributes
  const title = classified.values.map((value) => value.text).join(' ').trim()
  const header: DslHeader = { family: match[1]!, attributes, line }
  if (match[2]) header.variant = match[2]
  if (style) header.style = style
  if (title) header.title = title
  return header
}

interface StackEntry {
  indent: number
  node: DslNode
}

export function parseDsl(source: string): ParseResult {
  const diagnostics: Diagnostic[] = []
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const nodes: DslNode[] = []
  const stack: StackEntry[] = []
  let header: DslHeader | undefined
  let baseIndent: number | undefined

  lines.forEach((rawLine, lineIndex) => {
    const line = lineIndex + 1
    if (isCommentOrBlank(rawLine)) return
    const { tokens, unterminatedQuoteColumn } = tokenizeLine(rawLine.trim())
    if (unterminatedQuoteColumn !== undefined) {
      diagnostics.push({ severity: 'error', line, message: 'Unterminated quoted string', hint: 'Close the string with a matching quote' })
    }
    if (!header) {
      header = parseHeader(tokens, line, diagnostics)
      if (!header) return
      return
    }
    const keywordToken = tokens[0]
    if (!keywordToken || keywordToken.quoted || !KEYWORD_PATTERN.test(keywordToken.text)) {
      diagnostics.push({ severity: 'error', line, message: 'Each line must start with a keyword', hint: 'Example: step "Discover" "Interviews and research"' })
      return
    }
    const indent = measureIndent(rawLine)
    if (baseIndent === undefined) baseIndent = indent
    const classified = classifyTokens(tokens.slice(1), line, diagnostics)
    const node: DslNode = { keyword: keywordToken.text, values: classified.values, attributes: classified.attributes, children: [], line }
    if (classified.color) node.color = classified.color
    while (stack.length > 0 && stack[stack.length - 1]!.indent >= indent) stack.pop()
    const parent = indent > baseIndent ? stack[stack.length - 1] : undefined
    if (parent) parent.node.children.push(node)
    else {
      stack.length = 0
      nodes.push(node)
    }
    stack.push({ indent, node })
  })

  if (!header) {
    if (diagnostics.length === 0) diagnostics.push({ severity: 'error', line: 1, message: 'The document is empty', hint: 'Start with a header such as @process' })
    return { diagnostics }
  }
  const document: DslDocument = { header, nodes }
  return { document, diagnostics }
}
