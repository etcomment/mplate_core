import { useRef, useEffect, useMemo } from 'react'
import { useDiagramStore } from '../../store/diagramStore'
import { useDiagramDragResize } from '../../hooks/useDiagramDragResize'
import type { ZenUmlData } from '../../mermaid/parseZenUml'

const ACTOR_W = 120
const ACTOR_H = 50
const ACTOR_GAP = 160
const START_X = 80
const ACTOR_Y = 40
const LIFELINE_TOP_Y = ACTOR_Y + ACTOR_H
const MESSAGE_SPACING = 55
const LIFELINE_BOTTOM = 400

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function ZenUmlRenderer() {
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

  const data = (diagramType === 'zenuml' && diagramData) ? diagramData as unknown as ZenUmlData : null

  const participantIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    if (!data) return map
    data.participants.forEach((p, i) => map.set(p.name, i))
    return map
  }, [data])

  function getX(index: number): number {
    return START_X + index * (ACTOR_W + ACTOR_GAP)
  }

  function getCenterX(index: number): number {
    return getX(index) + ACTOR_W / 2
  }

  const computedRects = useMemo(() => {
    const map = new Map<string, Rect>()
    if (!data) return map

    for (let i = 0; i < data.participants.length; i++) {
      const x = getX(i)
      map.set(`zenuml-actor-${i}`, { x, y: ACTOR_Y, width: ACTOR_W, height: ACTOR_H })
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

  if (diagramType !== 'zenuml' || !data) return null

  function getRect(id: string): Rect {
    const stored = diagramElementPositions[id]
    const computed = computedRects.get(id)
    if (stored) {
      return {
        x: stored.x,
        y: stored.y,
        width: stored.width || computed?.width || ACTOR_W,
        height: stored.height || computed?.height || ACTOR_H,
      }
    }
    return computed ?? { x: 0, y: 0, width: 0, height: 0 }
  }

  return (
    <g ref={svgRef}>
      {data.title && (
        <text x={START_X + 100} y={18} textAnchor="start" fontFamily="Arial, sans-serif" fontSize={16} fontWeight={700} fill="#333">
          {data.title}
        </text>
      )}

      <defs>
        <marker id="zenumlArrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={5} markerHeight={5} orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#555" />
        </marker>
      </defs>

      {data.participants.map((_, pi) => {
        const centerX = getCenterX(pi)
        return (
          <line
            key={`zenuml-lifeline-${pi}`}
            x1={centerX}
            y1={LIFELINE_TOP_Y}
            x2={centerX}
            y2={LIFELINE_BOTTOM}
            stroke="#ccc"
            strokeWidth={1}
            strokeDasharray="6 4"
            pointerEvents="none"
          />
        )
      })}

      {data.messages.map((msg, mi) => {
        const srcIdx = participantIndexMap.get(msg.sourceId)
        const tgtIdx = participantIndexMap.get(msg.targetId)
        if (srcIdx === undefined || tgtIdx === undefined) return null

        const elementKey = `zenuml-msg-${mi}`
        const isSelected = selectedIds.has(elementKey)
        const y = LIFELINE_TOP_Y + 30 + mi * MESSAGE_SPACING
        const sx = getCenterX(srcIdx)
        const tx = getCenterX(tgtIdx)
        const dir = tx > sx ? 1 : -1
        const color = isSelected ? '#4a90d9' : '#555'

        return (
          <g key={elementKey}>
            <line
              x1={sx}
              y1={y}
              x2={tx - dir * 8}
              y2={y}
              stroke={color}
              strokeWidth={isSelected ? 2.5 : 1.5}
              markerEnd="url(#zenumlArrow)"
              style={{ cursor: 'pointer' }}
            />
            {msg.label && (
              <text
                x={(sx + tx) / 2}
                y={y - 8}
                textAnchor="middle"
                fontFamily="Arial, sans-serif"
                fontSize={11}
                fill={isSelected ? '#4a90d9' : '#666'}
                fontWeight={isSelected ? 600 : 400}
                pointerEvents="none"
              >
                {msg.label}
              </text>
            )}
          </g>
        )
      })}

      {data.participants.map((participant, pi) => {
        const rect = getRect(`zenuml-actor-${pi}`)
        const elementKey = `zenuml-actor-${pi}`
        const isSelected = selectedIds.has(elementKey)
        const color = diagramColors[elementKey] ?? '#f5f5f5'
        const stroke = diagramStrokeColors[elementKey] || (isSelected ? '#4a90d9' : (participant.isActor ? '#d69e2e' : '#999'))

        return (
          <g key={elementKey} onMouseDown={e => startDrag(e, elementKey, rect)} style={{ cursor: 'pointer' }}>
            <rect
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              rx={6}
              fill={color}
              stroke={stroke}
              strokeWidth={isSelected ? 2.5 : 1.5}
              strokeDasharray={isSelected ? '4 2' : undefined}
            />
            <text
              x={rect.x + rect.width / 2}
              y={rect.y + rect.height / 2 + 5}
              textAnchor="middle"
              fontFamily="Arial, sans-serif"
              fontSize={13}
              fill="#333"
              fontWeight={isSelected ? 600 : 400}
              pointerEvents="none"
            >
              {participant.isActor ? `@${participant.name}` : participant.name}
            </text>
            {isSelected && renderHandles(rect, elementKey)}
          </g>
        )
      })}
    </g>
  )
}
