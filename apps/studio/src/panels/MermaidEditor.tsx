import { useEffect, useState } from 'react'
import { useDiagramStore } from '../store/diagramStore'
import { Collapsible } from '../ui/Collapsible'
import { Button } from '../ui/Button'
import { CodeEditor } from '../ui/CodeEditor'
import { theme } from '../lib/theme'

const LIVE_PREVIEW_DELAY_MS = 700

export function MermaidEditor() {
  return (
    <Collapsible title="Mermaid">
      <MermaidEditorBody />
    </Collapsible>
  )
}

export function MermaidEditorBody() {
  const [dsl, setDsl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [livePreview, setLivePreview] = useState(false)

  const mergeMermaid = useDiagramStore(s => s.mergeMermaid)

  const handleImport = () => {
    if (!dsl.trim()) return
    try {
      setError(null)
      mergeMermaid(dsl)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid Mermaid syntax')
    }
  }

  useEffect(() => {
    if (!livePreview || !dsl.trim()) return
    const timer = setTimeout(() => {
      try {
        setError(null)
        mergeMermaid(dsl)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Invalid Mermaid syntax')
      }
    }, LIVE_PREVIEW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [dsl, livePreview, mergeMermaid])

  return (
    <>
      <CodeEditor
        value={dsl}
        onChange={setDsl}
        language="mermaid"
        placeholder={`graph TD\n  A[Start] --> B[End]`}
        minHeight="140px"
        maxHeight="300px"
      />
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.buttons}>
        <button
          style={{ ...styles.liveButton, ...(livePreview ? styles.liveButtonActive : {}) }}
          onClick={() => setLivePreview(!livePreview)}
          title="Appliquer automatiquement le diagramme pendant la saisie"
        >
          <span style={{ ...styles.liveDot, ...(livePreview ? styles.liveDotActive : {}) }} />
          Live
        </button>
        <Button size="sm" onClick={handleImport} disabled={!dsl.trim()}>
          Import
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => { setDsl(''); setError(null) }}
          disabled={!dsl}
        >
          Clear
        </Button>
      </div>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  error: {
    color: theme.color.danger,
    fontSize: theme.font.sizeXs,
    marginTop: theme.spacing.xs,
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    background: 'rgba(211, 47, 47, 0.08)',
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.sm,
  },
  buttons: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  liveButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.radius.sm,
    border: `1px solid ${theme.color.border}`,
    background: theme.color.bgSurfaceHover,
    color: theme.color.textSecondary,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightMedium,
    cursor: 'pointer',
    transition: theme.transition.fast,
  },
  liveButtonActive: {
    background: theme.color.accent,
    borderColor: theme.color.accent,
    color: theme.color.textOnPrimary,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: theme.radius.full,
    background: theme.color.disabled,
    transition: theme.transition.fast,
  },
  liveDotActive: {
    background: theme.color.textOnPrimary,
  },
}
