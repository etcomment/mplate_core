import { useRef, useEffect, useMemo } from 'react'
import { useDiagramStore } from '../../store/diagramStore'
import { useDiagramDragResize } from '../../hooks/useDiagramDragResize'
import type { QuadrantData } from '../../mermaid/parseQuadrant'

const PALETTE = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
  '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000',
  '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9',
]

const QUAD_COLORS = ['#e8f5e9', '#fff3e0', '#ffebee', '#e3f2fd']
const QUAD_TEXT_COLORS = ['#2e7d32', '#ef6c00', '#c62828', '#1565c0']
const SIZE = 420
const PAD = 90
const POINT_R = 7

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function QuadrantRenderer() {
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

  const data = (diagramType === 'quadrant' && diagramData) ? diagramData as unknown as QuadrantData : null

  const cx = PAD + SIZE / 2
  const cy = PAD + SIZE / 2
  const hs = SIZE / 2
  const pointSize = POINT_R * 2 + 4

  const computedRects = useMemo(() => {
    const map = new Map<string, Rect>()
    if (!data) return map
    for (let i = 0; i < data.quadrants.length; i++) {
      const q = data.quadrants[i]!
      const px = cx + q.x * hs
      const py = cy - q.y * hs
      map.set(`point-${i}`, { x: px - pointSize / 2, y: py - pointSize / 2, width: pointSize, height: pointSize })
    }
    return map
  }, [data, cx, cy, hs, pointSize])

  useEffect(() => {
    for (const [id, rect] of computedRects) {
      if (diagramElementPositions[id]) continue
      moveDiagramElement(id, { x: rect.x, y: rect.y })
      resizeDiagramElement(id, { width: rect.width, height: rect.height })
    }
  }, [computedRects, diagramElementPositions, moveDiagramElement, resizeDiagramElement])

  if (diagramType !== 'quadrant' || !data) return null

  function getRect(id: string): Rect {
    const stored = diagramElementPositions[id]
    const computed = computedRects.get(id)
    if (stored) {
      return {
        x: stored.x,
        y: stored.y,
        width: stored.width || computed?.width || pointSize,
        height: stored.height || computed?.height || pointSize,
      }
    }
    return computed ?? { x: 0, y: 0, width: 0, height: 0 }
  }

  return (
    <g ref={svgRef}>
      {data.title && (
        <text x={cx} y={30} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={17} fontWeight={700} fill="#333">
          {data.title}
        </text>
      )}

      <rect x={PAD} y={PAD} width={hs} height={hs} fill={QUAD_COLORS[0]!} opacity={0.6} rx={4} />
      <rect x={cx} y={PAD} width={hs} height={hs} fill={QUAD_COLORS[1]!} opacity={0.6} rx={4} />
      <rect x={PAD} y={cy} width={hs} height={hs} fill={QUAD_COLORS[2]!} opacity={0.6} rx={4} />
      <rect x={cx} y={cy} width={hs} height={hs} fill={QUAD_COLORS[3]!} opacity={0.6} rx={4} />

      <line x1={PAD} y1={cy} x2={PAD + SIZE} y2={cy} stroke="#888" strokeWidth={1.5} />
      <line x1={cx} y1={PAD} x2={cx} y2={PAD + SIZE} stroke="#888" strokeWidth={1.5} />

      <text x={PAD + 12} y={PAD + 22} fontFamily="Arial, sans-serif" fontSize={13} fontWeight={700} fill={QUAD_TEXT_COLORS[0]!}>
        {data.quadrantLabels[0]}
      </text>
      <text x={cx + 12} y={PAD + 22} fontFamily="Arial, sans-serif" fontSize={13} fontWeight={700} fill={QUAD_TEXT_COLORS[1]!}>
        {data.quadrantLabels[1]}
      </text>
      <text x={PAD + 12} y={cy + 22} fontFamily="Arial, sans-serif" fontSize={13} fontWeight={700} fill={QUAD_TEXT_COLORS[2]!}>
        {data.quadrantLabels[2]}
      </text>
      <text x={cx + 12} y={cy + 22} fontFamily="Arial, sans-serif" fontSize={13} fontWeight={700} fill={QUAD_TEXT_COLORS[3]!}>
        {data.quadrantLabels[3]}
      </text>

      <text x={PAD + SIZE + 14} y={cy + 4} fontFamily="Arial, sans-serif" fontSize={13} fill="#555">
        {data.xAxisLabel}
      </text>
      <text x={cx} y={PAD - 14} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={13} fill="#555">
        {data.yAxisLabel}
      </text>

      {data.quadrants.map((q, i) => {
        const elementKey = `point-${i}`
        const rect = getRect(elementKey)
        const color = diagramColors[elementKey] ?? PALETTE[i % PALETTE.length]!
        const isSelected = selectedIds.has(elementKey)
        const centerX = rect.x + rect.width / 2
        const centerY = rect.y + rect.height / 2

        return (
          <g key={i} onMouseDown={e => startDrag(e, elementKey, rect)} style={{ cursor: 'pointer' }}>
            <circle
              cx={centerX}
              cy={centerY}
              r={POINT_R}
              fill={color}
              stroke={diagramStrokeColors[elementKey] || (isSelected ? '#4a90d9' : 'white')}
              strokeWidth={isSelected ? 2.5 : 2}
              strokeDasharray={isSelected ? '4 2' : undefined}
            />
            <text
              x={centerX + 12}
              y={centerY + 1}
              fontFamily="Arial, sans-serif"
              fontSize={11}
              fill="#333"
              fontWeight={500}
              pointerEvents="none"
            >
              {q.label}
            </text>
            {isSelected && renderHandles(rect, elementKey)}
          </g>
        )
      })}
    </g>
  )
}
