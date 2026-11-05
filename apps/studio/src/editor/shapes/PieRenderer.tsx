import { useRef, useEffect, useMemo } from 'react'
import { useDiagramStore } from '../../store/diagramStore'
import { useDiagramDragResize } from '../../hooks/useDiagramDragResize'
import type { PieData } from '../../mermaid/parsePieChart'

const PALETTE = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
  '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000',
  '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9',
]

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const startRad = (startAngle * Math.PI) / 180
  const endRad = (endAngle * Math.PI) / 180
  const x1 = cx + r * Math.cos(startRad)
  const y1 = cy + r * Math.sin(startRad)
  const x2 = cx + r * Math.cos(endRad)
  const y2 = cy + r * Math.sin(endRad)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
}

const SLICE_SIZE = 24

export function PieRenderer() {
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

  const data = (diagramType === 'pie' && diagramData?.slices) ? diagramData as unknown as PieData : null

  const slices = data ? data.slices : []
  const total = slices.reduce((sum, s) => sum + s.value, 0)

  const cx = 300
  const cy = 260
  const outerR = 180
  const innerR = 50
  const legendX = cx + outerR + 60
  const legendY = 100

  const computedRects = useMemo(() => {
    const map = new Map<string, Rect>()
    if (!data || total === 0) return map
    let currentAngle = -90
    for (const slice of slices) {
      const percent = slice.value / total
      const angle = percent * 360
      const midAngle = ((currentAngle + currentAngle + angle) / 2) * Math.PI / 180
      const elementKey = `slice-${slice.label}`
      const labelR = (outerR + innerR) / 2
      const sx = cx + labelR * Math.cos(midAngle)
      const sy = cy + labelR * Math.sin(midAngle)
      map.set(elementKey, { x: sx - SLICE_SIZE / 2, y: sy - SLICE_SIZE / 2, width: SLICE_SIZE, height: SLICE_SIZE })
      currentAngle += angle
    }
    return map
  }, [slices, total, cx, cy, outerR, innerR])

  useEffect(() => {
    for (const [id, rect] of computedRects) {
      if (diagramElementPositions[id]) continue
      moveDiagramElement(id, { x: rect.x, y: rect.y })
      resizeDiagramElement(id, { width: rect.width, height: rect.height })
    }
  }, [computedRects, diagramElementPositions, moveDiagramElement, resizeDiagramElement])

  if (diagramType !== 'pie' || !data || total === 0) return null

  function getRect(id: string): Rect {
    const stored = diagramElementPositions[id]
    const computed = computedRects.get(id)
    if (stored) {
      return {
        x: stored.x,
        y: stored.y,
        width: stored.width || computed?.width || SLICE_SIZE,
        height: stored.height || computed?.height || SLICE_SIZE,
      }
    }
    return computed ?? { x: 0, y: 0, width: 0, height: 0 }
  }

  return (
    <g ref={svgRef}>
      {data.title && (
        <text x={cx} y={40} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={17} fontWeight={700} fill="#333">
          {data.title}
        </text>
      )}

      {(() => {
        let currentAngle = -90
        return slices.map((slice, i) => {
          const percent = slice.value / total
          const angle = percent * 360
          const startAngle = currentAngle
          const endAngle = currentAngle + angle
          const elementKey = `slice-${slice.label}`
          const rect = getRect(elementKey)
          const color = diagramColors[elementKey] ?? PALETTE[i % PALETTE.length]!
          const isSelected = selectedIds.has(elementKey)

          const outerPath = arcPath(cx, cy, outerR, startAngle, endAngle)
          const innerPath = arcPath(cx, cy, innerR, startAngle, endAngle)
          const d = `${outerPath} ${innerPath}`
          const midAngleRad = ((startAngle + endAngle) / 2) * Math.PI / 180
          const labelR = outerR + 24
          const lx = cx + labelR * Math.cos(midAngleRad)
          const ly = cy + labelR * Math.sin(midAngleRad)

          currentAngle = endAngle

          return (
            <g key={i}>
              <path
                d={d}
                fill={color}
                stroke={diagramStrokeColors[elementKey] || (isSelected ? '#4a90d9' : 'white')}
                strokeWidth={isSelected ? 2.5 : 1.5}
                strokeDasharray={isSelected ? '4 2' : undefined}
                style={{ cursor: 'pointer' }}
              />
              <g onMouseDown={e => startDrag(e, elementKey, rect)} style={{ cursor: 'pointer' }}>
                <rect
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  rx={4}
                  fill="transparent"
                  stroke="transparent"
                />
                <text
                  x={rect.x + SLICE_SIZE / 2}
                  y={rect.y + SLICE_SIZE / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="Arial, sans-serif"
                  fontSize={11}
                  fill="white"
                  fontWeight={700}
                  pointerEvents="none"
                >
                  {Math.round(percent * 100)}%
                </text>
                {isSelected && renderHandles(rect, elementKey)}
              </g>
              <line
                x1={cx + outerR * Math.cos(midAngleRad)}
                y1={cy + outerR * Math.sin(midAngleRad)}
                x2={lx}
                y2={ly}
                stroke="#999"
                strokeWidth={1}
              />
              <text
                x={lx + (lx > cx ? 6 : -6)}
                y={ly + 1}
                textAnchor={lx > cx ? 'start' : 'end'}
                fontFamily="Arial, sans-serif"
                fontSize={11}
                fill="#555"
                fontWeight={500}
              >
                {slice.label}
              </text>
              <text
                x={lx + (lx > cx ? 6 : -6)}
                y={ly + 14}
                textAnchor={lx > cx ? 'start' : 'end'}
                fontFamily="Arial, sans-serif"
                fontSize={9}
                fill="#999"
              >
                {slice.value} ({Math.round(percent * 100)}%)
              </text>
            </g>
          )
        })
      })()}

      {slices.map((slice, i) => {
        const elementKey = `slice-${slice.label}`
        const color = diagramColors[elementKey] ?? PALETTE[i % PALETTE.length]!
        return (
          <g key={`legend-${i}`} transform={`translate(${legendX}, ${legendY + i * 22})`}>
            <rect width={14} height={14} rx={3} fill={color} />
            <text x={20} y={11} fontFamily="Arial, sans-serif" fontSize={11} fill="#333">
              {slice.label} — {slice.value}
            </text>
          </g>
        )
      })}
    </g>
  )
}
