import { DiagramModel } from '../core/model/DiagramModel'

const ARCH_HEADER = /^\s*architecture-beta\s*$/i

const GROUP_PATTERN = /^group\s+(\S+)\(([^)]*)\)\[([^\]]*)\](?:\s+in\s+(\S+))?\s*$/
const SERVICE_PATTERN = /^service\s+(\S+)\(([^)]*)\)\[([^\]]*)\](?:\s+in\s+(\S+))?\s*$/
const JUNCTION_PATTERN = /^junction\s+(\S+)\s*$/
const EDGE_PATTERN = /^(\S+):([TBLR])\s*(<)?(--?)(>)?\s*([TBLR]):(\S+)\s*$/

interface ArchitectureGroup {
  id: string
  icon: string
  label: string
  in?: string
}

interface ArchitectureService {
  id: string
  icon: string
  iconText?: string
  label: string
  in?: string
}

interface ArchitectureEdge {
  lhsId: string
  rhsId: string
  lhsDir: string
  rhsDir: string
  lhsInto?: boolean
  rhsInto?: boolean
  title?: string
}

interface ArchitectureData {
  groups: ArchitectureGroup[]
  services: ArchitectureService[]
  junctions: { id: string; in?: string }[]
  edges: ArchitectureEdge[]
}

export interface ArchitectureParseResult {
  model: DiagramModel
  diagramData: ArchitectureData
}

export function parseArchitecture(dsl: string): ArchitectureParseResult {
  const model = new DiagramModel()
  const lines = dsl.split('\n')

  const groups: ArchitectureGroup[] = []
  const services: ArchitectureService[] = []
  const junctions: { id: string; in?: string }[] = []
  const edges: ArchitectureEdge[] = []

  const shapeIds = new Map<string, string>()
  const groupHierarchy = new Map<string, string>()
  let cursorY = 40

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('%%') || ARCH_HEADER.test(line)) continue

    const groupMatch = GROUP_PATTERN.exec(line)
    if (groupMatch) {
      const id = groupMatch[1]!
      const icon = groupMatch[2]!
      const label = groupMatch[3]!
      const parentId = groupMatch[4]
      const pos = { x: 100, y: cursorY }
      const shape = model.addShape('stadium', pos, { width: 200, height: 80 })
      model.updateShapeText(shape.id, { content: label })
      shapeIds.set(id, shape.id)
      if (parentId) {
        groupHierarchy.set(id, parentId)
      }
      groups.push({ id, icon, label, in: parentId })
      cursorY += 100
      continue
    }

    const serviceMatch = SERVICE_PATTERN.exec(line)
    if (serviceMatch) {
      const id = serviceMatch[1]!
      const icon = serviceMatch[2]!
      const label = serviceMatch[3]!
      const parentId = serviceMatch[4]
      const pos = { x: 100, y: cursorY }
      const shape = model.addShape('rectangle', pos, { width: 160, height: 70 })
      model.updateShapeText(shape.id, { content: label })
      shapeIds.set(id, shape.id)
      services.push({ id, icon, label, in: parentId })
      cursorY += 90
      continue
    }

    const junctionMatch = JUNCTION_PATTERN.exec(line)
    if (junctionMatch) {
      const id = junctionMatch[1]!
      const pos = { x: 100, y: cursorY }
      const shape = model.addShape('diamond', pos, { width: 50, height: 50 })
      model.updateShapeText(shape.id, { content: '' })
      shapeIds.set(id, shape.id)
      junctions.push({ id })
      cursorY += 70
      continue
    }

    const edgeMatch = EDGE_PATTERN.exec(line)
    if (edgeMatch) {
      const sourceId = edgeMatch[1]!
      const lhsDir = edgeMatch[2]!
      const lhsInto = !!edgeMatch[3]
      const rhsInto = !!edgeMatch[5]
      const rhsDir = edgeMatch[6]!
      const targetId = edgeMatch[7]!
      const srcShapeId = shapeIds.get(sourceId)
      const tgtShapeId = shapeIds.get(targetId)
      if (srcShapeId && tgtShapeId) {
        model.addConnection(srcShapeId, tgtShapeId)
      }
      edges.push({ lhsId: sourceId, rhsId: targetId, lhsDir, rhsDir, lhsInto, rhsInto })
    }
  }

  const diagramData: ArchitectureData = { groups, services, junctions, edges }
  return { model, diagramData }
}

export function isArchitecture(dsl: string): boolean {
  return ARCH_HEADER.test(dsl)
}
