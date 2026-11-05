import { useDiagramStore } from '../../store/diagramStore'
import { useMemo } from 'react'
import type { Shape, ConnectionType, Position, Dimensions } from '../../core/model/Shape'

type C4BaseType = 'Person' | 'System' | 'Container' | 'Component'

interface C4Element {
  id: string
  type: string
  baseType: C4BaseType
  isExternal: boolean
  isDatabase: boolean
  isQueue: boolean
  label: string
  description: string
  position: Position
  dimensions: Dimensions
}

interface C4Boundary {
  id: string
  type: string
  title: string
  position: Position
  dimensions: Dimensions
  childIds: readonly string[]
}

const TYPE_COLORS: Record<C4BaseType, string> = {
  Person: '#08427B',
  System: '#1168BD',
  Container: '#438DD5',
  Component: '#85BBF0',
}

const EXTERNAL_COLORS: Record<C4BaseType, string> = {
  Person: '#7EADDE',
  System: '#438DD5',
  Container: '#85BBF0',
  Component: '#A8D4F0',
}

function isValidBaseType(value: string): value is C4BaseType {
  return value === 'Person' || value === 'System' || value === 'Container' || value === 'Component'
}

function parseElementType(rawType: string): { baseType: C4BaseType; isExternal: boolean; isDatabase: boolean; isQueue: boolean; fullType: string } | null {
  if (rawType.endsWith('Boundary')) return null
  const isExternal = rawType.endsWith('_Ext')
  const base = isExternal ? rawType.slice(0, -4) : rawType
  const isDatabase = base.endsWith('Db')
  const isQueue = base.endsWith('Queue')
  const baseType = isDatabase ? base.slice(0, -2) : isQueue ? base.slice(0, -5) : base
  if (!isValidBaseType(baseType)) return null
  return { baseType, isExternal, isDatabase, isQueue, fullType: rawType }
}

function parseC4Element(shape: Shape): C4Element | null {
  const lines = shape.text.content.split('\n')
  const firstLine = lines[0] ?? ''
  const colonIndex = firstLine.indexOf(':')
  if (colonIndex === -1) return null
  const rawType = firstLine.slice(0, colonIndex).trim()
  const label = firstLine.slice(colonIndex + 1).trim()
  const description = lines.slice(1).join(' ').trim()
  const parsedType = parseElementType(rawType)
  if (!parsedType) return null
  return {
    id: shape.id,
    type: parsedType.fullType,
    baseType: parsedType.baseType,
    isExternal: parsedType.isExternal,
    isDatabase: parsedType.isDatabase,
    isQueue: parsedType.isQueue,
    label,
    description,
    position: shape.position,
    dimensions: shape.dimensions,
  }
}

function buildElementId(type: string, label: string): string {
  const normalizedLabel = label.toLowerCase().replace(/\s+/g, '-')
  return `c4-${type.toLowerCase()}-${normalizedLabel}`
}

function resolveStrokeColor(element: C4Element, diagramColors: Record<string, string>): string {
  const key = buildElementId(element.type, element.label)
  return diagramColors[key] ?? (element.isExternal ? EXTERNAL_COLORS[element.baseType] : TYPE_COLORS[element.baseType])
}

function resolveFillColor(element: C4Element, diagramColors: Record<string, string>): string {
  return `${resolveStrokeColor(element, diagramColors)}20`
}

function buildBoundaries(): C4Boundary[] {
  return []
}

function buildElementMap(elements: C4Element[]): Map<string, C4Element> {
  const map = new Map<string, C4Element>()
  for (const element of elements) {
    map.set(element.id, element)
  }
  return map
}

function computeCenter(position: Position, dimensions: Dimensions): Position {
  return { x: position.x + dimensions.width / 2, y: position.y + dimensions.height / 2 }
}

function computeMidpoint(a: Position, b: Position): Position {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function computeArrowHead(target: Position, source: Position, size: number): string {
  const angle = Math.atan2(target.y - source.y, target.x - source.x)
  const x1 = target.x - size * Math.cos(angle - Math.PI / 6)
  const y1 = target.y - size * Math.sin(angle - Math.PI / 6)
  const x2 = target.x - size * Math.cos(angle + Math.PI / 6)
  const y2 = target.y - size * Math.sin(angle + Math.PI / 6)
  return `M ${target.x} ${target.y} L ${x1} ${y1} L ${x2} ${y2} Z`
}

function renderTypeLabel(text: string, x: number, y: number, color: string): React.ReactElement {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontFamily="Arial, sans-serif"
      fontSize={9}
      fontStyle="italic"
      fontWeight={600}
      fill={color}
    >
      {`<<${text}>>`}
    </text>
  )
}

function renderNameLabel(text: string, x: number, y: number): React.ReactElement {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontFamily="Arial, sans-serif"
      fontSize={11}
      fontWeight={700}
      fill="#333333"
    >
      {text}
    </text>
  )
}

function renderDescriptionLabel(text: string, x: number, y: number): React.ReactElement {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontFamily="Arial, sans-serif"
      fontSize={9}
      fill="#888888"
    >
      {`[${text}]`}
    </text>
  )
}

function renderPerson(element: C4Element, color: string, isSelected: boolean, onClick: (event: React.MouseEvent) => void): React.ReactElement {
  const { x, y } = element.position
  const { width, height } = element.dimensions
  const headRadius = Math.min(width, height) * 0.12
  const headCenterY = y + height * 0.25
  const bodyBottomY = y + height * 0.75
  const armY = headCenterY + (bodyBottomY - headCenterY) * 0.45
  const strokeWidth = isSelected ? 2.5 : 1.5

  return (
    <g key={element.id} onClick={onClick} style={{ cursor: 'pointer' }}>
      <circle
        cx={x + width / 2}
        cy={headCenterY}
        r={headRadius}
        fill={color}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <line
        x1={x + width / 2}
        y1={headCenterY + headRadius}
        x2={x + width / 2}
        y2={bodyBottomY}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <line
        x1={x + width / 2 - width * 0.18}
        y1={armY}
        x2={x + width / 2 + width * 0.18}
        y2={armY}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      {renderNameLabel(element.label, x + width / 2, y + height - 14)}
      {element.description && renderDescriptionLabel(element.description, x + width / 2, y + height + 2)}
    </g>
  )
}

function renderCylinder(element: C4Element, color: string, fillColor: string, isSelected: boolean, onClick: (event: React.MouseEvent) => void): React.ReactElement {
  const { x, y } = element.position
  const { width, height } = element.dimensions
  const centerX = x + width / 2
  const ovalHeight = height * 0.15
  const strokeWidth = isSelected ? 2.5 : 1.5
  const bodyTop = y + ovalHeight
  const bodyBottom = y + height - ovalHeight

  return (
    <g key={element.id} onClick={onClick} style={{ cursor: 'pointer' }}>
      <rect
        x={x}
        y={bodyTop}
        width={width}
        height={bodyBottom - bodyTop}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={element.isExternal ? '6 3' : undefined}
      />
      <ellipse
        cx={centerX}
        cy={bodyBottom}
        rx={width / 2}
        ry={ovalHeight}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={element.isExternal ? '6 3' : undefined}
      />
      <ellipse
        cx={centerX}
        cy={bodyTop}
        rx={width / 2}
        ry={ovalHeight}
        fill="#ffffff"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={element.isExternal ? '6 3' : undefined}
      />
      {renderTypeLabel(element.baseType, centerX, y + 26, color)}
      {renderNameLabel(element.label, centerX, y + height / 2 + 4)}
      {element.description && renderDescriptionLabel(element.description, centerX, y + height - 18)}
    </g>
  )
}

function renderQueue(element: C4Element, color: string, fillColor: string, isSelected: boolean, onClick: (event: React.MouseEvent) => void): React.ReactElement {
  const { x, y } = element.position
  const { width, height } = element.dimensions
  const centerX = x + width / 2
  const centerY = y + height / 2
  const triangleSize = Math.min(width, height) * 0.12
  const triangleX = x + width - triangleSize - 8
  const strokeWidth = isSelected ? 2.5 : 1.5
  const trianglePath = `M ${triangleX} ${centerY - triangleSize} L ${triangleX + triangleSize} ${centerY} L ${triangleX} ${centerY + triangleSize} Z`

  return (
    <g key={element.id} onClick={onClick} style={{ cursor: 'pointer' }}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={2.5}
        ry={2.5}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={element.isExternal ? '6 3' : undefined}
      />
      <path d={trianglePath} fill={color} opacity={0.7} />
      {renderTypeLabel(element.baseType, centerX - triangleSize / 2, y + 18, color)}
      {renderNameLabel(element.label, centerX - triangleSize / 2, y + height / 2 + 4)}
      {element.description && renderDescriptionLabel(element.description, centerX - triangleSize / 2, y + height - 8)}
    </g>
  )
}

function renderBoxElement(element: C4Element, color: string, fillColor: string, isSelected: boolean, onClick: (event: React.MouseEvent) => void): React.ReactElement {
  const { x, y } = element.position
  const { width, height } = element.dimensions
  const centerX = x + width / 2
  const strokeWidth = isSelected ? 2.5 : 1.5

  return (
    <g key={element.id} onClick={onClick} style={{ cursor: 'pointer' }}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={2.5}
        ry={2.5}
        fill={fillColor}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={element.isExternal ? '6 3' : undefined}
      />
      {renderTypeLabel(element.baseType, centerX, y + 18, color)}
      {renderNameLabel(element.label, centerX, y + height / 2 + 4)}
      {element.description && renderDescriptionLabel(element.description, centerX, y + height - 8)}
    </g>
  )
}

function renderElement(element: C4Element, diagramColors: Record<string, string>, selectedIds: ReadonlySet<string>, toggle: (id: string) => void): React.ReactElement {
  const color = resolveStrokeColor(element, diagramColors)
  const fillColor = resolveFillColor(element, diagramColors)
  const isSelected = selectedIds.has(element.id)
  const onClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    toggle(element.id)
  }

  if (element.baseType === 'Person') {
    return renderPerson(element, color, isSelected, onClick)
  }

  if (element.isDatabase) {
    return renderCylinder(element, color, fillColor, isSelected, onClick)
  }

  if (element.isQueue) {
    return renderQueue(element, color, fillColor, isSelected, onClick)
  }

  return renderBoxElement(element, color, fillColor, isSelected, onClick)
}

function renderBoundary(boundary: C4Boundary): React.ReactElement {
  const { x, y } = boundary.position
  const { width, height } = boundary.dimensions

  return (
    <g key={boundary.id}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke="#666666"
        strokeWidth={1}
        strokeDasharray="6 3"
      />
      <text
        x={x + 8}
        y={y + 16}
        fontFamily="Arial, sans-serif"
        fontSize={11}
        fontWeight={700}
        fill="#666666"
      >
        {`[${boundary.title}]`}
      </text>
    </g>
  )
}

function renderRelationship(connection: ConnectionType, elementMap: Map<string, C4Element>): React.ReactElement | null {
  const source = elementMap.get(connection.sourceId)
  const target = elementMap.get(connection.targetId)
  if (!source || !target) return null

  const sourceCenter = computeCenter(source.position, source.dimensions)
  const targetCenter = computeCenter(target.position, target.dimensions)
  const midpoint = computeMidpoint(sourceCenter, targetCenter)
  const arrowPath = computeArrowHead(targetCenter, sourceCenter, 8)

  return (
    <g key={connection.id}>
      <line
        x1={sourceCenter.x}
        y1={sourceCenter.y}
        x2={targetCenter.x}
        y2={targetCenter.y}
        stroke="#666666"
        strokeWidth={1}
      />
      <path d={arrowPath} fill="#666666" />
      {connection.label && (
        <text
          x={midpoint.x}
          y={midpoint.y - 4}
          textAnchor="middle"
          fontFamily="Arial, sans-serif"
          fontSize={9}
          fill="#666666"
        >
          {connection.label}
        </text>
      )}
    </g>
  )
}

export function C4Renderer(): React.ReactElement | null {
  const diagramType = useDiagramStore(s => s.diagramType)
  const shapes = useDiagramStore(s => s.shapes)
  const connections = useDiagramStore(s => s.connections)
  const diagramColors = useDiagramStore(s => s.diagramColors)
  const selectedIds = useDiagramStore(s => s.selectedDiagramElementIds)
  const toggle = useDiagramStore(s => s.toggleDiagramElement)

  const elements = useMemo(() => {
    if (diagramType !== 'c4') return []
    const result: C4Element[] = []
    for (const shape of shapes) {
      const element = parseC4Element(shape)
      if (element) result.push(element)
    }
    return result
  }, [diagramType, shapes])

  const boundaries = useMemo(() => buildBoundaries(), [])
  const elementMap = useMemo(() => buildElementMap(elements), [elements])

  if (diagramType !== 'c4') return null

  return (
    <g>
      {boundaries.map(boundary => renderBoundary(boundary))}
      {elements.map(element => renderElement(element, diagramColors, selectedIds, toggle))}
      {connections.map(connection => renderRelationship(connection, elementMap))}
    </g>
  )
}
