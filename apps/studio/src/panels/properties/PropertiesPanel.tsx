import { SlidersHorizontal } from 'lucide-react'
import { Panel } from '../../ui/Panel'
import { useDiagramStore } from '../../store/diagramStore'
import { useTemplateStore } from '../../templates/store'
import { ShapeProperties } from './ShapeProperties'
import { TemplateElementProperties } from './TemplateElementProperties'
import { theme } from '../../lib/theme'

export function PropertiesPanel() {
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
  empty: {
    padding: `${theme.spacing.md} ${theme.spacing.xs}`,
    fontSize: theme.font.sizeXs,
    color: theme.color.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
}
