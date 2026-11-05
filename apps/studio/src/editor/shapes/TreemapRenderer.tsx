import { useRef, useEffect, useMemo } from 'react'
import { useDiagramStore } from '../../store/diagramStore'
import { useDiagramDragResize } from '../../hooks/useDiagramDragResize'
import type { TreeNode } from '../../mermaid/parseTreemap'

const PALETTE = [
  '#4299e1', '#48bb78', '#ed8936', '#9f7aea', '#ed64a6',
  '#38b2ac', '#667eea', '#f6ad55', '#fc8181', '#a3bffa',
  '#68d391', '#f6e05e', '#e2e8f0',
]

const TOTAL_W = 800
const TOTAL_H = 600
const PADDING = 12
const GAP = 4
const MIN_AREA = 30 * 30

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

interface LayoutRect extends Rect {
  node: TreeNode
  depth: number
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
  result: LayoutRect[],
): void {
  if (w <= GAP || h <= GAP) return

  result.push({ x: x + GAP, y: y + GAP, width: w - GAP * 2, height: h - GAP * 2, node, depth })

  if (node.children.length === 0) return

  const total = node.value ?? 1
  const vertical = depth % 2 === 0

  let offset = 0
  for (const child of node.children) {
    const childValue = child.value ?? 0
    const ratio = childValue / total
    if (vertical) {
      const childH = Math.max(GAP, h * ratio)
      layoutNode(child, x, y + offset, w, childH, depth + 1, result)
      offset += childH
    } else {
      const childW = Math.max(GAP, w * ratio)
      layoutNode(child, x + offset, y, childW, h, depth + 1, result)
      offset += childW
    }
  }
}

export function TreemapRenderer() {
  const svgRef = useRef<SVGGElement>(null)
  const diagramType = useDiagramStore(s => s.diagramType)
  const diagramData = useDiagramStore(s => s.diagramData)
  const diagramColors = useDiagramStore(s => s.diagramColors)
  const diagramStrokeColors = useDiagramStore(s => s.diagramStrokeColors)
  const diagramElementPositions = useDiagramStore(s => s.diagramElementPositions)
  const moveDiagramElement = useDiagramStore(s => s.moveDiagramElement)
  const resizeDiagramElement = useDiagramStore(s => s.resizeDiagramElement)
  const selectedIds = useDiagramStore(s => s.selectedDiagramElementIds)

  const { startDrag, renderHandles } = useDiagramDragResize(svgRef)

  const layoutRects = useMemo(() => {
    const result: LayoutRect[] = []
    if (diagramType !== 'treemap' || !diagramData?.root) return result
    const treeData = (diagramData as { root: TreeNode[] }).root
    if (treeData.length === 0) return result

    for (const node of treeData) {
      computeValues(node)
    }

    const totalValue = treeData.reduce((s, n) => s + (n.value ?? 0), 0)
    if (totalValue === 0) return result

    let offsetY = PADDING
    for (const node of treeData) {
      const ratio = (node.value ?? 0) / totalValue
      const h = (TOTAL_H - 2 * PADDING) * ratio
      layoutNode(node, PADDING, offsetY, TOTAL_W - 2 * PADDING, h, 0, result)
      offsetY += h
    }
    return result
  }, [diagramType, diagramData])

  const computedRects = useMemo(() => {
    const map = new Map<string, Rect>()
    for (let i = 0; i < layoutRects.length; i++) {
      const lr = layoutRects[i]!
      const name = lr.node.name
      map.set(`treemap-${name}-${i}`, { x: lr.x, y: lr.y, width: lr.width, height: lr.height })
    }
    return map
  }, [layoutRects])

  useEffect(() => {
    for (const [id, rect] of computedRects) {
      if (diagramElementPositions[id]) continue
      moveDiagramElement(id, { x: rect.x, y: rect.y })
      resizeDiagramElement(id, { width: rect.width, height: rect.height })
    }
  }, [computedRects, diagramElementPositions, moveDiagramElement, resizeDiagramElement])

  if (diagramType !== 'treemap' || layoutRects.length === 0) return null

  function getRect(id: string): Rect {
    const stored = diagramElementPositions[id]
    const computed = computedRects.get(id)
    if (stored) {
      return {
        x: stored.x,
        y: stored.y,
        width: stored.width || computed?.width || 50,
        height: stored.height || computed?.height || 30,
      }
    }
    return computed ?? { x: 0, y: 0, width: 0, height: 0 }
  }

  return (
    <g ref={svgRef}>
      {layoutRects.map((lr, i) => {
        const name = lr.node.name
        const elementKey = `treemap-${name}-${i}`
        const rect = getRect(elementKey)
        const isSelected = selectedIds.has(elementKey)
        const color = diagramColors[elementKey] ?? PALETTE[lr.depth % PALETTE.length]!
        const useStroke = diagramStrokeColors[elementKey] || (isSelected ? '#4a90d9' : '#fff')
        const isTooSmall = rect.width * rect.height < MIN_AREA

        return (
          <g key={elementKey} onMouseDown={e => startDrag(e, elementKey, rect)} style={{ cursor: 'pointer' }}>
            <rect
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              rx={3}
              fill={color}
              stroke={useStroke}
              strokeWidth={isSelected ? 2 : 0.5}
              strokeDasharray={isSelected ? '4 2' : undefined}
            />
            {!isTooSmall && (
              <text
                x={rect.x + rect.width / 2}
                y={rect.y + rect.height / 2 + 4}
                textAnchor="middle"
                fontFamily="Arial, sans-serif"
                fontSize={Math.min(14, rect.width / (name.length * 0.7), rect.height / 2.5)}
                fill="#fff"
                fontWeight={600}
                pointerEvents="none"
              >
                {lr.node.value !== null ? `${name} (${lr.node.value})` : name}
              </text>
            )}
            {isSelected && renderHandles(rect, elementKey)}
          </g>
        )
      })}
    </g>
  )
}
