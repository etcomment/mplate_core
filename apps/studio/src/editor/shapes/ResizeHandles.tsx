import { useCallback, useRef, useState } from 'react'
import { useDiagramStore } from '../../store/diagramStore'
import { snapToGrid } from '../../core/grid'
import { calculateSmartGuides } from '../../core/smartGuides'
import { useSmartGuidesStore } from '../../store/smartGuidesStore'
import { useTemplateStore } from '../../templates/store'
import type { Shape } from '../../core/model/Shape'

interface ResizeHandlesProps {
  readonly shape: Shape
}

type HandlePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

const HANDLE_SIZE = 8

function getHandleCoordinates(shape: Shape, position: HandlePosition) {
  const { x, y } = shape.position
  const { width: w, height: h } = shape.dimensions

  switch (position) {
    case 'top-left': return { x: x - HANDLE_SIZE / 2, y: y - HANDLE_SIZE / 2, cursor: 'nwse-resize' }
    case 'top-right': return { x: x + w - HANDLE_SIZE / 2, y: y - HANDLE_SIZE / 2, cursor: 'nesw-resize' }
    case 'bottom-left': return { x: x - HANDLE_SIZE / 2, y: y + h - HANDLE_SIZE / 2, cursor: 'nesw-resize' }
    case 'bottom-right': return { x: x + w - HANDLE_SIZE / 2, y: y + h - HANDLE_SIZE / 2, cursor: 'nwse-resize' }
  }
}

export function ResizeHandles({ shape }: ResizeHandlesProps) {
  const resizeShape = useDiagramStore(s => s.moveAndResizeShape)
  const updateShapeRotation = useDiagramStore(s => s.updateShapeRotation)
  const isDragging = useRef(false)
  const isRotating = useRef(false)
  const [currentRotation, setCurrentRotation] = useState<number | null>(null)
  const handleRef = useRef<HandlePosition | null>(null)
  const startMouse = useRef({ x: 0, y: 0 })
  const startDimensions = useRef({ width: 0, height: 0 })
  const startPosition = useRef({ x: 0, y: 0 })

  const onMouseDown = useCallback(
    (e: React.MouseEvent, position: HandlePosition) => {
      e.stopPropagation()
      e.preventDefault()
      isDragging.current = true
      handleRef.current = position
      startMouse.current = { x: e.clientX, y: e.clientY }
      startDimensions.current = { ...shape.dimensions }
      startPosition.current = { ...shape.position }

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging.current || !handleRef.current) return
        const dx = moveEvent.clientX - startMouse.current.x
        const dy = moveEvent.clientY - startMouse.current.y
        const pos = startPosition.current
        const dim = startDimensions.current
        const hPos = handleRef.current

        let newX = pos.x
        let newY = pos.y
        let newW = dim.width
        let newH = dim.height

        switch (hPos) {
          case 'top-left':
            newX = pos.x + dx
            newY = pos.y + dy
            newW = dim.width - dx
            newH = dim.height - dy
            break
          case 'top-right':
            newY = pos.y + dy
            newW = dim.width + dx
            newH = dim.height - dy
            break
          case 'bottom-left':
            newX = pos.x + dx
            newW = dim.width - dx
            newH = dim.height + dy
            break
          case 'bottom-right':
            newW = dim.width + dx
            newH = dim.height + dy
            break
        }

        if (moveEvent.shiftKey && dim.width > 0 && dim.height > 0) {
          const ratio = dim.width / dim.height
          if (Math.abs(dx) > Math.abs(dy)) {
            newH = newW / ratio
          } else {
            newW = newH * ratio
          }
          if (hPos === 'top-left') {
            newX = pos.x + (dim.width - newW)
            newY = pos.y + (dim.height - newH)
          } else if (hPos === 'top-right') {
            newY = pos.y + (dim.height - newH)
          } else if (hPos === 'bottom-left') {
            newX = pos.x + (dim.width - newW)
          }
        }

        if (!moveEvent.altKey) {
          const diagramStore = useDiagramStore.getState()
          const templateStore = useTemplateStore.getState()
          const targetBoxes = []
          for (const s of diagramStore.shapes) {
            if (s.id !== shape.id) {
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

        const minSize = 10
        if (newW < minSize) {
          if (hPos === 'top-left' || hPos === 'bottom-left') {
            newX = pos.x + dim.width - minSize
          }
          newW = minSize
        }
        if (newH < minSize) {
          if (hPos === 'top-left' || hPos === 'top-right') {
            newY = pos.y + dim.height - minSize
          }
          newH = minSize
        }

        resizeShape(shape.id,
          { x: snapToGrid(newX), y: snapToGrid(newY) },
          { width: snapToGrid(newW), height: snapToGrid(newH) },
        )
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
    [shape, resizeShape],
  )

  const onRotateMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    const svg = (e.currentTarget as SVGElement).ownerSVGElement
    let screenCX = e.clientX
    let screenCY = e.clientY + 24

    if (svg) {
      const pt = svg.createSVGPoint()
      pt.x = shape.position.x + shape.dimensions.width / 2
      pt.y = shape.position.y + shape.dimensions.height / 2
      const parent = (e.currentTarget as SVGElement).parentNode as unknown as SVGGraphicsElement | null
      const ctm = parent?.getScreenCTM()
      if (ctm) {
        const screenCenter = pt.matrixTransform(ctm)
        screenCX = screenCenter.x
        screenCY = screenCenter.y
      }
    }

    isRotating.current = true

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
      updateShapeRotation(shape.id, angle)
    }

    const handleMouseUp = () => {
      isRotating.current = false
      setCurrentRotation(null)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [shape, updateShapeRotation])

  const handles: HandlePosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']

  return (
    <>
      {handles.map((position) => {
        const { x, y, cursor } = getHandleCoordinates(shape, position)
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
            style={{ cursor }}
            onMouseDown={(e) => onMouseDown(e, position)}
          />
        )
      })}
      
      {/* Rotation Handle */}
      <line
        x1={shape.position.x + shape.dimensions.width / 2}
        y1={shape.position.y - 4}
        x2={shape.position.x + shape.dimensions.width / 2}
        y2={shape.position.y - 24}
        stroke="#4a90d9"
        strokeWidth={1.5}
      />
      <circle
        cx={shape.position.x + shape.dimensions.width / 2}
        cy={shape.position.y - 24}
        r={5}
        fill="white"
        stroke="#4a90d9"
        strokeWidth={1.5}
        style={{ cursor: 'grab' }}
        onMouseDown={onRotateMouseDown}
      />
      {currentRotation !== null && (
        <g transform={`translate(${shape.position.x + shape.dimensions.width / 2}, ${shape.position.y - 45})`}>
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
