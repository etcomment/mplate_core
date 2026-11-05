import { useCallback, useRef, useMemo, useState } from 'react'
import { useDiagramStore } from '../store/diagramStore'
import { useTemplateStore } from '../templates/store'
import { ShapeRenderer } from './shapes/ShapeRenderer'
import { ConnectionLines } from './shapes/ConnectionLines'
import { SubgraphRenderer } from './shapes/SubgraphRenderer'
import { SequenceLifelines } from './shapes/SequenceLifelines'
import { PieRenderer } from './shapes/PieRenderer'
import { QuadrantRenderer } from './shapes/QuadrantRenderer'
import { TimelineRenderer } from './shapes/TimelineRenderer'
import { UserJourneyRenderer } from './shapes/UserJourneyRenderer'
import { GanttRenderer } from './shapes/GanttRenderer'
import { MindmapRenderer } from './shapes/MindmapRenderer'
import { GitGraphRenderer } from './shapes/GitGraphRenderer'
import { SankeyRenderer } from './shapes/SankeyRenderer'
import { XYChartRenderer } from './shapes/XYChartRenderer'
import { KanbanRenderer } from './shapes/KanbanRenderer'
import { C4Renderer } from './shapes/C4Renderer'
import { StateRenderer } from './shapes/StateRenderer'
import { ArchitectureRenderer } from './shapes/ArchitectureRenderer'
import { RadarRenderer } from './shapes/RadarRenderer'
import { WardleyRenderer } from './shapes/WardleyRenderer'
import { CynefinRenderer } from './shapes/CynefinRenderer'
import { SwimlanesRenderer } from './shapes/SwimlanesRenderer'
import { ZenUmlRenderer } from './shapes/ZenUmlRenderer'
import { VennRenderer } from './shapes/VennRenderer'
import { TreemapRenderer } from './shapes/TreemapRenderer'
import { IshikawaRenderer } from './shapes/IshikawaRenderer'
import { ErDiagramRenderer } from './shapes/ErDiagramRenderer'
import { GroupSelectionRenderer } from './shapes/GroupSelectionRenderer'
import { TemplateRenderer } from '../templates/TemplateRenderer'
import { GRID_SIZE, snapToGrid } from '../core/grid'
import type { ShapeType } from '../core/model/Shape'
import { calculateSmartGuides } from '../core/smartGuides'
import { useSmartGuidesStore } from '../store/smartGuidesStore'
import { SmartGuidesOverlay } from './SmartGuidesOverlay'

interface MarqueeRect {
  startX: number
  startY: number
  endX: number
  endY: number
}

export function Canvas() {
  const shapes = useDiagramStore(s => s.shapes)
  const selectedShapeIds = useDiagramStore(s => s.selectedShapeIds)
  const diagramType = useDiagramStore(s => s.diagramType)
  const templateZIndex = useDiagramStore(s => s.templateZIndex)
  const viewBox = useDiagramStore(s => s.viewBox)
  const setViewBox = useDiagramStore(s => s.setViewBox)
  const clearSelection = useDiagramStore(s => s.clearSelection)
  const clearDiagramElementSelection = useDiagramStore(s => s.clearDiagramElementSelection)
  const clearTemplateElementSelection = useTemplateStore(s => s.clearTemplateElementSelection)
  const toggleSelection = useDiagramStore(s => s.toggleSelection)
  const selectShape = useDiagramStore(s => s.selectShape)
  const moveShape = useDiagramStore(s => s.moveShape)
  const isConnectMode = useDiagramStore(s => s.isConnectMode)
  const addConnection = useDiagramStore(s => s.addConnection)

  const svgRef = useRef<SVGSVGElement>(null)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const dragTarget = useRef<string | null>(null)
  const dragStartMouse = useRef({ x: 0, y: 0 })
  const dragStartPositions = useRef<Map<string, { x: number; y: number }>>(new Map())
  const isDragging = useRef(false)
  const connectSourceId = useRef<string | null>(null)

  const [marquee, setMarquee] = useState<MarqueeRect | null>(null)

  const selectedSet = useMemo(
    () => new Set(selectedShapeIds),
    [selectedShapeIds],
  )

  const screenToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const svgEl = svgRef.current
      if (!svgEl) return { x: 0, y: 0 }
      const rect = svgEl.getBoundingClientRect()
      const mx = (clientX - rect.left - viewBox.x) / viewBox.scale
      const my = (clientY - rect.top - viewBox.y) / viewBox.scale
      return { x: mx, y: my }
    },
    [viewBox],
  )

  const isShapeInsideMarquee = useCallback(
    (shape: { position: { x: number; y: number }; dimensions: { width: number; height: number } }, marqueeRect: MarqueeRect) => {
      const minX = Math.min(marqueeRect.startX, marqueeRect.endX)
      const maxX = Math.max(marqueeRect.startX, marqueeRect.endX)
      const minY = Math.min(marqueeRect.startY, marqueeRect.endY)
      const maxY = Math.max(marqueeRect.startY, marqueeRect.endY)

      return (
        shape.position.x < maxX &&
        shape.position.x + shape.dimensions.width > minX &&
        shape.position.y < maxY &&
        shape.position.y + shape.dimensions.height > minY
      )
    },
    [],
  )

  const onMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // Middle-click → pan
      if (e.button === 1) {
        isPanning.current = true
        panStart.current = { x: e.clientX - viewBox.x, y: e.clientY - viewBox.y }
        return
      }

      if (e.button !== 0) return

      const target = e.target as HTMLElement
      const shapeElement = target.closest('[data-shape-id]')
      if (shapeElement) {
        const shapeId = shapeElement.getAttribute('data-shape-id')
        if (!shapeId) return

        if (isConnectMode) {
          if (connectSourceId.current === null) {
            connectSourceId.current = shapeId
            selectShape(shapeId)
            return
          }
          if (connectSourceId.current !== shapeId) {
            addConnection(connectSourceId.current, shapeId)
          }
          connectSourceId.current = null
          clearSelection()
          return
        }

        if (e.ctrlKey || e.metaKey) {
          toggleSelection(shapeId)
        } else {
          clearSelection()
          clearDiagramElementSelection()
          clearTemplateElementSelection()
          selectShape(shapeId)
        }

        dragStartMouse.current = { x: e.clientX, y: e.clientY }
        const currentSelectedIds = Array.from(useDiagramStore.getState().selectedShapeIds)
        dragStartPositions.current.clear()
    useSmartGuidesStore.getState().clearGuides()
        for (const sId of currentSelectedIds) {
          const s = shapes.find(item => item.id === sId)
          if (s && !s.isLocked) {
            dragStartPositions.current.set(sId, { x: s.position.x, y: s.position.y })
          }
        }
        if (dragStartPositions.current.size > 0) {
          dragTarget.current = shapeId
        }
        return
      }

      connectSourceId.current = null

      // Click on background / Start marquee selection
      if (!e.ctrlKey && !e.metaKey) {
        clearSelection()
        clearDiagramElementSelection()
        clearTemplateElementSelection()
      }
      const canvas = screenToCanvas(e.clientX, e.clientY)
      setMarquee({ startX: canvas.x, startY: canvas.y, endX: canvas.x, endY: canvas.y })
    },
    [toggleSelection, clearSelection, viewBox, isConnectMode, addConnection, selectShape, screenToCanvas, shapes, clearDiagramElementSelection, clearTemplateElementSelection],
  )

  const onMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (isPanning.current) {
        const dx = e.clientX - panStart.current.x
        const dy = e.clientY - panStart.current.y
        setViewBox({ ...viewBox, x: dx, y: dy })
        return
      }

      if (marquee) {
        const canvas = screenToCanvas(e.clientX, e.clientY)
        setMarquee({ ...marquee, endX: canvas.x, endY: canvas.y })
        return
      }

      if (dragTarget.current && !isConnectMode) {
        const dx = (e.clientX - dragStartMouse.current.x) / viewBox.scale
        const dy = (e.clientY - dragStartMouse.current.y) / viewBox.scale
        isDragging.current = true

        const targetShapeId = dragTarget.current
        const targetShape = shapes.find(s => s.id === targetShapeId)
        const targetStartPos = dragStartPositions.current.get(targetShapeId)

        let finalDx = dx
        let finalDy = dy

        if (targetShape && targetStartPos && !e.altKey) {
          const activeBox = {
            x: targetStartPos.x + dx,
            y: targetStartPos.y + dy,
            width: targetShape.dimensions.width,
            height: targetShape.dimensions.height,
          }

          const targetBoxes = shapes
            .filter(s => s.id !== targetShapeId && !dragStartPositions.current.has(s.id))
            .map(s => ({
              x: s.position.x,
              y: s.position.y,
              width: s.dimensions.width,
              height: s.dimensions.height,
            }))

          // Also get template boxes
          const templateStore = useTemplateStore.getState()
          for (const pos of Object.values(templateStore.templateElementPositions)) {
            targetBoxes.push({
              x: pos.x,
              y: pos.y,
              width: pos.width,
              height: pos.height,
            })
          }

          const { snappedBBox, guides } = calculateSmartGuides(activeBox, targetBoxes, 5 / viewBox.scale)
          
          useSmartGuidesStore.getState().setActiveGuides(guides)
          
          finalDx = snappedBBox.x - targetStartPos.x
          finalDy = snappedBBox.y - targetStartPos.y
        } else {
          useSmartGuidesStore.getState().clearGuides()
        }

        for (const [sId, startPos] of dragStartPositions.current.entries()) {
          moveShape(sId, {
            x: startPos.x + finalDx,
            y: startPos.y + finalDy,
          })
        }
      }
    },
    [viewBox, moveShape, setViewBox, isConnectMode, marquee, screenToCanvas],
  )

  const onMouseUp = useCallback(() => {
    isPanning.current = false

    if (isDragging.current && dragStartPositions.current.size > 0) {
      for (const [sId] of dragStartPositions.current.entries()) {
        const shape = shapes.find(s => s.id === sId)
        if (shape) {
          moveShape(sId, {
            x: snapToGrid(shape.position.x),
            y: snapToGrid(shape.position.y),
          })
        }
      }
      isDragging.current = false
    }
    dragTarget.current = null
    dragStartPositions.current.clear()

    if (marquee) {
      // Select shapes inside marquee
      for (const shape of shapes) {
        if (isShapeInsideMarquee(shape, marquee)) {
          selectShape(shape.id)
        }
      }
      // Select template elements inside marquee
      const templateElementPositions = useTemplateStore.getState().templateElementPositions
      const toggleTemplateElement = useTemplateStore.getState().toggleTemplateElement
      const selectedTemplateElementIds = useTemplateStore.getState().selectedTemplateElementIds
      for (const [tId, pos] of Object.entries(templateElementPositions)) {
        if (pos.width > 0 && pos.height > 0) {
          if (isShapeInsideMarquee({ position: { x: pos.x, y: pos.y }, dimensions: { width: pos.width, height: pos.height } }, marquee)) {
            if (!selectedTemplateElementIds.has(tId)) {
              toggleTemplateElement(tId)
            }
          }
        }
      }
      setMarquee(null)
    }
  }, [marquee, shapes, isShapeInsideMarquee, selectShape, moveShape])

  const onWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault()
      const step = e.deltaY > 0 ? -0.01 : 0.01
      const newScale = Math.max(0.1, Math.min(5, viewBox.scale + step))
      setViewBox({ ...viewBox, scale: Number(newScale.toFixed(3)) })
    },
    [viewBox, setViewBox],
  )

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  const addShape = useDiagramStore(s => s.addShape)

  const onDragOver = useCallback((e: React.DragEvent<SVGSVGElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback((e: React.DragEvent<SVGSVGElement>) => {
    e.preventDefault()
    const pos = screenToCanvas(e.clientX, e.clientY)
    const snapped = { x: snapToGrid(pos.x), y: snapToGrid(pos.y) }

    const shapeType = e.dataTransfer.getData('shapeType')
    if (shapeType) {
      addShape(shapeType as ShapeType, snapped, { width: 120, height: 80 })
      return
    }

    const iconName = e.dataTransfer.getData('templateIcon')
    if (iconName) {
      addShape('icon', snapped, { width: 80, height: 80 }, iconName)
      return
    }
  }, [screenToCanvas, addShape])

  const transform = `translate(${viewBox.x}, ${viewBox.y}) scale(${viewBox.scale})`

  return (
    <svg
      ref={svgRef}
      data-canvas-svg="true"
      width="100%"
      height="100%"
      style={{
        display: 'block',
        background: isConnectMode ? '#f0f4ff' : '#f8f8f8',
        cursor: isConnectMode ? 'crosshair' : isPanning.current ? 'grabbing' : 'default',
        touchAction: 'none',
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
      onContextMenu={onContextMenu}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <defs>
        <pattern
          id="grid"
          width={GRID_SIZE}
          height={GRID_SIZE}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
            fill="none"
            stroke="#e0e0e0"
            strokeWidth={0.5}
          />
        </pattern>
      </defs>

      <g transform={transform}>
        <rect x={-5000} y={-5000} width={10000} height={10000} fill="url(#grid)" />
        <SubgraphRenderer />
        <SequenceLifelines />
        <PieRenderer />
        <QuadrantRenderer />
        <TimelineRenderer />
        <UserJourneyRenderer />
        <GanttRenderer />
        <MindmapRenderer />
        <GitGraphRenderer />
        <SankeyRenderer />
        <XYChartRenderer />
        {diagramType !== 'sequence' && diagramType !== 'state' && diagramType !== 'architecture' && diagramType !== 'c4' && diagramType !== 'er' && <ConnectionLines />}

        <C4Renderer />
        <StateRenderer />
        <ArchitectureRenderer />
        <KanbanRenderer />
        <RadarRenderer />
        <WardleyRenderer />
        <CynefinRenderer />
        <SwimlanesRenderer />
        <ZenUmlRenderer />
        <VennRenderer />
        <TreemapRenderer />
        <IshikawaRenderer />
        <ErDiagramRenderer />

        {diagramType !== 'sequence' && diagramType !== 'state' && diagramType !== 'er' && diagramType !== 'architecture' && diagramType !== 'c4' && (() => {
          const clampedIndex = Math.max(0, Math.min(shapes.length, templateZIndex))
          const shapeElements = shapes.map((shape) => (
            <g key={shape.id} data-shape-id={shape.id}>
              <ShapeRenderer
                shape={shape}
                isSelected={selectedSet.has(shape.id)}
              />
            </g>
          ))

          const result = []
          for (let i = 0; i <= shapes.length; i++) {
            if (i === clampedIndex) {
              result.push(<TemplateRenderer key="template-layer" />)
            }
            if (i < shapes.length) {
              result.push(shapeElements[i])
            }
          }
          return result
        })()}

        <GroupSelectionRenderer />
        <SmartGuidesOverlay />

        {marquee && (
          <rect
            x={Math.min(marquee.startX, marquee.endX)}
            y={Math.min(marquee.startY, marquee.endY)}
            width={Math.abs(marquee.endX - marquee.startX)}
            height={Math.abs(marquee.endY - marquee.startY)}
            fill="rgba(74, 144, 217, 0.1)"
            stroke="#4a90d9"
            strokeWidth={1}
            strokeDasharray="4 2"
          />
        )}
      </g>
    </svg>
  )
}
