import { DiagramModel } from '../core/model/DiagramModel'
import type { ShapeType } from '../core/model/Shape'

const EM_HEADER = /^\s*eventmodeling-beta\s*$/i
const SECTION_HEADER = /^\s*section\s+(.+)$/i

interface EmEntity {
  type: ShapeType
  label: string
  fill: string
}

const ENTITY_PATTERN = /^\s*(UI|Command|Event|View|Processor):\s*"([^"]*)"\s*$/
const ENTITY_TYPES: Record<string, EmEntity> = {
  UI: { type: 'stadium', label: 'UI', fill: '#b3d9ff' },
  Command: { type: 'parallelogram', label: 'Command', fill: '#ffcc80' },
  Event: { type: 'rectangle', label: 'Event', fill: '#a5d6a7' },
  View: { type: 'document', label: 'View', fill: '#fff59d' },
  Processor: { type: 'hexagon', label: 'Processor', fill: '#ce93d8' },
}

export function parseEventModeling(dsl: string): DiagramModel {
  const model = new DiagramModel()
  const lines = dsl.split('\n')

  const shapeIds: string[] = []
  let cursorY = 40

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('%%') || EM_HEADER.test(line) || SECTION_HEADER.test(line)) continue

    const match = ENTITY_PATTERN.exec(line)
    if (!match) continue

    const entityKey = match[1]!
    const desc = match[2]!
    const entity = ENTITY_TYPES[entityKey]!

    const pos = { x: 100, y: cursorY }
    const shape = model.addShape(entity.type, pos, { width: 160, height: 70 })
    model.updateShapeText(shape.id, { content: desc })
    model.updateShapeStyle(shape.id, { fill: entity.fill })
    shapeIds.push(shape.id)
    cursorY += 90
  }

  for (let i = 0; i < shapeIds.length - 1; i++) {
    model.addConnection(shapeIds[i]!, shapeIds[i + 1]!)
  }

  return model
}

export function isEventModeling(dsl: string): boolean {
  return EM_HEADER.test(dsl)
}
