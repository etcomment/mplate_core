import { DiagramModel } from '../core/model/DiagramModel'
import type { ShapeType } from '../core/model/Shape'

function cleanLabel(raw: string): string {
  let label = raw
  const iconMatch = /icon\([^)]*\)/.exec(label)
  if (iconMatch) label = label.replace(iconMatch[0], '').trim()
  const anonMatch = /:::[\w-]+/.exec(label)
  if (anonMatch) label = label.replace(anonMatch[0], '').trim()
  const descMatch = /##/.exec(label)
  if (descMatch) label = label.slice(0, descMatch.index).trim()
  label = label.replace(/^"(.*)"$/, '$1')
  return label.trim()
}

function isDirectory(label: string): boolean {
  return label.trim().endsWith('/')
}

export function parseTreeView(dsl: string): DiagramModel {
  const model = new DiagramModel()
  const lines = dsl.split('\n')

  const stack: { indent: number; id: string }[] = []
  let xPos = 40
  let yPos = 40

  for (const line of lines) {
    const trimmed = line.trimRight()
    if (!trimmed.trim() || trimmed.trim().startsWith('%%')) continue
    if (/^treeView-beta/i.test(trimmed.trim())) continue
    if (/^---/.test(trimmed.trim())) continue
    if (/^config:/.test(trimmed.trim())) continue
    if (/^\s+\w+:/.test(trimmed)) continue
    if (/^title\s+/i.test(trimmed.trim())) continue

    const indent = trimmed.length - trimmed.trimStart().length
    const raw = trimmed.trim()
    const label = cleanLabel(raw)
    if (!label) continue

    const isDir = isDirectory(label)
    const shapeType: ShapeType = isDir ? 'stadium' : 'document'

    while (stack.length > 0 && stack[stack.length - 1]!.indent >= indent) {
      stack.pop()
    }

    const shape = model.addShape(shapeType, { x: xPos, y: yPos }, { width: 140, height: 36 })
    model.updateShapeText(shape.id, { content: label.replace(/\/$/, ''), fontSize: 12 })

    if (stack.length > 0) {
      model.addConnection(stack[stack.length - 1]!.id, shape.id)
    }

    stack.push({ indent, id: shape.id })
    yPos += 50
  }

  return model
}

export function isTreeView(dsl: string): boolean {
  return /^\s*treeView-beta/i.test(dsl)
}
