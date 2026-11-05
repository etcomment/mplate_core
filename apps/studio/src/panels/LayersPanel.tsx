import React, { useState } from 'react'
import { Eye, EyeOff, Lock, Unlock, Layers, ChevronUp, ChevronDown, ChevronRight, LayoutTemplate, Square } from 'lucide-react'
import { useDiagramStore } from '../store/diagramStore'
import { useTemplateStore } from '../templates/store'
import { Panel } from '../ui/Panel'
import { IconButton } from '../ui/IconButton'
import { theme } from '../lib/theme'
import type { Shape } from '../core/model/Shape'
import type { ElementInfo } from '@mplate/core'

interface LayerItem {
  id: string
  type: 'shape' | 'template'
  shape?: Shape
}

interface TemplateSubElement {
  id: string
  label: string
  children?: TemplateSubElement[]
}

function getTemplateSubElements(elements: readonly ElementInfo[]): TemplateSubElement[] {
  const byParent = new Map<string | undefined, ElementInfo[]>()
  for (const element of elements) {
    const list = byParent.get(element.parentId) ?? []
    list.push(element)
    byParent.set(element.parentId, list)
  }
  const build = (parentId: string | undefined): TemplateSubElement[] =>
    (byParent.get(parentId) ?? []).map(element => {
      const children = build(element.id)
      const label = `${element.keyword}: "${element.title || element.id}"`
      return children.length > 0 ? { id: element.id, label, children } : { id: element.id, label }
    })
  return build(undefined)
}

export function LayersPanel() {
  const shapes = useDiagramStore(s => s.shapes)
  const selectedShapeIds = useDiagramStore(s => s.selectedShapeIds)
  const templateZIndex = useDiagramStore(s => s.templateZIndex)
  const setTemplateZIndex = useDiagramStore(s => s.setTemplateZIndex)
  const selectShape = useDiagramStore(s => s.selectShape)
  const deselectShape = useDiagramStore(s => s.deselectShape)
  const clearSelection = useDiagramStore(s => s.clearSelection)
  const toggleShapeHidden = useDiagramStore(s => s.toggleShapeHidden)
  const toggleShapeLocked = useDiagramStore(s => s.toggleShapeLocked)
  const reorderShapes = useDiagramStore(s => s.reorderShapes)

  const activeTemplate = useTemplateStore(s => s.activeTemplate)
  const templateElements = useTemplateStore(s => s.result?.elements)
  const isTemplateHidden = useTemplateStore(s => s.isTemplateHidden)
  const toggleTemplateHidden = useTemplateStore(s => s.toggleTemplateHidden)
  const hiddenTemplateElementIds = useTemplateStore(s => s.hiddenTemplateElementIds)
  const toggleTemplateElementHidden = useTemplateStore(s => s.toggleTemplateElementHidden)
  const selectedTemplateElementIds = useTemplateStore(s => s.selectedTemplateElementIds)
  const selectTemplateElement = useTemplateStore(s => s.selectTemplateElement)
  const toggleTemplateElement = useTemplateStore(s => s.toggleTemplateElement)

  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [isTemplateTreeExpanded, setIsTemplateTreeExpanded] = useState(true)
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(new Set())

  // Construct bottom-to-top SVG render order list of items
  const clampedTemplateIndex = Math.max(0, Math.min(shapes.length, templateZIndex))
  const svgOrderItems: LayerItem[] = []
  for (let i = 0; i <= shapes.length; i++) {
    if (activeTemplate && i === clampedTemplateIndex) {
      svgOrderItems.push({ id: 'template-layer-item', type: 'template' })
    }
    if (i < shapes.length) {
      const shape = shapes[i]
      if (shape) {
        svgOrderItems.push({ id: shape.id, type: 'shape', shape })
      }
    }
  }

  // UI display order is top-to-bottom (reversed SVG render order)
  const reversedLayerItems = [...svgOrderItems].reverse()
  const templateSubElements = getTemplateSubElements(templateElements ?? [])
  const totalCount = (activeTemplate ? 1 + templateSubElements.length : 0) + shapes.length

  const handleSelect = (item: LayerItem, e: React.MouseEvent) => {
    if (item.type === 'template') return
    if (!item.shape) return

    if (e.ctrlKey || e.metaKey) {
      if (selectedShapeIds.has(item.shape.id)) {
        deselectShape(item.shape.id)
      } else {
        selectShape(item.shape.id)
      }
    } else {
      clearSelection()
      selectShape(item.shape.id)
    }
  }

  const handleSelectSubElement = (subId: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      toggleTemplateElement(subId)
    } else {
      clearSelection()
      selectTemplateElement(subId)
    }
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedId(id)
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverId !== id) {
      setDragOverId(id)
    }
  }

  const handleDragLeave = () => {
    setDragOverId(null)
  }

  const applyNewReversedOrder = (updatedReversed: LayerItem[]) => {
    const newSvgOrder = [...updatedReversed].reverse()
    let newTemplateIndex = newSvgOrder.findIndex(item => item.type === 'template')
    if (newTemplateIndex === -1) newTemplateIndex = 0

    const newShapeIds = newSvgOrder
      .filter(item => item.type === 'shape' && item.shape)
      .map(item => item.shape!.id)

    reorderShapes(newShapeIds)
    if (activeTemplate) {
      setTemplateZIndex(newTemplateIndex)
    }
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const sourceId = draggedId || e.dataTransfer.getData('text/plain')
    setDraggedId(null)
    setDragOverId(null)

    if (!sourceId || sourceId === targetId) return

    const currentReversed = reversedLayerItems.map(item => item.id)
    const fromIndex = currentReversed.indexOf(sourceId)
    const toIndex = currentReversed.indexOf(targetId)

    if (fromIndex === -1 || toIndex === -1) return

    const updatedReversed = [...reversedLayerItems]
    const moved = updatedReversed[fromIndex]
    if (!moved) return
    updatedReversed.splice(fromIndex, 1)
    updatedReversed.splice(toIndex, 0, moved)

    applyNewReversedOrder(updatedReversed)
  }

  const handleMoveUp = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const currentReversed = reversedLayerItems.map(item => item.id)
    const index = currentReversed.indexOf(id)
    if (index <= 0) return
    const updatedReversed = [...reversedLayerItems]
    const moved = updatedReversed[index]
    if (!moved) return
    updatedReversed.splice(index, 1)
    updatedReversed.splice(index - 1, 0, moved)

    applyNewReversedOrder(updatedReversed)
  }

  const handleMoveDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const currentReversed = reversedLayerItems.map(item => item.id)
    const index = currentReversed.indexOf(id)
    if (index === -1 || index >= currentReversed.length - 1) return
    const updatedReversed = [...reversedLayerItems]
    const moved = updatedReversed[index]
    if (!moved) return
    updatedReversed.splice(index, 1)
    updatedReversed.splice(index + 1, 0, moved)

    applyNewReversedOrder(updatedReversed)
  }

  const getItemLabel = (item: LayerItem): string => {
    if (item.type === 'template') {
      return `Template (${activeTemplate ?? ''})`
    }
    const shape = item.shape!
    if (shape.text?.content?.trim()) {
      return shape.text.content.trim()
    }
    if (shape.iconName) {
      return `Icône (${shape.iconName})`
    }
    return `${shape.type.charAt(0).toUpperCase() + shape.type.slice(1)} (${shape.id})`
  }

  return (
    <Panel title="Calques" icon={<Layers size={14} />} badge={totalCount}>
      {totalCount === 0 ? (
        <div style={styles.emptyState}>Aucun élément sur le canvas</div>
      ) : (
        <div style={styles.list}>
          {reversedLayerItems.map((item, index) => {
            const isTemplate = item.type === 'template'
            const isSelected = !isTemplate && item.shape && selectedShapeIds.has(item.shape.id)
            const isDraggingThis = draggedId === item.id
            const isDragOverThis = dragOverId === item.id
            const isHidden = isTemplate ? isTemplateHidden : !!item.shape?.isHidden
            const isLocked = isTemplate ? false : !!item.shape?.isLocked

            return (
              <React.Fragment key={item.id}>
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragOver={(e) => handleDragOver(e, item.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, item.id)}
                  onClick={(e) => handleSelect(item, e)}
                  style={{
                    ...styles.item,
                    ...(isSelected ? styles.selectedItem : {}),
                    ...(isTemplate ? styles.templateItem : {}),
                    ...(isDraggingThis ? styles.draggingItem : {}),
                    ...(isDragOverThis ? styles.dragOverItem : {}),
                  }}
                >
                  <div style={styles.itemContent}>
                    <span style={styles.dragHandle} title="Glisser pour réordonner">
                      ⋮⋮
                    </span>
                    {isTemplate && (
                      <IconButton
                        size="sm"
                        variant="ghost"
                        icon={isTemplateTreeExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        style={{ width: 22, height: 22, marginRight: 2 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setIsTemplateTreeExpanded(!isTemplateTreeExpanded)
                        }}
                      />
                    )}
                    {isTemplate && <LayoutTemplate size={14} color={theme.color.accent} style={{ flexShrink: 0 }} />}
                    <span
                      style={{
                        ...styles.itemLabel,
                        opacity: isHidden ? 0.5 : 1,
                        textDecoration: isHidden ? 'line-through' : 'none',
                        fontWeight: isTemplate ? theme.font.weightSemibold : theme.font.weightNormal,
                      }}
                      title={getItemLabel(item)}
                    >
                      {getItemLabel(item)}
                    </span>
                  </div>

                  <div style={styles.actions}>
                    <IconButton
                      size="sm"
                      variant="ghost"
                      icon={isHidden ? <EyeOff size={14} color="#888" /> : <Eye size={14} color="#555" />}
                      tooltip={isHidden ? 'Afficher' : 'Masquer'}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (isTemplate) {
                          toggleTemplateHidden()
                        } else if (item.shape) {
                          toggleShapeHidden(item.shape.id)
                        }
                      }}
                    />

                    {!isTemplate && (
                      <IconButton
                        size="sm"
                        variant="ghost"
                        icon={isLocked ? <Lock size={14} color={theme.color.danger} /> : <Unlock size={14} color="#888" />}
                        tooltip={isLocked ? 'Déverrouiller' : 'Verrouiller'}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (item.shape) {
                            toggleShapeLocked(item.shape.id)
                          }
                        }}
                      />
                    )}

                    <IconButton
                      size="sm"
                      variant="ghost"
                      icon={<ChevronUp size={14} color="#555" />}
                      tooltip="Monter l'élément"
                      disabled={index === 0}
                      onClick={(e) => handleMoveUp(item.id, e)}
                    />

                    <IconButton
                      size="sm"
                      variant="ghost"
                      icon={<ChevronDown size={14} color="#555" />}
                      tooltip="Descendre l'élément"
                      disabled={index === reversedLayerItems.length - 1}
                      onClick={(e) => handleMoveDown(item.id, e)}
                    />
                  </div>
                </div>

                {isTemplate && isTemplateTreeExpanded && templateSubElements.map((subItem) => {
                  const isSubHidden = hiddenTemplateElementIds.has(subItem.id) || isTemplateHidden

                  const collectLeafIds = (item: TemplateSubElement): string[] => [item.id]

                  const toggleGroupVisibility = (item: TemplateSubElement) => {
                    const leafIds = collectLeafIds(item)
                    const allHidden = leafIds.every(id => hiddenTemplateElementIds.has(id))
                    for (const id of leafIds) {
                      if (allHidden) {
                        if (hiddenTemplateElementIds.has(id)) toggleTemplateElementHidden(id)
                      } else {
                        if (!hiddenTemplateElementIds.has(id)) toggleTemplateElementHidden(id)
                      }
                    }
                  }

                  const toggleGroupExpand = (id: string) => {
                    setCollapsedGroupIds(prev => {
                      const next = new Set(prev)
                      if (next.has(id)) next.delete(id)
                      else next.add(id)
                      return next
                    })
                  }

                  const renderSubItemRow = (item: TemplateSubElement, depth = 1) => {
                    const isSelected = selectedTemplateElementIds.has(item.id)
                    const hasChildren = item.children && item.children.length > 0
                    const isExpanded = !collapsedGroupIds.has(item.id)
                    const isHidden = hasChildren
                      ? collectLeafIds(item).every(id => hiddenTemplateElementIds.has(id)) || isSubHidden
                      : hiddenTemplateElementIds.has(item.id) || isSubHidden

                    return (
                      <React.Fragment key={`frag-${item.id}`}>
                        <div
                          onClick={(e) => handleSelectSubElement(item.id, e)}
                          style={{
                            ...styles.item,
                            paddingLeft: 14 + depth * 14,
                            backgroundColor: isSelected ? theme.color.selection : theme.color.bgPanelHover,
                          }}
                        >
                          <div style={styles.itemContent}>
                            {hasChildren ? (
                              <IconButton
                                size="sm"
                                variant="ghost"
                                icon={isExpanded ? <ChevronDown size={12} color="#555" /> : <ChevronRight size={12} color="#555" />}
                                style={{ width: 18, height: 18, marginRight: -2 }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleGroupExpand(item.id)
                                }}
                              />
                            ) : (
                              <Square size={10} color={depth > 1 ? '#a0a0a0' : '#757575'} style={{ flexShrink: 0 }} />
                            )}
                            <span
                              style={{
                                ...styles.itemLabel,
                                fontSize: theme.font.sizeXs,
                                fontWeight: hasChildren ? theme.font.weightSemibold : theme.font.weightNormal,
                                opacity: isHidden ? 0.4 : 1,
                                textDecoration: isHidden ? 'line-through' : 'none',
                              }}
                              title={item.label}
                            >
                              {item.label}
                            </span>
                          </div>
                          <div style={styles.actions}>
                            <IconButton
                              size="sm"
                              variant="ghost"
                              icon={isHidden ? <EyeOff size={13} color="#888" /> : <Eye size={13} color="#555" />}
                              tooltip={isHidden ? 'Afficher' : 'Masquer'}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (hasChildren) {
                                  toggleGroupVisibility(item)
                                } else {
                                  toggleTemplateElementHidden(item.id)
                                }
                              }}
                            />
                          </div>
                        </div>

                        {hasChildren && isExpanded && item.children!.map(child => renderSubItemRow(child, depth + 1))}
                      </React.Fragment>
                    )
                  }

                  return renderSubItemRow(subItem, 1)
                })}
              </React.Fragment>
            )
          })}
        </div>
      )}
    </Panel>
  )
}

const styles: Record<string, React.CSSProperties> = {
  emptyState: {
    padding: theme.spacing.lg,
    fontSize: theme.font.sizeXs,
    color: theme.color.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `4px ${theme.spacing.xs}`,
    borderBottom: `1px solid ${theme.color.border}`,
    cursor: 'pointer',
    userSelect: 'none',
    fontSize: theme.font.sizeXs,
    transition: theme.transition.fast,
  },
  selectedItem: {
    backgroundColor: theme.color.selection,
  },
  templateItem: {
    backgroundColor: theme.color.bgPanelHover,
  },
  draggingItem: {
    opacity: 0.4,
  },
  dragOverItem: {
    borderTop: `2px solid ${theme.color.accent}`,
  },
  itemContent: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
    minWidth: 0,
    marginRight: theme.spacing.sm,
  },
  dragHandle: {
    cursor: 'grab',
    color: theme.color.disabled,
    fontSize: theme.font.sizeXs,
    lineHeight: 1,
  },
  itemLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: theme.color.textPrimary,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
}
