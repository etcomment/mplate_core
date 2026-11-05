import { useCallback, useRef, useState } from 'react'
import { useDiagramStore } from '../../store/diagramStore'
import { snapToGrid } from '../../core/grid'
import { calculateSmartGuides } from '../../core/smartGuides'
import { useSmartGuidesStore } from '../../store/smartGuidesStore'
import { useTemplateStore } from '../../templates/store'

interface GroupBox {
  id: string
  minX: number
  minY: number
  width: number
  height: number
  shapeIds: string[]
}

interface GroupResizeHandlesProps {
  readonly groupBox: GroupBox
}

type HandlePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

const HANDLE_SIZE = 8

function getHandleCoordinates(box: GroupBox, position: HandlePosition) {
  const { minX: x, minY: y, width: w, height: h } = box
  switch (position) {
    case 'top-left': return { x: x - HANDLE_SIZE / 2, y: y - HANDLE_SIZE / 2, cursor: 'nwse-resize' }
    case 'top-right': return { x: x + w - HANDLE_SIZE / 2, y: y - HANDLE_SIZE / 2, cursor: 'nesw-resize' }
    case 'bottom-left': return { x: x - HANDLE_SIZE / 2, y: y + h - HANDLE_SIZE / 2, cursor: 'nesw-resize' }
    case 'bottom-right': return { x: x + w - HANDLE_SIZE / 2, y: y + h - HANDLE_SIZE / 2, cursor: 'nwse-resize' }
  }
}

export function GroupResizeHandles({ groupBox }: GroupResizeHandlesProps) {
  const moveAndResizeShape = useDiagramStore(s => s.moveAndResizeShape)
  const updateShapeRotation = useDiagramStore(s => s.updateShapeRotation)
  const shapes = useDiagramStore(s => s.shapes)
  
  const isDragging = useRef(false)
  const isRotating = useRef(false)
  const [currentRotation, setCurrentRotation] = useState<number | null>(null)
  const handleRef = useRef<HandlePosition | null>(null)
  
  const startMouse = useRef({ x: 0, y: 0 })
  const startBox = useRef({ ...groupBox })
  const startShapes = useRef<Array<{ id: string, x: number, y: number, w: number, h: number, rot: number }>>([])

  const onMouseDown = useCallback(
    (e: React.MouseEvent, position: HandlePosition) => {
      e.stopPropagation()
      e.preventDefault()
      isDragging.current = true
      handleRef.current = position
      startMouse.current = { x: e.clientX, y: e.clientY }
      startBox.current = { ...groupBox }
      startShapes.current = groupBox.shapeIds
        .map(id => shapes.find(s => s.id === id))
        .filter((s): s is NonNullable<typeof s> => !!s)
        .map(s => ({ id: s.id, x: s.position.x, y: s.position.y, w: s.dimensions.width, h: s.dimensions.height, rot: s.rotation ?? 0 }))

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging.current || !handleRef.current) return
        const dx = moveEvent.clientX - startMouse.current.x
        const dy = moveEvent.clientY - startMouse.current.y
        const pos = startBox.current
        const hPos = handleRef.current

        let newX = pos.minX
        let newY = pos.minY
        let newW = pos.width
        let newH = pos.height

        switch (hPos) {
          case 'top-left':
            newX = pos.minX + dx
            newY = pos.minY + dy
            newW = pos.width - dx
            newH = pos.height - dy
            break
          case 'top-right':
            newY = pos.minY + dy
            newW = pos.width + dx
            newH = pos.height - dy
            break
          case 'bottom-left':
            newX = pos.minX + dx
            newW = pos.width - dx
            newH = pos.height + dy
            break
          case 'bottom-right':
            newW = pos.width + dx
            newH = pos.height + dy
            break
        }

        if (moveEvent.shiftKey && pos.width > 0 && pos.height > 0) {
          const ratio = pos.width / pos.height
          if (Math.abs(dx) > Math.abs(dy)) {
            newH = newW / ratio
          } else {
            newW = newH * ratio
          }
          if (hPos === 'top-left') {
            newX = pos.minX + (pos.width - newW)
            newY = pos.minY + (pos.height - newH)
          } else if (hPos === 'top-right') {
            newY = pos.minY + (pos.height - newH)
          } else if (hPos === 'bottom-left') {
            newX = pos.minX + (pos.width - newW)
          }
        }

        if (!moveEvent.altKey) {
          const diagramStore = useDiagramStore.getState()
          const templateStore = useTemplateStore.getState()
          const targetBoxes = []
          const shapeIdSet = new Set(groupBox.shapeIds)
          for (const s of diagramStore.shapes) {
            if (!shapeIdSet.has(s.id)) {
              targetBoxes.push({ x: s.position.x, y: s.position.y, width: s.dimensions.width, height: s.dimensions.height })
            }
          }
          for (const pos of Object.values(templateStore.templateElementPositions)) {
            targetBoxes.push({ x: pos.x, y: pos.y, width: pos.width, height: pos.height })
          }

          const activeBox = { x: newX, y: newY, width: newW, height: newH }
          const { snappedBBox, guides } = calculateSmartGuides(activeBox, targetBoxes, 5)
          useSmartGuidesStore.getState().setActiveGuides(guides)

          if (hPos === 'bottom-right') {
            if (snappedBBox.x !== newX) newW += (snappedBBox.x - newX)
            if (snappedBBox.y !== newY) newH += (snappedBBox.y - newY)
          } else if (hPos === 'top-left') {
            newW += (newX - snappedBBox.x)
            newH += (newY - snappedBBox.y)
            newX = snappedBBox.x
            newY = snappedBBox.y
          } else if (hPos === 'top-right') {
            if (snappedBBox.x !== newX) newW += (snappedBBox.x - newX)
            newH += (newY - snappedBBox.y)
            newY = snappedBBox.y
          } else if (hPos === 'bottom-left') {
            newW += (newX - snappedBBox.x)
            newX = snappedBBox.x
            if (snappedBBox.y !== newY) newH += (snappedBBox.y - newY)
          }
        } else {
          useSmartGuidesStore.getState().clearGuides()
        }

        const minSize = 20
        if (newW < minSize) {
          if (hPos === 'top-left' || hPos === 'bottom-left') newX = pos.minX + pos.width - minSize
          newW = minSize
        }
        if (newH < minSize) {
          if (hPos === 'top-left' || hPos === 'top-right') newY = pos.minY + pos.height - minSize
          newH = minSize
        }

        const scaleX = newW / pos.width
        const scaleY = newH / pos.height

        for (const s of startShapes.current) {
          const sx = newX + (s.x - pos.minX) * scaleX
          const sy = newY + (s.y - pos.minY) * scaleY
          const sw = s.w * scaleX
          const sh = s.h * scaleY
          moveAndResizeShape(s.id, { x: snapToGrid(sx), y: snapToGrid(sy) }, { width: snapToGrid(sw), height: snapToGrid(sh) })
        }
      }

      const handleMouseUp = () => {
        isDragging.current = false
        handleRef.current = null
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
        useSmartGuidesStore.getState().clearGuides()
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [groupBox, shapes, moveAndResizeShape],
  )

  const onRotateMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    const svg = (e.currentTarget as SVGElement).ownerSVGElement
    let screenCX = e.clientX
    let screenCY = e.clientY + 24

    if (svg) {
      const pt = svg.createSVGPoint()
      pt.x = groupBox.minX + groupBox.width / 2
      pt.y = groupBox.minY + groupBox.height / 2
      const parent = (e.currentTarget as SVGElement).parentNode as unknown as SVGGraphicsElement | null
      const ctm = parent?.getScreenCTM()
      if (ctm) {
        const screenCenter = pt.matrixTransform(ctm)
        screenCX = screenCenter.x
        screenCY = screenCenter.y
      }
    }

    isRotating.current = true
    const center = { x: groupBox.minX + groupBox.width / 2, y: groupBox.minY + groupBox.height / 2 }
    
    startShapes.current = groupBox.shapeIds
      .map(id => shapes.find(s => s.id === id))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map(s => ({ id: s.id, x: s.position.x, y: s.position.y, w: s.dimensions.width, h: s.dimensions.height, rot: s.rotation ?? 0 }))

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isRotating.current) return
      const dx = moveEvent.clientX - screenCX
      const dy = moveEvent.clientY - screenCY
      let angle = Math.atan2(dy, dx) * (180 / Math.PI)
      angle += 90
      if (angle < 0) angle += 360
      if (angle >= 360) angle -= 360
      
      if (moveEvent.shiftKey) {
        angle = Math.round(angle / 15) * 15
        if (angle === 360) angle = 0
      } else {
        angle = Math.round(angle)
      }
      
      setCurrentRotation(angle)
      const deltaAngle = angle
      const rad = (deltaAngle * Math.PI) / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)

      for (const s of startShapes.current) {
        const sCenterX = s.x + s.w / 2
        const sCenterY = s.y + s.h / 2
        const relX = sCenterX - center.x
        const relY = sCenterY - center.y
        const newCenterX = center.x + (relX * cos - relY * sin)
        const newCenterY = center.y + (relX * sin + relY * cos)
        
        moveAndResizeShape(s.id, { x: newCenterX - s.w / 2, y: newCenterY - s.h / 2 }, { width: s.w, height: s.h })
        let newRot = s.rot + deltaAngle
        if (newRot < 0) newRot += 360
        if (newRot >= 360) newRot -= 360
        updateShapeRotation(s.id, Math.round(newRot))
      }
    }

    const handleMouseUp = () => {
      isRotating.current = false
      setCurrentRotation(null)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [groupBox, shapes, moveAndResizeShape, updateShapeRotation])

  const handles: HandlePosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']

  return (
    <>
      {handles.map((position) => {
        const { x, y, cursor } = getHandleCoordinates(groupBox, position)
        return (
          <rect
            key={position}
            x={x}
            y={y}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="white"
            stroke="#4a90d9"
            strokeWidth={1.5}
            style={{ cursor, pointerEvents: 'auto' }}
            onMouseDown={(e) => onMouseDown(e, position)}
          />
        )
      })}
      
      {/* Rotation Handle */}
      <line
        x1={groupBox.minX + groupBox.width / 2}
        y1={groupBox.minY - 4}
        x2={groupBox.minX + groupBox.width / 2}
        y2={groupBox.minY - 24}
        stroke="#4a90d9"
        strokeWidth={1.5}
        pointerEvents="none"
      />
      <circle
        cx={groupBox.minX + groupBox.width / 2}
        cy={groupBox.minY - 24}
        r={5}
        fill="white"
        stroke="#4a90d9"
        strokeWidth={1.5}
        style={{ cursor: 'grab', pointerEvents: 'auto' }}
        onMouseDown={onRotateMouseDown}
      />
      {currentRotation !== null && (
        <g transform={`translate(${groupBox.minX + groupBox.width / 2}, ${groupBox.minY - 45})`}>
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
            {currentRotation}°
          </text>
        </g>
      )}
    </>
  )
}
