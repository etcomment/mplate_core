import { create } from 'zustand'
import { DiagramModel } from '../core/model/DiagramModel'
import type { ConnectionOptions } from '../core/model/DiagramModel'
import { History } from '../core/commands/History'
import { parseMermaid } from '../mermaid/parseMermaid'
import type { SubgraphGroup } from '../mermaid/parseMermaid'
import type { SequenceData } from '../mermaid/parseSequenceDiagram'
import { createDefaultSubgraphStyle } from '../core/model/SubgraphStyle'
import type { SubgraphStyle } from '../core/model/SubgraphStyle'
import type { ConnectionType, Dimensions, Position, Shape, ShapeStyle, ShapeText, ShapeType } from '../core/model/Shape'

interface ViewBox {
  readonly x: number
  readonly y: number
  readonly scale: number
}

interface DiagramStore {
  readonly shapes: readonly Shape[]
  readonly connections: readonly ConnectionType[]
  readonly subgraphGroups: readonly SubgraphGroup[]
  readonly subgraphStyle: SubgraphStyle
  readonly sequenceData: SequenceData | null
  readonly diagramType: string
  readonly diagramData: Record<string, unknown> | null
  readonly diagramColors: Record<string, string>
  readonly diagramStrokeColors: Record<string, string>
  readonly diagramElementPositions: Record<string, { x: number; y: number; width: number; height: number }>
  readonly selectedShapeIds: ReadonlySet<string>
  readonly selectedDiagramElementIds: ReadonlySet<string>
  readonly viewBox: ViewBox
  readonly isConnectMode: boolean
  readonly templateZIndex: number

  readonly canUndo: boolean
  readonly canRedo: boolean

  undo: () => void
  redo: () => void

  addShape: (type: ShapeType, position: Position, dimensions: Dimensions, iconName?: string) => Shape
  removeShape: (id: string) => void
  moveShape: (id: string, position: Position) => void
  resizeShape: (id: string, dimensions: Dimensions) => void
  updateShapeStyle: (id: string, style: Partial<ShapeStyle>) => void
  updateShapeRotation: (id: string, rotation: number) => void
  updateShapeText: (id: string, text: Partial<ShapeText>) => void
  moveAndResizeShape: (id: string, position: Position, dimensions: Dimensions) => void
  batchUpdateShapeStyle: (ids: string[], style: Partial<ShapeStyle>) => void
  toggleShapeHidden: (id: string) => void
  toggleShapeLocked: (id: string) => void
  reorderShapes: (orderedIds: readonly string[]) => void
  bringToFront: (id: string) => void
  sendToBack: (id: string) => void
  bringForward: (id: string) => void
  sendBackward: (id: string) => void

  addConnection: (sourceId: string, targetId: string, options?: ConnectionOptions) => void
  removeConnection: (connectionId: string) => void

  selectShape: (id: string) => void
  deselectShape: (id: string) => void
  toggleSelection: (id: string) => void
  selectAll: () => void
  clearSelection: () => void

  selectDiagramElement: (id: string) => void
  deselectDiagramElement: (id: string) => void
  toggleDiagramElement: (id: string) => void
  clearDiagramElementSelection: () => void

  moveDiagramElement: (id: string, position: Position) => void
  resizeDiagramElement: (id: string, size: Dimensions) => void

  updateDiagramColor: (elementId: string, color: string) => void
  updateDiagramStrokeColor: (elementId: string, color: string) => void
  setDiagramColors: (colors: Record<string, string>) => void

  setViewBox: (viewBox: ViewBox) => void
  toggleConnectMode: () => void
  mergeModel: (model: DiagramModel) => void
  mergeMermaid: (dsl: string) => void
  getModel: () => DiagramModel
  moveTemplateToFront: () => void
  moveTemplateToBack: () => void
  moveTemplateUp: () => void
  moveTemplateDown: () => void
  setTemplateZIndex: (index: number) => void
  updateSubgraphStyle: (style: Partial<SubgraphStyle>) => void
  groupSelectedShapes: () => void
  ungroupSelectedShapes: () => void
}

export const useDiagramStore = create<DiagramStore>((set, get) => {
  const model = new DiagramModel()
  const history = new History(model)

  function syncState(): Partial<DiagramStore> {
    return {
      shapes: model.shapes,
      connections: model.connections,
      canUndo: history.canUndo,
      canRedo: history.canRedo,
    }
  }

  return {
    shapes: [],
    connections: [],
    subgraphGroups: [],
    subgraphStyle: createDefaultSubgraphStyle(),
    sequenceData: null,
    diagramType: 'flowchart',
    diagramData: null,
    diagramColors: {},
    diagramStrokeColors: {},
    diagramElementPositions: {},
    selectedShapeIds: new Set(),
    selectedDiagramElementIds: new Set(),
    viewBox: { x: 0, y: 0, scale: 1 },
    isConnectMode: false,
    canUndo: false,
    canRedo: false,

    undo: () => {
      history.undo()
      set({ ...syncState(), selectedShapeIds: new Set() })
    },

    redo: () => {
      history.redo()
      set({ ...syncState(), selectedShapeIds: new Set() })
    },

    addShape: (type, position, dimensions, iconName) => {
      const shape = history.addShape(type, position, dimensions, iconName)
      set({
        ...syncState(),
        selectedShapeIds: new Set([shape.id]),
      })
      return shape
    },

    removeShape: (id) => {
      history.removeShape(id)
      set(syncState())
    },

    moveShape: (id, position) => {
      history.moveShape(id, position)
      set(syncState())
    },

    resizeShape: (id, dimensions) => {
      history.resizeShape(id, dimensions)
      set(syncState())
    },

    updateShapeStyle: (id, style) => {
      history.updateShapeStyle(id, style)
      set(syncState())
    },

    updateShapeRotation: (id, rotation) => {
      history.updateShapeRotation(id, rotation)
      set(syncState())
    },

    updateShapeText: (id, text) => {
      history.updateShapeText(id, text)
      set(syncState())
    },

    moveAndResizeShape: (id, position, dimensions) => {
      history.moveAndResizeShape(id, position, dimensions)
      set(syncState())
    },

    batchUpdateShapeStyle: (ids, style) => {
      for (const id of ids) {
        history.updateShapeStyle(id, style)
      }
      set(syncState())
    },

    toggleShapeHidden: (id) => {
      const shape = model.getShape(id)
      if (!shape) return
      history.setShapeHidden(id, !shape.isHidden)
      set(syncState())
    },

    toggleShapeLocked: (id) => {
      const shape = model.getShape(id)
      if (!shape) return
      history.setShapeLocked(id, !shape.isLocked)
      set(syncState())
    },

    reorderShapes: (orderedIds) => {
      history.reorderShapes(orderedIds)
      set(syncState())
    },

    bringToFront: (id) => {
      history.bringToFront(id)
      set(syncState())
    },

    sendToBack: (id) => {
      history.sendToBack(id)
      set(syncState())
    },

    bringForward: (id) => {
      history.bringForward(id)
      set(syncState())
    },

    sendBackward: (id) => {
      history.sendBackward(id)
      set(syncState())
    },

    addConnection: (sourceId, targetId, options) => {
      history.addConnection(sourceId, targetId, options)
      set(syncState())
    },

    removeConnection: (connectionId) => {
      history.removeConnection(connectionId)
      set(syncState())
    },

    selectShape: (id) => {
      const { selectedShapeIds } = get()
      const shape = model.getShape(id)
      const groupShapeIds = shape?.groupId ? model.getGroupShapeIds(shape.groupId) : [id]

      let changed = false
      const next = new Set(selectedShapeIds)
      for (const gid of groupShapeIds) {
        if (!next.has(gid)) {
          next.add(gid)
          changed = true
        }
      }
      if (changed) {
        set({ selectedShapeIds: next })
      }
    },

    deselectShape: (id) => {
      const { selectedShapeIds } = get()
      const shape = model.getShape(id)
      const groupShapeIds = shape?.groupId ? model.getGroupShapeIds(shape.groupId) : [id]

      let changed = false
      const next = new Set(selectedShapeIds)
      for (const gid of groupShapeIds) {
        if (next.has(gid)) {
          next.delete(gid)
          changed = true
        }
      }
      if (changed) {
        set({ selectedShapeIds: next })
      }
    },

    toggleSelection: (id) => {
      const { selectedShapeIds } = get()
      const shape = model.getShape(id)
      const groupShapeIds = shape?.groupId ? model.getGroupShapeIds(shape.groupId) : [id]

      const next = new Set(selectedShapeIds)
      const isSelected = groupShapeIds.every(gid => next.has(gid))
      for (const gid of groupShapeIds) {
        if (isSelected) {
          next.delete(gid)
        } else {
          next.add(gid)
        }
      }
      set({ selectedShapeIds: next })
    },

    selectAll: () => {
      const ids = model.shapes.map(s => s.id)
      set({ selectedShapeIds: new Set(ids) })
    },

    clearSelection: () => {
      set({ selectedShapeIds: new Set() })
    },

    selectDiagramElement: (id) => {
      const { selectedDiagramElementIds } = get()
      if (selectedDiagramElementIds.has(id)) return
      const next = new Set(selectedDiagramElementIds)
      next.add(id)
      set({ selectedDiagramElementIds: next, selectedShapeIds: new Set() })
    },

    deselectDiagramElement: (id) => {
      const { selectedDiagramElementIds } = get()
      if (!selectedDiagramElementIds.has(id)) return
      const next = new Set(selectedDiagramElementIds)
      next.delete(id)
      set({ selectedDiagramElementIds: next })
    },

    toggleDiagramElement: (id) => {
      const { selectedDiagramElementIds } = get()
      const next = new Set(selectedDiagramElementIds)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      set({ selectedDiagramElementIds: next, selectedShapeIds: new Set() })
    },

    clearDiagramElementSelection: () => {
      set({ selectedDiagramElementIds: new Set() })
    },

    moveDiagramElement: (id, position) => {
      const { diagramElementPositions } = get()
      const current = diagramElementPositions[id]
      set({
        diagramElementPositions: {
          ...diagramElementPositions,
          [id]: {
            width: current?.width ?? 0,
            height: current?.height ?? 0,
            ...position,
          },
        },
      })
    },

    resizeDiagramElement: (id, size) => {
      const { diagramElementPositions } = get()
      const current = diagramElementPositions[id]
      set({
        diagramElementPositions: {
          ...diagramElementPositions,
          [id]: {
            x: current?.x ?? 0,
            y: current?.y ?? 0,
            ...size,
          },
        },
      })
    },

    updateDiagramColor: (elementId, color) => {
      const { diagramColors } = get()
      set({ diagramColors: { ...diagramColors, [elementId]: color } })
    },

    updateDiagramStrokeColor: (elementId, color) => {
      const { diagramStrokeColors } = get()
      set({ diagramStrokeColors: { ...diagramStrokeColors, [elementId]: color } })
    },

    setDiagramColors: (colors) => {
      set({ diagramColors: { ...colors } })
    },

    setViewBox: (viewBox) => {
      set({ viewBox })
    },

    toggleConnectMode: () => {
      set(s => ({ isConnectMode: !s.isConnectMode, selectedShapeIds: new Set() }))
    },

    mergeModel: (importedModel) => {
      model.mergeModel(importedModel)
      set({ ...syncState(), selectedShapeIds: new Set() })
    },

    mergeMermaid: (dsl) => {
      const { model: imported, subgraphGroups, sequenceData, diagramType, diagramData, diagramColors } = parseMermaid(dsl)

      model.clear()

      const idMap = new Map<string, string>()

      for (const importedShape of imported.shapes) {
        const newShape = model.mergeMermaidShape(importedShape)
        idMap.set(importedShape.id, newShape.id)
      }

      for (const conn of imported.connections) {
        const sourceId = idMap.get(conn.sourceId)
        const targetId = idMap.get(conn.targetId)
        if (sourceId && targetId) {
          model.addConnection(sourceId, targetId, {
            label: conn.label,
            arrowStyle: conn.arrowStyle,
            arrowHead: conn.arrowHead,
            arrowDirection: conn.arrowDirection,
            lineColor: conn.lineColor,
          })
        }
      }

      const resolvedGroups: SubgraphGroup[] = []
      for (const group of subgraphGroups) {
        const shapeIds = group.shapeIds
          .map(mermaidId => idMap.get(mermaidId))
          .filter((id): id is string => id !== undefined)
        if (shapeIds.length > 0) {
          resolvedGroups.push({ title: group.title, shapeIds })
        }
      }

      set({ ...syncState(), selectedShapeIds: new Set(), selectedDiagramElementIds: new Set(), subgraphGroups: resolvedGroups, sequenceData: sequenceData ?? null, diagramType, diagramData: diagramData ?? null, diagramColors: diagramColors ?? {}, diagramElementPositions: {}, diagramStrokeColors: {}, templateZIndex: 0 })
    },

    templateZIndex: 0,

    moveTemplateToFront: () => {
      set(s => ({ templateZIndex: s.shapes.length }))
    },

    moveTemplateToBack: () => {
      set({ templateZIndex: 0 })
    },

    moveTemplateUp: () => {
      set(s => ({ templateZIndex: Math.min(s.shapes.length, s.templateZIndex + 1) }))
    },

    moveTemplateDown: () => {
      set(s => ({ templateZIndex: Math.max(0, s.templateZIndex - 1) }))
    },

    setTemplateZIndex: (index: number) => {
      set(s => ({ templateZIndex: Math.max(0, Math.min(s.shapes.length, index)) }))
    },

    getModel: () => model,

    updateSubgraphStyle: (style) => {
      set(s => ({ subgraphStyle: { ...s.subgraphStyle, ...style } }))
    },

    groupSelectedShapes: () => {
      const { selectedShapeIds } = get()
      const shapeIds = Array.from(selectedShapeIds)
      if (shapeIds.length < 2) return
      const groupId = history.groupShapes(shapeIds)
      if (groupId) {
        set({ ...syncState(), selectedShapeIds: new Set(shapeIds) })
      }
    },

    ungroupSelectedShapes: () => {
      const { selectedShapeIds } = get()
      const shapeIds = Array.from(selectedShapeIds)
      const groupIdsToUngroup = new Set<string>()

      for (const id of shapeIds) {
        const shape = model.getShape(id)
        if (shape?.groupId) {
          groupIdsToUngroup.add(shape.groupId)
        }
      }

      if (groupIdsToUngroup.size === 0) return

      for (const groupId of groupIdsToUngroup) {
        history.ungroupShapes(groupId)
      }

      set({ ...syncState() })
    },
  }
})
