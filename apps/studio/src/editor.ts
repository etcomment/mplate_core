import type { Diagnostic } from '@mplate/core'

export interface Editor {
  value(): string
  setValue(text: string): void
  focusLine(line: number): void
  markLines(diagnostics: Diagnostic[]): void
}

const INDENT = '  '

function lineStartOffset(text: string, line: number): number {
  let offset = 0
  for (let current = 1; current < line; current++) {
    const next = text.indexOf('\n', offset)
    if (next === -1) return text.length
    offset = next + 1
  }
  return offset
}

export function createEditor(textarea: HTMLTextAreaElement, gutter: HTMLElement, onChange: (text: string) => void): Editor {
  let marked = new Map<number, Diagnostic['severity']>()

  const drawGutter = (): void => {
    const count = textarea.value.split('\n').length
    gutter.replaceChildren(
      ...Array.from({ length: count }, (_, index) => {
        const line = document.createElement('span')
        const severity = marked.get(index + 1)
        line.textContent = String(index + 1)
        if (severity) line.className = `mark-${severity}`
        return line
      }),
    )
    gutter.scrollTop = textarea.scrollTop
  }

  const insertAtCursor = (text: string): void => {
    const { selectionStart, selectionEnd, value } = textarea
    textarea.value = value.slice(0, selectionStart) + text + value.slice(selectionEnd)
    textarea.selectionStart = textarea.selectionEnd = selectionStart + text.length
    textarea.dispatchEvent(new Event('input'))
  }

  textarea.addEventListener('input', () => {
    drawGutter()
    onChange(textarea.value)
  })
  textarea.addEventListener('scroll', () => {
    gutter.scrollTop = textarea.scrollTop
  })
  textarea.addEventListener('keydown', (event) => {
    if (event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault()
      insertAtCursor(INDENT)
    } else if (event.key === 'Enter' && !event.isComposing) {
      const before = textarea.value.slice(0, textarea.selectionStart)
      const currentLine = before.slice(before.lastIndexOf('\n') + 1)
      const indent = /^\s*/.exec(currentLine)?.[0] ?? ''
      const nextIndent = currentLine.trimStart().startsWith('@') ? INDENT : indent
      event.preventDefault()
      insertAtCursor('\n' + nextIndent)
    }
  })

  drawGutter()
  return {
    value: () => textarea.value,
    setValue: (text) => {
      textarea.value = text
      drawGutter()
      onChange(text)
    },
    focusLine: (line) => {
      const start = lineStartOffset(textarea.value, line)
      const end = textarea.value.indexOf('\n', start)
      textarea.focus()
      textarea.setSelectionRange(start, end === -1 ? textarea.value.length : end)
      const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 20
      textarea.scrollTop = Math.max(0, (line - 3) * lineHeight)
    },
    markLines: (diagnostics) => {
      marked = new Map()
      for (const diagnostic of diagnostics) {
        if (marked.get(diagnostic.line) !== 'error') marked.set(diagnostic.line, diagnostic.severity)
      }
      drawGutter()
    },
  }
}
