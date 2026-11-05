import { useEffect, useState } from 'react'
import { useTemplateStore } from '../store'
import { Collapsible } from '../../ui/Collapsible'
import { Button } from '../../ui/Button'
import { CodeEditor } from '../../ui/CodeEditor'
import { theme } from '../../lib/theme'

const LIVE_PREVIEW_DELAY_MS = 300

export function TemplateDslEditor() {
  return (
    <Collapsible title="Template DSL">
      <TemplateDslEditorBody />
    </Collapsible>
  )
}

export function TemplateDslEditorBody() {
  const dslText = useTemplateStore(s => s.dslText)
  const setDslText = useTemplateStore(s => s.setDslText)
  const diagnostics = useTemplateStore(s => s.result?.diagnostics ?? [])
  const card = useTemplateStore(s => s.result?.card)
  const [dsl, setDsl] = useState(dslText)
  const [livePreview, setLivePreview] = useState(true)

  useEffect(() => { setDsl(dslText) }, [dslText])

  useEffect(() => {
    if (!livePreview || dsl === useTemplateStore.getState().dslText) return
    const timer = setTimeout(() => setDslText(dsl), LIVE_PREVIEW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [dsl, livePreview, setDslText])

  const errorCount = diagnostics.filter(diagnostic => diagnostic.severity === 'error').length
  const warningCount = diagnostics.length - errorCount

  return (
    <>
      <CodeEditor
        value={dsl}
        onChange={setDsl}
        language="templates"
        placeholder="Choisissez un template dans la galerie, ou tapez @process…"
        minHeight="160px"
        maxHeight="320px"
      />

      <div style={styles.actions}>
        <button
          style={{ ...styles.liveButton, ...(livePreview ? styles.liveButtonActive : {}) }}
          onClick={() => setLivePreview(!livePreview)}
          title="Rendre automatiquement le template pendant la saisie"
        >
          <span style={{ ...styles.liveDot, ...(livePreview ? styles.liveDotActive : {}) }} />
          Live
        </button>
        <Button size="sm" onClick={() => setDslText(dsl)} disabled={!dsl.trim()}>
          Parse & Render
        </Button>
        <span style={styles.status}>
          {card ? <span style={styles.templateId}>{card.id}</span> : null}
          {errorCount > 0 ? <span style={styles.error}>{errorCount} erreur{errorCount > 1 ? 's' : ''}</span> : null}
          {warningCount > 0 ? <span style={styles.warning}>{warningCount} avertissement{warningCount > 1 ? 's' : ''}</span> : null}
          {dsl.trim() && diagnostics.length === 0 ? <span style={styles.ok}>OK</span> : null}
        </span>
      </div>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  status: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    fontSize: theme.font.sizeXs,
  },
  templateId: {
    fontFamily: theme.font.mono,
    color: theme.color.textSecondary,
  },
  error: { color: theme.color.danger, fontWeight: theme.font.weightSemibold },
  warning: { color: '#b7791f', fontWeight: theme.font.weightSemibold },
  ok: { color: theme.color.success, fontWeight: theme.font.weightSemibold },
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
