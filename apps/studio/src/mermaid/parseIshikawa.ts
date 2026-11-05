import { DiagramModel } from '../core/model/DiagramModel'

export interface IshikawaCategory {
  name: string
  causes: string[]
}

export interface IshikawaData {
  problem: string
  categories: IshikawaCategory[]
}

interface IshikawaNode {
  id: string
  text: string
  indent: number
}

export function parseIshikawa(dsl: string): { model: DiagramModel; ishikawaData: IshikawaData } {
  const model = new DiagramModel()
  const lines = dsl.split('\n')

  const nodes: IshikawaNode[] = []
  const nodeIds = new Map<string, string>()
  const ishikawaData: IshikawaData = { problem: '', categories: [] }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('%%')) continue
    if (/^ishikawa-beta/i.test(trimmed)) continue
    if (/^title\s+/i.test(trimmed)) continue

    const indent = line.length - line.trimStart().length
    nodes.push({ id: `ish-${Math.random().toString(36).slice(2, 8)}`, text: trimmed, indent })
  }

  if (nodes.length > 0) {
    ishikawaData.problem = nodes[0]!.text
  }

  if (nodes.length === 0) return { model, ishikawaData }

  const spineY = 200
  const head = model.addShape('rectangle', { x: 40, y: spineY - 30 }, { width: 160, height: 60 })
  const headText = nodes[0]!.text
  model.updateShapeText(head.id, { content: headText, fontSize: 13 })
  nodeIds.set('head', head.id)

  let categoryIndex = 0
  const categoryNodeIds: string[] = []

  for (let i = 1; i < nodes.length; i++) {
    const node = nodes[i]!
    if (node.indent === 0) {
      const x = 260 + categoryIndex * 200
      const shape = model.addShape('rectangle', { x, y: spineY - 25 }, { width: 150, height: 50 })
      model.updateShapeText(shape.id, { content: node.text, fontSize: 12 })
      nodeIds.set(node.id, shape.id)
      categoryNodeIds.push(shape.id)
      model.addConnection(head.id, shape.id)
      ishikawaData.categories.push({ name: node.text, causes: [] })
      categoryIndex++
    } else {
      const categoryNode = nodes.slice(1, i).reverse().find(n => n.indent < node.indent)
      const parentId = categoryNode ? nodeIds.get(categoryNode.id) : null
      if (parentId) {
        const x = parseInt(parentId) || 200 + categoryIndex * 200
        const shape = model.addShape('rectangle', { x: x - 20, y: spineY + 70 + (i % 4) * 50 }, { width: 130, height: 40 })
        model.updateShapeText(shape.id, { content: node.text, fontSize: 11 })
        nodeIds.set(node.id, shape.id)
        model.addConnection(parentId, shape.id)
        const categoryName = categoryNode?.text ?? ''
        const categoryEntry = ishikawaData.categories.find(c => c.name === categoryName)
        if (categoryEntry) {
          categoryEntry.causes.push(node.text)
        }
      }
    }
  }

  return { model, ishikawaData }
}

export function isIshikawa(dsl: string): boolean {
  return /^\s*ishikawa-beta/i.test(dsl)
}
