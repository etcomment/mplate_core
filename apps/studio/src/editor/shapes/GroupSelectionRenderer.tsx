import { useDiagramStore } from '../../store/diagramStore'
import { GroupResizeHandles } from './GroupResizeHandles'

export function GroupSelectionRenderer() {
  const shapes = useDiagramStore(s => s.shapes)
  const selectedShapeIds = useDiagramStore(s => s.selectedShapeIds)

  if (selectedShapeIds.size < 2) return null

  // Find all groupIds present in current selection
  const selectedShapes = shapes.filter(s => selectedShapeIds.has(s.id))
  const groupMap = new Map<string, typeof selectedShapes>()

  for (const shape of selectedShapes) {
    if (shape.groupId) {
      const existing = groupMap.get(shape.groupId) ?? []
      existing.push(shape)
      groupMap.set(shape.groupId, existing)
    }
  }

  const groupBoxes: { id: string; minX: number; minY: number; width: number; height: number; shapeIds: string[] }[] = []

  for (const [groupId, groupShapes] of groupMap.entries()) {
    // Make sure all shapes of the group are selected to draw global box
    const totalGroupShapeCount = shapes.filter(s => s.groupId === groupId).length
    if (groupShapes.length === totalGroupShapeCount && totalGroupShapeCount >= 2) {
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity

      for (const s of groupShapes) {
        minX = Math.min(minX, s.position.x)
        minY = Math.min(minY, s.position.y)
        maxX = Math.max(maxX, s.position.x + s.dimensions.width)
        maxY = Math.max(maxY, s.position.y + s.dimensions.height)
      }

      groupBoxes.push({
        id: groupId,
        minX: minX - 4,
        minY: minY - 4,
        width: maxX - minX + 8,
        height: maxY - minY + 8,
        shapeIds: groupShapes.map(s => s.id),
      })
    }
  }

  if (groupBoxes.length === 0) return null

  return (
    <g pointerEvents="none">
      {groupBoxes.map(box => (
        <g key={box.id}>
          <rect
            x={box.minX}
            y={box.minY}
            width={box.width}
            height={box.height}
            fill="none"
            stroke="#4a90d9"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            rx={2}
            ry={2}
          />
          <GroupResizeHandles groupBox={box} />
        </g>
      ))}
    </g>
  )
}
