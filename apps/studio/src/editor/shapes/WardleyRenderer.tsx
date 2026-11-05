import { useRef, useEffect, useMemo } from 'react'
import { useDiagramStore } from '../../store/diagramStore'
import { useDiagramDragResize } from '../../hooks/useDiagramDragResize'
import type { WardleyData } from '../../mermaid/parseWardley'

const CANVAS_W = 700
const CANVAS_H = 600
const MARGIN_X = 100
const MARGIN_Y = 50
const PLOT_W = CANVAS_W - MARGIN_X - 30
const PLOT_H = CANVAS_H - MARGIN_Y - 60
const COMP_W = 120
const COMP_H = 50

const EVOLUTION_LABELS = ['Genesis', 'Custom', 'Product', 'Commodity'] as const

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function WardleyRenderer() {
  const svgRef = useRef<SVGGElement>(null)
  const diagramType = useDiagramStore(s => s.diagramType)
  const diagramData = useDiagramStore(s => s.diagramData)
  const diagramColors = useDiagramStore(s => s.diagramColors)
  const diagramStrokeColors = useDiagramStore(s => s.diagramStrokeColors)
  const diagramElementPositions = useDiagramStore(s => s.diagramElementPositions)
  const moveDiagramElement = useDiagramStore(s => s.moveDiagramElement)
  const resizeDiagramElement = useDiagramStore(s => s.resizeDiagramElement)
  const selectedIds = useDiagramStore(s => s.selectedDiagramElementIds)

  const { startDrag, renderHandles } = useDiagramDragResize(svgRef)

  const data = (diagramType === 'wardley' && diagramData) ? diagramData as unknown as WardleyData : null

  const components = data?.components ?? []
  const connections = data?.connections ?? []

  const componentPositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>()
    for (const comp of components) {
      const plotX = comp.evolution * PLOT_W
      const plotY = (1 - comp.visibility) * PLOT_H
      map.set(comp.id, { x: MARGIN_X + plotX - COMP_W / 2, y: MARGIN_Y + plotY - COMP_H / 2 })
    }
    return map
  }, [components])

  const computedRects = useMemo(() => {
    const map = new Map<string, Rect>()
    for (const comp of components) {
      const pos = componentPositions.get(comp.id) ?? { x: 0, y: 0 }
      map.set(comp.id, { x: pos.x, y: pos.y, width: COMP_W, height: COMP_H })
    }
    return map
  }, [components, componentPositions])

  useEffect(() => {
    for (const [id, rect] of computedRects) {
      if (diagramElementPositions[id]) continue
      moveDiagramElement(id, { x: rect.x, y: rect.y })
      resizeDiagramElement(id, { width: rect.width, height: rect.height })
    }
  }, [computedRects, diagramElementPositions, moveDiagramElement, resizeDiagramElement])

  if (diagramType !== 'wardley' || !data) return null

  function getRect(id: string): Rect {
    const stored = diagramElementPositions[id]
    const computed = computedRects.get(id)
    if (stored) {
      return {
        x: stored.x,
        y: stored.y,
        width: stored.width || computed?.width || COMP_W,
        height: stored.height || computed?.height || COMP_H,
      }
    }
    return computed ?? { x: 0, y: 0, width: 0, height: 0 }
  }

  return (
    <g ref={svgRef}>
      {data.title && (
        <text x={MARGIN_X + PLOT_W / 2} y={22} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={16} fontWeight={700} fill="#333">
          {data.title}
        </text>
      )}

      <line x1={MARGIN_X} y1={MARGIN_Y + PLOT_H} x2={MARGIN_X + PLOT_W} y2={MARGIN_Y + PLOT_H} stroke="#888" strokeWidth={1.5} />
      <line x1={MARGIN_X} y1={MARGIN_Y} x2={MARGIN_X} y2={MARGIN_Y + PLOT_H} stroke="#888" strokeWidth={1.5} />

      <text
        x={MARGIN_X - 40}
        y={MARGIN_Y + PLOT_H / 2}
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize={12}
        fill="#666"
        transform={`rotate(-90, ${MARGIN_X - 40}, ${MARGIN_Y + PLOT_H / 2})`}
        pointerEvents="none"
      >
        Visibility → Commodity
      </text>

      <text x={MARGIN_X + PLOT_W + 10} y={MARGIN_Y + PLOT_H / 2} fontFamily="Arial, sans-serif" fontSize={12} fill="#666" pointerEvents="none">
        Evolution →
      </text>

      {EVOLUTION_LABELS.map((label, i) => {
        const x = MARGIN_X + ((i + 0.5) / EVOLUTION_LABELS.length) * PLOT_W
        return (
          <g key={`evo-${i}`}>
            <line x1={x} y1={MARGIN_Y + PLOT_H} x2={x} y2={MARGIN_Y + PLOT_H + 8} stroke="#ccc" strokeWidth={0.5} pointerEvents="none" />
            <text x={x} y={MARGIN_Y + PLOT_H + 22} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={10} fill="#888" pointerEvents="none">
              {label}
            </text>
          </g>
        )
      })}

      {connections.map((conn, i) => {
        const srcPos = componentPositions.get(conn.source)
        const tgtPos = componentPositions.get(conn.target)
        if (!srcPos || !tgtPos) return null

        const elementKey = `wardley-conn-${i}`
        const isSelected = selectedIds.has(elementKey)
        const sx = srcPos.x + COMP_W / 2
        const sy = srcPos.y + COMP_H / 2
        const tx = tgtPos.x + COMP_W / 2
        const ty = tgtPos.y + COMP_H / 2

        return (
          <line
            key={elementKey}
            x1={sx}
            y1={sy}
            x2={tx}
            y2={ty}
            stroke={isSelected ? '#4a90d9' : '#aaa'}
            strokeWidth={isSelected ? 2 : 1}
            strokeDasharray={isSelected ? '4 2' : '5 3'}
            markerEnd="url(#wardleyArrow)"
            style={{ cursor: 'pointer' }}
          />
        )
      })}

      <defs>
        <marker id="wardleyArrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={5} markerHeight={5} orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#aaa" />
        </marker>
      </defs>

      {components.map(comp => {
        const rect = getRect(comp.id)
        const isSelected = selectedIds.has(comp.id)
        const color = diagramColors[comp.id] ?? (comp.isAnchor ? '#e8f4f8' : '#f0fff4')
        const strokeColor = diagramStrokeColors[comp.id] || (isSelected ? '#4a90d9' : (comp.isAnchor ? '#2b6cb0' : '#2f855a'))

        return (
          <g key={comp.id} onMouseDown={e => startDrag(e, comp.id, rect)} style={{ cursor: 'pointer' }}>
            <rect
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              rx={rect.height / 2}
              ry={rect.height / 2}
              fill={color}
              stroke={strokeColor}
              strokeWidth={isSelected ? 2.5 : 1.5}
              strokeDasharray={isSelected ? '4 2' : undefined}
            />
            <text
              x={rect.x + rect.width / 2}
              y={rect.y + rect.height / 2 + 5}
              textAnchor="middle"
              fontFamily="Arial, sans-serif"
              fontSize={12}
              fill="#333"
              fontWeight={isSelected ? 600 : 400}
              pointerEvents="none"
            >
              {comp.name}
            </text>
            {isSelected && renderHandles(rect, comp.id)}
          </g>
        )
      })}
    </g>
  )
}
