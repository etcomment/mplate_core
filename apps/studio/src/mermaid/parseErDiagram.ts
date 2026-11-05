import { DiagramModel } from '../core/model/DiagramModel'

export interface ErAttribute {
  name: string
  type: string
  isOptional: boolean
  keys: string[]
  comment?: string
}

export interface ErEntity {
  name: string
  alias?: string
  attributes: ErAttribute[]
}

export interface ErRelation {
  sourceName: string
  targetName: string
  sourceCardinality: string
  targetCardinality: string
  lineStyle: 'solid' | 'dashed'
  label?: string
}

export interface ErData {
  entities: ErEntity[]
  relations: ErRelation[]
}

export interface ErParseResult {
  model: DiagramModel
  diagramData: ErData
}

export function parseErDiagram(dsl: string): ErParseResult {
  const model = new DiagramModel()
  const lines = dsl.split('\n')
  const entitiesMap = new Map<string, ErEntity>()
  const relations: ErRelation[] = []

  let currentEntity: ErEntity | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('%%') || /^erDiagram/i.test(trimmed)) continue

    if (/^direction\s+(TB|BT|LR|RL)$/i.test(trimmed)) continue

    if (/^subgraph\s+/i.test(trimmed) || trimmed === 'end') continue

    const entityMatch = /^(?:"([^"]*)"|(\w[\w-]*))(?:\s*\[([^\]]+)\])?\s*\{$/.exec(trimmed)
    if (entityMatch) {
      const name = entityMatch[1] ?? entityMatch[2]!
      const alias = entityMatch[3]?.replace(/^"|"$/g, '')
      currentEntity = { name, alias, attributes: [] }
      entitiesMap.set(name, currentEntity)
      continue
    }

    if (trimmed === '}') {
      currentEntity = null
      continue
    }

    if (currentEntity) {
      const attrMatch = /^([a-zA-Z][\w\-()[\]]*)(\??)\s+(\*?\w[\w\-()[\]]*)(?:\s+((?:PK|FK|UK)(?:\s*,\s*(?:PK|FK|UK))*))?(?:\s+"([^"]*)")?\s*$/.exec(trimmed)
      if (attrMatch) {
        const type = attrMatch[1]!
        const isOptional = attrMatch[2] === '?'
        const attrName = attrMatch[3]!
        const keyStr = attrMatch[4] ?? ''
        const keys = keyStr ? keyStr.split(/\s*,\s*/).filter(Boolean) : []
        const comment = attrMatch[5]

        currentEntity.attributes.push({ name: attrName, type, isOptional, keys, comment })
      }
      continue
    }

    const relationMatch = /^(?:"([^"]*)"|(\w[\w-]*))\s+(\|\||\}\||}o|\|o)(--|\.\.)(\|\||\|\{|o\{|o\|)\s+(?:"([^"]*)"|(\w[\w-]*))(?:\s*:\s*(.*))?$/.exec(trimmed)
    if (relationMatch) {
      const sourceName = relationMatch[1] ?? relationMatch[2]!
      const sourceCard = relationMatch[3]!
      const lineStyle: 'solid' | 'dashed' = relationMatch[4] === '--' ? 'solid' : 'dashed'
      const targetCard = relationMatch[5]!
      const targetName = relationMatch[6] ?? relationMatch[7]!
      const label = relationMatch[8]?.trim()

      if (!entitiesMap.has(sourceName)) {
        entitiesMap.set(sourceName, { name: sourceName, attributes: [] })
      }
      if (!entitiesMap.has(targetName)) {
        entitiesMap.set(targetName, { name: targetName, attributes: [] })
      }
      relations.push({ sourceName, targetName, sourceCardinality: sourceCard, targetCardinality: targetCard, lineStyle, label })
      continue
    }

    const standaloneMatch = /^(?:"([^"]*)"|(\w[\w-]*))\s*$/.exec(trimmed)
    if (standaloneMatch) {
      const name = standaloneMatch[1] ?? standaloneMatch[2]!
      if (!entitiesMap.has(name)) {
        entitiesMap.set(name, { name, attributes: [] })
      }
    }
  }

  const entityIds = new Map<string, string>()
  let index = 0
  for (const [name, entity] of entitiesMap) {
    const x = 100 + (index % 4) * 250
    const y = 40 + Math.floor(index / 4) * 200
    const displayName = entity.alias ?? name
    const attrLines = entity.attributes.map(a => {
      let line = `${a.name}: ${a.type}`
      if (a.keys.length > 0) line += ` [${a.keys.join(',')}]`
      if (a.comment) line += ` "${a.comment}"`
      return line
    })
    const textLines = entity.alias ? [displayName, ...attrLines] : attrLines.length > 0 ? [entity.name, ...attrLines] : [entity.name]
    const height = Math.max(60, 30 + attrLines.length * 22)
    const shape = model.addShape('rectangle', { x, y }, { width: 190, height })
    model.updateShapeText(shape.id, { content: textLines.join('\n'), fontAlign: 'left', fontSize: 11 })
    entityIds.set(name, shape.id)
    index++
  }

  for (const rel of relations) {
    const sourceId = entityIds.get(rel.sourceName)
    const targetId = entityIds.get(rel.targetName)
    if (sourceId && targetId) {
      const label = rel.sourceCardinality && rel.targetCardinality
        ? `${decodeCardinality(rel.sourceCardinality)} ${rel.label ? `${rel.label} ` : ''}${decodeCardinality(rel.targetCardinality)}`
        : rel.label
      model.addConnection(sourceId, targetId, {
        label,
        arrowStyle: rel.lineStyle === 'dashed' ? 'dashed' : 'solid',
      })
    }
  }

  const entities: ErEntity[] = Array.from(entitiesMap.values())

  return {
    model,
    diagramData: { entities, relations },
  }
}

function decodeCardinality(card: string): string {
  const map: Record<string, string> = {
    '||': '||',
    '}|': '}|',
    '}o': '}o',
    '|o': '|o',
    '|{': '|{',
    'o{': 'o{',
    'o|': 'o|',
  }
  return map[card] ?? card
}

export function isErDiagram(dsl: string): boolean {
  return /^\s*erDiagram/i.test(dsl)
}
