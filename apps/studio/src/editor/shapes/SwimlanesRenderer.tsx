import { useRef, useEffect, useMemo } from 'react'
import { useDiagramStore } from '../../store/diagramStore'
import { useDiagramDragResize } from '../../hooks/useDiagramDragResize'
import type { SwimlanesData } from '../../mermaid/parseSwimlanes'

const PALETTE = [
  '#bee3f8', '#c6f6d5', '#fefcbf', '#fed7d7', '#e9d8fd',
  '#fbb6ce', '#e2e8f0', '#feebc8',
]

const LANE_HEADER_W = 140
const LANE_NODE_W = 180
const LANE_NODE_H = 60
const PAD = 20
const START_X = 20
const START_Y = 50

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function SwimlanesRenderer() {
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

  const data = (diagramType === 'swimlane' && diagramData) ? diagramData as unknown as SwimlanesData : null

  const computedRects = useMemo(() => {
    const map = new Map<string, Rect>()
    if (!data) return map

    let y = START_Y
    for (let li = 0; li < data.lanes.length; li++) {
      const lane = data.lanes[li]!
      const laneKey = `swimlane-lane-${li}`
      const nodeCount = Math.max(lane.nodes.length, 1)
      const laneH = LANE_HEADER_W + nodeCount * (LANE_NODE_H + PAD) + PAD
      map.set(laneKey, { x: START_X, y, width: LANE_HEADER_W + LANE_NODE_W + PAD * 3, height: laneH })

      let nodeY = y + LANE_HEADER_W + PAD
      for (let ni = 0; ni < lane.nodes.length; ni++) {
        const nodeKey = `swimlane-node-${li}-${ni}`
        map.set(nodeKey, { x: START_X + PAD, y: nodeY, width: LANE_NODE_W, height: LANE_NODE_H })
        nodeY += LANE_NODE_H + PAD
      }
      y += laneH + PAD
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

  if (diagramType !== 'swimlane' || !data) return null

  function getRect(id: string): Rect {
    const stored = diagramElementPositions[id]
    const computed = computedRects.get(id)
    if (stored) {
      return {
        x: stored.x,
        y: stored.y,
        width: stored.width || computed?.width || LANE_NODE_W,
        height: stored.height || computed?.height || LANE_NODE_H,
      }
    }
    return computed ?? { x: 0, y: 0, width: 0, height: 0 }
  }

  return (
    <g ref={svgRef}>
      {data.lanes.map((lane, li) => {
        const laneKey = `swimlane-lane-${li}`
        const laneRect = getRect(laneKey)
        const isSelected = selectedIds.has(laneKey)
        const bg = diagramColors[laneKey] ?? PALETTE[li % PALETTE.length]!

        const headerY = laneRect.y
        const headerH = LANE_HEADER_W

        return (
          <g key={laneKey}>
            <rect
              x={laneRect.x}
              y={laneRect.y}
              width={laneRect.width}
              height={laneRect.height}
              rx={8}
              fill={bg}
              stroke={diagramStrokeColors[laneKey] || (isSelected ? '#4a90d9' : '#ccc')}
              strokeWidth={isSelected ? 2 : 1}
              strokeDasharray={isSelected ? '4 2' : undefined}
              opacity={0.5}
              style={{ cursor: 'pointer' }}
              onMouseDown={e => startDrag(e, laneKey, laneRect)}
            />
            <rect
              x={laneRect.x}
              y={headerY}
              width={laneRect.width}
              height={headerH}
              rx={8}
              fill={bg}
              opacity={0.9}
              pointerEvents="none"
            />
            <rect
              x={laneRect.x}
              y={headerY + headerH - 8}
              width={laneRect.width}
              height={8}
              fill={bg}
              opacity={0.9}
              pointerEvents="none"
            />
            <text
              x={laneRect.x + laneRect.width / 2}
              y={headerY + headerH / 2 + 5}
              textAnchor="middle"
              fontFamily="Arial, sans-serif"
              fontSize={15}
              fontWeight={700}
              fill="#333"
              pointerEvents="none"
            >
              {lane.name}
            </text>
            {isSelected && renderHandles(laneRect, laneKey)}

            {lane.nodes.map((node, ni) => {
              const nodeKey = `swimlane-node-${li}-${ni}`
              const nodeRect = getRect(nodeKey)
              const isNodeSelected = selectedIds.has(nodeKey)

              return (
                <g key={nodeKey} onMouseDown={e => startDrag(e, nodeKey, nodeRect)} style={{ cursor: 'pointer' }}>
                  <rect
                    x={nodeRect.x}
                    y={nodeRect.y}
                    width={nodeRect.width}
                    height={nodeRect.height}
                    rx={6}
                    fill="#ffffff"
                    stroke={diagramStrokeColors[nodeKey] || (isNodeSelected ? '#4a90d9' : '#bbb')}
                    strokeWidth={isNodeSelected ? 2 : 1}
                    strokeDasharray={isNodeSelected ? '4 2' : undefined}
                  />
                  <text
                    x={nodeRect.x + nodeRect.width / 2}
                    y={nodeRect.y + nodeRect.height / 2 + 5}
                    textAnchor="middle"
                    fontFamily="Arial, sans-serif"
                    fontSize={13}
                    fill="#333"
                    fontWeight={isNodeSelected ? 600 : 400}
                    pointerEvents="none"
                  >
                    {node.label}
                  </text>
                  {isNodeSelected && renderHandles(nodeRect, nodeKey)}
                </g>
              )
            })}
          </g>
        )
      })}

      {data.edges.map((edge, i) => {
        const elementKey = `swimlane-edge-${i}`
        const isSelected = selectedIds.has(elementKey)
        const sourceRects: Rect[] = []
        const targetRects: Rect[] = []

        for (let li = 0; li < data.lanes.length; li++) {
          const lane = data.lanes[li]!
          for (let ni = 0; ni < lane.nodes.length; ni++) {
            if (lane.nodes[ni]!.id === edge.source) {
              sourceRects.push(getRect(`swimlane-node-${li}-${ni}`))
            }
            if (lane.nodes[ni]!.id === edge.target) {
              targetRects.push(getRect(`swimlane-node-${li}-${ni}`))
            }
          }
        }

        if (sourceRects.length === 0 || targetRects.length === 0) return null
        const sr = sourceRects[0]!
        const tr = targetRects[0]!

        const sx = sr.x + sr.width
        const sy = sr.y + sr.height / 2
        const tx = tr.x
        const ty = tr.y + tr.height / 2

        return (
          <line
            key={elementKey}
            x1={sx}
            y1={sy}
            x2={tx}
            y2={ty}
            stroke={isSelected ? '#4a90d9' : '#888'}
            strokeWidth={isSelected ? 2.5 : 1.5}
            strokeDasharray={isSelected ? '4 2' : undefined}
            markerEnd="url(#swimlaneArrow)"
            style={{ cursor: 'pointer' }}
          />
        )
      })}

      <defs>
        <marker id="swimlaneArrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={5} markerHeight={5} orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#888" />
        </marker>
      </defs>
    </g>
  )
}
