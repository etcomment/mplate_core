import { DiagramModel } from '../core/model/DiagramModel'
import dagre from 'dagre'
import { parseSequenceDiagram, isSequenceDiagram, isClassDiagram } from './parseSequenceDiagram'
import type { SequenceData } from './parseSequenceDiagram'
import { parseClassDiagram } from './parseClassDiagram'
import { parseStateDiagram, isStateDiagram } from './parseStateDiagram'
import { parseErDiagram, isErDiagram } from './parseErDiagram'
import { parseBlockDiagram, isBlockDiagram } from './parseBlockDiagram'
import { parsePieChart, isPieChart } from './parsePieChart'
import { parseQuadrant, isQuadrant } from './parseQuadrant'
import { parseTimeline, isTimeline } from './parseTimeline'
import { parseUserJourney, isUserJourney } from './parseUserJourney'
import { parseGantt, isGantt } from './parseGantt'
import { parseMindmap, isMindmap } from './parseMindmap'
import { parseGitGraph, isGitGraph } from './parseGitGraph'
import { parseRequirementDiagram, isRequirementDiagram } from './parseRequirementDiagram'
import { parseC4Diagram, isC4Diagram } from './parseC4Diagram'
import { parseSankey, isSankey } from './parseSankey'
import { parseXYChart, isXYChart } from './parseXYChart'
import { parseFlowchart } from './parseFlowchart'
import { parsePacket, isPacket } from './parsePacket'
import { parseVenn, isVenn } from './parseVenn'
import { parseIshikawa, isIshikawa } from './parseIshikawa'
import { parseTreeView, isTreeView } from './parseTreeView'
import { parseKanban, isKanban } from './parseKanban'
import { parseRadar, isRadar } from './parseRadar'
import { parseTreemap, isTreemap } from './parseTreemap'
import { parseArchitecture, isArchitecture } from './parseArchitecture'
import { parseEventModeling, isEventModeling } from './parseEventModeling'
import { parseSwimlanes, isSwimlanes } from './parseSwimlanes'
import { parseWardley, isWardley } from './parseWardley'
import { parseCynefin, isCynefin } from './parseCynefin'
import { parseZenUml, isZenUml } from './parseZenUml'

interface ParsedStyle {
  nodeId: string
  properties: Record<string, string>
}

interface ParsedClassDef {
  className: string
  properties: Record<string, string>
}

function parseStyleProperties(styleStr: string): Record<string, string> {
  const props: Record<string, string> = {}
  const parts = styleStr.split(',').map(s => s.trim())
  for (const part of parts) {
    const colonIndex = part.indexOf(':')
    if (colonIndex === -1) continue
    const key = part.slice(0, colonIndex).trim()
    const value = part.slice(colonIndex + 1).trim()
    if (key && value) props[key] = value
  }
  return props
}

function parseStyles(dsl: string): ParsedStyle[] {
  const styles: ParsedStyle[] = []
  const re = /^[ \t]*style\s+(\w[\w-]*)\s+(.+)$/gim
  let m: RegExpExecArray | null
  while ((m = re.exec(dsl)) !== null) {
    styles.push({ nodeId: m[1]!, properties: parseStyleProperties(m[2]!) })
  }
  return styles
}

function parseClassDefs(dsl: string): ParsedClassDef[] {
  const defs: ParsedClassDef[] = []
  const re = /^[ \t]*classDef\s+(\w[\w-]*)\s+(.+)$/gim
  let m: RegExpExecArray | null
  while ((m = re.exec(dsl)) !== null) {
    defs.push({ className: m[1]!, properties: parseStyleProperties(m[2]!) })
  }
  return defs
}

function parseClassAssignments(dsl: string): Map<string, string> {
  const assignments = new Map<string, string>()
  const re = /^[ \t]*class\s+([\w\s,]+)\s+(\w[\w-]*)$/gim
  let m: RegExpExecArray | null
  while ((m = re.exec(dsl)) !== null) {
    const nodeIds = m[1]!.split(',').map(id => id.trim()).filter(Boolean)
    const className = m[2]!
    for (const id of nodeIds) {
      assignments.set(id, className)
    }
  }
  return assignments
}

function applyStyleProperty(key: string, value: string): Record<string, string | number> | null {
  switch (key) {
    case 'fill': return { fill: value }
    case 'stroke': return { stroke: value }
    case 'stroke-width': return { strokeWidth: parseInt(value, 10) || 2 }
    case 'color': return { color: value }
    case 'stroke-dasharray': return { strokeDasharray: value }
    default: return null
  }
}

export interface SubgraphGroup {
  readonly title: string
  readonly shapeIds: readonly string[]
}

export interface ParseResult {
  model: DiagramModel
  subgraphGroups: readonly SubgraphGroup[]
  diagramType: 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'block' | 'pie' | 'quadrant' | 'timeline' | 'userJourney' | 'gantt' | 'mindmap' | 'gitGraph' | 'requirement' | 'c4' | 'sankey' | 'xyChart' | 'packet' | 'venn' | 'ishikawa' | 'treeView' | 'kanban' | 'radar' | 'treemap' | 'architecture' | 'eventModeling' | 'swimlane' | 'wardley' | 'cynefin' | 'zenuml'
  sequenceData?: SequenceData
  diagramData?: Record<string, unknown>
  diagramColors?: Record<string, string>
}

export function parseMermaid(dsl: string): ParseResult {
  const trimmed = dsl.trim()
  if (!trimmed) return { model: new DiagramModel(), subgraphGroups: [], diagramType: 'flowchart' }

  if (isSequenceDiagram(trimmed)) {
    const { model, sequenceData } = parseSequenceDiagram(trimmed)
    return { model, subgraphGroups: [], diagramType: 'sequence', sequenceData }
  }

  if (isClassDiagram(trimmed)) {
    const model = parseClassDiagram(trimmed)
    return { model, subgraphGroups: [], diagramType: 'class' }
  }

  if (isStateDiagram(trimmed)) {
    const model = parseStateDiagram(trimmed)
    return { model, subgraphGroups: [], diagramType: 'state' }
  }

  if (isErDiagram(trimmed)) {
    const { model, diagramData } = parseErDiagram(trimmed)
    return { model, subgraphGroups: [], diagramType: 'er', diagramData: diagramData as unknown as Record<string, unknown> }
  }

  if (isBlockDiagram(trimmed)) {
    const model = parseBlockDiagram(trimmed)
    return { model, subgraphGroups: [], diagramType: 'block' }
  }

  if (isPieChart(trimmed)) {
    const data = parsePieChart(trimmed)
    return { model: new DiagramModel(), subgraphGroups: [], diagramType: 'pie', diagramData: data as unknown as Record<string, unknown>, diagramColors: data.colors }
  }

  if (isQuadrant(trimmed)) {
    const data = parseQuadrant(trimmed)
    return { model: new DiagramModel(), subgraphGroups: [], diagramType: 'quadrant', diagramData: data as unknown as Record<string, unknown>, diagramColors: data.colors }
  }

  if (isTimeline(trimmed)) {
    const data = parseTimeline(trimmed)
    return { model: new DiagramModel(), subgraphGroups: [], diagramType: 'timeline', diagramData: data as unknown as Record<string, unknown>, diagramColors: data.colors }
  }

  if (isUserJourney(trimmed)) {
    const data = parseUserJourney(trimmed)
    return { model: new DiagramModel(), subgraphGroups: [], diagramType: 'userJourney', diagramData: data as unknown as Record<string, unknown>, diagramColors: data.colors }
  }


  if (isGantt(trimmed)) {
    const data = parseGantt(trimmed)
    return { model: new DiagramModel(), subgraphGroups: [], diagramType: 'gantt', diagramData: data as unknown as Record<string, unknown>, diagramColors: data.colors }
  }

  if (isMindmap(trimmed)) {
    const data = parseMindmap(trimmed)
    return { model: new DiagramModel(), subgraphGroups: [], diagramType: 'mindmap', diagramData: data as unknown as Record<string, unknown>, diagramColors: data.colors }
  }

  if (isGitGraph(trimmed)) {
    const data = parseGitGraph(trimmed)
    return { model: new DiagramModel(), subgraphGroups: [], diagramType: 'gitGraph', diagramData: data as unknown as Record<string, unknown>, diagramColors: data.colors }
  }

  if (isRequirementDiagram(trimmed)) {
    const model = parseRequirementDiagram(trimmed)
    return { model, subgraphGroups: [], diagramType: 'requirement' }
  }

  if (isC4Diagram(trimmed)) {
    const model = parseC4Diagram(trimmed)
    return { model, subgraphGroups: [], diagramType: 'c4' }
  }

  if (isSankey(trimmed)) {
    const data = parseSankey(trimmed)
    return { model: new DiagramModel(), subgraphGroups: [], diagramType: 'sankey', diagramData: data as unknown as Record<string, unknown>, diagramColors: data.colors }
  }

  if (isXYChart(trimmed)) {
    const data = parseXYChart(trimmed)
    return { model: new DiagramModel(), subgraphGroups: [], diagramType: 'xyChart', diagramData: data as unknown as Record<string, unknown>, diagramColors: data.colors }
  }

  if (isPacket(trimmed)) {
    const model = parsePacket(trimmed)
    return { model, subgraphGroups: [], diagramType: 'packet' }
  }

  if (isVenn(trimmed)) {
    const { model, vennData } = parseVenn(trimmed)
    return { model, subgraphGroups: [], diagramType: 'venn', diagramData: vennData as unknown as Record<string, unknown> }
  }

  if (isIshikawa(trimmed)) {
    const { model, ishikawaData } = parseIshikawa(trimmed)
    return { model, subgraphGroups: [], diagramType: 'ishikawa', diagramData: ishikawaData as unknown as Record<string, unknown> }
  }

  if (isTreeView(trimmed)) {
    const model = parseTreeView(trimmed)
    return { model, subgraphGroups: [], diagramType: 'treeView' }
  }

  if (isKanban(trimmed)) {
    const model = parseKanban(trimmed)
    const modelShapes = model.shapes
    const conns = model.connections

    const columnShapes = modelShapes.filter(s => s.position.y === 40)
    const columns = columnShapes.map(s => ({ id: s.id, title: s.text.content }))

    const taskShapes = modelShapes.filter(s => s.position.y !== 40)
    const tasks: { id: string; title: string; columnId: string; modifiers: string[] }[] = []

    const dslLines = trimmed.split('\n')
    let baseIndent = -1
    let colIdx = -1
    let taskIdx = 0

    for (const raw of dslLines) {
      const t = raw.trim()
      if (!t || t.startsWith('%%') || /^\s*kanban\b/i.test(t) || t.startsWith('---')) continue
      const level = raw.length - raw.trimStart().length
      if (baseIndent < 0) baseIndent = level

      const cleaned = t.replace(/\b(crit|active|high|low|done)\b\s*/gi, '').replace(/@\{[^}]*\}\s*/g, '').trim()
      const withBrackets = /^(\w[\w-]*)\s*\[([^\]]*)\]\s*$/.exec(cleaned)
      const onlyBrackets = /^\[([^\]]+)\]\s*$/.exec(cleaned)
      const bare = /^(\w[\w-]+)\s*$/.exec(cleaned)
      const item = withBrackets ? { id: withBrackets[1]!, title: withBrackets[2]! }
        : onlyBrackets ? { id: onlyBrackets[1]!, title: onlyBrackets[1]! }
        : bare ? { id: bare[1]!, title: bare[1]! }
        : null
      if (!item) continue

      if (level <= baseIndent) {
        colIdx++
      } else if (colIdx >= 0 && taskIdx < taskShapes.length) {
        const modifiers: string[] = []
        const lower = t.toLowerCase()
        if (/\bcrit\b/.test(lower)) modifiers.push('crit')
        if (/\bactive\b/.test(lower)) modifiers.push('active')
        if (/\bdone\b/.test(lower)) modifiers.push('done')

        const shape = taskShapes[taskIdx]!
        const columnId = conns.find(c => c.sourceId === shape.id)?.targetId ?? ''
        tasks.push({ id: shape.id, title: shape.text.content, columnId, modifiers })
        taskIdx++
      }
    }

    for (let i = taskIdx; i < taskShapes.length; i++) {
      const shape = taskShapes[i]!
      const columnId = conns.find(c => c.sourceId === shape.id)?.targetId ?? ''
      tasks.push({ id: shape.id, title: shape.text.content, columnId, modifiers: [] })
    }

    return {
      model,
      subgraphGroups: [],
      diagramType: 'kanban',
      diagramData: { columns, tasks } as unknown as Record<string, unknown>,
    }
  }

  if (isRadar(trimmed)) {
    const { model, radarData } = parseRadar(trimmed)
    return { model, subgraphGroups: [], diagramType: 'radar', diagramData: radarData as unknown as Record<string, unknown> }
  }

  if (isTreemap(trimmed)) {
    const { model, treemapData } = parseTreemap(trimmed)
    return { model, subgraphGroups: [], diagramType: 'treemap', diagramData: treemapData as unknown as Record<string, unknown> }
  }

  if (isArchitecture(trimmed)) {
    const { model, diagramData } = parseArchitecture(trimmed)
    return { model, subgraphGroups: [], diagramType: 'architecture', diagramData: diagramData as unknown as Record<string, unknown> }
  }

  if (isEventModeling(trimmed)) {
    const model = parseEventModeling(trimmed)
    return { model, subgraphGroups: [], diagramType: 'eventModeling' }
  }

  if (isSwimlanes(trimmed)) {
    const { model, swimlanesData } = parseSwimlanes(trimmed)
    return { model, subgraphGroups: [], diagramType: 'swimlane', diagramData: swimlanesData as unknown as Record<string, unknown> }
  }

  if (isWardley(trimmed)) {
    const { model, wardleyData } = parseWardley(trimmed)
    return { model, subgraphGroups: [], diagramType: 'wardley', diagramData: wardleyData as unknown as Record<string, unknown> }
  }

  if (isCynefin(trimmed)) {
    const { model, cynefinData } = parseCynefin(trimmed)
    return { model, subgraphGroups: [], diagramType: 'cynefin', diagramData: cynefinData as unknown as Record<string, unknown> }
  }

  if (isZenUml(trimmed)) {
    const { model, zenUmlData } = parseZenUml(trimmed)
    return { model, subgraphGroups: [], diagramType: 'zenuml', diagramData: zenUmlData as unknown as Record<string, unknown> }
  }

  const fd = parseFlowchart(trimmed)
  const model = new DiagramModel()

  const idMap = new Map<string, string>()

  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: fd.direction })

  for (const node of fd.nodes) {
    graph.setNode(node.id, { width: 120, height: 80 })
  }
  for (const edge of fd.edges) {
    graph.setEdge(edge.sourceId, edge.targetId)
  }

  dagre.layout(graph)

  const styles = parseStyles(trimmed)
  const classDefs = parseClassDefs(trimmed)
  const classAssignments = parseClassAssignments(trimmed)

  for (const node of fd.nodes) {
    const dagreNode = graph.node(node.id)
    const pos = dagreNode ? { x: dagreNode.x - 60, y: dagreNode.y - 40 } : { x: 0, y: 0 }
    const shape = model.addShape(node.type, pos, { width: 120, height: 80 })
    model.updateShapeText(shape.id, { content: node.text })

    const className = classAssignments.get(node.id)
    const classDef = className ? classDefs.find(d => d.className === className) : undefined
    const directStyle = styles.find(s => s.nodeId === node.id)

    const resolved: Record<string, string | number> = {}
    if (classDef) {
      for (const [key, value] of Object.entries(classDef.properties)) {
        const applied = applyStyleProperty(key, value)
        if (applied) Object.assign(resolved, applied)
      }
    }
    if (directStyle) {
      for (const [key, value] of Object.entries(directStyle.properties)) {
        const applied = applyStyleProperty(key, value)
        if (applied) Object.assign(resolved, applied)
      }
    }
    if (Object.keys(resolved).length > 0) {
      model.updateShapeStyle(shape.id, resolved as Parameters<typeof model.updateShapeStyle>[1])
    }

    idMap.set(node.id, shape.id)
  }

  for (const edge of fd.edges) {
    const sourceId = idMap.get(edge.sourceId)
    const targetId = idMap.get(edge.targetId)
    if (sourceId && targetId) {
      model.addConnection(sourceId, targetId, {
        label: edge.label,
        arrowStyle: edge.arrowStyle,
        arrowHead: edge.arrowHead,
        arrowDirection: edge.arrowDirection,
      })
    }
  }

  const subgraphGroups: SubgraphGroup[] = fd.subgraphs.map(sg => ({
    title: sg.title,
    shapeIds: sg.nodeIds.map(id => idMap.get(id)).filter((id): id is string => !!id),
  }))

  return { model, subgraphGroups, diagramType: 'flowchart' }
}
