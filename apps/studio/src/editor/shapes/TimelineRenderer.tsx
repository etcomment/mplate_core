import { useRef, useEffect, useMemo } from 'react'
import { useDiagramStore } from '../../store/diagramStore'
import { useDiagramDragResize } from '../../hooks/useDiagramDragResize'
import type { TimelineEvent } from '../../mermaid/parseTimeline'

const PALETTE = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
  '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000',
  '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9',
]

const EVENT_R = 7
const SIDE_MARGIN = 60
const EVENT_GAP_X = 100
const TIMELINE_Y = 120
const SECTION_H = 60

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function TimelineRenderer() {
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

  const events = (diagramType === 'timeline' && diagramData?.events) ? diagramData.events as TimelineEvent[] : null
  const sections = (diagramType === 'timeline' && diagramData) ? diagramData.sections as Record<string, TimelineEvent[]> | undefined : undefined
  const title = (diagramType === 'timeline' && diagramData) ? diagramData.title as string | undefined : undefined

  const totalWidth = useMemo(() => Math.max(600, (events?.length ?? 0) * EVENT_GAP_X + SIDE_MARGIN * 2), [events])

  const computedRects = useMemo(() => {
    const map = new Map<string, Rect>()
    if (!events) return map
    const SIZE = EVENT_R * 2 + 4
    let globalIndex = 0

    if (sections) {
      for (const [, sectionEvents] of Object.entries(sections)) {
        for (const _event of sectionEvents) {
          const ei = globalIndex++
          const ex = SIDE_MARGIN + ei * EVENT_GAP_X
          map.set(`event-${ei}`, { x: ex - SIZE / 2, y: TIMELINE_Y - SIZE / 2, width: SIZE, height: SIZE })
        }
      }
    } else {
      for (let i = 0; i < events.length; i++) {
        const ex = SIDE_MARGIN + i * EVENT_GAP_X
        map.set(`event-${i}`, { x: ex - SIZE / 2, y: TIMELINE_Y - SIZE / 2, width: SIZE, height: SIZE })
      }
    }
    return map
  }, [events, sections])

  useEffect(() => {
    for (const [id, rect] of computedRects) {
      if (diagramElementPositions[id]) continue
      moveDiagramElement(id, { x: rect.x, y: rect.y })
      resizeDiagramElement(id, { width: rect.width, height: rect.height })
    }
  }, [computedRects, diagramElementPositions, moveDiagramElement, resizeDiagramElement])

  if (diagramType !== 'timeline' || !events) return null

  function getRect(id: string): Rect {
    const stored = diagramElementPositions[id]
    const computed = computedRects.get(id)
    if (stored) {
      return {
        x: stored.x,
        y: stored.y,
        width: stored.width || computed?.width || (EVENT_R * 2 + 4),
        height: stored.height || computed?.height || (EVENT_R * 2 + 4),
      }
    }
    return computed ?? { x: 0, y: 0, width: 0, height: 0 }
  }

  const midX = totalWidth / 2

  return (
    <g ref={svgRef}>
      {title && (
        <text x={midX} y={30} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={17} fontWeight={700} fill="#333">
          {title}
        </text>
      )}

      <line x1={SIDE_MARGIN} y1={TIMELINE_Y} x2={totalWidth - SIDE_MARGIN} y2={TIMELINE_Y} stroke="#b0b0b0" strokeWidth={2} />

      {(() => {
        let globalIndex = 0

        if (sections) {
          return Object.entries(sections).map(([sectionName, sectionEvents], si) => {
            const secColor = PALETTE[si % PALETTE.length]!
            const secY = TIMELINE_Y + 30
            const startX = SIDE_MARGIN + sectionEvents.length * EVENT_GAP_X / 2

            return (
              <g key={sectionName}>
                <rect
                  x={startX - 40}
                  y={secY - 6}
                  width={sectionEvents.length * EVENT_GAP_X + 80}
                  height={SECTION_H}
                  rx={6}
                  fill={secColor}
                  opacity={0.08}
                />
                <text
                  x={startX}
                  y={secY + 6}
                  textAnchor="middle"
                  fontFamily="Arial, sans-serif"
                  fontSize={11}
                  fontWeight={600}
                  fill="#666"
                >
                  {sectionName}
                </text>
                {sectionEvents.map((event, j) => {
                  const ei = globalIndex++
                  const ex = SIDE_MARGIN + ei * EVENT_GAP_X
                  const elementKey = `event-${ei}`
                  const rect = getRect(elementKey)
                  const color = diagramColors[elementKey] ?? secColor
                  const isSelected = selectedIds.has(elementKey)
                  const isUp = ei % 2 === 0
                  const centerX = rect.x + rect.width / 2
                  const centerY = rect.y + rect.height / 2

                  return (
                    <g key={`${sectionName}-${j}`} onMouseDown={e => startDrag(e, elementKey, rect)} style={{ cursor: 'pointer' }}>
                      <line x1={centerX} y1={centerY} x2={ex} y2={isUp ? TIMELINE_Y - 16 : TIMELINE_Y + 16} stroke="#b0b0b0" strokeWidth={1} />
                      <circle
                        cx={centerX}
                        cy={centerY}
                        r={EVENT_R}
                        fill={color}
                        stroke={diagramStrokeColors[elementKey] || (isSelected ? '#4a90d9' : 'white')}
                        strokeWidth={isSelected ? 2.5 : 2}
                        strokeDasharray={isSelected ? '4 2' : undefined}
                      />
                      <text x={ex} y={isUp ? TIMELINE_Y - 30 : TIMELINE_Y + 34} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={11} fontWeight={600} fill="#333">
                        {event.date}
                      </text>
                      <text x={ex} y={isUp ? TIMELINE_Y - 44 : TIMELINE_Y + 48} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={10} fill="#666">
                        {event.title}
                      </text>
                      {isSelected && renderHandles(rect, elementKey)}
                    </g>
                  )
                })}
              </g>
            )
          })
        }

        return events.map((event, i) => {
          const ex = SIDE_MARGIN + i * EVENT_GAP_X
          const elementKey = `event-${i}`
          const rect = getRect(elementKey)
          const color = diagramColors[elementKey] ?? PALETTE[i % PALETTE.length]!
          const isSelected = selectedIds.has(elementKey)
          const isUp = i % 2 === 0
          const centerX = rect.x + rect.width / 2
          const centerY = rect.y + rect.height / 2

          return (
            <g key={i} onMouseDown={e => startDrag(e, elementKey, rect)} style={{ cursor: 'pointer' }}>
              <line x1={centerX} y1={centerY} x2={ex} y2={isUp ? TIMELINE_Y - 16 : TIMELINE_Y + 16} stroke="#b0b0b0" strokeWidth={1} />
              <circle
                cx={centerX}
                cy={centerY}
                r={EVENT_R}
                fill={color}
                stroke={diagramStrokeColors[elementKey] || (isSelected ? '#4a90d9' : 'white')}
                strokeWidth={isSelected ? 2.5 : 2}
                strokeDasharray={isSelected ? '4 2' : undefined}
              />
              <text x={ex} y={isUp ? TIMELINE_Y - 30 : TIMELINE_Y + 34} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={11} fontWeight={600} fill="#333">
                {event.date}
              </text>
              <text x={ex} y={isUp ? TIMELINE_Y - 44 : TIMELINE_Y + 48} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={10} fill="#666">
                {event.title}
              </text>
              {isSelected && renderHandles(rect, elementKey)}
            </g>
          )
        })
      })()}
    </g>
  )
}
