import { useEffect, useRef, useMemo } from 'react'
import { useDiagramStore } from '../../store/diagramStore'
import { useDiagramDragResize } from '../../hooks/useDiagramDragResize'
import type { ErEntity, ErData } from '../../mermaid/parseErDiagram'

const ROW_HEIGHT = 26
const HEADER_HEIGHT = 32
const COL_W = 200
const LINE_COLOR = '#555'
const HEADER_FILL = '#5a7d9a'
const ROW_ODD = '#fcfcfc'
const ROW_EVEN = '#f5f5f5'
const KEY_COLOR = '#d4a017'
const SEPARATOR_COLOR = '#bbb'

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

function getElementId(entity: ErEntity): string {
  return `entity-${entity.name}`
}

export function ErDiagramRenderer() {
  const svgRef = useRef<SVGGElement>(null)
  const diagramType = useDiagramStore(s => s.diagramType)
  const diagramData = useDiagramStore(s => s.diagramData)
  const diagramColors = useDiagramStore(s => s.diagramColors)
  const diagramStrokeColors = useDiagramStore(s => s.diagramStrokeColors)
  const diagramElementPositions = useDiagramStore(s => s.diagramElementPositions)
  const selectedIds = useDiagramStore(s => s.selectedDiagramElementIds)
  const moveDiagramElement = useDiagramStore(s => s.moveDiagramElement)
  const resizeDiagramElement = useDiagramStore(s => s.resizeDiagramElement)

  const { startDrag, renderHandles } = useDiagramDragResize(svgRef)

  const data = (diagramType === 'er' && diagramData) ? diagramData as unknown as ErData : null

  const computedRects = useMemo(() => {
    const map = new Map<string, Rect>()
    if (!data) return map

    const cols = Math.min(data.entities.length, 4)
    data.entities.forEach((entity, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      const x = 100 + col * (COL_W + 60)
      const y = 40 + row * 200
      const rowCount = 1 + entity.attributes.length
      const height = HEADER_HEIGHT + rowCount * ROW_HEIGHT

      map.set(getElementId(entity), { x, y, width: COL_W, height })
    })
    return map
  }, [data])

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
        width: stored.width || computed?.width || COL_W,
        height: stored.height || computed?.height || HEADER_HEIGHT + ROW_HEIGHT,
      }
    }
    return computed ?? { x: 0, y: 0, width: 0, height: 0 }
  }

  if (diagramType !== 'er' || !data) return null

  return (
    <g ref={svgRef}>
      {data.entities.map((entity) => {
        const elementId = getElementId(entity)
        const rect = getRect(elementId)
        const isSelected = selectedIds.has(elementId)
        const headerFill = diagramColors[elementId] ?? HEADER_FILL
        const stroke = diagramStrokeColors[elementId] || (isSelected ? '#4a90d9' : LINE_COLOR)

        return (
          <g key={entity.name} onMouseDown={e => startDrag(e, elementId, rect)} style={{ cursor: 'pointer' }}>
            <rect
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              fill="white"
              stroke={stroke}
              strokeWidth={isSelected ? 2.5 : 1.5}
              rx={3}
            />
            <rect
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={HEADER_HEIGHT}
              fill={headerFill}
              stroke={stroke}
              strokeWidth={isSelected ? 2.5 : 1.5}
              rx={3}
            />
            <rect
              x={rect.x}
              y={rect.y + HEADER_HEIGHT - 3}
              width={rect.width}
              height={6}
              fill={headerFill}
            />
            <text
              x={rect.x + rect.width / 2}
              y={rect.y + HEADER_HEIGHT / 2 + 5}
              textAnchor="middle"
              fontFamily="Arial, sans-serif"
              fontSize={13}
              fontWeight={700}
              fill="white"
              pointerEvents="none"
            >
              {entity.alias ?? entity.name}
            </text>

            {entity.attributes.map((attr, attrIndex) => {
              const y = rect.y + HEADER_HEIGHT + attrIndex * ROW_HEIGHT
              const hasKeys = attr.keys.length > 0
              const midX = rect.x + rect.width * 0.58
              return (
                <g key={`${entity.name}-${attr.name}`}>
                  <line
                    x1={rect.x}
                    y1={y}
                    x2={rect.x + rect.width}
                    y2={y}
                    stroke={SEPARATOR_COLOR}
                    strokeWidth={0.5}
                  />
                  <line
                    x1={midX}
                    y1={y}
                    x2={midX}
                    y2={y + ROW_HEIGHT}
                    stroke={SEPARATOR_COLOR}
                    strokeWidth={0.5}
                  />
                  <rect
                    x={rect.x + 1}
                    y={y + 1}
                    width={rect.width - 2}
                    height={ROW_HEIGHT - 1}
                    fill={attrIndex % 2 === 0 ? ROW_ODD : ROW_EVEN}
                  />
                  {hasKeys && (
                    <text
                      x={rect.x + 6}
                      y={y + ROW_HEIGHT / 2 + 4}
                      fontFamily="Arial, sans-serif"
                      fontSize={7}
                      fontWeight={900}
                      fill={KEY_COLOR}
                      pointerEvents="none"
                    >
                      {attr.keys.join(',')}
                    </text>
                  )}
                  <text
                    x={rect.x + (hasKeys ? 26 : 8)}
                    y={y + ROW_HEIGHT / 2 + 4}
                    fontFamily="Arial, sans-serif"
                    fontSize={11}
                    fontWeight={600}
                    fill="#333"
                    pointerEvents="none"
                  >
                    {attr.name}
                  </text>
                  <text
                    x={midX + 8}
                    y={y + ROW_HEIGHT / 2 + 4}
                    fontFamily="Arial, sans-serif"
                    fontSize={10}
                    fill="#666"
                    pointerEvents="none"
                  >
                    {attr.type}{attr.isOptional ? '?' : ''}
                  </text>
                  {attr.comment && (
                    <text
                      x={midX + 8}
                      y={y + 16}
                      fontFamily="Arial, sans-serif"
                      fontSize={8}
                      fill="#999"
                      pointerEvents="none"
                    >
                      {attr.comment}
                    </text>
                  )}
                </g>
              )
            })}

            {isSelected && renderHandles(rect, elementId)}
          </g>
        )
      })}

      <defs>
        <marker id="erArrowFilled" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#666" />
        </marker>
      </defs>

      {data.relations.map((rel, index) => {
        const sourceEntity = data.entities.find(e => e.name === rel.sourceName)
        const targetEntity = data.entities.find(e => e.name === rel.targetName)
        if (!sourceEntity || !targetEntity) return null

        const sourceRect = getRect(getElementId(sourceEntity))
        const targetRect = getRect(getElementId(targetEntity))

        const sx = sourceRect.x + sourceRect.width
        const sy = sourceRect.y + sourceRect.height / 2
        const tx = targetRect.x
        const ty = targetRect.y + targetRect.height / 2

        const midX = (sx + tx) / 2
        const midY = (sy + ty) / 2
        const dd = rel.lineStyle === 'dashed' ? '6 3' : undefined

        const labelText = rel.label
        const sourceCard = rel.sourceCardinality
        const targetCard = rel.targetCardinality

        return (
          <g key={`rel-${index}`}>
            <path
              d={`M ${sx} ${sy} L ${tx} ${ty}`}
              fill="none"
              stroke="#666"
              strokeWidth={1.5}
              strokeDasharray={dd}
              markerEnd="url(#erArrowFilled)"
            />
            {sourceCard && (
              <text
                x={sx + 4}
                y={midY - 6}
                textAnchor="start"
                fontFamily="Arial, sans-serif"
                fontSize={9}
                fontWeight={700}
                fill="#555"
                pointerEvents="none"
              >
                {sourceCard}
              </text>
            )}
            {labelText && (
              <text
                x={midX}
                y={midY - 6}
                textAnchor="middle"
                fontFamily="Arial, sans-serif"
                fontSize={9}
                fill="#555"
                pointerEvents="none"
              >
                {labelText}
              </text>
            )}
            {targetCard && (
              <text
                x={tx - 4}
                y={midY - 6}
                textAnchor="end"
                fontFamily="Arial, sans-serif"
                fontSize={9}
                fontWeight={700}
                fill="#555"
                pointerEvents="none"
              >
                {targetCard}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}
