import { measureText } from './metrics.js'

const ELLIPSIS = '…'

function splitLongWord(word: string, maxWidth: number, fontSize: number, weight: number): string[] {
  const parts: string[] = []
  let current = ''
  for (const character of word) {
    if (current && measureText(current + character, fontSize, weight) > maxWidth) {
      parts.push(current)
      current = character
    } else current += character
  }
  if (current) parts.push(current)
  return parts
}

export function wrapText(text: string, maxWidth: number, fontSize: number, weight: number = 400): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter((word) => word.length > 0)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let current = ''
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (measureText(candidate, fontSize, weight) <= maxWidth) {
        current = candidate
        continue
      }
      if (current) lines.push(current)
      if (measureText(word, fontSize, weight) > maxWidth) {
        const pieces = splitLongWord(word, maxWidth, fontSize, weight)
        lines.push(...pieces.slice(0, -1))
        current = pieces[pieces.length - 1] ?? ''
      } else current = word
    }
    if (current) lines.push(current)
  }
  return lines
}

export function truncateLine(line: string, maxWidth: number, fontSize: number, weight: number = 400): string {
  if (measureText(line + ELLIPSIS, fontSize, weight) <= maxWidth) return line + ELLIPSIS
  let truncated = line
  while (truncated.length > 0 && measureText(truncated + ELLIPSIS, fontSize, weight) > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return truncated.trimEnd() + ELLIPSIS
}

export interface FitOptions {
  maxWidth: number
  fontSize: number
  minFontSize?: number
  maxLines?: number
  maxHeight?: number
  weight?: number
  lineHeight?: number
}

export interface FittedText {
  lines: string[]
  fontSize: number
  lineHeight: number
  width: number
  height: number
  isTruncated: boolean
}

function lineLimit(options: FitOptions, fontSize: number, lineHeightRatio: number): number {
  const byHeight = options.maxHeight !== undefined ? Math.max(1, Math.floor(options.maxHeight / (fontSize * lineHeightRatio))) : Infinity
  return Math.min(options.maxLines ?? Infinity, byHeight)
}

export function fitText(text: string, options: FitOptions): FittedText {
  const weight = options.weight ?? 400
  const lineHeightRatio = options.lineHeight ?? 1.25
  const minimum = Math.min(options.minFontSize ?? options.fontSize, options.fontSize)
  let fontSize = options.fontSize
  let lines = wrapText(text, options.maxWidth, fontSize, weight)
  let limit = lineLimit(options, fontSize, lineHeightRatio)
  while (lines.length > limit && fontSize > minimum) {
    fontSize = Math.max(minimum, fontSize - 1)
    lines = wrapText(text, options.maxWidth, fontSize, weight)
    limit = lineLimit(options, fontSize, lineHeightRatio)
  }
  let isTruncated = false
  if (lines.length > limit) {
    const kept = lines.slice(0, limit)
    const lastIndex = kept.length - 1
    kept[lastIndex] = truncateLine(kept[lastIndex] ?? '', options.maxWidth, fontSize, weight)
    lines = kept
    isTruncated = true
  }
  const width = Math.min(options.maxWidth, Math.max(0, ...lines.map((line) => measureText(line, fontSize, weight))))
  const lineHeight = fontSize * lineHeightRatio
  return { lines, fontSize, lineHeight, width, height: lines.length * lineHeight, isTruncated }
}
