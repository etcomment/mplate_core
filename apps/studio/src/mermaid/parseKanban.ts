import { DiagramModel } from '../core/model/DiagramModel'

const MODIFIERS = /\b(crit|active|high|low|done)\b\s*/gi
const METADATA = /@\{[^}]*\}\s*/g

function parseItem(text: string): { id: string; title: string } | null {
  const cleaned = text.replace(MODIFIERS, '').replace(METADATA, '').trim()
  const withBrackets = /^(\w[\w-]*)\s*\[([^\]]*)\]\s*$/.exec(cleaned)
  if (withBrackets) return { id: withBrackets[1]!, title: withBrackets[2]! }
  const onlyBrackets = /^\[([^\]]+)\]\s*$/.exec(cleaned)
  if (onlyBrackets) return { id: onlyBrackets[1]!, title: onlyBrackets[1]! }
  const bare = /^(\w[\w-]+)\s*$/.exec(cleaned)
  if (bare) return { id: bare[1]!, title: bare[1]! }
  return null
}

function indentLevel(line: string): number {
  return line.length - line.trimStart().length
}

export function parseKanban(dsl: string): DiagramModel {
  const model = new DiagramModel()
  const lines = dsl.split('\n')

  const columns: { title: string; shapeId?: string }[] = []
  const tasks: { title: string; colIdx: number }[] = []

  let baseIndent = -1
  let colIdx = -1

  for (const raw of lines) {
    const trimmed = raw.trim()
    if (!trimmed || trimmed.startsWith('%%') || /^\s*kanban\b/i.test(trimmed) || trimmed.startsWith('---')) continue

    const level = indentLevel(raw)
    if (baseIndent < 0) baseIndent = level

    const item = parseItem(trimmed)
    if (!item) continue

    if (level <= baseIndent) {
      colIdx++
      columns.push({ title: item.title })
    } else if (colIdx >= 0) {
      tasks.push({ title: item.title, colIdx })
    }
  }

  const COL_W = 180
  const COL_H = 50
  const GAP_X = 220
  const START_X = 100
  const START_Y = 40
  const TASK_W = 160
  const TASK_H = 60
  const TASK_GAP = 20

  for (let i = 0; i < columns.length; i++) {
    const x = START_X + i * GAP_X
    const shape = model.addShape('rectangle', { x, y: START_Y }, { width: COL_W, height: COL_H })
    model.updateShapeText(shape.id, { content: columns[i]!.title })
    columns[i]!.shapeId = shape.id
  }

  const rowIdx: number[] = columns.map(() => 0)
  for (const task of tasks) {
    const ci = task.colIdx
    const x = START_X + ci * GAP_X + 10
    const y = START_Y + COL_H + 20 + rowIdx[ci]! * (TASK_H + TASK_GAP)
    const shape = model.addShape('rectangle', { x, y }, { width: TASK_W, height: TASK_H })
    model.updateShapeText(shape.id, { content: task.title })
    if (columns[ci]?.shapeId) {
      model.addConnection(shape.id, columns[ci]!.shapeId!)
    }
    rowIdx[ci]!++
  }

  return model
}

export function isKanban(dsl: string): boolean {
  return /^\s*kanban\b/i.test(dsl)
}
