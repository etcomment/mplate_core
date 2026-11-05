import { useRef, useCallback } from 'react'
import { useDiagramStore } from '../store/diagramStore'
import { calculateSmartGuides } from '../core/smartGuides';
import { useSmartGuidesStore } from '../store/smartGuidesStore';
import { useTemplateStore } from '../templates/store';


interface Rect {
  x: number
  y: number
  width: number
  height: number
}

type Corner = 'nw' | 'ne' | 'sw' | 'se'

interface Interaction {
  id: string
  kind: 'drag' | 'resize'
  corner?: Corner
  startMouse: { x: number; y: number }
  startRect: Rect
  hasMoved: boolean
  allStartRects?: Record<string, Rect>
}

const DRAG_THRESHOLD = 3
const HANDLE_SIZE = 8
const MIN_SIZE = 40

export function useDiagramDragResize(svgRef: React.RefObject<SVGGElement | null>) {
  const interactionRef = useRef<Interaction | null>(null)
  const toggleElement = useDiagramStore(s => s.toggleDiagramElement)
  const moveDiagramElement = useDiagramStore(s => s.moveDiagramElement)
  const resizeDiagramElement = useDiagramStore(s => s.resizeDiagramElement)
  const selectedIds = useDiagramStore(s => s.selectedDiagramElementIds)
  const diagramElementPositions = useDiagramStore(s => s.diagramElementPositions)

  const onMouseMoveRef = useRef<(e: MouseEvent) => void>(() => {})
  const onMouseUpRef = useRef<() => void>(() => {})

  const stableOnMouseMove = useCallback((e: MouseEvent) => onMouseMoveRef.current(e), [])
  const stableOnMouseUp = useCallback(() => onMouseUpRef.current(), [])

  const toSvgPoint = useCallback((e: React.MouseEvent | MouseEvent): { x: number; y: number } => {
    const viewBox = useDiagramStore.getState().viewBox
    const svg = svgRef.current?.ownerSVGElement || svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const clientX = 'nativeEvent' in e ? e.nativeEvent.clientX : e.clientX
    const clientY = 'nativeEvent' in e ? e.nativeEvent.clientY : e.clientY
    const x = (clientX - rect.left - viewBox.x) / viewBox.scale
    const y = (clientY - rect.top - viewBox.y) / viewBox.scale
    return { x, y }
  }, [svgRef])

  onMouseUpRef.current = () => {
    const interaction = interactionRef.current
    if (!interaction) return
    interactionRef.current = null
    window.removeEventListener('mousemove', stableOnMouseMove)
    window.removeEventListener('mouseup', stableOnMouseUp)
    useSmartGuidesStore.getState().clearGuides();
    if (!interaction.hasMoved) {
      toggleElement(interaction.id)
    }
  }

  onMouseMoveRef.current = (e: MouseEvent) => {
    const interaction = interactionRef.current
    if (!interaction) return
    const { x, y } = toSvgPoint(e)
    const dx = x - interaction.startMouse.x
    const dy = y - interaction.startMouse.y

    if (interaction.kind === 'drag') {
      if (!interaction.hasMoved) {
        if (Math.hypot(dx, dy) <= DRAG_THRESHOLD) return
        interaction.hasMoved = true
      }
      const useX = (e.ctrlKey || e.metaKey) ? dx : (e.shiftKey ? 0 : dx)
      const useY = e.shiftKey ? dy : (e.ctrlKey || e.metaKey) ? 0 : dy

      let finalUseX = useX;
      let finalUseY = useY;

      if (!e.altKey) {
        const activeBox = {
          x: interaction.startRect.x + useX,
          y: interaction.startRect.y + useY,
          width: interaction.startRect.width,
          height: interaction.startRect.height,
        };

        const diagramStore = useDiagramStore.getState();
        const templateStore = useTemplateStore.getState();

        const targetBoxes = [];
        // Add shapes
        for (const shape of diagramStore.shapes) {
          targetBoxes.push({
            x: shape.position.x,
            y: shape.position.y,
            width: shape.dimensions.width,
            height: shape.dimensions.height,
          });
        }
        
        // Add templates
        for (const [tid, pos] of Object.entries(templateStore.templateElementPositions)) {
          if (tid !== interaction.id && !interaction.allStartRects?.[tid]) {
            targetBoxes.push({
              x: pos.x,
              y: pos.y,
              width: pos.width,
              height: pos.height,
            });
          }
        }

        // Add other diagram elements
        for (const [did, pos] of Object.entries(diagramStore.diagramElementPositions)) {
          if (did !== interaction.id && !interaction.allStartRects?.[did]) {
            targetBoxes.push({
              x: pos.x,
              y: pos.y,
              width: pos.width,
              height: pos.height,
            });
          }
        }

        const { snappedBBox, guides } = calculateSmartGuides(activeBox, targetBoxes, 5);
        useSmartGuidesStore.getState().setActiveGuides(guides);

        finalUseX = snappedBBox.x - interaction.startRect.x;
        finalUseY = snappedBBox.y - interaction.startRect.y;
      } else {
        useSmartGuidesStore.getState().clearGuides();
      }

      if (interaction.allStartRects) {
        for (const [sid, startR] of Object.entries(interaction.allStartRects)) {
          moveDiagramElement(sid, {
            x: startR.x + finalUseX,
            y: startR.y + finalUseY,
          });
        }
      }
      moveDiagramElement(interaction.id, {
        x: interaction.startRect.x + finalUseX,
        y: interaction.startRect.y + finalUseY,
      });
      return;
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


      if (!e.altKey) {
        const diagramStore = useDiagramStore.getState();
        const templateStore = useTemplateStore.getState();
        const targetBoxes = [];
        for (const shape of diagramStore.shapes) {
          targetBoxes.push({
            x: shape.position.x,
            y: shape.position.y,
            width: shape.dimensions.width,
            height: shape.dimensions.height,
          });
        }
        for (const [tid, pos] of Object.entries(templateStore.templateElementPositions)) {
          if (tid !== interaction.id) {
            targetBoxes.push({ x: pos.x, y: pos.y, width: pos.width, height: pos.height });
          }
        }
        for (const [did, pos] of Object.entries(diagramStore.diagramElementPositions)) {
          if (did !== interaction.id) {
            targetBoxes.push({ x: pos.x, y: pos.y, width: pos.width, height: pos.height });
          }
        }

        const activeBox = { x: nextX, y: nextY, width: nextW, height: nextH };
        const { snappedBBox, guides } = calculateSmartGuides(activeBox, targetBoxes, 5);
        useSmartGuidesStore.getState().setActiveGuides(guides);

        if (interaction.corner === 'se') {
          nextW = snappedBBox.width; // For SE, we only change width/height, x/y are fixed
          // Wait, calculateSmartGuides modifies x and y, not width/height based on snapping.
          // To snap width/height, we need to map x/y snapping back to width/height.
          // If the snappedBBox has a different X/Y, it means the right/bottom edge snapped.
          if (snappedBBox.x !== nextX) nextW += (snappedBBox.x - nextX);
          if (snappedBBox.y !== nextY) nextH += (snappedBBox.y - nextY);
        } else if (interaction.corner === 'nw') {
          nextW += (nextX - snappedBBox.x);
          nextH += (nextY - snappedBBox.y);
          nextX = snappedBBox.x;
          nextY = snappedBBox.y;
        } else if (interaction.corner === 'ne') {
          if (snappedBBox.x !== nextX) nextW += (snappedBBox.x - nextX);
          nextH += (nextY - snappedBBox.y);
          nextY = snappedBBox.y;
        } else if (interaction.corner === 'sw') {
          nextW += (nextX - snappedBBox.x);
          nextX = snappedBBox.x;
          if (snappedBBox.y !== nextY) nextH += (snappedBBox.y - nextY);
        }
      } else {
        useSmartGuidesStore.getState().clearGuides();
      }

      nextW = Math.max(MIN_SIZE, nextW);
      nextH = Math.max(MIN_SIZE, nextH);

      resizeDiagramElement(interaction.id, { width: nextW, height: nextH })
      moveDiagramElement(interaction.id, { x: nextX, y: nextY })
    }
  }

  const startDrag = useCallback((e: React.MouseEvent, id: string, rect: Rect) => {
    e.stopPropagation()
    e.preventDefault()
    if (interactionRef.current) return
    const { x, y } = toSvgPoint(e)

    let allStartRects: Record<string, Rect> | undefined
    if (selectedIds.size > 1 && selectedIds.has(id)) {
      allStartRects = {}
      for (const sid of selectedIds) {
        if (sid === id) continue
        const pos = diagramElementPositions[sid]
        if (pos) {
          allStartRects[sid] = { x: pos.x, y: pos.y, width: pos.width || 20, height: pos.height || 20 }
        }
      }
    }

    interactionRef.current = {
      id,
      kind: 'drag',
      startMouse: { x, y },
      startRect: rect,
      hasMoved: false,
      allStartRects,
    }
    window.addEventListener('mousemove', stableOnMouseMove)
    window.addEventListener('mouseup', stableOnMouseUp)
  }, [toSvgPoint, stableOnMouseMove, stableOnMouseUp, selectedIds, diagramElementPositions])

  const startResize = useCallback((e: React.MouseEvent, id: string, corner: Corner, rect: Rect) => {
    e.stopPropagation()
    e.preventDefault()
    if (interactionRef.current) return
    const { x, y } = toSvgPoint(e)
    interactionRef.current = {
      id,
      kind: 'resize',
      corner,
      startMouse: { x, y },
      startRect: rect,
      hasMoved: true,
    }
    window.addEventListener('mousemove', stableOnMouseMove)
    window.addEventListener('mouseup', stableOnMouseUp)
  }, [toSvgPoint, stableOnMouseMove, stableOnMouseUp])

  const renderHandles = useCallback((visualRect: Rect, id: string) => {
    if (!selectedIds.has(id)) return null
    const half = HANDLE_SIZE / 2
    const handles: Array<{ corner: Corner; x: number; y: number; cursor: string }> = [
      { corner: 'nw', x: visualRect.x - half, y: visualRect.y - half, cursor: 'nwse-resize' },
      { corner: 'ne', x: visualRect.x + visualRect.width - half, y: visualRect.y - half, cursor: 'nesw-resize' },
      { corner: 'sw', x: visualRect.x - half, y: visualRect.y + visualRect.height - half, cursor: 'nesw-resize' },
      { corner: 'se', x: visualRect.x + visualRect.width - half, y: visualRect.y + visualRect.height - half, cursor: 'nwse-resize' },
    ]
    return (
      <g pointerEvents="all">
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
            onMouseDown={e => startResize(e, id, h.corner, visualRect)}
          />
        ))}
      </g>
    )
  }, [selectedIds, startResize])

  return { startDrag, startResize, renderHandles, toSvgPoint }
}
