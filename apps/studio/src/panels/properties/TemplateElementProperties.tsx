import { useTemplateStore, type Rect } from '../../templates/store'
import { useDiagramStore } from '../../store/diagramStore'
import { NumberInput } from '../../ui/Input'
import { ColorField } from './ColorField'
import { fieldStyles } from './fieldStyles'
import { theme } from '../../lib/theme'
import { readElementFields } from '../../templates/elementFields'
import { rewriteElementLine, type EditableField } from '../../templates/dslLines'
import { boundingRect, isTopLevelId } from '../../templates/geometry'

const FIELD_LABELS: Record<EditableField, string> = {
  title: 'Titre / Texte',
  subtitle: 'Sous-titre / Description',
  value: 'Valeur (val:)',
}

export function TemplateElementProperties() {
  const activeTemplate = useTemplateStore(s => s.activeTemplate)
  const selectedIds = useTemplateStore(s => s.selectedTemplateElementIds)
  const selectedShapeIds = useDiagramStore(s => s.selectedShapeIds)
  const templateColors = useTemplateStore(s => s.templateElementColors)
  const templateStrokeColors = useTemplateStore(s => s.templateStrokeColors)
  const templateStrokeWidths = useTemplateStore(s => s.templateStrokeWidths)
  const templateElementPositions = useTemplateStore(s => s.templateElementPositions)
  const naturalRects = useTemplateStore(s => s.naturalElementRects)
  const templateElementRotations = useTemplateStore(s => s.templateElementRotations)
  const dslText = useTemplateStore(s => s.dslText)
  const result = useTemplateStore(s => s.result)

  const updateTemplateColor = useTemplateStore(s => s.updateTemplateColor)
  const updateTemplateStrokeColor = useTemplateStore(s => s.updateTemplateStrokeColor)
  const updateTemplateStrokeWidth = useTemplateStore(s => s.updateTemplateStrokeWidth)
  const setDslText = useTemplateStore(s => s.setDslText)
  const moveTemplateElement = useTemplateStore(s => s.moveTemplateElement)
  const resizeTemplateElement = useTemplateStore(s => s.resizeTemplateElement)
  const rotateTemplateElement = useTemplateStore(s => s.rotateTemplateElement)
  const resetTemplateElements = useTemplateStore(s => s.resetTemplateElements)

  if (!activeTemplate || selectedIds.size === 0 || selectedShapeIds.size > 0) return null

  const elements = [...selectedIds]
  const primaryId = elements[0]!
  const isMulti = elements.length > 1
  const info = result?.elements.find(element => element.id === primaryId)
  const geometryIds = elements.filter(id => isTopLevelId(id, naturalRects))
  const rectOf = (id: string): Rect => templateElementPositions[id] ?? naturalRects[id] ?? { x: 0, y: 0, width: 100, height: 100 }
  const groupPos = boundingRect(geometryIds.map(rectOf)) ?? { x: 0, y: 0, width: 0, height: 0 }
  const primaryRot = templateElementRotations[geometryIds[0] ?? primaryId] ?? 0
  const primaryFill = templateColors[primaryId] ?? ''
  const primaryStroke = templateStrokeColors[primaryId] ?? ''
  const primaryStrokeWidth = templateStrokeWidths[primaryId] ?? (primaryStroke && primaryStroke !== 'transparent' && primaryStroke !== 'none' ? 2 : 0)
  const fields = info ? readElementFields(dslText, info.line, result?.card) : undefined

  const handleFieldChange = (field: EditableField, value: string) => {
    if (!info || !fields) return
    const edit = { line: info.line, field, value, positional: fields.spec?.positional ?? ['title', 'subtitle'] }
    setDslText(rewriteElementLine(dslText, fields.spec?.flags ? { ...edit, flags: fields.spec.flags } : edit))
  }

  const rotateSelection = (targetRot: number) => {
    if (geometryIds.length <= 1) {
      geometryIds.forEach(id => rotateTemplateElement(id, targetRot))
      return
    }
    const centerX = groupPos.x + groupPos.width / 2
    const centerY = groupPos.y + groupPos.height / 2
    const deltaAngle = targetRot - primaryRot
    const rad = (deltaAngle * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    geometryIds.forEach(id => {
      const pos = rectOf(id)
      const relX = pos.x + pos.width / 2 - centerX
      const relY = pos.y + pos.height / 2 - centerY
      moveTemplateElement(id, { x: centerX + (relX * cos - relY * sin) - pos.width / 2, y: centerY + (relX * sin + relY * cos) - pos.height / 2 })
      let newRot = ((templateElementRotations[id] ?? 0) + deltaAngle) % 360
      if (newRot < 0) newRot += 360
      rotateTemplateElement(id, Math.round(newRot))
    })
  }

  return (
    <>
      <div style={fieldStyles.section}>
        <span style={styles.elementName}>
          {isMulti ? `${elements.length} éléments sélectionnés` : info ? `${info.keyword} « ${info.title} »` : primaryId}
        </span>
        {!isMulti && info ? <span style={styles.elementMeta}>{primaryId} · ligne {info.line}</span> : null}
      </div>

      {!isMulti && fields && fields.editable.map(field => (
        <div key={field} style={fieldStyles.section}>
          <label style={fieldStyles.sectionLabel}>{FIELD_LABELS[field]}</label>
          {field === 'value' ? (
            <input
              type="text"
              value={fields.value}
              onChange={(e) => handleFieldChange('value', e.target.value)}
              placeholder="Ex : €4,2 M"
              style={fieldStyles.textInput}
            />
          ) : (
            <textarea
              value={fields[field]}
              onChange={(e) => handleFieldChange(field, e.target.value)}
              placeholder={field === 'title' ? 'Titre...' : 'Description...'}
              style={fieldStyles.textarea}
              rows={field === 'title' ? 2 : 3}
            />
          )}
        </div>
      ))}

      {geometryIds.length > 0 ? (
        <div style={fieldStyles.section}>
          <label style={fieldStyles.sectionLabel}>Géométrie</label>
          <div style={styles.geometryGrid}>
            <NumberInput
              label="X (px)"
              value={Math.round(groupPos.x)}
              onChange={(newX) => {
                const dx = newX - groupPos.x
                geometryIds.forEach(id => {
                  const current = rectOf(id)
                  moveTemplateElement(id, { x: current.x + dx, y: current.y })
                })
              }}
            />
            <NumberInput
              label="Y (px)"
              value={Math.round(groupPos.y)}
              onChange={(newY) => {
                const dy = newY - groupPos.y
                geometryIds.forEach(id => {
                  const current = rectOf(id)
                  moveTemplateElement(id, { x: current.x, y: current.y + dy })
                })
              }}
            />
            <NumberInput
              label="Largeur (px)"
              value={Math.round(groupPos.width)}
              min={10}
              onChange={(newW) => {
                if (groupPos.width <= 0) return
                const scaleX = newW / groupPos.width
                geometryIds.forEach(id => {
                  const current = rectOf(id)
                  moveTemplateElement(id, { x: groupPos.x + (current.x - groupPos.x) * scaleX, y: current.y })
                  resizeTemplateElement(id, { width: current.width * scaleX, height: current.height })
                })
              }}
            />
            <NumberInput
              label="Hauteur (px)"
              value={Math.round(groupPos.height)}
              min={10}
              onChange={(newH) => {
                if (groupPos.height <= 0) return
                const scaleY = newH / groupPos.height
                geometryIds.forEach(id => {
                  const current = rectOf(id)
                  moveTemplateElement(id, { x: current.x, y: groupPos.y + (current.y - groupPos.y) * scaleY })
                  resizeTemplateElement(id, { width: current.width, height: current.height * scaleY })
                })
              }}
            />
          </div>

          <label style={{ ...fieldStyles.sectionLabel, marginTop: theme.spacing.xs }}>Rotation</label>
          <div style={styles.rangeRow}>
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={primaryRot}
              onChange={(e) => rotateSelection(Number(e.target.value))}
              style={fieldStyles.range}
            />
            <span style={fieldStyles.rangeValue}>{primaryRot}°</span>
          </div>
        </div>
      ) : (
        <div style={{ ...fieldStyles.section, ...styles.hint }}>Cet élément suit son parent : déplacez le parent pour le déplacer.</div>
      )}

      <ColorField
        label="Remplissage (Fill)"
        value={primaryFill}
        onChange={(c) => elements.forEach(id => updateTemplateColor(id, c))}
      />

      <div style={fieldStyles.section}>
        <ColorField
          label="Contour (Stroke)"
          value={primaryStroke}
          onChange={(c) => {
            elements.forEach(id => {
              updateTemplateStrokeColor(id, c)
              if (c && c !== 'transparent' && c !== 'none') {
                if ((templateStrokeWidths[id] ?? 0) <= 0) updateTemplateStrokeWidth(id, 2)
              } else {
                updateTemplateStrokeWidth(id, 0)
              }
            })
          }}
        />
        <label style={fieldStyles.sectionLabel}>Épaisseur de contour</label>
        <div style={styles.rangeRow}>
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={primaryStrokeWidth}
            onChange={(e) => elements.forEach(id => updateTemplateStrokeWidth(id, Number(e.target.value)))}
            style={fieldStyles.range}
          />
          <span style={fieldStyles.rangeValue}>{primaryStrokeWidth}px</span>
        </div>
      </div>

      <button style={styles.resetButton} onClick={() => resetTemplateElements(elements)}>
        Réinitialiser {isMulti ? 'ces éléments' : 'cet élément'}
      </button>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  elementName: {
    display: 'block',
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightSemibold,
    color: theme.color.textPrimary,
  },
  elementMeta: {
    display: 'block',
    marginTop: 2,
    fontFamily: theme.font.mono,
    fontSize: 10,
    color: theme.color.textSecondary,
  },
  hint: {
    fontSize: theme.font.sizeXs,
    color: theme.color.textSecondary,
    fontStyle: 'italic',
  },
  geometryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  rangeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  resetButton: {
    width: '100%',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightSemibold,
    cursor: 'pointer',
    border: `1px solid ${theme.color.border}`,
    background: theme.color.bgSurfaceHover,
    color: theme.color.textSecondary,
  },
}
