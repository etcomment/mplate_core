import { useRef, useEffect, useMemo } from 'react'
import { useDiagramStore } from '../../store/diagramStore'
import { useDiagramDragResize } from '../../hooks/useDiagramDragResize'
import type { JourneyData } from '../../mermaid/parseUserJourney'

const SCORE_COLORS: Record<number, string> = { 1: '#f44336', 2: '#ff9800', 3: '#ffc107', 4: '#8bc34a', 5: '#4caf50' }

const BAR_W = 160
const BAR_H = 28
const TASK_GAP = 12
const SECTION_GAP = 40
const LEFT_MARGIN = 120
const TOP_MARGIN = 60

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function UserJourneyRenderer() {
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

  const data = (diagramType === 'userJourney' && diagramData) ? diagramData as unknown as JourneyData : null

  const computedRects = useMemo(() => {
    const map = new Map<string, Rect>()
    if (!data) return map
    let y = TOP_MARGIN
    let globalIndex = 0

    for (const section of data.sections) {
      y += 28
      for (const _task of section.tasks) {
        const x = LEFT_MARGIN + globalIndex * (BAR_W + TASK_GAP)
        map.set(`task-${globalIndex}`, { x, y, width: BAR_W, height: BAR_H })
        globalIndex++
      }
      y += BAR_H + SECTION_GAP
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

  if (diagramType !== 'userJourney' || !data) return null

  function getRect(id: string): Rect {
    const stored = diagramElementPositions[id]
    const computed = computedRects.get(id)
    if (stored) {
      return {
        x: stored.x,
        y: stored.y,
        width: stored.width || computed?.width || BAR_W,
        height: stored.height || computed?.height || BAR_H,
      }
    }
    return computed ?? { x: 0, y: 0, width: 0, height: 0 }
  }

  return (
    <g ref={svgRef}>
      {data.title && (
        <text x={LEFT_MARGIN} y={25} fontFamily="Arial, sans-serif" fontSize={17} fontWeight={700} fill="#333">
          {data.title}
        </text>
      )}

      {[1, 2, 3, 4, 5].map((score, i) => {
        const lx = LEFT_MARGIN + i * 80
        return (
          <g key={`legend-${score}`} transform={`translate(${lx}, 40)`}>
            <rect width={14} height={14} rx={2} fill={SCORE_COLORS[score]!} />
            <text x={20} y={11} fontFamily="Arial, sans-serif" fontSize={10} fill="#555">{score}</text>
          </g>
        )
      })}

      {(() => {
        let y = TOP_MARGIN
        let globalIndex = 0
        const elements: React.ReactElement[] = []

        for (let si = 0; si < data.sections.length; si++) {
          const section = data.sections[si]!

          elements.push(
            <g key={`section-${si}`}>
              <text
                x={LEFT_MARGIN}
                y={y + 6}
                fontFamily="Arial, sans-serif"
                fontSize={13}
                fontWeight={700}
                fill="#555"
              >
                {section.title}
              </text>
            </g>
          )

          y += 28

          for (let ti = 0; ti < section.tasks.length; ti++) {
            const task = section.tasks[ti]!
            const elementKey = `task-${globalIndex}`
            const rect = getRect(elementKey)
            const color = diagramColors[elementKey] ?? SCORE_COLORS[task.score] ?? '#999'
            const isSelected = selectedIds.has(elementKey)

            elements.push(
              <g key={`task-${globalIndex}`} onMouseDown={e => startDrag(e, elementKey, rect)} style={{ cursor: 'pointer' }}>
                <rect
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  rx={4}
                  fill={color}
                  opacity={0.75}
                  stroke={diagramStrokeColors[elementKey] || (isSelected ? '#4a90d9' : undefined)}
                  strokeWidth={isSelected ? 2 : undefined}
                  strokeDasharray={isSelected ? '4 2' : undefined}
                />
                <text
                  x={rect.x + rect.width / 2}
                  y={rect.y + rect.height / 2 + 4}
                  textAnchor="middle"
                  fontFamily="Arial, sans-serif"
                  fontSize={10}
                  fill="white"
                  fontWeight={600}
                  pointerEvents="none"
                >
                  {task.name}
                </text>
                <text
                  x={rect.x + rect.width / 2}
                  y={rect.y + rect.height / 2 - 8}
                  textAnchor="middle"
                  fontFamily="Arial, sans-serif"
                  fontSize={9}
                  fill="white"
                  opacity={0.8}
                  pointerEvents="none"
                >
                  {'★'.repeat(task.score)}
                </text>
                {task.actors.length > 0 && (
                  <text
                    x={rect.x + rect.width / 2}
                    y={rect.y + rect.height + 14}
                    textAnchor="middle"
                    fontFamily="Arial, sans-serif"
                    fontSize={8}
                    fill="#999"
                  >
                    {task.actors.join(', ')}
                  </text>
                )}
                {isSelected && renderHandles(rect, elementKey)}
              </g>
            )

            globalIndex++
          }

          y += BAR_H + SECTION_GAP
        }

        return elements
      })()}
    </g>
  )
}
