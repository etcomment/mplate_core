import { useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { linter, type Diagnostic } from '@codemirror/lint'
import { mermaidLanguage } from '../lib/codemirror/mermaidMode'
import { templateDslLanguage, templateDslAutocomplete } from '../lib/codemirror/templateDslMode'
import { iconAutocompleteExtension } from '../lib/codemirror/iconAutocomplete'
import { computeDiagnostics } from '../lib/codemirror/diagnostics'
import { createEditorExtensions, editorTheme } from '../lib/codemirror/theme'

export type CodeEditorLanguage = 'mermaid' | 'templates'

export interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language?: CodeEditorLanguage
  placeholder?: string
  minHeight?: string
  maxHeight?: string
  autoFocus?: boolean
}

export function CodeEditor({ value, onChange, language, placeholder, minHeight, maxHeight, autoFocus }: CodeEditorProps) {
  const extensions = useMemo(() => {
    const list = [...createEditorExtensions(), editorTheme]
    if (language === 'mermaid') list.push(mermaidLanguage)
    if (language === 'templates') {
      list.push(templateDslLanguage)
      list.push(templateDslAutocomplete)
      list.push(iconAutocompleteExtension)
    }
    if (language) {
      list.push(
        linter((view) => {
          const text = view.state.doc.toString()
          return computeDiagnostics(language, text) as Diagnostic[]
        })
      )
    }
    return list
  }, [language])

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      placeholder={placeholder}
      height={minHeight}
      maxHeight={maxHeight}
      autoFocus={autoFocus}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        foldGutter: true,
        autocompletion: true,
        bracketMatching: true,
        closeBrackets: true,
      }}
    />
  )
}
