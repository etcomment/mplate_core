import { useDiagramStore } from '../../store/diagramStore'
import type { Shape } from '../../core/model/Shape'

const PADDING = 16

interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

function computeBoundingBox(shapes: readonly Shape[]): BoundingBox | null {
  if (shapes.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const shape of shapes) {
    const left = shape.position.x
    const top = shape.position.y
    const right = shape.position.x + shape.dimensions.width
    const bottom = shape.position.y + shape.dimensions.height

    if (left < minX) minX = left
    if (top < minY) minY = top
    if (right > maxX) maxX = right
    if (bottom > maxY) maxY = bottom
  }

  return {
    x: minX - PADDING,
    y: minY - PADDING - 20,
    width: maxX - minX + 2 * PADDING,
    height: maxY - minY + 2 * PADDING + 20,
  }
}

export function SubgraphRenderer() {
  const shapes = useDiagramStore(s => s.shapes)
  const subgraphGroups = useDiagramStore(s => s.subgraphGroups)
  const subgraphStyle = useDiagramStore(s => s.subgraphStyle)

  const shapeMap = new Map(shapes.map(s => [s.id, s]))

  return (
    <g>
      {subgraphGroups.map((group, index) => {
        const groupShapes = group.shapeIds
          .map(id => shapeMap.get(id))
          .filter((s): s is Shape => s !== undefined)

        const box = computeBoundingBox(groupShapes)
        if (!box) return null

        return (
          <g key={`subgraph-${index}`}>
            <rect
              x={box.x}
              y={box.y + 20}
              width={box.width}
              height={box.height - 20}
              fill={subgraphStyle.fill}
              stroke={subgraphStyle.stroke}
              strokeWidth={1.5}
              strokeDasharray="6 3"
              rx={6}
              ry={6}
            />
            <rect
              x={box.x}
              y={box.y}
              width={box.width}
              height={20}
              fill="#ffffff"
              stroke={subgraphStyle.stroke}
              strokeWidth={1.5}
              rx={0}
              ry={0}
            />
            <text
              x={box.x + box.width / 2}
              y={box.y + 14}
              textAnchor="middle"
              fontFamily="Arial, sans-serif"
              fontSize={11}
              fill={subgraphStyle.textColor}
              fontWeight={600}
            >
              {group.title}
            </text>
          </g>
        )
      })}
    </g>
  )
}
