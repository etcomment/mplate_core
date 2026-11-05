import { useEffect, useRef, useMemo } from 'react'
import { useDiagramStore } from '../../store/diagramStore'
import { useDiagramDragResize } from '../../hooks/useDiagramDragResize'
import type { XYChartData } from '../../mermaid/parseXYChart'

const PALETTE = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
  '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000',
  '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9',
]

const CHART_LEFT = 70
const CHART_TOP = 50
const CHART_W = 500
const CHART_H = 320
const TICK_COUNT = 5
const GRID_COLOR = '#eee'

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

function yTicks(maxVal: number): number[] {
  const step = Math.ceil(maxVal / TICK_COUNT)
  const ticks: number[] = []
  for (let v = 0; v <= maxVal; v += step) ticks.push(v)
  if (ticks[ticks.length - 1]! < maxVal) ticks.push(maxVal)
  return ticks
}

export function XYChartRenderer() {
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

  const data = (diagramType === 'xyChart' && diagramData) ? diagramData as unknown as XYChartData : null

  const maxVal = useMemo(() => data && data.series.length > 0 ? Math.max(...data.series.flatMap(s => s.data), 1) : 1, [data])
  const barWidth = data ? CHART_W / data.xLabels.length : 0
  const seriesCount = data?.series.length ?? 0
  const groupBarW = Math.min(barWidth * 0.7, 60)
  const perBarW = seriesCount > 0 ? groupBarW / seriesCount : 0
  const ticks = yTicks(maxVal)
  const plotH = CHART_H - 10

  const chartElementId = 'xyChart-root'
  const chartRect: Rect = { x: CHART_LEFT - 10, y: CHART_TOP - 10, width: CHART_W + 180, height: CHART_H + 60 }

  const computedRects = useMemo(() => {
    const map = new Map<string, Rect>()
    map.set(chartElementId, chartRect)
    return map
  }, [chartElementId, chartRect])

  useEffect(() => {
    for (const [id, rect] of computedRects) {
      if (diagramElementPositions[id]) continue
      moveDiagramElement(id, { x: rect.x, y: rect.y })
      resizeDiagramElement(id, { width: rect.width, height: rect.height })
    }
  }, [computedRects, diagramElementPositions, moveDiagramElement, resizeDiagramElement])

  if (diagramType !== 'xyChart' || !data || data.series.length === 0) return null

  let globalX = CHART_LEFT - 10
  let globalY = CHART_TOP - 10
  let globalW = CHART_W + 180
  let globalH = CHART_H + 60
  const stored = diagramElementPositions[chartElementId]
  if (stored) {
    globalX = stored.x
    globalY = stored.y
    globalW = stored.width || CHART_W + 180
    globalH = stored.height || CHART_H + 60
  }

  const isSelected = selectedIds.has(chartElementId)

  return (
    <g ref={svgRef} onMouseDown={e => startDrag(e, chartElementId, { x: globalX, y: globalY, width: globalW, height: globalH })} style={{ cursor: 'pointer' }}>
      {isSelected && renderHandles({ x: globalX, y: globalY, width: globalW, height: globalH }, chartElementId)}

      <g transform={`translate(${globalX - (CHART_LEFT - 10)}, ${globalY - (CHART_TOP - 10)})`}>
        {data.title && (
          <text x={CHART_LEFT + CHART_W / 2} y={25} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={15} fontWeight={700} fill="#333">
            {data.title}
          </text>
        )}

        {ticks.map(t => {
          const y = CHART_TOP + plotH - (t / maxVal) * plotH
          return (
            <g key={`tick-${t}`}>
              <line x1={CHART_LEFT} y1={y} x2={CHART_LEFT + CHART_W} y2={y} stroke={GRID_COLOR} strokeWidth={0.5} />
              <text x={CHART_LEFT - 6} y={y + 4} textAnchor="end" fontFamily="Arial, sans-serif" fontSize={9} fill="#999">
                {t}
              </text>
            </g>
          )
        })}

        <line x1={CHART_LEFT} y1={CHART_TOP + plotH} x2={CHART_LEFT + CHART_W} y2={CHART_TOP + plotH} stroke="#333" strokeWidth={1.5} />
        <line x1={CHART_LEFT} y1={CHART_TOP} x2={CHART_LEFT} y2={CHART_TOP + plotH} stroke="#333" strokeWidth={1.5} />

        {data.xLabels.map((label, xi) => {
          const cx = CHART_LEFT + xi * barWidth + barWidth / 2
          return (
            <text key={`xlabel-${xi}`} x={cx} y={CHART_TOP + plotH + 18} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={10} fill="#666">
              {label}
            </text>
          )
        })}

        {data.chartType === 'bar' ? (
          data.series.map((series, si) => {
            const elementKey = `series-${series.label}`
            const color = diagramColors[elementKey] ?? PALETTE[si % PALETTE.length]!
            const isSeriesSelected = selectedIds.has(elementKey)
            return (
              <g key={`series-${si}`}>
                {series.data.map((val, xi) => {
                  if (xi >= data.xLabels.length) return null
                  const barH = (val / maxVal) * plotH
                  const bx = CHART_LEFT + xi * barWidth + (barWidth - groupBarW) / 2 + si * perBarW
                  return (
                    <rect
                      key={`bar-${si}-${xi}`}
                      x={bx}
                      y={CHART_TOP + plotH - barH}
                      width={Math.max(2, perBarW - 2)}
                      height={barH}
                      rx={2}
                      fill={color}
                      opacity={0.8}
                      stroke={diagramStrokeColors[elementKey] || (isSeriesSelected ? '#4a90d9' : undefined)}
                      strokeWidth={isSeriesSelected ? 2 : undefined}
                      strokeDasharray={isSeriesSelected ? '4 2' : undefined}
                      style={{ cursor: 'pointer' }}
                    >
                      <title>{`${series.label}: ${val}`}</title>
                    </rect>
                  )
                })}
              </g>
            )
          })
        ) : (
          data.series.map((series, si) => {
            const elementKey = `series-${series.label}`
            const color = diagramColors[elementKey] ?? PALETTE[si % PALETTE.length]!
            const isSeriesSelected = selectedIds.has(elementKey)
            const pts: Array<{ x: number; y: number }> = []

            for (let xi = 0; xi < series.data.length && xi < data.xLabels.length; xi++) {
              const val = series.data[xi]!
              pts.push({
                x: CHART_LEFT + xi * barWidth + barWidth / 2,
                y: CHART_TOP + plotH - (val / maxVal) * plotH,
              })
            }

            if (pts.length <= 1) return null
            const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

            return (
              <g key={`series-${si}`}>
                <path
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={isSeriesSelected ? 3 : 2}
                  strokeDasharray={isSeriesSelected ? '4 2' : undefined}
                  style={{ cursor: 'pointer' }}
                />
                {pts.map((p, xi) => (
                  <circle
                    key={`dot-${si}-${xi}`}
                    cx={p.x}
                    cy={p.y}
                    r={isSeriesSelected ? 5 : 3}
                    fill="white"
                    stroke={color}
                    strokeWidth={2}
                    style={{ cursor: 'pointer' }}
                  >
                    <title>{`${series.label}: ${series.data[xi]}`}</title>
                  </circle>
                ))}
              </g>
            )
          })
        )}
      </g>

      {data.series.map((series, si) => {
        const elementKey = `series-${series.label}`
        const color = diagramColors[elementKey] ?? PALETTE[si % PALETTE.length]!
        const lx = CHART_LEFT + CHART_W + 24
        const ly = CHART_TOP + si * 20

        return (
          <g key={`legend-${si}`} transform={`translate(${lx}, ${ly})`}>
            <rect width={12} height={12} rx={2} fill={color} style={{ cursor: 'pointer' }} />
            <text x={18} y={10} fontFamily="Arial, sans-serif" fontSize={10} fill="#333">
              {series.label}
            </text>
          </g>
        )
      })}
    </g>
  )
}
