import { useDiagramStore } from '../../store/diagramStore'
import { ColorField } from './ColorField'
import { fieldStyles } from './fieldStyles'
import { theme } from '../../lib/theme'
import type { ShapeStyle } from '../../core/model/Shape'

export function ShapeProperties() {
  const shapes = useDiagramStore(s => s.shapes)
  const selectedShapeIds = useDiagramStore(s => s.selectedShapeIds)
  const selectedDiagramElementIds = useDiagramStore(s => s.selectedDiagramElementIds)
  const diagramColors = useDiagramStore(s => s.diagramColors)
  const batchUpdateShapeStyle = useDiagramStore(s => s.batchUpdateShapeStyle)
  const updateShapeText = useDiagramStore(s => s.updateShapeText)
  const updateDiagramColor = useDiagramStore(s => s.updateDiagramColor)
  const diagramStrokeColors = useDiagramStore(s => s.diagramStrokeColors)
  const updateDiagramStrokeColor = useDiagramStore(s => s.updateDiagramStrokeColor)

  if (selectedDiagramElementIds.size > 0) {
    return (
      <DiagramElementColorPanel
        selectedIds={selectedDiagramElementIds}
        diagramColors={diagramColors}
        diagramStrokeColors={diagramStrokeColors}
        updateDiagramColor={updateDiagramColor}
        updateDiagramStrokeColor={updateDiagramStrokeColor}
      />
    )
  }

  const selectedIds = [...selectedShapeIds]
  const primaryShape = shapes.find(s => s.id === selectedIds[0])
  if (!primaryShape) return null

  const plural = selectedIds.length > 1

  const handleStyleChange = (field: keyof ShapeStyle, value: string | number) => {
    batchUpdateShapeStyle(selectedIds, { [field]: value })
  }

  return (
    <>
      <div style={fieldStyles.section}>
        <span style={styles.elementName}>
          {plural ? `${selectedIds.length} formes sélectionnées` : 'Propriétés de la forme'}
        </span>
      </div>

      <ColorField
        label="Remplissage (Fill)"
        value={primaryShape.style.fill}
        onChange={(c) => handleStyleChange('fill', c)}
      />

      <ColorField
        label="Contour (Stroke)"
        value={primaryShape.style.stroke}
        onChange={(c) => handleStyleChange('stroke', c)}
      />

      <div style={fieldStyles.section}>
        <label style={fieldStyles.sectionLabel}>Épaisseur du contour</label>
        <div style={styles.rangeRow}>
          <input
            type="range"
            min={1}
            max={10}
            value={primaryShape.style.strokeWidth}
            onChange={(e) => handleStyleChange('strokeWidth', Number(e.target.value))}
            style={fieldStyles.range}
          />
          <span style={fieldStyles.rangeValue}>{primaryShape.style.strokeWidth}px</span>
        </div>
      </div>

      {!plural && (
        <div style={fieldStyles.section}>
          <label style={fieldStyles.sectionLabel}>Texte</label>
          <input
            type="text"
            value={primaryShape.text.content}
            onChange={(e) => {
              updateShapeText(primaryShape.id, { content: e.target.value })
            }}
            placeholder="Saisir le texte..."
            style={fieldStyles.textInput}
          />
        </div>
      )}
    </>
  )
}

interface DiagramElementColorPanelProps {
  selectedIds: ReadonlySet<string>
  diagramColors: Record<string, string>
  diagramStrokeColors: Record<string, string>
  updateDiagramColor: (elementId: string, color: string) => void
  updateDiagramStrokeColor: (elementId: string, color: string) => void
}

function DiagramElementColorPanel({ selectedIds, diagramColors, diagramStrokeColors, updateDiagramColor, updateDiagramStrokeColor }: DiagramElementColorPanelProps) {
  const elements = [...selectedIds]
  const isMulti = elements.length > 1
  const primaryId = elements[0]!
  const primaryFill = diagramColors[primaryId] ?? ''
  const primaryStroke = diagramStrokeColors[primaryId] ?? ''

  return (
    <>
      <div style={fieldStyles.section}>
        <span style={styles.elementName}>
          {isMulti ? `${elements.length} éléments sélectionnés` : 'Couleurs de l\u2019élément'}
        </span>
      </div>

      <ColorField
        label="Remplissage (Fill)"
        value={primaryFill}
        onChange={(c) => elements.forEach(id => updateDiagramColor(id, c))}
      />

      <ColorField
        label="Contour (Stroke)"
        value={primaryStroke}
        onChange={(c) => elements.forEach(id => updateDiagramStrokeColor(id, c))}
      />
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  elementName: {
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightSemibold,
    color: theme.color.textPrimary,
  },
  rangeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
}
