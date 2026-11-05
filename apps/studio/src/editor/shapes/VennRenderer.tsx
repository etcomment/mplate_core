import { useRef, useEffect, useMemo } from 'react'
import { useDiagramStore } from '../../store/diagramStore'
import { useDiagramDragResize } from '../../hooks/useDiagramDragResize'
import type { VennData } from '../../mermaid/parseVenn'

const PALETTE = [
  { fill: '#e8f4fd', stroke: '#2196f3' },
  { fill: '#fce4ec', stroke: '#e91e63' },
  { fill: '#e8f5e9', stroke: '#4caf50' },
]

const HEIGHT = 400
const PAD = 60

const POSITIONS = [
  { cx: PAD + 120, cy: PAD + 120, rx: 110, ry: 80 },
  { cx: PAD + 260, cy: PAD + 120, rx: 110, ry: 80 },
  { cx: PAD + 190, cy: PAD + 240, rx: 110, ry: 80 },
]

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function VennRenderer() {
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

  const data = (diagramType === 'venn' && diagramData) ? diagramData as unknown as VennData : null

  const computedRects = useMemo(() => {
    const map = new Map<string, Rect>()
    if (!data) return map
    for (let i = 0; i < data.sets.length && i < POSITIONS.length; i++) {
      const pos = POSITIONS[i]!
      const elementKey = `venn-set-${i}`
      map.set(elementKey, { x: pos.cx - pos.rx, y: pos.cy - pos.ry, width: pos.rx * 2, height: pos.ry * 2 })
    }
    return map
  }, [data])

  useEffect(() => {
    for (const [id, rect] of computedRects) {
      if (diagramElementPositions[id]) continue
      moveDiagramElement(id, { x: rect.x, y: rect.y })
      resizeDiagramElement(id, { width: rect.width, height: rect.height })
    }
  }, [computedRects, diagramElementPositions, moveDiagramElement, resizeDiagramElement])

  if (diagramType !== 'venn' || !data) return null

  function getRect(id: string): Rect {
    const stored = diagramElementPositions[id]
    const computed = computedRects.get(id)
    if (stored) {
      return {
        x: stored.x,
        y: stored.y,
        width: stored.width || computed?.width || 200,
        height: stored.height || computed?.height || 160,
      }
    }
    return computed ?? { x: 0, y: 0, width: 0, height: 0 }
  }

  return (
    <g ref={svgRef}>
      {data.sets.map((set, i) => {
        if (i >= POSITIONS.length) return null
        const palette = PALETTE[i] ?? { fill: '#f5f5f5', stroke: '#999' }
        const elementKey = `venn-set-${i}`
        const rect = getRect(elementKey)
        const isSelected = selectedIds.has(elementKey)

        const cx = rect.x + rect.width / 2
        const cy = rect.y + rect.height / 2
        const rx = rect.width / 2
        const ry = rect.height / 2

        return (
          <g key={elementKey} onMouseDown={e => startDrag(e, elementKey, rect)} style={{ cursor: 'pointer' }}>
            <ellipse
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              fill={diagramColors[elementKey] ?? palette.fill}
              stroke={diagramStrokeColors[elementKey] || (isSelected ? '#4a90d9' : palette.stroke)}
              strokeWidth={isSelected ? 2.5 : 2}
              strokeDasharray={isSelected ? '4 2' : undefined}
              opacity={0.6}
            />
            <text
              x={cx}
              y={cy - ry * 0.2}
              textAnchor="middle"
              fontFamily="Arial, sans-serif"
              fontSize={13}
              fontWeight={600}
              fill="#333"
              pointerEvents="none"
            >
              {set.label}
            </text>
            {isSelected && renderHandles(rect, elementKey)}
          </g>
        )
      })}

      {data.sets.length > 1 && (
        <text x={PAD + 190} y={HEIGHT} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={11} fill="#999" pointerEvents="none">
          Full set: {data.sets.map(s => s.label).join(' + ')}
        </text>
      )}
    </g>
  )
}
