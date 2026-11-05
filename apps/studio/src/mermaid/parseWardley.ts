import { DiagramModel } from '../core/model/DiagramModel'

export interface WardleyData {
  title?: string
  components: { id: string; name: string; visibility: number; evolution: number; isAnchor: boolean }[]
  connections: { source: string; target: string }[]
  evolutions: { name: string }[]
  inertias: { name: string }[]
}

const CANVAS_WIDTH = 600
const CANVAS_HEIGHT = 600
const SHAPE_WIDTH = 120
const SHAPE_HEIGHT = 50

function parseCoord(value: string): number {
  const v = parseFloat(value)
  return isNaN(v) ? 0 : v
}

export function parseWardley(dsl: string): { model: DiagramModel; wardleyData: WardleyData } {
  const model = new DiagramModel()
  const data: WardleyData = {
    components: [],
    connections: [],
    evolutions: [],
    inertias: [],
  }

  const lines = dsl.split('\n')
  const componentMap = new Map<string, string>()

  for (const rawLine of lines) {
    const trimmed = rawLine.trim()
    if (!trimmed || trimmed.startsWith('%%')) continue

    if (/^wardley-beta/i.test(trimmed)) continue

    const titleMatch = /^title\s+(.+)/i.exec(trimmed)
    if (titleMatch) {
      data.title = titleMatch[1]!.trim()
      const shape = model.addShape('rectangle', { x: 20, y: 10 }, { width: 300, height: 40 })
      model.updateShapeText(shape.id, { content: data.title, fontSize: 18 })
      continue
    }

    const anchorMatch = /^anchor\s+(?:"([^"]+)"|(\S+))\s*\[([\d.]+)\s*,\s*([\d.]+)\]/.exec(trimmed)
    if (anchorMatch) {
      const name = anchorMatch[1] ?? anchorMatch[2]!
      const visibility = parseCoord(anchorMatch[3]!)
      const evolution = parseCoord(anchorMatch[4]!)
      const x = evolution * CANVAS_WIDTH
      const y = (1 - visibility) * CANVAS_HEIGHT
      const shape = model.addShape('stadium', { x, y }, { width: SHAPE_WIDTH, height: SHAPE_HEIGHT })
      model.updateShapeText(shape.id, { content: name, fontSize: 14 })
      model.updateShapeStyle(shape.id, { fill: '#e8f4f8', stroke: '#2b6cb0' })
      componentMap.set(name.toLowerCase(), shape.id)
      data.components.push({ id: shape.id, name, visibility, evolution, isAnchor: true })
      continue
    }

    const componentMatch = /^component\s+(?:"([^"]+)"|(\S+))\s*\[([\d.]+)\s*,\s*([\d.]+)\]/.exec(trimmed)
    if (componentMatch) {
      const name = componentMatch[1] ?? componentMatch[2]!
      const visibility = parseCoord(componentMatch[3]!)
      const evolution = parseCoord(componentMatch[4]!)
      const x = evolution * CANVAS_WIDTH
      const y = (1 - visibility) * CANVAS_HEIGHT
      const shape = model.addShape('stadium', { x, y }, { width: SHAPE_WIDTH, height: SHAPE_HEIGHT })
      model.updateShapeText(shape.id, { content: name, fontSize: 14 })
      model.updateShapeStyle(shape.id, { fill: '#f0fff4', stroke: '#2f855a' })
      componentMap.set(name.toLowerCase(), shape.id)
      data.components.push({ id: shape.id, name, visibility, evolution, isAnchor: false })
      continue
    }

    const evolutionMatch = /^evolution\s+(.+)/i.exec(trimmed)
    if (evolutionMatch) {
      const evoName = evolutionMatch[1]!.trim()
      data.evolutions.push({ name: evoName })
      const shape = model.addShape('rectangle', { x: 20, y: CANVAS_HEIGHT - 30 }, { width: SHAPE_WIDTH, height: 30 })
      model.updateShapeText(shape.id, { content: evoName, fontSize: 12 })
      model.updateShapeStyle(shape.id, { fill: '#fefcbf', stroke: '#d69e2e' })
      continue
    }

    const inertiaMatch = /^inertia\s+"([^"]+)"/i.exec(trimmed)
    if (inertiaMatch) {
      const name = inertiaMatch[1]!
      data.inertias.push({ name })
      const shape = model.addShape('diamond', { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 }, { width: 60, height: 60 })
      model.updateShapeText(shape.id, { content: name, fontSize: 10 })
      model.updateShapeStyle(shape.id, { fill: '#fff5f5', stroke: '#e53e3e' })
      continue
    }

    const arrowMatch = /^(?:"([^"]+)"|(\S+))\s*[-.>+]+\s*(?:"([^"]+)"|(\S+))/.exec(trimmed)
    if (arrowMatch) {
      const sourceName = arrowMatch[1] ?? arrowMatch[2]!
      const targetName = arrowMatch[3] ?? arrowMatch[4]!
      data.connections.push({ source: sourceName, target: targetName })
    }
  }

  for (const conn of data.connections) {
    const sourceId = componentMap.get(conn.source.toLowerCase())
    const targetId = componentMap.get(conn.target.toLowerCase())
    if (sourceId && targetId) {
      try {
        model.addConnection(sourceId, targetId)
      } catch {
      }
    }
  }

  return { model, wardleyData: data }
}

export function isWardley(dsl: string): boolean {
  return /^\s*wardley-beta/i.test(dsl)
}
