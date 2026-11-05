import { useEffect, useMemo, useRef } from 'react'
import { useDiagramStore } from '../../store/diagramStore'
import type { MindmapNode } from '../../mermaid/parseMindmap'

const SECTION_PALETTE = [
  '#ef5350', '#66bb6a', '#42a5f5', '#ffa726',
  '#ab47bc', '#26c6da', '#8d6e63', '#78909c',
]

const ROOT_COLOR = '#e8f4f8'

interface LayoutNode {
  node: MindmapNode
  x: number
  y: number
  depth: number
  section: number
}

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

interface Interaction {
  id: string
  kind: 'drag' | 'resize'
  corner?: 'nw' | 'ne' | 'sw' | 'se'
  startMouse: { x: number; y: number }
  startRect: Rect
  hasMoved: boolean
}

function countLeaves(node: MindmapNode): number {
  if (node.children.length === 0) return 1
  let total = 0
  for (const child of node.children) total += countLeaves(child)
  return total
}

const LEAF_WIDTH = 140
const LEVEL_HEIGHT = 110
const NODE_HEIGHT = 34
const ROOT_HEIGHT = 40
const HANDLE_SIZE = 8
const MIN_SIZE = 40
const DRAG_THRESHOLD = 3

function computeNodeWidth(node: MindmapNode): number {
  return Math.max(80, node.text.length * 8 + 24)
}

function layoutTree(root: MindmapNode): LayoutNode[] {
  const result: LayoutNode[] = []
  const totalLeaves = countLeaves(root)
  const totalWidth = Math.max(totalLeaves * LEAF_WIDTH, 400)
  const canvasWidth = totalWidth + 80
  const startX = (canvasWidth - totalWidth) / 2

  function position(
    node: MindmapNode,
    left: number,
    right: number,
    depth: number,
    section: number,
  ): void {
    const x = startX + (left + right) / 2
    const y = 50 + depth * LEVEL_HEIGHT
    result.push({ node, x, y, depth, section })

    if (node.children.length === 0) return

    const childLeaves = node.children.map(c => countLeaves(c))
    const totalChildLeaves = childLeaves.reduce((a, b) => a + b, 0)
    if (totalChildLeaves === 0) return

    const span = right - left
    let currentLeft = left
    for (let i = 0; i < node.children.length; i++) {
      const segment = (childLeaves[i]! / totalChildLeaves) * span
      const childSection = depth === 0 ? i % 4 : section
      position(node.children[i]!, currentLeft, currentLeft + segment, depth + 1, childSection)
      currentLeft += segment
    }
  }

  position(root, 0, totalWidth, 0, 0)
  return result
}

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const cy = (y1 + y2) / 2
  return `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`
}

function getSectionColor(section: number, elementId: string, diagramColors: Record<string, string>): string {
  return diagramColors[elementId] ?? SECTION_PALETTE[section % SECTION_PALETTE.length]!
}

function getElementId(node: MindmapNode): string {
  return `node-${node.text}`
}

function getNodeRect(layoutNode: LayoutNode, positions: Record<string, Rect>): Rect {
  const id = getElementId(layoutNode.node)
  const stored = positions[id]
  const isRoot = layoutNode.depth === 0
  const height = isRoot ? ROOT_HEIGHT : NODE_HEIGHT
  const width = computeNodeWidth(layoutNode.node)
  if (stored) {
    return {
      x: stored.x,
      y: stored.y,
      width: stored.width || width,
      height: stored.height || height,
    }
  }
  return { x: layoutNode.x, y: layoutNode.y, width, height }
}

export function MindmapRenderer() {
  const diagramType = useDiagramStore(s => s.diagramType)
  const diagramData = useDiagramStore(s => s.diagramData)
  const diagramColors = useDiagramStore(s => s.diagramColors)
  const diagramStrokeColors = useDiagramStore(s => s.diagramStrokeColors)
  const diagramElementPositions = useDiagramStore(s => s.diagramElementPositions)
  const selectedIds = useDiagramStore(s => s.selectedDiagramElementIds)
  const toggleElement = useDiagramStore(s => s.toggleDiagramElement)
  const moveDiagramElement = useDiagramStore(s => s.moveDiagramElement)
  const resizeDiagramElement = useDiagramStore(s => s.resizeDiagramElement)

  const svgRef = useRef<SVGGElement>(null)
  const interactionRef = useRef<Interaction | null>(null)

  const root = diagramType === 'mindmap' && diagramData?.root
    ? (diagramData.root as MindmapNode)
    : null

  const layoutNodes = useMemo(() => (root ? layoutTree(root) : []), [root])

  useEffect(() => {
    if (layoutNodes.length === 0) return
    for (const layoutNode of layoutNodes) {
      const id = getElementId(layoutNode.node)
      if (diagramElementPositions[id]) continue
      const rect = getNodeRect(layoutNode, diagramElementPositions)
      moveDiagramElement(id, { x: rect.x, y: rect.y })
      resizeDiagramElement(id, { width: rect.width, height: rect.height })
    }
  }, [layoutNodes, diagramElementPositions, moveDiagramElement, resizeDiagramElement])

  if (diagramType !== 'mindmap' || !diagramData?.root) return null

  const nodeRects = new Map<string, Rect>()
  for (const layoutNode of layoutNodes) {
    nodeRects.set(getElementId(layoutNode.node), getNodeRect(layoutNode, diagramElementPositions))
  }

  function toSvgPoint(e: MouseEvent): { x: number; y: number } {
    const svg = svgRef.current?.ownerSVGElement
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const p = pt.matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }

  function stopInteraction() {
    const interaction = interactionRef.current
    if (!interaction) return
    interactionRef.current = null
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    if (!interaction.hasMoved) {
      toggleElement(interaction.id)
    }
  }

  function onMouseMove(e: MouseEvent) {
    const interaction = interactionRef.current
    if (!interaction) return
    const { x, y } = toSvgPoint(e)
    const dx = x - interaction.startMouse.x
    const dy = y - interaction.startMouse.y

    if (interaction.kind === 'drag') {
      if (!interaction.hasMoved) {
        if (Math.hypot(dx, dy) <= DRAG_THRESHOLD) return
        interaction.hasMoved = true
      }
      moveDiagramElement(interaction.id, {
        x: interaction.startRect.x + dx,
        y: interaction.startRect.y + dy,
      })
      return
    }

    if (interaction.kind === 'resize' && interaction.corner) {
      interaction.hasMoved = true
      const start = interaction.startRect
      let nextX = start.x
      let nextY = start.y
      let nextW = start.width
      let nextH = start.height

      if (interaction.corner === 'se') {
        nextW = Math.max(MIN_SIZE, x - start.x)
        nextH = Math.max(MIN_SIZE, y - start.y)
      } else if (interaction.corner === 'sw') {
        const right = start.x + start.width
        nextX = Math.min(x, right - MIN_SIZE)
        nextW = Math.max(MIN_SIZE, right - x)
        nextH = Math.max(MIN_SIZE, y - start.y)
      } else if (interaction.corner === 'ne') {
        const bottom = start.y + start.height
        nextY = Math.min(y, bottom - MIN_SIZE)
        nextW = Math.max(MIN_SIZE, x - start.x)
        nextH = Math.max(MIN_SIZE, bottom - y)
      } else if (interaction.corner === 'nw') {
        const right = start.x + start.width
        const bottom = start.y + start.height
        nextX = Math.min(x, right - MIN_SIZE)
        nextY = Math.min(y, bottom - MIN_SIZE)
        nextW = Math.max(MIN_SIZE, right - x)
        nextH = Math.max(MIN_SIZE, bottom - y)
      }

      resizeDiagramElement(interaction.id, { width: nextW, height: nextH })
      moveDiagramElement(interaction.id, { x: nextX, y: nextY })
    }
  }

  function onMouseUp() {
    stopInteraction()
  }

  function startDrag(e: React.MouseEvent<SVGGElement>, id: string) {
    e.stopPropagation()
    e.preventDefault()
    if (interactionRef.current) return
    const rect = nodeRects.get(id)
    if (!rect) return
    const { x, y } = toSvgPoint(e.nativeEvent)
    interactionRef.current = {
      id,
      kind: 'drag',
      startMouse: { x, y },
      startRect: rect,
      hasMoved: false,
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  function startResize(
    e: React.MouseEvent<SVGRectElement>,
    id: string,
    corner: 'nw' | 'ne' | 'sw' | 'se',
  ) {
    e.stopPropagation()
    e.preventDefault()
    if (interactionRef.current) return
    const rect = nodeRects.get(id)
    if (!rect) return
    const { x, y } = toSvgPoint(e.nativeEvent)
    interactionRef.current = {
      id,
      kind: 'resize',
      corner,
      startMouse: { x, y },
      startRect: rect,
      hasMoved: true,
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  function renderHandles(rect: Rect, id: string) {
    const half = HANDLE_SIZE / 2
    const handles: Array<{ corner: 'nw' | 'ne' | 'sw' | 'se'; x: number; y: number; cursor: string }> = [
      { corner: 'nw', x: rect.x - half, y: rect.y - half, cursor: 'nwse-resize' },
      { corner: 'ne', x: rect.x + rect.width - half, y: rect.y - half, cursor: 'nesw-resize' },
      { corner: 'sw', x: rect.x - half, y: rect.y + rect.height - half, cursor: 'nesw-resize' },
      { corner: 'se', x: rect.x + rect.width - half, y: rect.y + rect.height - half, cursor: 'nwse-resize' },
    ]

    return (
      <g pointerEvents="all">
        {handles.map(handle => (
          <rect
            key={handle.corner}
            x={handle.x}
            y={handle.y}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#fff"
            stroke="#2196F3"
            strokeWidth={1}
            style={{ cursor: handle.cursor }}
            onMouseDown={e => startResize(e, id, handle.corner)}
          />
        ))}
      </g>
    )
  }

  return (
    <g ref={svgRef}>
      {layoutNodes.filter(n => n.depth > 0).map(({ node }) => {
        const parent = layoutNodes.find(p => p.node.children.includes(node))
        if (!parent) return null
        const parentRect = nodeRects.get(getElementId(parent.node))!
        const childRect = nodeRects.get(getElementId(node))!
        return (
          <path
            key={`conn-${node.id}`}
            d={bezierPath(
              parentRect.x,
              parentRect.y + parentRect.height / 2,
              childRect.x,
              childRect.y - childRect.height / 2,
            )}
            fill="none"
            stroke="#666"
            strokeWidth={1.5}
          />
        )
      })}
      {layoutNodes.map(layoutNode => {
        const { node, depth, section } = layoutNode
        const elementId = getElementId(node)
        const isSelected = selectedIds.has(elementId)
        const rect = nodeRects.get(elementId)!
        const color = depth === 0
          ? (diagramColors[elementId] ?? ROOT_COLOR)
          : getSectionColor(section, elementId, diagramColors)
        const textColor = depth === 0 ? '#333' : '#fff'

        return (
          <g key={node.id} onMouseDown={e => startDrag(e, elementId)} style={{ cursor: 'pointer' }}>
            {depth === 0 ? (
              <rect
                x={rect.x - rect.width / 2}
                y={rect.y - rect.height / 2}
                width={rect.width}
                height={rect.height}
                rx={rect.height / 2}
                ry={rect.height / 2}
                fill={color}
                stroke={diagramStrokeColors[elementId] || (isSelected ? '#2196F3' : '#333')}
                strokeWidth={isSelected ? 2.5 : 1.5}
                strokeDasharray={isSelected ? '6 3' : 'none'}
              />
            ) : (
              <rect
                x={rect.x - rect.width / 2}
                y={rect.y - rect.height / 2}
                width={rect.width}
                height={rect.height}
                rx={6}
                ry={6}
                fill={color}
                stroke={diagramStrokeColors[elementId] || (isSelected ? '#2196F3' : color)}
                strokeWidth={isSelected ? 2.5 : 1}
                strokeDasharray={isSelected ? '6 3' : 'none'}
              />
            )}
            <text
              x={rect.x}
              y={rect.y + 4}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="Arial, sans-serif"
              fontSize={11}
              fill={textColor}
              pointerEvents="none"
            >
              {node.text}
            </text>
            {isSelected && renderHandles(
              { x: rect.x - rect.width / 2, y: rect.y - rect.height / 2, width: rect.width, height: rect.height },
              elementId,
            )}
          </g>
        )
      })}
    </g>
  )
}
