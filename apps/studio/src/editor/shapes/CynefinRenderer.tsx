import { useRef, useEffect, useMemo } from 'react'
import { useDiagramStore } from '../../store/diagramStore'
import { useDiagramDragResize } from '../../hooks/useDiagramDragResize'
import type { CynefinData } from '../../mermaid/parseCynefin'

const PAD = 40
const CELL_W = 370
const CELL_H = 280
const MARGIN = 20
const TOTAL_W = PAD * 2 + CELL_W * 2 + MARGIN
const ITEM_H = 34
const ITEM_PAD = 8

const DOMAIN_LAYOUT: Record<string, { x: number; y: number; label: string; bg: string; textColor: string }> = {
  clear: { x: PAD, y: PAD, label: 'Clear', bg: '#bee3f8', textColor: '#2b6cb0' },
  complicated: { x: PAD + CELL_W + MARGIN, y: PAD, label: 'Complicated', bg: '#c6f6d5', textColor: '#276749' },
  complex: { x: PAD, y: PAD + CELL_H + MARGIN, label: 'Complex', bg: '#fefcbf', textColor: '#d69e2e' },
  chaotic: { x: PAD + CELL_W + MARGIN, y: PAD + CELL_H + MARGIN, label: 'Chaotic', bg: '#fed7d7', textColor: '#c53030' },
  confusion: { x: PAD + CELL_W / 2 + MARGIN / 2 - 90, y: PAD + CELL_H / 2 + MARGIN / 2 - 50, label: 'Disorder', bg: '#e2e8f0', textColor: '#718096' },
}

const CONFUSION_W = 180
const CONFUSION_H = 100

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function CynefinRenderer() {
  const svgRef = useRef<SVGGElement>(null)
  const diagramType = useDiagramStore(s => s.diagramType)
  const diagramData = useDiagramStore(s => s.diagramData)
  const diagramStrokeColors = useDiagramStore(s => s.diagramStrokeColors)
  const diagramElementPositions = useDiagramStore(s => s.diagramElementPositions)
  const moveDiagramElement = useDiagramStore(s => s.moveDiagramElement)
  const resizeDiagramElement = useDiagramStore(s => s.resizeDiagramElement)
  const selectedIds = useDiagramStore(s => s.selectedDiagramElementIds)

  const { startDrag, renderHandles } = useDiagramDragResize(svgRef)

  const data = (diagramType === 'cynefin' && diagramData) ? diagramData as unknown as CynefinData : null

  const computedRects = useMemo(() => {
    const map = new Map<string, Rect>()
    if (!data) return map

    for (const domain of data.domains) {
      const layout = DOMAIN_LAYOUT[domain.name]
      if (!layout) continue

      const isConfusion = domain.name === 'confusion'
      const dw = isConfusion ? CONFUSION_W : CELL_W
      const dh = isConfusion ? CONFUSION_H : CELL_H
      const domainKey = `cynefin-domain-${domain.name}`
      map.set(domainKey, { x: layout.x, y: layout.y, width: dw, height: dh })

      let itemY = layout.y + 36
      for (let i = 0; i < domain.items.length; i++) {
        const itemKey = `cynefin-item-${domain.name}-${i}`
        map.set(itemKey, { x: layout.x + ITEM_PAD, y: itemY, width: dw - ITEM_PAD * 2, height: ITEM_H })
        itemY += ITEM_H + 6
      }
    }
    return map
  }, [data])

  useEffect(() => {
    for (const [id, rect] of computedRects) {
      if (diagramElementPositions[id]) continue
      moveDiagramElement(id, { x: rect.x, y: rect.y })
      resizeDiagramElement(id, { width: rect.width, height: rect.height })
    }
  }, [computedRects, diagramElementPositions, moveDiagramElement, resizeDiagramElement])

  if (diagramType !== 'cynefin' || !data) return null

  function getRect(id: string): Rect {
    const stored = diagramElementPositions[id]
    const computed = computedRects.get(id)
    if (stored) {
      return {
        x: stored.x,
        y: stored.y,
        width: stored.width || computed?.width || ITEM_H,
        height: stored.height || computed?.height || ITEM_H,
      }
    }
    return computed ?? { x: 0, y: 0, width: 0, height: 0 }
  }

  return (
    <g ref={svgRef}>
      {data.title && (
        <text x={TOTAL_W / 2} y={22} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={16} fontWeight={700} fill="#333">
          {data.title}
        </text>
      )}

      {data.domains.map(domain => {
        const layout = DOMAIN_LAYOUT[domain.name]
        if (!layout) return null

        const domainKey = `cynefin-domain-${domain.name}`
        const domainRect = getRect(domainKey)
        const isSelected = selectedIds.has(domainKey)
        const bg = layout.bg

        return (
          <g key={domain.name}>
            <rect
              x={domainRect.x}
              y={domainRect.y}
              width={domainRect.width}
              height={domainRect.height}
              rx={6}
              fill={bg}
              stroke={diagramStrokeColors[domainKey] || (isSelected ? '#4a90d9' : layout.textColor)}
              strokeWidth={isSelected ? 2 : 1}
              strokeDasharray={isSelected ? '4 2' : undefined}
              opacity={0.7}
              style={{ cursor: 'pointer' }}
              onMouseDown={e => startDrag(e, domainKey, domainRect)}
            />
            <text
              x={domainRect.x + 12}
              y={domainRect.y + 24}
              fontFamily="Arial, sans-serif"
              fontSize={14}
              fontWeight={700}
              fill={layout.textColor}
              pointerEvents="none"
            >
              {layout.label}
            </text>
            {domain.items.map((item, i) => {
              const itemKey = `cynefin-item-${domain.name}-${i}`
              const itemRect = getRect(itemKey)
              const isItemSelected = selectedIds.has(itemKey)

              return (
                <g key={itemKey} onMouseDown={e => startDrag(e, itemKey, itemRect)} style={{ cursor: 'pointer' }}>
                  <rect
                    x={itemRect.x}
                    y={itemRect.y}
                    width={itemRect.width}
                    height={itemRect.height}
                    rx={4}
                    fill="#ffffff"
                    stroke={diagramStrokeColors[itemKey] || (isItemSelected ? '#4a90d9' : '#ddd')}
                    strokeWidth={isItemSelected ? 2 : 1}
                    strokeDasharray={isItemSelected ? '4 2' : undefined}
                  />
                  <text
                    x={itemRect.x + itemRect.width / 2}
                    y={itemRect.y + itemRect.height / 2 + 4}
                    textAnchor="middle"
                    fontFamily="Arial, sans-serif"
                    fontSize={12}
                    fill="#333"
                    fontWeight={isItemSelected ? 600 : 400}
                    pointerEvents="none"
                  >
                    {item.text}
                  </text>
                  {isItemSelected && renderHandles(itemRect, itemKey)}
                </g>
              )
            })}
            {isSelected && renderHandles(domainRect, domainKey)}
          </g>
        )
      })}

      {data.transitions.map((trans, i) => {
        const srcLayout = DOMAIN_LAYOUT[trans.source]
        const tgtLayout = DOMAIN_LAYOUT[trans.target]
        if (!srcLayout || !tgtLayout) return null

        const elementKey = `cynefin-trans-${i}`
        const isSelected = selectedIds.has(elementKey)
        const sx = srcLayout.x + (trans.source === 'confusion' ? CONFUSION_W : CELL_W) / 2
        const sy = srcLayout.y + (trans.source === 'confusion' ? CONFUSION_H : CELL_H) / 2
        const tx = tgtLayout.x + (trans.target === 'confusion' ? CONFUSION_W : CELL_W) / 2
        const ty = tgtLayout.y + (trans.target === 'confusion' ? CONFUSION_H : CELL_H) / 2

        return (
          <g key={elementKey}>
            <line
              x1={sx}
              y1={sy}
              x2={tx}
              y2={ty}
              stroke={isSelected ? '#4a90d9' : '#999'}
              strokeWidth={isSelected ? 2 : 1.5}
              strokeDasharray={isSelected ? '4 2' : '6 3'}
              markerEnd="url(#cynefinArrow)"
              style={{ cursor: 'pointer' }}
            />
            {trans.label && (
              <text
                x={(sx + tx) / 2}
                y={(sy + ty) / 2 - 8}
                textAnchor="middle"
                fontFamily="Arial, sans-serif"
                fontSize={10}
                fill="#666"
                pointerEvents="none"
              >
                {trans.label}
              </text>
            )}
          </g>
        )
      })}

      <defs>
        <marker id="cynefinArrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={5} markerHeight={5} orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#999" />
        </marker>
      </defs>
    </g>
  )
}
