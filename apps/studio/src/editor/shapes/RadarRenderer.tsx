import { useRef, useEffect, useMemo } from 'react'
import { useDiagramStore } from '../../store/diagramStore'
import { useDiagramDragResize } from '../../hooks/useDiagramDragResize'
import type { RadarAxis, RadarCurve, RadarData } from '../../mermaid/parseRadar'

const PALETTE = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
  '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000',
  '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9',
]

const CX = 350
const CY = 340
const R = 220
const LABEL_OFFSET = 35
const POINT_R = 6
const GRID_LEVELS = 5

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function RadarRenderer() {
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

  const data = (diagramType === 'radar' && diagramData) ? diagramData as unknown as RadarData : null

  const axes = (data?.axes ?? []) as RadarAxis[]
  const curves = (data?.curves ?? []) as RadarCurve[]
  const globalMax = data?.globalMax ?? 1

  const numAxes = axes.length
  const angleStep = numAxes > 0 ? (2 * Math.PI) / numAxes : 0

  const computedRects = useMemo(() => {
    const map = new Map<string, Rect>()
    if (!data || numAxes === 0) return map

    for (let ci = 0; ci < curves.length; ci++) {
      const curve = curves[ci]!
      const effectiveNum = Math.min(curve.values.length, numAxes)
      for (let i = 0; i < effectiveNum; i++) {
        const angle = angleStep * i - Math.PI / 2
        const ratio = curve.values[i]! / globalMax
        const dx = CX + R * ratio * Math.cos(angle)
        const dy = CY + R * ratio * Math.sin(angle)
        const elementKey = `radar-point-${ci}-${i}`
        const size = POINT_R * 2 + 4
        map.set(elementKey, { x: dx - size / 2, y: dy - size / 2, width: size, height: size })
      }
    }
    return map
  }, [data, numAxes, angleStep, curves, globalMax])

  useEffect(() => {
    for (const [id, rect] of computedRects) {
      if (diagramElementPositions[id]) continue
      moveDiagramElement(id, { x: rect.x, y: rect.y })
      resizeDiagramElement(id, { width: rect.width, height: rect.height })
    }
  }, [computedRects, diagramElementPositions, moveDiagramElement, resizeDiagramElement])

  if (diagramType !== 'radar' || numAxes === 0) return null

  function getRect(id: string): Rect {
    const stored = diagramElementPositions[id]
    const computed = computedRects.get(id)
    if (stored) {
      return {
        x: stored.x,
        y: stored.y,
        width: stored.width || computed?.width || (POINT_R * 2 + 4),
        height: stored.height || computed?.height || (POINT_R * 2 + 4),
      }
    }
    return computed ?? { x: 0, y: 0, width: 0, height: 0 }
  }

  return (
    <g ref={svgRef}>
      {Array.from({ length: GRID_LEVELS }, (_, lvl) => {
        const levelRadius = R * ((lvl + 1) / GRID_LEVELS)
        const pts: string[] = []
        for (let i = 0; i < numAxes; i++) {
          const angle = angleStep * i - Math.PI / 2
          const x = CX + levelRadius * Math.cos(angle)
          const y = CY + levelRadius * Math.sin(angle)
          pts.push(`${x},${y}`)
        }
        return (
          <polygon
            key={`grid-${lvl}`}
            points={pts.join(' ')}
            fill="none"
            stroke="#ddd"
            strokeWidth={0.8}
            strokeDasharray={lvl < GRID_LEVELS - 1 ? '3 3' : undefined}
            pointerEvents="none"
          />
        )
      })}

      {axes.map((axis, i) => {
        const angle = angleStep * i - Math.PI / 2
        const ex = CX + R * Math.cos(angle)
        const ey = CY + R * Math.sin(angle)
        const lx = CX + (R + LABEL_OFFSET) * Math.cos(angle)
        const ly = CY + (R + LABEL_OFFSET) * Math.sin(angle)

        return (
          <g key={`axis-${i}`}>
            <line
              x1={CX}
              y1={CY}
              x2={ex}
              y2={ey}
              stroke="#bbb"
              strokeWidth={1}
              pointerEvents="none"
            />
            <text
              x={lx}
              y={ly + 4}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="Arial, sans-serif"
              fontSize={11}
              fill="#555"
              fontWeight={500}
              pointerEvents="none"
            >
              {axis.label}
            </text>
          </g>
        )
      })}

      {curves.map((curve, ci) => {
        const effectiveNum = Math.min(curve.values.length, numAxes)
        const elementKey = `radar-curve-${ci}`
        const color = diagramColors[elementKey] ?? PALETTE[ci % PALETTE.length]!
        const isSelected = selectedIds.has(elementKey)
        const strokeColor = diagramStrokeColors[elementKey] || (isSelected ? '#4a90d9' : color)

        const pts: string[] = []
        for (let i = 0; i < effectiveNum; i++) {
          const angle = angleStep * i - Math.PI / 2
          const ratio = curve.values[i]! / globalMax
          const x = CX + R * ratio * Math.cos(angle)
          const y = CY + R * ratio * Math.sin(angle)
          pts.push(`${x},${y}`)
        }

        return (
          <g key={`curve-${ci}`}>
            <polygon
              points={pts.join(' ')}
              fill={color}
              opacity={isSelected ? 0.35 : 0.15}
              stroke={strokeColor}
              strokeWidth={isSelected ? 2.5 : 1.5}
              strokeDasharray={isSelected ? '4 2' : undefined}
              style={{ cursor: 'pointer' }}
            />

            {curve.values.slice(0, numAxes).map((_val, i) => {
              const pointKey = `radar-point-${ci}-${i}`
              const rect = getRect(pointKey)
              const centerX = rect.x + rect.width / 2
              const centerY = rect.y + rect.height / 2
              const isPointSelected = selectedIds.has(pointKey)

              return (
                <g key={pointKey} onMouseDown={e => startDrag(e, pointKey, rect)} style={{ cursor: 'pointer' }}>
                  <circle
                    cx={centerX}
                    cy={centerY}
                    r={POINT_R}
                    fill="white"
                    stroke={diagramStrokeColors[pointKey] || (isPointSelected ? '#4a90d9' : color)}
                    strokeWidth={isPointSelected ? 3 : 2}
                    strokeDasharray={isPointSelected ? '4 2' : undefined}
                  />
                  {isPointSelected && renderHandles(rect, pointKey)}
                </g>
              )
            })}
          </g>
        )
      })}

      {curves.map((curve, ci) => {
        const elementKey = `radar-curve-${ci}`
        const color = diagramColors[elementKey] ?? PALETTE[ci % PALETTE.length]!
        const legendX = CX + R + 50
        const legendY = CY - R + ci * 22
        return (
          <g key={`legend-${ci}`} transform={`translate(${legendX}, ${legendY})`}>
            <rect width={14} height={14} rx={3} fill={color} opacity={0.3} />
            <rect width={14} height={14} rx={3} fill="none" stroke={color} strokeWidth={1.5} />
            <text x={20} y={11} fontFamily="Arial, sans-serif" fontSize={11} fill="#333">
              {curve.label}
            </text>
          </g>
        )
      })}
    </g>
  )
}
