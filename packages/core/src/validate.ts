import type { Diagnostic } from './dsl/types.js'
import type { Engine } from './render/engine.js'
import { DEFAULT_ENGINE, renderWith, type RenderOptions } from './render/render.js'

export interface ValidationResult {
  isValid: boolean
  template?: string
  elementCount: number
  diagnostics: Diagnostic[]
}

export function validate(source: string, options: RenderOptions = {}, engine: Engine = DEFAULT_ENGINE): ValidationResult {
  const result = renderWith(engine, source, options)
  const validation: ValidationResult = {
    isValid: result.ok && !result.diagnostics.some((diagnostic) => diagnostic.severity === 'error'),
    elementCount: result.layout.elementIds.filter((id) => /^[a-zA-Z]+-\d+$/.test(id)).length,
    diagnostics: result.diagnostics,
  }
  if (result.template) validation.template = result.template.id
  return validation
}

export function formatDiagnostic(diagnostic: Diagnostic): string {
  const hint = diagnostic.hint ? `\n    hint: ${diagnostic.hint.replace(/\n/g, '\n          ')}` : ''
  const location = diagnostic.line > 0 ? `line ${diagnostic.line}: ` : ''
  return `${location}${diagnostic.severity}: ${diagnostic.message}${hint}`
}
