import { DiagramModel } from '../core/model/DiagramModel'

export interface TreeNode {
  name: string
  value: number | null
  children: TreeNode[]
}

export interface TreemapData {
  root: TreeNode[]
}

function parseTree(dsl: string): TreeNode[] {
  const lines = dsl.split('\n')
  const root: TreeNode[] = []
  const stack: { node: TreeNode; indent: number }[] = []

  for (const raw of lines) {
    const trimmed = raw.trim()
    if (!trimmed || trimmed.startsWith('%%') || /^\s*treemap-beta\b/i.test(trimmed) || trimmed.startsWith('---')) continue
    if (/^title\s+/i.test(trimmed)) continue
    if (/^classDef\s+/i.test(trimmed)) continue

    const indent = raw.length - raw.trimStart().length
    const cleaned = trimmed.replace(/:::[\w-]+/g, '').trim()

    const leafMatch = /^"([^"]+)"\s*:\s*([\d.]+)\s*$/.exec(cleaned)
    if (leafMatch) {
      const node: TreeNode = { name: leafMatch[1]!, value: parseFloat(leafMatch[2]!), children: [] }
      while (stack.length > 0 && stack[stack.length - 1]!.indent >= indent) {
        stack.pop()
      }
      if (stack.length > 0) {
        stack[stack.length - 1]!.node.children.push(node)
      } else {
        root.push(node)
      }
      continue
    }

    const sectionMatch = /^"([^"]+)"\s*$/.exec(cleaned)
    if (sectionMatch) {
      const node: TreeNode = { name: sectionMatch[1]!, value: null, children: [] }
      while (stack.length > 0 && stack[stack.length - 1]!.indent >= indent) {
        stack.pop()
      }
      if (stack.length > 0) {
        stack[stack.length - 1]!.node.children.push(node)
      } else {
        root.push(node)
      }
      stack.push({ node, indent })
      continue
    }
  }

  return root
}

function computeValues(node: TreeNode): number {
  if (node.value !== null) return node.value
  if (node.children.length === 0) { node.value = 0; return 0 }
  let total = 0
  for (const child of node.children) {
    total += computeValues(child)
  }
  node.value = total
  return total
}

function layoutNode(
  node: TreeNode,
  x: number, y: number, w: number, h: number,
  depth: number,
  model: DiagramModel,
): void {
  if (w <= 0 || h <= 0) return

  const shape = model.addShape('rectangle', { x, y }, { width: w, height: h })
  model.updateShapeText(shape.id, { content: node.value !== null ? `${node.name}: ${node.value}` : node.name })

  if (node.children.length === 0) return

  const total = node.value ?? 1
  const vertical = depth % 2 === 0

  let offset = 0
  for (const child of node.children) {
    const childValue = child.value ?? 0
    const ratio = childValue / total
    if (vertical) {
      const childH = h * ratio
      layoutNode(child, x, y + offset, w, childH, depth + 1, model)
      offset += childH
    } else {
      const childW = w * ratio
      layoutNode(child, x + offset, y, childW, h, depth + 1, model)
      offset += childW
    }
  }
}

export function parseTreemap(dsl: string): { model: DiagramModel; treemapData: TreemapData } {
  const model = new DiagramModel()
  const root = parseTree(dsl)

  const TOTAL_W = 800
  const TOTAL_H = 600
  const PADDING = 10

  for (const node of root) {
    computeValues(node)
  }

  const totalValue = root.reduce((s, n) => s + (n.value ?? 0), 0)
  const treemapData: TreemapData = { root }

  if (totalValue === 0) return { model, treemapData }

  let offsetY = PADDING
  for (const node of root) {
    const ratio = (node.value ?? 0) / totalValue
    const h = (TOTAL_H - 2 * PADDING) * ratio
    layoutNode(node, PADDING, offsetY, TOTAL_W - 2 * PADDING, h, 0, model)
    offsetY += h
  }

  return { model, treemapData }
}

export function isTreemap(dsl: string): boolean {
  return /^\s*treemap-beta\b/i.test(dsl)
}
