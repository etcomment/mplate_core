import { useDiagramStore } from '../../store/diagramStore'
import type { Shape, ConnectionType } from '../../core/model/Shape'
import { useMemo, type ReactElement } from 'react'
import { DatabaseIcon, ServerIcon, DiskIcon, CloudIcon, InternetIcon, DefaultIcon } from './ArchitectureIcons'

interface ArchitectureService {
  id: string
  icon: string
  iconText?: string
  label: string
  in?: string
}

interface ArchitectureGroup {
  id: string
  icon: string
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

interface LayoutItem {
  id: string
  x: number
  y: number
  w: number
  h: number
}

interface LayoutService extends LayoutItem {
  icon: string
  iconText?: string
  label: string
}

interface LayoutGroup extends LayoutItem {
  label: string
  icon: string
}

interface LayoutJunction {
  id: string
  x: number
  y: number
}

interface EdgePath {
  points: Array<{ x: number; y: number }>
  lhsArrow: boolean
  rhsArrow: boolean
  title?: string
}

const SERVICE_W = 140
const SERVICE_H = 90
const GROUP_PAD = 16
const GROUP_HEADER = 30
const GROUP_GAP = 12
const ITEM_GAP = 20
const ARROW_SIZE = 10

const GROUP_COLORS = ['#4a90d9', '#e91e63', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4', '#ff5722', '#607d8b']
const SERVICE_DEFAULT = '#087ebf'

const ARCHITECTURE_ICONS: Record<string, (props: { size: number; color: string }) => ReactElement> = {
  database: DatabaseIcon,
  server: ServerIcon,
  disk: DiskIcon,
  cloud: CloudIcon,
  internet: InternetIcon,
}

function getAttachmentPoint(item: LayoutItem, dir: string): { x: number; y: number } {
  switch (dir) {
    case 'T': return { x: item.x + item.w / 2, y: item.y }
    case 'B': return { x: item.x + item.w / 2, y: item.y + item.h }
    case 'L': return { x: item.x, y: item.y + item.h / 2 }
    case 'R': return { x: item.x + item.w, y: item.y + item.h / 2 }
    default: return { x: item.x + item.w / 2, y: item.y + item.h / 2 }
  }
}

function routeEdge(
  src: LayoutItem, sDir: string,
  tgt: LayoutItem, tDir: string,
  lhsArrow: boolean, rhsArrow: boolean,
  title?: string
): EdgePath {
  const srcPt = getAttachmentPoint(src, sDir)
  const tgtPt = getAttachmentPoint(tgt, tDir)
  const sAxis = sDir === 'T' || sDir === 'B' ? 'Y' : 'X'
  const tAxis = tDir === 'T' || tDir === 'B' ? 'Y' : 'X'

  if (sAxis !== tAxis) {
    const corner = sAxis === 'Y'
      ? { x: srcPt.x, y: tgtPt.y }
      : { x: tgtPt.x, y: srcPt.y }
    return { points: [srcPt, corner, tgtPt], lhsArrow, rhsArrow, title }
  }
  return { points: [srcPt, tgtPt], lhsArrow, rhsArrow, title }
}

function layoutStructured(data: ArchitectureData) {
  const groups: LayoutGroup[] = []
  const services: LayoutService[] = []
  const junctions: LayoutJunction[] = []
  const edgePaths: EdgePath[] = []

  const servicesByGroup = new Map<string, ArchitectureService[]>()
  const groupSet = new Set(data.groups.map(g => g.id))
  const ungroupedServices: ArchitectureService[] = []

  for (const sv of data.services) {
    if (sv.in && groupSet.has(sv.in)) {
      const list = servicesByGroup.get(sv.in)
      if (list) list.push(sv)
      else servicesByGroup.set(sv.in, [sv])
    } else {
      ungroupedServices.push(sv)
    }
  }

  const groupList = data.groups.filter(g => !g.in || !groupSet.has(g.in))
  let cursorY = 40

  for (const g of groupList) {
    const children = servicesByGroup.get(g.id) ?? []
    const cols = Math.max(1, Math.min(children.length || 1, 3))
    const rows = Math.max(1, Math.ceil(children.length / cols))
    const contentW = cols * SERVICE_W + (cols - 1) * GROUP_GAP
    const contentH = rows * SERVICE_H + (rows - 1) * GROUP_GAP
    const groupW = Math.max(200, contentW + GROUP_PAD * 2)
    const groupH = Math.max(80, contentH + GROUP_HEADER + GROUP_PAD * 2)
    const gx = 80
    const gy = cursorY

    if (children.length > 0) {
      const startX = gx + (groupW - contentW) / 2
      const startY = gy + GROUP_HEADER + GROUP_PAD
      children.forEach((sv, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        services.push({
          id: sv.id,
          label: sv.label,
          icon: sv.icon,
          iconText: sv.iconText,
          x: startX + col * (SERVICE_W + GROUP_GAP),
          y: startY + row * (SERVICE_H + GROUP_GAP),
          w: SERVICE_W,
          h: SERVICE_H,
        })
      })
    }

    groups.push({ id: g.id, label: g.label, icon: g.icon, x: gx, y: gy, w: groupW, h: groupH })
    cursorY = gy + groupH + ITEM_GAP
  }

  for (const sv of ungroupedServices) {
    services.push({
      id: sv.id,
      label: sv.label,
      icon: sv.icon,
      iconText: sv.iconText,
      x: 100,
      y: cursorY,
      w: SERVICE_W,
      h: SERVICE_H,
    })
    cursorY += SERVICE_H + ITEM_GAP
  }

  for (const j of data.junctions) {
    junctions.push({ id: j.id, x: 100, y: cursorY })
    cursorY += 40
  }

  const serviceMap = new Map(services.map(s => [s.id, s]))
  const groupMap = new Map(groups.map(g => [g.id, g]))

  for (const edge of data.edges) {
    const src = serviceMap.get(edge.lhsId) ?? groupMap.get(edge.lhsId)
    const tgt = serviceMap.get(edge.rhsId) ?? groupMap.get(edge.rhsId)
    if (!src || !tgt) continue
    edgePaths.push(routeEdge(src, edge.lhsDir, tgt, edge.rhsDir, !!edge.lhsInto, !!edge.rhsInto, edge.title))
  }

  return { groups, services, junctions, edgePaths }
}

function isInside(inner: Shape, outer: Shape): boolean {
  const ox = outer.position.x - 40
  const oy = outer.position.y - 20
  const ow = outer.dimensions.width + 100
  const oh = outer.dimensions.height + 100
  return (
    inner.position.x >= ox &&
    inner.position.x + inner.dimensions.width <= ox + ow &&
    inner.position.y >= oy &&
    inner.position.y + inner.dimensions.height <= oy + oh
  )
}

function layoutFromShapes(shapes: readonly Shape[], connections: readonly ConnectionType[]) {
  const groups: LayoutGroup[] = []
  const services: LayoutService[] = []
  const junctions: LayoutJunction[] = []
  const edgePaths: EdgePath[] = []

  const stadiumShapes = shapes.filter(s => s.type === 'stadium')
  const rectShapes = shapes.filter(s => s.type === 'rectangle')
  const diamondShapes = shapes.filter(s => s.type === 'diamond')

  const usedRectIds = new Set<string>()
  const gChildIds = new Map<string, string[]>()
  let cursorY = 40

  for (const g of stadiumShapes) {
    const children: string[] = []
    for (const r of rectShapes) {
      if (isInside(r, g)) {
        children.push(r.id)
        usedRectIds.add(r.id)
      }
    }
    gChildIds.set(g.id, children)
  }

  for (const g of stadiumShapes) {
    const childIds = gChildIds.get(g.id) ?? []
    const cols = Math.max(1, Math.min(childIds.length || 1, 3))
    const rows = Math.max(1, Math.ceil(childIds.length / cols))
    const contentW = cols * SERVICE_W + (cols - 1) * GROUP_GAP
    const contentH = rows * SERVICE_H + (rows - 1) * GROUP_GAP
    const groupW = Math.max(200, contentW + GROUP_PAD * 2)
    const groupH = Math.max(80, contentH + GROUP_HEADER + GROUP_PAD * 2)
    const gx = 80
    const gy = cursorY

    if (childIds.length > 0) {
      const startX = gx + (groupW - contentW) / 2
      const startY = gy + GROUP_HEADER + GROUP_PAD
      childIds.forEach((cid, i) => {
        const childShape = shapes.find(s => s.id === cid)
        if (!childShape) return
        const col = i % cols
        const row = Math.floor(i / cols)
        services.push({
          id: cid,
          label: childShape.text.content,
          icon: '',
          x: startX + col * (SERVICE_W + GROUP_GAP),
          y: startY + row * (SERVICE_H + GROUP_GAP),
          w: SERVICE_W,
          h: SERVICE_H,
        })
      })
    }

    groups.push({ id: g.id, label: g.text.content, icon: '', x: gx, y: gy, w: groupW, h: groupH })
    cursorY = gy + groupH + ITEM_GAP
  }

  for (const r of rectShapes) {
    if (usedRectIds.has(r.id)) continue
    services.push({
      id: r.id,
      label: r.text.content,
      icon: '',
      x: 100,
      y: cursorY,
      w: Math.max(SERVICE_W, r.dimensions.width),
      h: Math.max(SERVICE_H, r.dimensions.height),
    })
    cursorY += Math.max(SERVICE_H, r.dimensions.height) + ITEM_GAP
  }

  for (const d of diamondShapes) {
    junctions.push({ id: d.id, x: d.position.x, y: d.position.y })
  }

  for (const conn of connections) {
    const src = services.find(s => s.id === conn.sourceId)
    const tgt = services.find(s => s.id === conn.targetId)
    const srcG = !src ? groups.find(g => g.id === conn.sourceId) : undefined
    const tgtG = !tgt ? groups.find(g => g.id === conn.targetId) : undefined
    const srcItem = src ?? srcG
    const tgtItem = tgt ?? tgtG
    if (!srcItem || !tgtItem) continue
    edgePaths.push({
      points: [
        { x: srcItem.x + srcItem.w / 2, y: srcItem.y + srcItem.h / 2 },
        { x: tgtItem.x + tgtItem.w / 2, y: tgtItem.y + tgtItem.h / 2 },
      ],
      lhsArrow: false,
      rhsArrow: false,
    })
  }

  return { groups, services, junctions, edgePaths }
}

function arrowHeadPoints(x: number, y: number, fromX: number, fromY: number, size: number): string {
  const angle = Math.atan2(y - fromY, x - fromX)
  const ax = x - Math.cos(angle) * size
  const ay = y - Math.sin(angle) * size
  const nx = -Math.sin(angle) * size * 0.4
  const ny = Math.cos(angle) * size * 0.4
  return `${x},${y} ${ax + nx},${ay + ny} ${ax - nx},${ay - ny}`
}

export function ArchitectureRenderer() {
  const diagramType = useDiagramStore(s => s.diagramType)
  const diagramData = useDiagramStore(s => s.diagramData)
  const shapes = useDiagramStore(s => s.shapes)
  const connections = useDiagramStore(s => s.connections)
  const diagramColors = useDiagramStore(s => s.diagramColors)
  const selectedIds = useDiagramStore(s => s.selectedDiagramElementIds)
  const toggle = useDiagramStore(s => s.toggleDiagramElement)

  const archData = diagramData as ArchitectureData | null

  const layout = useMemo(() => {
    if (diagramType !== 'architecture') {
      return { groups: [] as LayoutGroup[], services: [] as LayoutService[], junctions: [] as LayoutJunction[], edgePaths: [] as EdgePath[] }
    }
    const hasData = archData && Array.isArray(archData.groups) && (archData.groups.length > 0 || (Array.isArray(archData.services) ? archData.services.length > 0 : false))
    if (hasData) return layoutStructured(archData!)
    return layoutFromShapes(shapes, connections)
  }, [diagramType, archData, shapes, connections])

  if (diagramType !== 'architecture') return null

  const { groups, services, junctions, edgePaths } = layout

  return (
    <g>
      {edgePaths.map((edge, i) => {
        const pts = edge.points
        const mid = pts.length === 3 ? pts[1]! : { x: (pts[0]!.x + pts[1]!.x) / 2, y: (pts[0]!.y + pts[1]!.y) / 2 }

        return (
          <g key={`edge-${i}`}>
            {pts.slice(0, -1).map((p, j) => (
              <line
                key={`seg-${j}`}
                x1={p.x}
                y1={p.y}
                x2={pts[j + 1]!.x}
                y2={pts[j + 1]!.y}
                stroke="#666"
                strokeWidth={1.5}
              />
            ))}
            {edge.rhsArrow && (
              <polygon
                points={arrowHeadPoints(pts[pts.length - 1]!.x, pts[pts.length - 1]!.y, pts[pts.length - 2]!.x, pts[pts.length - 2]!.y, ARROW_SIZE)}
                fill="#666"
              />
            )}
            {edge.lhsArrow && (
              <polygon
                points={arrowHeadPoints(pts[0]!.x, pts[0]!.y, pts[1]!.x, pts[1]!.y, ARROW_SIZE)}
                fill="#666"
              />
            )}
            {edge.title && (
              <text
                x={mid!.x}
                y={mid!.y - 6}
                textAnchor="middle"
                fontFamily="Arial, sans-serif"
                fontSize={10}
                fill="#555"
              >
                {edge.title}
              </text>
            )}
          </g>
        )
      })}

      {junctions.map(j => {
        const isSelected = selectedIds.has(j.id)
        const size = 14
        return (
          <g
            key={`junction-${j.id}`}
            style={{ cursor: 'pointer' }}
            onClick={e => { e.stopPropagation(); toggle(j.id) }}
          >
            <polygon
              points={`${j.x},${j.y - size} ${j.x + size},${j.y} ${j.x},${j.y + size} ${j.x - size},${j.y}`}
              fill={isSelected ? '#bbb' : '#9e9e9e'}
              stroke={isSelected ? '#666' : '#888'}
              strokeWidth={isSelected ? 2 : 1}
            />
          </g>
        )
      })}

      {groups.map((g, i) => {
        const color = diagramColors[`group-${g.id}`] ?? GROUP_COLORS[i % GROUP_COLORS.length]!
        const isSelected = selectedIds.has(g.id)
        return (
          <g
            key={`group-${g.id}`}
            style={{ cursor: 'pointer' }}
            onClick={e => { e.stopPropagation(); toggle(g.id) }}
          >
            <rect
              x={g.x}
              y={g.y}
              width={g.w}
              height={g.h}
              rx={12}
              fill={isSelected ? `${color}15` : `${color}08`}
              stroke={isSelected ? color : `${color}60`}
              strokeWidth={isSelected ? 2.5 : 1.5}
              strokeDasharray={isSelected ? undefined : '8 3'}
            />
            <rect x={g.x} y={g.y} width={g.w} height={GROUP_HEADER} rx={12} fill={color} opacity={0.15} />
            <rect x={g.x} y={g.y + GROUP_HEADER - 10} width={g.w} height={10} fill={color} opacity={0.15} />
            <text
              x={g.x + g.w / 2}
              y={g.y + GROUP_HEADER / 2 + 1}
              textAnchor="middle"
              fontFamily="Arial, sans-serif"
              fontSize={13}
              fontWeight={700}
              fill={color}
            >
              {g.label}
            </text>
          </g>
        )
      })}

      {services.map(sv => {
        const color = diagramColors[`service-${sv.id}`] ?? SERVICE_DEFAULT
        const isSelected = selectedIds.has(sv.id)
        const iconSize = 28
        const IconComponent = ARCHITECTURE_ICONS[sv.icon] ?? DefaultIcon
        const showText = !ARCHITECTURE_ICONS[sv.icon] && !!sv.iconText

        return (
          <g
            key={`service-${sv.id}`}
            style={{ cursor: 'pointer' }}
            onClick={e => { e.stopPropagation(); toggle(sv.id) }}
          >
            <rect
              x={sv.x}
              y={sv.y}
              width={sv.w}
              height={sv.h}
              rx={8}
              fill={isSelected ? `${color}dd` : color}
              stroke={isSelected ? '#2196F3' : `${color}cc`}
              strokeWidth={isSelected ? 2.5 : 1.5}
            />
            <g transform={`translate(${sv.x + (sv.w - iconSize) / 2}, ${sv.y + 10})`}>
              <IconComponent size={iconSize} color="white" />
            </g>
            {showText && (
              <text
                x={sv.x + sv.w / 2}
                y={sv.y + 36}
                textAnchor="middle"
                fontFamily="Arial, sans-serif"
                fontSize={14}
                fontWeight={700}
                fill="white"
              >
                {sv.iconText}
              </text>
            )}
            <text
              x={sv.x + sv.w / 2}
              y={sv.y + sv.h / 2 + (showText ? 22 : 18)}
              textAnchor="middle"
              fontFamily="Arial, sans-serif"
              fontSize={11}
              fontWeight={600}
              fill="white"
            >
              {sv.label}
            </text>
          </g>
        )
      })}
    </g>
  )
}
