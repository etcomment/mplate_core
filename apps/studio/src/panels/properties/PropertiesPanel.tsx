import { SlidersHorizontal } from 'lucide-react'
import { Panel } from '../../ui/Panel'
import { useDiagramStore } from '../../store/diagramStore'
import { useTemplateStore } from '../../templates/store'
import { readDocumentSubtitle, readHeaderTitle, rewriteDocumentSubtitle, rewriteHeaderTitle } from '../../templates/dslLines'
import { ShapeProperties } from './ShapeProperties'
import { TemplateElementProperties } from './TemplateElementProperties'
import { fieldStyles } from './fieldStyles'
import { theme } from '../../lib/theme'

export function PropertiesPanel() {
  const activeTemplate = useTemplateStore(s => s.activeTemplate)
  const dslText = useTemplateStore(s => s.dslText)
  const setDslText = useTemplateStore(s => s.setDslText)
  const selectedTemplateIds = useTemplateStore(s => s.selectedTemplateElementIds)
  const selectedShapeIds = useDiagramStore(s => s.selectedShapeIds)
  const selectedDiagramElementIds = useDiagramStore(s => s.selectedDiagramElementIds)

  const hasTemplateSelection = selectedTemplateIds.size > 0 && selectedShapeIds.size === 0
  const hasCanvasSelection = selectedShapeIds.size > 0 || selectedDiagramElementIds.size > 0

  let content: React.ReactNode
  if (hasTemplateSelection) {
    content = <TemplateElementProperties />
  } else if (hasCanvasSelection) {
    content = <ShapeProperties />
  } else if (activeTemplate) {
    const header = readHeaderTitle(dslText)
    const subtitle = readDocumentSubtitle(dslText)
    content = (
      <>
        <div style={fieldStyles.section}>
          <div style={styles.headerRow}>
            <label style={{ ...fieldStyles.sectionLabel, marginBottom: 0 }}>Titre du diagramme</label>
            {header?.title ? (
              <button
                type="button"
                style={styles.clearButton}
                onClick={() => setDslText(rewriteHeaderTitle(dslText, ''))}
              >
                Supprimer
              </button>
            ) : null}
          </div>
          <input
            type="text"
            value={header?.title ?? ''}
            onChange={(e) => setDslText(rewriteHeaderTitle(dslText, e.target.value))}
            placeholder="Sans titre"
            style={fieldStyles.textInput}
          />
        </div>
        <div style={fieldStyles.section}>
          <label style={fieldStyles.sectionLabel}>Sous-titre du diagramme</label>
          <input
            type="text"
            value={subtitle?.subtitle ?? ''}
            onChange={(e) => setDslText(rewriteDocumentSubtitle(dslText, e.target.value))}
            placeholder="Sous-titre optionnel"
            style={fieldStyles.textInput}
          />
        </div>
        <div style={styles.empty}>Cliquez sur un élément du canevas pour le modifier</div>
      </>
    )
  } else {
    content = <div style={styles.empty}>Aucun élément sélectionné</div>
  }

  return (
    <Panel title="Propriétés" icon={<SlidersHorizontal size={14} />}>
      {content}
    </Panel>
  )
}

const styles: Record<string, React.CSSProperties> = {
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  clearButton: {
    border: 'none',
    background: 'transparent',
    padding: 0,
    fontSize: theme.font.sizeXs,
    color: theme.color.danger,
    cursor: 'pointer',
  },
  empty: {
    padding: `${theme.spacing.md} ${theme.spacing.xs}`,
    fontSize: theme.font.sizeXs,
    color: theme.color.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
}
