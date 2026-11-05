import { useDiagramStore } from '../../store/diagramStore'
import type { Shape, ConnectionType } from '../../core/model/Shape'
import { useMemo } from 'react'

interface StateLayout {
  shapes: readonly Shape[]
  connections: readonly ConnectionType[]
}

function layoutStates(shapes: readonly Shape[], connections: readonly ConnectionType[]): StateLayout {
  const rectShapes = shapes.filter(s => s.type === 'rectangle')
  const choiceShapes = shapes.filter(s => s.type === 'diamond')
  return { shapes: [...rectShapes, ...choiceShapes], connections }
}

export function StateRenderer() {
  const diagramType = useDiagramStore(s => s.diagramType)
  const shapes = useDiagramStore(s => s.shapes)
  const connections = useDiagramStore(s => s.connections)
  const diagramColors = useDiagramStore(s => s.diagramColors)
  const selectedIds = useDiagramStore(s => s.selectedDiagramElementIds)
  const toggleElement = useDiagramStore(s => s.toggleDiagramElement)

  const layout = useMemo(() => layoutStates(shapes, connections), [shapes, connections])

  if (diagramType !== 'state') return null

  const shapeMap = new Map(shapes.map(s => [s.id, s]))

  return (
    <g>
      {layout.connections.map((conn, ci) => {
        const source = shapeMap.get(conn.sourceId)
        const target = shapeMap.get(conn.targetId)
        if (!source || !target) return null

        const sx = source.position.x + source.dimensions.width / 2
        const sy = source.position.y + source.dimensions.height / 2
        const tx = target.position.x + target.dimensions.width / 2
        const ty = target.position.y + target.dimensions.height / 2
        const elementKey = `trans-${ci}`
        const isSelected = selectedIds.has(elementKey)

        return (
          <g key={conn.id}>
            <line
              x1={sx}
              y1={sy}
              x2={tx}
              y2={ty}
              stroke={isSelected ? '#4a90d9' : '#666'}
              strokeWidth={isSelected ? 2.5 : 1.5}
              strokeDasharray={isSelected ? '4 2' : undefined}
              markerEnd="url(#stateArrow)"
              onClick={() => toggleElement(elementKey)}
              style={{ cursor: 'pointer' }}
            />
            {conn.label && (
              <text
                x={(sx + tx) / 2}
                y={(sy + ty) / 2 - 6}
                textAnchor="middle"
                fontFamily="Arial, sans-serif"
                fontSize={9}
                fill="#555"
                pointerEvents="none"
              >
                {conn.label}
              </text>
            )}
          </g>
        )
      })}

      {layout.shapes.map((shape) => {
        const { x, y } = shape.position
        const { width: w, height: h } = shape.dimensions
        const elementKey = `state-${shape.id}`
        const isSelected = selectedIds.has(elementKey) || selectedIds.has(shape.id)
        const color = diagramColors[elementKey] ?? (shape.type === 'diamond' ? '#f0f0f0' : '#e8f4f8')
        const isChoice = shape.type === 'diamond'

        return (
          <g
            key={shape.id}
            onClick={() => toggleElement(elementKey)}
            style={{ cursor: 'pointer' }}
          >
            {isChoice ? (
              <>
                <polygon
                  points={`${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`}
                  fill={color}
                  stroke={isSelected ? '#4a90d9' : '#666'}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  strokeDasharray={isSelected ? '4 2' : undefined}
                />
                <text
                  x={x + w / 2}
                  y={y + h / 2 + 4}
                  textAnchor="middle"
                  fontFamily="Arial, sans-serif"
                  fontSize={10}
                  fill="#555"
                  pointerEvents="none"
                >
                  {shape.text.content}
                </text>
              </>
            ) : (
              <>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx={8}
                  fill={color}
                  stroke={isSelected ? '#4a90d9' : shape.style.stroke}
                  strokeWidth={isSelected ? 2.5 : shape.style.strokeWidth}
                  strokeDasharray={isSelected ? '4 2' : undefined}
                />
                <text
                  x={x + w / 2}
                  y={y + h / 2 + 4}
                  textAnchor="middle"
                  fontFamily="Arial, sans-serif"
                  fontSize={12}
                  fill="#333"
                  fontWeight={600}
                  pointerEvents="none"
                >
                  {shape.text.content}
                </text>
              </>
            )}
          </g>
        )
      })}

      <defs>
        <marker id="stateArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#666" />
        </marker>
      </defs>
    </g>
  )
}
