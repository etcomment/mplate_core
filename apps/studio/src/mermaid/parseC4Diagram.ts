import { DiagramModel } from '../core/model/DiagramModel'

interface C4Node {
  alias: string
  label: string
  type: string
  description?: string
}

const C4_TYPES = [
  'Person', 'Person_Ext',
  'System', 'System_Ext', 'SystemDb', 'SystemDb_Ext',
  'SystemQueue', 'SystemQueue_Ext',
  'Container', 'Container_Ext', 'ContainerDb', 'ContainerDb_Ext',
  'ContainerQueue', 'ContainerQueue_Ext',
  'Component', 'Component_Ext',
  'ComponentDb', 'ComponentDb_Ext',
  'ComponentQueue', 'ComponentQueue_Ext',
]

const C4_TYPE_PATTERN = C4_TYPES.join('|')

function stripHtml(text: string): string {
  return text.replace(/<br\s*\/?>/gi, ' ').replace(/<\/?[^>]+>/g, '')
}

function cleanLabel(text: string): string {
  return stripHtml(text).replace(/\s+/g, ' ').trim()
}

export function parseC4Diagram(dsl: string): DiagramModel {
  const model = new DiagramModel()
  const lines = dsl.split('\n')
  const nodes = new Map<string, C4Node>()
  const relations: { source: string; target: string; label: string }[] = []

  let index = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('%%') || /^C4/i.test(trimmed)) continue

    const titleMatch = /^title\s+(.+)/i.exec(trimmed)
    if (titleMatch) continue

    if (/^Update(?:RelStyle|LayoutConfig|ElementStyle|BoundaryStyle)\b/i.test(trimmed)) continue

    const boundaryMatch = /^(Enterprise_Boundary|System_Boundary|Container_Boundary|Boundary)\s*\(\s*\w[\w-]*\s*,\s*"([^"]*)"/.exec(trimmed)
    if (boundaryMatch) continue

    const nodeMatch = new RegExp(`^(${C4_TYPE_PATTERN})\\s*\\(\\s*(\\w[\\w-]*)\\s*,\\s*"([^"]*)"(?:\\s*,\\s*"([^"]*)")?[^)]*\\)\\s*$`).exec(trimmed)
    if (nodeMatch) {
      const rawType = nodeMatch[1]!
      const alias = nodeMatch[2]!
      const label = cleanLabel(nodeMatch[3]!)
      const description = nodeMatch[4] ? cleanLabel(nodeMatch[4]) : undefined
      nodes.set(alias, { alias, label, type: rawType, description })
      continue
    }

    const relMatch = /^(BiRel|Rel|Rel_Back|Rel_Neighbor|Rel_D|Rel_U|Rel_R|Rel_L)\s*\(\s*(\w[\w-]*)\s*,\s*(\w[\w-]*)\s*(?:,\s*"([^"]*)")?(?:,\s*"([^"]*)")?[^)]*\)\s*$/.exec(trimmed)
    if (relMatch) {
      const source = relMatch[2]!
      const target = relMatch[3]!
      const label = relMatch[4] ? cleanLabel(relMatch[4]) : ''
      relations.push({ source, target, label })
      continue
    }

    const unknownMatch = /^(\w[\w-]*)\s*\(\s*(\w[\w-]*)\s*,\s*"([^"]*)"\s*\)/.exec(trimmed)
    if (unknownMatch) {
      const alias = unknownMatch[2]!
      const label = cleanLabel(unknownMatch[3]!)
      nodes.set(alias, { alias, label, type: 'System' })
    }
  }

  const nodeIds = new Map<string, string>()
  const cols = 3
  for (const [alias, node] of nodes) {
    const col = index % cols
    const row = Math.floor(index / cols)
    const x = 100 + col * 240
    const y = 40 + row * 140
    const shape = model.addShape('rectangle', { x, y }, { width: 210, height: 80 })
    const text = node.description ? `${node.type}: ${node.label}\n${node.description}` : `${node.type}: ${node.label}`
    model.updateShapeText(shape.id, { content: text, fontAlign: 'left', fontSize: 11 })
    nodeIds.set(alias, shape.id)
    index++
  }

  for (const { source, target } of relations) {
    const sourceId = nodeIds.get(source)
    const targetId = nodeIds.get(target)
    if (sourceId && targetId) {
      model.addConnection(sourceId, targetId)
    }
  }

  return model
}

export function isC4Diagram(dsl: string): boolean {
  return /^\s*C4(?:Context|Container|Component|Dynamic|Deployment)/i.test(dsl)
}
