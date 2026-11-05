import { useRef, useCallback, useState, useEffect } from 'react'
import { useTemplateStore } from './store'
import { useSmartGuidesStore } from '../store/smartGuidesStore'
import { calculateSmartGuides } from '../core/smartGuides'
import { useDiagramStore } from '../store/diagramStore'

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

type Corner = 'nw' | 'ne' | 'sw' | 'se'

interface Interaction {
  id: string
  kind: 'drag' | 'resize' | 'rotate'
  corner?: Corner
  startMouse: { x: number; y: number }
  startRect: Rect
  hasMoved: boolean
  allStartRects?: Record<string, Rect>
  allStartRotations?: Record<string, number>
  screenCX?: number
  screenCY?: number
  startAngle?: number
}

const DRAG_THRESHOLD = 3
const HANDLE_SIZE = 8
const MIN_SIZE = 20

export function useTemplateDragResize(svgRef: React.RefObject<SVGGElement | null>) {
  const interactionRef = useRef<Interaction | null>(null)
  const renderedRectsRef = useRef<Map<string, Rect>>(new Map())
  const pendingRectsRef = useRef<Map<string, Rect>>(new Map())
  const [currentRotation, setCurrentRotation] = useState<number | null>(null)

  const toggleElement = useTemplateStore(s => s.toggleTemplateElement)
  const selectElement = useTemplateStore(s => s.selectTemplateElement)
  const moveElement = useTemplateStore(s => s.moveTemplateElement)
  const resizeElement = useTemplateStore(s => s.resizeTemplateElement)
  const rotateElement = useTemplateStore(s => s.rotateTemplateElement)
  const initElement = useTemplateStore(s => s.initTemplateElement)
  const selectedIds = useTemplateStore(s => s.selectedTemplateElementIds)
  const templateElementPositions = useTemplateStore(s => s.templateElementPositions)
  const templateElementRotations = useTemplateStore(s => s.templateElementRotations)

  const onMouseMoveRef = useRef<(e: MouseEvent) => void>(() => {})
  const onMouseUpRef = useRef<(e: MouseEvent) => void>(() => {})

  const stableOnMouseMove = useCallback((e: MouseEvent) => onMouseMoveRef.current(e), [])
  const stableOnMouseUp = useCallback((e: MouseEvent) => onMouseUpRef.current(e), [])

  const toSvgPoint = useCallback((e: MouseEvent): { x: number; y: number } => {
    const viewBox = useDiagramStore.getState().viewBox
    const svg = svgRef.current?.ownerSVGElement || svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const x = (e.clientX - rect.left - viewBox.x) / viewBox.scale
    const y = (e.clientY - rect.top - viewBox.y) / viewBox.scale
    return { x, y }
  }, [svgRef])

  onMouseUpRef.current = (e: MouseEvent) => {
    const interaction = interactionRef.current
    if (!interaction) return
    interactionRef.current = null
    setCurrentRotation(null)
    window.removeEventListener('mousemove', stableOnMouseMove)
    window.removeEventListener('mouseup', stableOnMouseUp)
    useSmartGuidesStore.getState().clearGuides()
    if (!interaction.hasMoved && interaction.kind === 'drag') {
      if (e.ctrlKey || e.metaKey) {
        toggleElement(interaction.id)
      } else {
        useDiagramStore.getState().clearSelection()
        useDiagramStore.getState().clearDiagramElementSelection()
        selectElement(interaction.id)
      }
    }
  }

  onMouseMoveRef.current = (e: MouseEvent) => {
    const interaction = interactionRef.current
    if (!interaction) return
    const { x, y } = toSvgPoint(e)
    const dx = x - interaction.startMouse.x
    const dy = y - interaction.startMouse.y

    if (interaction.kind === 'rotate') {
      interaction.hasMoved = true
      let angle = 0

      // If we have screen coordinates for the center, use client coordinates for precise rotation
      if (interaction.screenCX !== undefined && interaction.screenCY !== undefined) {
        const dx = e.clientX - interaction.screenCX
        const dy = e.clientY - interaction.screenCY
        angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90
      } else {
        const centerX = interaction.startRect.x + interaction.startRect.width / 2
        const centerY = interaction.startRect.y + interaction.startRect.height / 2
        const rdx = x - centerX
        const rdy = y - centerY
        angle = Math.atan2(rdy, rdx) * (180 / Math.PI) + 90
      }

      if (angle < 0) angle += 360
      if (angle >= 360) angle -= 360

      if (e.shiftKey) {
        angle = Math.round(angle / 15) * 15
        if (angle === 360) angle = 0
      } else {
        angle = Math.round(angle)
      }

      setCurrentRotation(angle)

      if (interaction.allStartRects && interaction.allStartRotations && Object.keys(interaction.allStartRects).length > 1) {
        const deltaAngle = angle - (interaction.startAngle || 0)
        const rad = (deltaAngle * Math.PI) / 180
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)
        const centerX = interaction.startRect.x + interaction.startRect.width / 2
        const centerY = interaction.startRect.y + interaction.startRect.height / 2

        for (const [sid, sRect] of Object.entries(interaction.allStartRects)) {
          const sCenterX = sRect.x + sRect.width / 2
          const sCenterY = sRect.y + sRect.height / 2
          const relX = sCenterX - centerX
          const relY = sCenterY - centerY
          
          const newCenterX = centerX + (relX * cos - relY * sin)
          const newCenterY = centerY + (relX * sin + relY * cos)
          
          moveElement(sid, { x: newCenterX - sRect.width / 2, y: newCenterY - sRect.height / 2 })
          
          let newRot = (interaction.allStartRotations![sid] || 0) + deltaAngle
          if (newRot < 0) newRot += 360
          if (newRot >= 360) newRot -= 360
          rotateElement(sid, newRot)
        }
      } else {
        rotateElement(interaction.id, angle)
      }
      return
    }

    if (interaction.kind === 'drag') {
      if (!interaction.hasMoved) {
        if (Math.hypot(dx, dy) <= DRAG_THRESHOLD) return
        interaction.hasMoved = true
      }
      let useX = (e.ctrlKey || e.metaKey) ? dx : (e.shiftKey ? 0 : dx)
      let useY = e.shiftKey ? dy : (e.ctrlKey || e.metaKey) ? 0 : dy

      if (!e.altKey) {
        const diagramStore = useDiagramStore.getState()
        const targetBoxes = []
        for (const s of diagramStore.shapes) {
          targetBoxes.push({ x: s.position.x, y: s.position.y, width: s.dimensions.width, height: s.dimensions.height })
        }
        for (const [sid, pos] of Object.entries(templateElementPositions)) {
          if (!selectedIds.has(sid)) {
            targetBoxes.push({ x: pos.x, y: pos.y, width: pos.width, height: pos.height })
          }
        }

        const activeBox = {
          x: interaction.startRect.x + useX,
          y: interaction.startRect.y + useY,
          width: interaction.startRect.width,
          height: interaction.startRect.height,
        }
        const { snappedBBox, guides } = calculateSmartGuides(activeBox, targetBoxes, 5)
        useSmartGuidesStore.getState().setActiveGuides(guides)

        useX = snappedBBox.x - interaction.startRect.x
        useY = snappedBBox.y - interaction.startRect.y
      } else {
        useSmartGuidesStore.getState().clearGuides()
      }

      if (interaction.allStartRects) {
        for (const [sid, startR] of Object.entries(interaction.allStartRects)) {
          moveElement(sid, {
            x: startR.x + useX,
            y: startR.y + useY,
          })
        }
      }
      return
    }

    if (interaction.kind === 'resize' && interaction.corner) {
      interaction.hasMoved = true
      const start = interaction.startRect
      let nextX = start.x
      let nextY = start.y
      let nextW = start.width
      let nextH = start.height

      if (interaction.corner === 'se') {
        nextW = Math.max(MIN_SIZE, x - start.x)
        nextH = Math.max(MIN_SIZE, y - start.y)
      } else if (interaction.corner === 'sw') {
        const right = start.x + start.width
        nextX = Math.min(x, right - MIN_SIZE)
        nextW = Math.max(MIN_SIZE, right - x)
        nextH = Math.max(MIN_SIZE, y - start.y)
      } else if (interaction.corner === 'ne') {
        const bottom = start.y + start.height
        nextY = Math.min(y, bottom - MIN_SIZE)
        nextW = Math.max(MIN_SIZE, x - start.x)
        nextH = Math.max(MIN_SIZE, bottom - y)
      } else {
        const right = start.x + start.width
        const bottom = start.y + start.height
        nextX = Math.min(x, right - MIN_SIZE)
        nextY = Math.min(y, bottom - MIN_SIZE)
        nextW = Math.max(MIN_SIZE, right - x)
        nextH = Math.max(MIN_SIZE, bottom - y)
      }

      if (e.shiftKey && start.width > 0 && start.height > 0) {
        const ratio = start.width / start.height
        if (Math.abs(x - interaction.startMouse.x) > Math.abs(y - interaction.startMouse.y)) {
          nextH = nextW / ratio
        } else {
          nextW = nextH * ratio
        }
        if (interaction.corner === 'nw') {
          nextX = start.x + (start.width - nextW)
          nextY = start.y + (start.height - nextH)
        } else if (interaction.corner === 'ne') {
          nextY = start.y + (start.height - nextH)
        } else if (interaction.corner === 'sw') {
          nextX = start.x + (start.width - nextW)
        }
      }

      if (!e.altKey) {
        const diagramStore = useDiagramStore.getState()
        const targetBoxes = []
        for (const s of diagramStore.shapes) {
          targetBoxes.push({ x: s.position.x, y: s.position.y, width: s.dimensions.width, height: s.dimensions.height })
        }
        for (const [sid, pos] of Object.entries(templateElementPositions)) {
          if (!selectedIds.has(sid)) {
            targetBoxes.push({ x: pos.x, y: pos.y, width: pos.width, height: pos.height })
          }
        }

        const activeBox = { x: nextX, y: nextY, width: nextW, height: nextH }
        const { snappedBBox, guides } = calculateSmartGuides(activeBox, targetBoxes, 5)
        useSmartGuidesStore.getState().setActiveGuides(guides)

        if (interaction.corner === 'se') {
          if (snappedBBox.x !== nextX) nextW += (snappedBBox.x - nextX)
          if (snappedBBox.y !== nextY) nextH += (snappedBBox.y - nextY)
        } else if (interaction.corner === 'sw') {
          nextW += (nextX - snappedBBox.x)
          nextX = snappedBBox.x
          if (snappedBBox.y !== nextY) nextH += (snappedBBox.y - nextY)
        }
      } else {
        useSmartGuidesStore.getState().clearGuides()
      }

      if (interaction.allStartRects && start.width > 0 && start.height > 0) {
        const scaleX = nextW / start.width
        const scaleY = nextH / start.height

        for (const [sid, startR] of Object.entries(interaction.allStartRects)) {
          const relativeX = startR.x - start.x
          const relativeY = startR.y - start.y
          moveElement(sid, {
            x: nextX + relativeX * scaleX,
            y: nextY + relativeY * scaleY,
          })
          resizeElement(sid, {
            width: startR.width * scaleX,
            height: startR.height * scaleY,
          })
        }
      } else {
        resizeElement(interaction.id, { width: nextW, height: nextH })
        moveElement(interaction.id, { x: nextX, y: nextY })
      }
    }
  }

  const startInteraction = useCallback((e: React.MouseEvent, id: string, rect: Rect, kind: 'drag' | 'resize' | 'rotate', corner?: Corner) => {
    e.stopPropagation()
    e.preventDefault()
    if (interactionRef.current) return
    const mouseEvent = e.nativeEvent
    const { x, y } = toSvgPoint(mouseEvent)

    const allStartRects: Record<string, Rect> = {}
    const allStartRotations: Record<string, number> = {}
    let groupStartRect = rect

    const isMulti = selectedIds.size > 1 && selectedIds.has(id)
    const targetIds = isMulti ? Array.from(selectedIds) : [id]

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const sid of targetIds) {
      const pos = templateElementPositions[sid] || renderedRectsRef.current.get(sid) || (sid === id ? rect : { x: 0, y: 0, width: 40, height: 40 })
      allStartRects[sid] = { ...pos }
      allStartRotations[sid] = templateElementRotations[sid] || 0
      minX = Math.min(minX, pos.x)
      minY = Math.min(minY, pos.y)
      maxX = Math.max(maxX, pos.x + pos.width)
      maxY = Math.max(maxY, pos.y + pos.height)
    }

    if (minX !== Infinity && isMulti) {
      groupStartRect = { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    } else {
      groupStartRect = rect
    }

    let screenCX: number | undefined
    let screenCY: number | undefined
    let startAngle: number | undefined

    if (kind === 'rotate') {
      screenCX = e.clientX
      screenCY = e.clientY + 24
      const svg = svgRef.current?.ownerSVGElement || svgRef.current
      if (svg) {
        const pt = (svg as SVGSVGElement).createSVGPoint()
        pt.x = groupStartRect.x + groupStartRect.width / 2
        pt.y = groupStartRect.y + groupStartRect.height / 2
        const parentEl = (e.currentTarget as SVGElement).parentNode as SVGGraphicsElement | null
        const ctm = parentEl?.getScreenCTM() || (svg as SVGSVGElement).getScreenCTM()
        if (ctm) {
          const screenCenter = pt.matrixTransform(ctm)
          screenCX = screenCenter.x
          screenCY = screenCenter.y
        }
      }
      
      const dx = e.clientX - screenCX
      const dy = e.clientY - screenCY
      let ang = Math.atan2(dy, dx) * (180 / Math.PI) + 90
      if (ang < 0) ang += 360
      if (ang >= 360) ang -= 360
      startAngle = ang
    }

    interactionRef.current = {
      id,
      kind,
      corner,
      startMouse: { x, y },
      startRect: groupStartRect,
      hasMoved: kind === 'resize' || kind === 'rotate',
      allStartRects,
      allStartRotations,
      screenCX,
      screenCY,
      startAngle,
    }
    window.addEventListener('mousemove', stableOnMouseMove)
    window.addEventListener('mouseup', stableOnMouseUp)
  }, [toSvgPoint, stableOnMouseMove, stableOnMouseUp, selectedIds, templateElementPositions])

  const startDrag = useCallback((e: React.MouseEvent, id: string, rect: Rect) => {
    startInteraction(e, id, rect, 'drag')
  }, [startInteraction])

  const startResize = useCallback((e: React.MouseEvent, id: string, corner: Corner, rect: Rect) => {
    startInteraction(e, id, rect, 'resize', corner)
  }, [startInteraction])

  const startRotate = useCallback((e: React.MouseEvent, id: string, rect: Rect) => {
    startInteraction(e, id, rect, 'rotate')
  }, [startInteraction])

  const getTransform = useCallback((id: string, rect: Rect) => {
    pendingRectsRef.current.set(id, rect)
    const rot = templateElementRotations[id]
    if (!rot) return undefined
    const cx = rect.x + rect.width / 2
    const cy = rect.y + rect.height / 2
    return `rotate(${rot}, ${cx}, ${cy})`
  }, [templateElementRotations])

  const renderHandles = useCallback((visualRect: Rect, id: string) => {
    renderedRectsRef.current.set(id, visualRect)
    const hiddenIds = useTemplateStore.getState().hiddenTemplateElementIds
    if (hiddenIds.has(id)) return null
    if (!selectedIds.has(id)) return null

    let renderRect = visualRect
    if (selectedIds.size > 1) {
      const firstId = Array.from(selectedIds)[0]
      if (id !== firstId) return null

      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity

      for (const sid of selectedIds) {
        const pos = templateElementPositions[sid] || renderedRectsRef.current.get(sid)
        if (pos) {
          minX = Math.min(minX, pos.x)
          minY = Math.min(minY, pos.y)
          maxX = Math.max(maxX, pos.x + pos.width)
          maxY = Math.max(maxY, pos.y + pos.height)
        }
      }
      if (minX !== Infinity) {
        renderRect = { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
      }
    }

    const half = HANDLE_SIZE / 2
    const handles: Array<{ corner: Corner; x: number; y: number; cursor: string }> = [
      { corner: 'nw', x: renderRect.x - half, y: renderRect.y - half, cursor: 'nwse-resize' },
      { corner: 'ne', x: renderRect.x + renderRect.width - half, y: renderRect.y - half, cursor: 'nesw-resize' },
      { corner: 'sw', x: renderRect.x - half, y: renderRect.y + renderRect.height - half, cursor: 'nesw-resize' },
      { corner: 'se', x: renderRect.x + renderRect.width - half, y: renderRect.y + renderRect.height - half, cursor: 'nwse-resize' },
    ]

    const centerX = renderRect.x + renderRect.width / 2
    const rotationY = renderRect.y - 24
    const activeRot = currentRotation ?? (templateElementRotations[id] || 0)

    return (
      <g data-selection-handles="true" pointerEvents="all">
        {selectedIds.size > 1 && (
          <rect
            x={renderRect.x}
            y={renderRect.y}
            width={renderRect.width}
            height={renderRect.height}
            fill="none"
            stroke="#2196F3"
            strokeWidth={1}
            strokeDasharray="4 4"
            pointerEvents="none"
          />
        )}
        {handles.map(h => (
          <rect
            key={h.corner}
            x={h.x}
            y={h.y}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#fff"
            stroke="#2196F3"
            strokeWidth={1}
            style={{ cursor: h.cursor }}
            onMouseDown={e => startResize(e, id, h.corner, renderRect)}
          />
        ))}

        {/* Rotation Handle Line & Circle */}
        <line
          x1={centerX}
          y1={renderRect.y - 4}
          x2={centerX}
          y2={rotationY}
          stroke="#2196F3"
          strokeWidth={1.5}
        />
        <circle
          cx={centerX}
          cy={rotationY}
          r={5}
          fill="#fff"
          stroke="#2196F3"
          strokeWidth={1.5}
          style={{ cursor: 'grab' }}
          onMouseDown={e => startRotate(e, id, renderRect)}
        />

        {/* Live Degree Badge Pill */}
        {(currentRotation !== null || activeRot > 0) && (
          <g transform={`translate(${centerX}, ${renderRect.y - 45})`}>
            <rect
              x={-20}
              y={-12}
              width={40}
              height={24}
              rx={12}
              fill="#2196F3"
              pointerEvents="none"
            />
            <text
              x={0}
              y={4}
              fill="white"
              fontSize={12}
              fontFamily="sans-serif"
              fontWeight="bold"
              textAnchor="middle"
              pointerEvents="none"
            >
              {activeRot}°
            </text>
          </g>
        )}
      </g>
    )
  }, [selectedIds, startResize, startRotate, templateElementPositions, templateElementRotations, currentRotation])

  useEffect(() => {
    const snapshot = new Map(pendingRectsRef.current)
    pendingRectsRef.current.clear()
    const { templateElementPositions } = useTemplateStore.getState()
    let changed = false
    const next = { ...templateElementPositions }
    for (const [id, rect] of snapshot) {
      if (!next[id]) {
        next[id] = { ...rect }
        changed = true
      }
    }
    if (changed) {
      useTemplateStore.setState({ templateElementPositions: next })
    }
  })

  return { startDrag, startResize, startRotate, getTransform, renderHandles, toSvgPoint }
}
