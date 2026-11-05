import type { Diagnostic } from '@codemirror/lint'
import { parseMermaid } from '../../mermaid/parseMermaid'
import { validate } from '@mplate/core'
import type { CodeEditorLanguage } from '../../ui/CodeEditor'

export function computeDiagnostics(language: CodeEditorLanguage, text: string): Diagnostic[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  if (language === 'templates') {
    return computeTemplateDiagnostics(text)
  }

  return computeMermaidDiagnostics(text)
}

function computeMermaidDiagnostics(text: string): Diagnostic[] {
  const trimmed = text.trim()
  try {
    const result = parseMermaid(trimmed)
    if (
      result.model.shapes.length === 0 &&
      result.model.connections.length === 0 &&
      !result.diagramData &&
      result.subgraphGroups.length === 0
    ) {
      return [
        {
          from: 0,
          to: firstLineEnd(text),
          severity: 'warning',
          message: 'Aucun élément détecté dans ce diagramme Mermaid',
        },
      ]
    }
    return []
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Syntaxe Mermaid invalide'
    return [
      {
        from: 0,
        to: firstLineEnd(text),
        severity: 'error',
        message,
      },
    ]
  }
}

function computeTemplateDiagnostics(text: string): Diagnostic[] {
  const lineCount = text.split('\n').length
  return validate(text).diagnostics.map(diagnostic => {
    const lineIndex = Math.min(Math.max(diagnostic.line, 1), lineCount) - 1
    const from = offsetOfLine(text, lineIndex)
    const lineEnd = text.indexOf('\n', from)
    const to = lineEnd === -1 ? text.length : lineEnd
    return {
      from,
      to: Math.min(text.length, Math.max(from + 1, to)),
      severity: diagnostic.severity,
      message: diagnostic.hint ? `${diagnostic.message}\n${diagnostic.hint}` : diagnostic.message,
    }
  })
}

function offsetOfLine(text: string, lineIndex: number): number {
  let offset = 0
  for (let i = 0; i < lineIndex; i++) {
    const newline = text.indexOf('\n', offset)
    if (newline === -1) return text.length
    offset = newline + 1
  }
  return offset
}

function firstLineEnd(text: string): number {
  const newline = text.indexOf('\n')
  return newline === -1 ? text.length : newline
}
