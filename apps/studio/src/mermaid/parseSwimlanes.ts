import { DiagramModel } from '../core/model/DiagramModel'

const SWIMLANE_HEADER = /^\s*swimlane-beta(?:\s+(TB|TD|LR|RL|BT))?/i
const DIRECTION_PATTERN = /^\s*direction\s+(TB|TD|LR|RL|BT)\s*$/i
const SUBGRAPH_BEGIN = /^subgraph\s+(\w[\w-]*)(?:\s+\[([^\]]*)\])?\s*$/
const SUBGRAPH_END = /^end\s*$/
const NODE_PATTERN = /^\s*(\w[\w-]*)\s*\[([^\]]*)\]\s*$/

export interface SwimlaneNode {
  id: string
  label: string
}

export interface SwimlaneLane {
  name: string
  nodes: SwimlaneNode[]
}

export interface SwimlanesData {
  lanes: SwimlaneLane[]
  edges: { source: string; target: string }[]
}

function parseEdgeLine(line: string): { source: string; target: string }[] {
  const result: { source: string; target: string }[] = []

  const tokens = line.split(/\s+/)
  for (let i = 1; i < tokens.length - 1; i++) {
    const left = tokens[i - 1]!
    const mid = tokens[i]!
    const right = tokens[i + 1]!

    if (mid === '-->') {
      result.push({ source: left, target: right })
      i += 1
    } else if (mid.startsWith('-->') || mid.startsWith('---')) {
      const clean = mid.replace(/[->|]/g, '')
      if (clean.length === 0 && left && right) {
        result.push({ source: left, target: right })
        i += 1
      }
    }
  }

  return result
}

export function parseSwimlanes(dsl: string): { model: DiagramModel; swimlanesData: SwimlanesData } {
  const model = new DiagramModel()
  const lines = dsl.split('\n')

  const nodeIds = new Map<string, string>()
  const subgraphStack: string[] = []
  const lanes: SwimlaneLane[] = []
  const edges: { source: string; target: string }[] = []
  let cursorX = 60
  let cursorY = 40
  let currentLane: SwimlaneLane | null = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('%%')) continue
    if (SWIMLANE_HEADER.test(line)) continue
    if (DIRECTION_PATTERN.test(line)) continue

    const subgraphMatch = SUBGRAPH_BEGIN.exec(line)
    if (subgraphMatch) {
      currentLane = { name: subgraphMatch[2] ?? subgraphMatch[1]!, nodes: [] }
      lanes.push(currentLane)
      const pos = { x: cursorX, y: cursorY }
      const shape = model.addShape('stadium', pos, { width: 180, height: 60 })
      model.updateShapeText(shape.id, { content: currentLane.name })
      subgraphStack.push(currentLane.name)
      cursorY += 80
      continue
    }

    if (SUBGRAPH_END.test(line)) {
      subgraphStack.pop()
      currentLane = null
      continue
    }

    const nodeMatch = NODE_PATTERN.exec(line)
    if (nodeMatch) {
      const id = nodeMatch[1]!
      const label = nodeMatch[2]!
      const pos = { x: cursorX, y: cursorY }
      const shape = model.addShape('rectangle', pos, { width: 150, height: 60 })
      model.updateShapeText(shape.id, { content: label })
      nodeIds.set(id, shape.id)
      if (currentLane) {
        currentLane.nodes.push({ id, label })
      }
      cursorY += 80
      continue
    }

    const edgeLine = line.replace(/\|([^|]*)\|/g, ' ')
    const parsedEdges = parseEdgeLine(edgeLine)
    for (const { source, target } of parsedEdges) {
      const srcId = nodeIds.get(source)
      const tgtId = nodeIds.get(target)
      if (srcId && tgtId) {
        model.addConnection(srcId, tgtId)
        edges.push({ source, target })
      }
    }
  }

  return { model, swimlanesData: { lanes, edges } }
}

export function isSwimlanes(dsl: string): boolean {
  return SWIMLANE_HEADER.test(dsl)
}
