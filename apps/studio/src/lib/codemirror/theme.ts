import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'
import { theme } from '../theme'

const highlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: theme.color.accentAlt },
  { tag: t.string, color: '#0a8043' },
  { tag: t.number, color: '#b35900' },
  { tag: t.meta, color: theme.color.textSecondary },
  { tag: t.comment, color: theme.color.disabled, fontStyle: 'italic' },
  { tag: t.variableName, color: theme.color.textPrimary },
  { tag: t.propertyName, color: '#7c3aed' },
  { tag: t.operator, color: theme.color.accent },
  { tag: t.bracket, color: theme.color.textSecondary },
  { tag: t.color, color: '#7c3aed' },
])

const editorTheme = EditorView.theme({
  '&': {
    backgroundColor: theme.color.bgPanel,
    color: theme.color.textPrimary,
    fontSize: theme.font.sizeSm,
  },
  '.cm-content': {
    fontFamily: theme.font.mono,
    lineHeight: '1.5',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: theme.color.accentAlt,
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: theme.color.selection,
  },
  '.cm-gutters': {
    backgroundColor: theme.color.bgSurfaceHover,
    color: theme.color.disabled,
    borderRight: `1px solid ${theme.color.border}`,
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(74, 144, 217, 0.06)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(74, 144, 217, 0.1)',
    color: theme.color.textSecondary,
  },
  '.cm-matchingBracket': {
    backgroundColor: 'rgba(74, 144, 217, 0.2)',
    outline: `1px solid ${theme.color.accent}`,
  },
  '.cm-placeholder': {
    color: theme.color.disabled,
  },
  '.cm-scroller': {
    fontFamily: theme.font.mono,
    overflow: 'auto',
  },
})

export function createEditorExtensions(): ReturnType<typeof syntaxHighlighting>[] {
  return [syntaxHighlighting(highlightStyle)]
}

export { editorTheme }
