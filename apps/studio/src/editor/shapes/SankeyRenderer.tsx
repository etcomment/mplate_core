import { useMemo, useRef, useEffect } from 'react'
import { useDiagramStore } from '../../store/diagramStore'
import { useDiagramDragResize } from '../../hooks/useDiagramDragResize'
import type { SankeyLink } from '../../mermaid/parseSankey'

const PALETTE = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
  '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000',
  '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9',
]

interface SankeyNode {
  name: string
  x0: number
  x1: number
  y0: number
  y1: number
  value: number
}

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

interface SankeyComputed {
  nodes: SankeyNode[]
  links: Array<{
    source: SankeyNode
    target: SankeyNode
    value: number
    elementKey: string
  }>
  width: number
  height: number
}

function computeSankey(nodeNames: string[], links: SankeyLink[]): SankeyComputed {
  const nodeValue = new Map<string, number>()
  const nodeLinks = new Map<string, { source: string; target: string; value: number }[]>()
  for (const n of nodeNames) {
    nodeValue.set(n, 0)
    nodeLinks.set(n, [])
  }
  for (const l of links) {
    const sv = (nodeValue.get(l.source) ?? 0) + l.value
    nodeValue.set(l.source, sv)
    const tv = (nodeValue.get(l.target) ?? 0) + l.value
    nodeValue.set(l.target, tv)
    const nl = nodeLinks.get(l.source) ?? []
    nl.push(l)
    nodeLinks.set(l.source, nl)
  }

  const maxVal = Math.max(1, ...Array.from(nodeValue.values()))
  const PAD = 16
  const NODE_W = 20
  const CHART_W = 700
  const CHART_H = 500

  const sourceNodes = nodeNames.filter(n => !links.some(l => l.target === n))
  const targetNodes = nodeNames.filter(n => !links.some(l => l.source === n))
  const middleNodes = nodeNames.filter(n => sourceNodes.includes(n) === false && targetNodes.includes(n) === false)

  const layoutNodes: SankeyNode[] = []
  const scaleY = (CHART_H - PAD * 2) / maxVal

  let sy = PAD
  for (const n of sourceNodes) {
    const v = nodeValue.get(n) ?? 0
    const h = v * scaleY
    layoutNodes.push({ name: n, x0: 0, x1: NODE_W, y0: sy, y1: sy + h, value: v })
    sy += h + PAD * 0.5
  }

  sy = PAD
  const targetX = CHART_W - NODE_W
  for (const n of targetNodes) {
    const v = nodeValue.get(n) ?? 0
    const h = v * scaleY
    layoutNodes.push({ name: n, x0: targetX, x1: CHART_W, y0: sy, y1: sy + h, value: v })
    sy += h + PAD * 0.5
  }

  sy = PAD
  const midX = NODE_W + 50
  for (const n of middleNodes) {
    const v = nodeValue.get(n) ?? 0
    const h = v * scaleY
    layoutNodes.push({ name: n, x0: midX, x1: midX + NODE_W, y0: sy, y1: sy + h, value: v })
    sy += h + PAD * 0.5
  }

  const nodeMap = new Map(layoutNodes.map(n => [n.name, n]))
  const computedLinks = links.map((l, i) => ({
    source: nodeMap.get(l.source)!,
    target: nodeMap.get(l.target)!,
    value: l.value,
    elementKey: `link-${i}`,
  }))

  return { nodes: layoutNodes, links: computedLinks, width: CHART_W, height: CHART_H }
}

export function SankeyRenderer() {
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

  const links = (diagramData?.links ?? []) as SankeyLink[]
  const nodes = (diagramData?.nodes as string[]) ?? []

  const layout = useMemo(() => computeSankey(nodes, links), [nodes, links])

  const computedRects = useMemo(() => {
    const map = new Map<string, Rect>()
    for (const node of layout.nodes) {
      const key = `node-${node.name}`
      const h = node.y1 - node.y0
      map.set(key, { x: node.x0, y: node.y0, width: node.x1 - node.x0, height: h })
    }
    return map
  }, [layout])

  useEffect(() => {
    for (const [id, rect] of computedRects) {
      if (diagramElementPositions[id]) continue
      moveDiagramElement(id, { x: rect.x, y: rect.y })
      resizeDiagramElement(id, { width: rect.width, height: rect.height })
    }
  }, [computedRects, diagramElementPositions, moveDiagramElement, resizeDiagramElement])

  function getRect(id: string): Rect {
    const stored = diagramElementPositions[id]
    const computed = computedRects.get(id)
    if (stored) {
      return {
        x: stored.x,
        y: stored.y,
        width: stored.width || computed?.width || 20,
        height: stored.height || computed?.height || 20,
      }
    }
    return computed ?? { x: 0, y: 0, width: 0, height: 0 }
  }

  if (diagramType !== 'sankey' || links.length === 0) return null

  return (
    <g ref={svgRef}>
      {layout.links.map((l, i) => {
        const { source, target, value } = l
        const color = PALETTE[i % PALETTE.length]!
        const sy = source.y0 + (source.y1 - source.y0) * 0.3
        const ty = target.y0 + (target.y1 - target.y0) * 0.3
        const linkH = Math.max(2, value * 0.5)
        const isSelected = selectedIds.has(l.elementKey)

        return (
          <path
            key={l.elementKey}
            d={`M ${source.x1} ${sy} C ${(source.x1 + target.x0) / 2} ${sy}, ${(source.x1 + target.x0) / 2} ${ty}, ${target.x0} ${ty} L ${target.x0} ${ty + linkH} C ${(source.x1 + target.x0) / 2} ${ty + linkH}, ${(source.x1 + target.x0) / 2} ${sy + linkH}, ${source.x1} ${sy + linkH} Z`}
            fill={color}
            opacity={isSelected ? 0.7 : 0.35}
            stroke={isSelected ? '#4a90d9' : 'none'}
            strokeWidth={isSelected ? 1.5 : 0}
            strokeDasharray={isSelected ? '4 2' : undefined}
            style={{ cursor: 'pointer' }}
          />
        )
      })}

      {layout.nodes.map((node, i) => {
        const elementKey = `node-${node.name}`
        const rect = getRect(elementKey)
        const color = diagramColors[elementKey] ?? PALETTE[i % PALETTE.length]!
        const isSelected = selectedIds.has(elementKey)
        const xText = rect.x < 100 ? rect.x + rect.width + 6 : rect.x - 6

        return (
          <g key={elementKey} onMouseDown={e => startDrag(e, elementKey, rect)} style={{ cursor: 'pointer' }}>
            <rect
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              rx={2}
              fill={color}
              opacity={0.85}
              stroke={diagramStrokeColors[elementKey] || (isSelected ? '#4a90d9' : color)}
              strokeWidth={isSelected ? 2 : 0.5}
              strokeDasharray={isSelected ? '4 2' : undefined}
            />
            {rect.height > 20 ? (
              <text
                x={xText}
                y={rect.y + rect.height / 2 + 4}
                textAnchor={rect.x < 100 ? 'start' : 'end'}
                fontFamily="Arial, sans-serif"
                fontSize={10}
                fill="#333"
                fontWeight={600}
                pointerEvents="none"
              >
                {node.name}
              </text>
            ) : (
              <text
                x={xText}
                y={rect.y + rect.height / 2 + 4}
                textAnchor={rect.x < 100 ? 'start' : 'end'}
                fontFamily="Arial, sans-serif"
                fontSize={9}
                fill="#999"
                pointerEvents="none"
              >
                {node.name}
              </text>
            )}
            {isSelected && renderHandles(rect, elementKey)}
          </g>
        )
      })}
    </g>
  )
}
