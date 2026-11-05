import type { ArrowDirection, ArrowHead, ArrowStyle, ShapeType } from '../core/model/Shape'

export interface FlowNode {
  id: string
  type: ShapeType
  text: string
}

export interface FlowEdge {
  sourceId: string
  targetId: string
  label?: string
  arrowStyle?: ArrowStyle
  arrowHead?: ArrowHead
  arrowDirection?: ArrowDirection
}

export interface FlowSubgraph {
  id?: string
  title: string
  nodeIds: string[]
}

export interface FlowchartData {
  nodes: FlowNode[]
  edges: FlowEdge[]
  subgraphs: FlowSubgraph[]
  direction: 'TD' | 'LR' | 'RL' | 'BT'
}

function stripQuotes(s: string): string {
  return s.replace(/^["'\s]+|["'\s]+$/g, '')
}

const SHAPE_ALIASES: Record<string, ShapeType> = {
  rect: 'rectangle',
  rounded: 'stadium',
  stadium: 'stadium',
  subproc: 'subroutine',
  cyl: 'cylinder',
  circle: 'ellipse',
  diamond: 'diamond',
  hex: 'hexagon',
  doc: 'document',
  'trap-b': 'trapezoid',
  'trap-t': 'trapezoidAlt',
  'lean-r': 'parallelogram',
  'lean-l': 'parallelogramAlt',
  'dbl-circ': 'ellipse',
  text: 'rectangle',
  'notch-rect': 'rectangle',
  'lin-rect': 'rectangle',
  'sm-circ': 'ellipse',
  'framed-circle': 'ellipse',
  fork: 'rectangle',
  hourglass: 'diamond',
  comment: 'stadium',
  'brace-r': 'stadium',
  braces: 'stadium',
  bolt: 'rectangle',
  delay: 'stadium',
  das: 'cylinder',
  'lin-cyl': 'cylinder',
  'curv-trap': 'trapezoid',
  'div-rect': 'rectangle',
  tri: 'diamond',
  'win-pane': 'rectangle',
  'f-circ': 'ellipse',
  'lin-doc': 'document',
  'notch-pent': 'hexagon',
  'flip-tri': 'trapezoid',
  'sl-rect': 'parallelogram',
  docs: 'document',
  processes: 'rectangle',
  flag: 'trapezoid',
  'bow-rect': 'rectangle',
  'cross-circ': 'ellipse',
  'tag-doc': 'document',
  'tag-rect': 'rectangle',
  odd: 'rectangle',
  'manual-file': 'document',
  'manual-input': 'parallelogram',
  procs: 'rectangle',
  'paper-tape': 'trapezoid',
}

const SHAPE_PATTERNS: { regex: RegExp; type: ShapeType }[] = [
  { regex: /(\w[\w-]*)\s*\(\(\(([^)]*)\)\)\)/g, type: 'ellipse' },
  { regex: /(\w[\w-]*)\s*\[\/([^\]]*)\\\]/g, type: 'trapezoid' },
  { regex: /(\w[\w-]*)\s*\\\[([^\]]*)\/\]/g, type: 'trapezoidAlt' },
  { regex: /(\w[\w-]*)\s*\\\[([^\]]*)\\\]/g, type: 'parallelogramAlt' },
  { regex: /(\w[\w-]*)\s*\(\(([^)]*)\)\)/g, type: 'ellipse' },
  { regex: /(\w[\w-]*)\s*\(\[([^\]]*)\]\)/g, type: 'stadium' },
  { regex: /(\w[\w-]*)\s*\[\[([^\]]*)\]\]/g, type: 'subroutine' },
  { regex: /(\w[\w-]*)\s*\[\(([^)]*)\)\]/g, type: 'cylinder' },
  { regex: /(\w[\w-]*)\s*\{\{([^}]*)\}\}/g, type: 'hexagon' },
  { regex: /(\w[\w-]*)\s*\{(?!\{)([^}]+)\}/g, type: 'diamond' },
  { regex: /(\w[\w-]*)\s*\[\/([^/]*)\/\]/g, type: 'parallelogram' },
  { regex: /(\w[\w-]*)\s*>([^\]]*)\]/g, type: 'parallelogram' },
  { regex: /(\w[\w-]*)\s*\((?!\(|\[)([a-zA-Z0-9\u00C0-\u024F][^)]*)\)/g, type: 'stadium' },
  { regex: /(\w[\w-]*)\s*\["([^"]*)"\]/g, type: 'rectangle' },
  { regex: /(\w[\w-]*)\s*\[(?!["[({/\\])([^\]]+)\]/g, type: 'rectangle' },
]

const AT_SHAPE_REGEX = /(\w[\w-]*)\s*@\{\s*shape:\s*(\w[\w-]*)\s*(?:,\s*label:\s*"([^"]*)")?\s*\}/g

function extractDecoratedNodes(line: string): Map<string, FlowNode> {
  const found = new Map<string, FlowNode>()
  for (const { regex, type } of SHAPE_PATTERNS) {
    regex.lastIndex = 0
    for (const m of line.matchAll(regex)) {
      const id = m[1]!
      const text = stripQuotes(m[2] ?? id)
      found.set(id, { id, type, text })
    }
  }
  if (line.includes('@{')) {
    AT_SHAPE_REGEX.lastIndex = 0
    for (const m of line.matchAll(AT_SHAPE_REGEX)) {
      const id = m[1]!
      const alias = m[2]!
      const label = m[3]
      const type = SHAPE_ALIASES[alias] ?? 'rectangle'
      const text = label ? stripQuotes(label) : id
      if (!found.has(id)) {
        found.set(id, { id, type, text })
      }
    }
  }
  return found
}

function isArrowToken(s: string): boolean {
  return /^(-->|==>|-.->|---|===|-\.-|-->>|--o|--x|<-->|o--o|x--x|o--|x--)$/.test(s)
}

interface ArrowInfo {
  arrowStyle: ArrowStyle
  arrowHead: ArrowHead
  arrowDirection: ArrowDirection
}

const ARROW_INFO_MAP: Record<string, ArrowInfo> = {
  '-->': { arrowStyle: 'solid', arrowHead: 'filled', arrowDirection: 'forward' },
  '---': { arrowStyle: 'solid', arrowHead: 'none', arrowDirection: 'none' },
  '-->>': { arrowStyle: 'solid', arrowHead: 'filled', arrowDirection: 'forward' },
  '==>': { arrowStyle: 'thick', arrowHead: 'filled', arrowDirection: 'forward' },
  '===': { arrowStyle: 'thick', arrowHead: 'none', arrowDirection: 'none' },
  '-.->': { arrowStyle: 'dashed', arrowHead: 'filled', arrowDirection: 'forward' },
  '-.-': { arrowStyle: 'dashed', arrowHead: 'none', arrowDirection: 'none' },
  '--o': { arrowStyle: 'solid', arrowHead: 'circle', arrowDirection: 'forward' },
  '--x': { arrowStyle: 'solid', arrowHead: 'cross', arrowDirection: 'forward' },
  '<-->': { arrowStyle: 'solid', arrowHead: 'filled', arrowDirection: 'both' },
  'o--o': { arrowStyle: 'solid', arrowHead: 'circle', arrowDirection: 'both' },
  'x--x': { arrowStyle: 'solid', arrowHead: 'cross', arrowDirection: 'both' },
  'o--': { arrowStyle: 'solid', arrowHead: 'circle', arrowDirection: 'backward' },
  'x--': { arrowStyle: 'solid', arrowHead: 'cross', arrowDirection: 'backward' },
  '???': { arrowStyle: 'solid', arrowHead: 'filled', arrowDirection: 'forward' },
}

function getArrowInfo(token: string): ArrowInfo {
  return ARROW_INFO_MAP[token] ?? ARROW_INFO_MAP['???']!
}

function removeNodeDeclarations(line: string): string {
  let result = line
  for (const { regex } of SHAPE_PATTERNS) {
    regex.lastIndex = 0
    result = result.replace(regex, (_, id) => ` ${id} `)
  }
  result = result.replace(/(\w[\w-]*)\s*@\{[^}]*\}/g, (_, id) => ` ${id} `)
  result = result.replace(/\|([^|]*)\|/g, ' ')
  result = result.replace(/\s+/g, ' ').trim()
  return result
}

function extractPipeLabels(line: string): string[] {
  const labels: string[] = []
  const regex = /\|([^|]*)\|/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(line)) !== null) {
    labels.push(m[1]!)
  }
  return labels
}

function findEdges(cleanLine: string, labels: string[] = []): { source: string; target: string; label?: string; arrowInfo: ArrowInfo }[] {
  const result: { source: string; target: string; label?: string; arrowInfo: ArrowInfo }[] = []

  const parts = cleanLine.split(/\s+/)

  let edgeIndex = 0
  let i = 1
  while (i < parts.length - 1) {
    const left = i - 1
    const mid = i
    const right = i + 1

    if (parts[left] && parts[mid] && parts[right] && isArrowToken(parts[mid]!)) {
      const arrowInfo = getArrowInfo(parts[mid]!)
      result.push({ source: parts[left]!, target: parts[right]!, label: labels[edgeIndex], arrowInfo })
      edgeIndex++
      i += 2
    } else {
      i++
    }
  }

  return result
}

export function parseFlowchart(dsl: string): FlowchartData {
  const lines = dsl.split('\n')
  const nodes: FlowNode[] = []
  const edges: FlowEdge[] = []
  const subgraphs: FlowSubgraph[] = []
  let direction: 'TD' | 'LR' | 'RL' | 'BT' = 'TD'

  const knownIds = new Set<string>()
  const subgraphStack: { id?: string; title: string; nodeIds: string[] }[] = []

  function addNode(id: string, type: ShapeType, text: string) {
    if (!knownIds.has(id)) {
      knownIds.add(id)
      nodes.push({ id, type, text })
      if (subgraphStack.length > 0) {
        subgraphStack[subgraphStack.length - 1]!.nodeIds.push(id)
      }
    }
  }

  function ensureNode(id: string) {
    if (!knownIds.has(id)) {
      addNode(id, 'rectangle', id)
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('%%')) continue

    if (/^(?:graph|flowchart)\s+(?:TB|TD|LR|RL|BT)\b/i.test(line)) {
      const m = /^(?:graph|flowchart)\s+(TB|TD|LR|RL|BT)\b/i.exec(line)
      if (m) {
        const d = m[1]!.toUpperCase()
        direction = d === 'TB' ? 'TD' : (d as typeof direction)
      }
      continue
    }

    if (line.startsWith('subgraph')) {
      const rest = line.slice(9).trim()
      const titleMatch = /^(\w[\w-]*)\s*\[([^\]]*)\]/.exec(rest)
      if (titleMatch) {
        subgraphStack.push({ id: titleMatch[1]!, title: titleMatch[2]!, nodeIds: [] })
      } else {
        subgraphStack.push({ id: undefined, title: rest.replace(/["']/g, '').trim(), nodeIds: [] })
      }
      continue
    }

    if (/^end\b/i.test(line)) {
      if (subgraphStack.length > 0) {
        subgraphs.push(subgraphStack.pop()!)
      }
      continue
    }

    if (/^direction\s+(?:TB|TD|LR|RL|BT)\b/i.test(line)) {
      const m = /^direction\s+(TB|TD|LR|RL|BT)\b/i.exec(line)
      if (m) {
        const d = m[1]!.toUpperCase()
        direction = d === 'TB' ? 'TD' : (d as typeof direction)
      }
      continue
    }

    if (/^(?:style|classDef|class|link|click)\b/i.test(line)) continue

    const decorated = extractDecoratedNodes(line)
    for (const [, node] of decorated) {
      addNode(node.id, node.type, node.text)
    }

    const pipeLabels = extractPipeLabels(line)
    const cleanLine = removeNodeDeclarations(line)
    const lineEdges = findEdges(cleanLine, pipeLabels)
    for (const { source, target, label, arrowInfo } of lineEdges) {
      ensureNode(source)
      ensureNode(target)
      const dup = edges.some(e => e.sourceId === source && e.targetId === target)
      if (!dup) {
        edges.push({
          sourceId: source,
          targetId: target,
          label,
          arrowStyle: arrowInfo.arrowStyle,
          arrowHead: arrowInfo.arrowHead,
          arrowDirection: arrowInfo.arrowDirection,
        })
      }
    }
  }

  while (subgraphStack.length > 0) {
    subgraphs.push(subgraphStack.pop()!)
  }

  return { nodes, edges, subgraphs, direction }
}
