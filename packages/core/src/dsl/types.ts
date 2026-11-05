export type Severity = 'error' | 'warning'

export interface Diagnostic {
  severity: Severity
  message: string
  line: number
  hint?: string
}

export interface Token {
  text: string
  quoted: boolean
  column: number
}

export interface DslValue {
  text: string
  quoted: boolean
}

export interface DslNode {
  keyword: string
  values: DslValue[]
  attributes: Record<string, string>
  color?: string
  children: DslNode[]
  line: number
}

export interface DslHeader {
  family: string
  variant?: string
  style?: string
  title?: string
  attributes: Record<string, string>
  line: number
}

export interface DslDocument {
  header: DslHeader
  nodes: DslNode[]
}

export interface ParseResult {
  document?: DslDocument
  diagnostics: Diagnostic[]
}
