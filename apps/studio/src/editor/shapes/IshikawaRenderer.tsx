import { useRef, useEffect, useMemo } from 'react'
import { useDiagramStore } from '../../store/diagramStore'
import { useDiagramDragResize } from '../../hooks/useDiagramDragResize'
import type { IshikawaData } from '../../mermaid/parseIshikawa'

const START_X = 50
const START_Y = 100
const SPINE_LENGTH = 700
const HEAD_W = 180
const HEAD_H = 60
const CATEGORY_W = 140
const CATEGORY_H = 44
const CAUSE_W = 120
const CAUSE_H = 36
const RIB_LENGTH = 100
const CATEGORY_V_GAP = 90
const CAUSE_V_GAP = 50

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function IshikawaRenderer() {
  const svgRef = useRef<SVGGElement>(null)
  const diagramType = useDiagramStore(s => s.diagramType)
  const diagramData = useDiagramStore(s => s.diagramData)
  const diagramStrokeColors = useDiagramStore(s => s.diagramStrokeColors)
  const diagramElementPositions = useDiagramStore(s => s.diagramElementPositions)
  const moveDiagramElement = useDiagramStore(s => s.moveDiagramElement)
  const resizeDiagramElement = useDiagramStore(s => s.resizeDiagramElement)
  const selectedIds = useDiagramStore(s => s.selectedDiagramElementIds)

  const { startDrag, renderHandles } = useDiagramDragResize(svgRef)

  const data = (diagramType === 'ishikawa' && diagramData) ? diagramData as unknown as IshikawaData : null

  const spineY = START_Y

  const computedRects = useMemo(() => {
    const map = new Map<string, Rect>()
    if (!data) return map

    const headX = START_X + SPINE_LENGTH - HEAD_W / 2
    const headY = spineY - HEAD_H / 2
    map.set('ishikawa-head', { x: headX, y: headY, width: HEAD_W, height: HEAD_H })

    let catIdx = 0
    for (const cat of data.categories) {
      const isTop = catIdx % 2 === 0
      const ribEndX = START_X + 100 + catIdx * 150
      const catY = isTop ? spineY - CATEGORY_V_GAP - CATEGORY_H / 2 : spineY + CATEGORY_V_GAP - CATEGORY_H / 2
      const catX = ribEndX + RIB_LENGTH - CATEGORY_W / 2
      map.set(`ishikawa-cat-${catIdx}`, { x: catX, y: catY, width: CATEGORY_W, height: CATEGORY_H })

      for (let ci = 0; ci < cat.causes.length; ci++) {
        const causeY = isTop
          ? catY - CAUSE_V_GAP * (ci + 1)
          : catY + CATEGORY_H + CAUSE_V_GAP * ci
        map.set(`ishikawa-cause-${catIdx}-${ci}`, {
          x: ribEndX + RIB_LENGTH / 2 - CAUSE_W / 2,
          y: causeY,
          width: CAUSE_W,
          height: CAUSE_H,
        })
      }
      catIdx++
    }
    return map
  }, [data, spineY])

  useEffect(() => {
    for (const [id, rect] of computedRects) {
      if (diagramElementPositions[id]) continue
      moveDiagramElement(id, { x: rect.x, y: rect.y })
      resizeDiagramElement(id, { width: rect.width, height: rect.height })
    }
  }, [computedRects, diagramElementPositions, moveDiagramElement, resizeDiagramElement])

  if (diagramType !== 'ishikawa' || !data) return null

  function getRect(id: string): Rect {
    const stored = diagramElementPositions[id]
    const computed = computedRects.get(id)
    if (stored) {
      return {
        x: stored.x,
        y: stored.y,
        width: stored.width || computed?.width || CATEGORY_W,
        height: stored.height || computed?.height || CATEGORY_H,
      }
    }
    return computed ?? { x: 0, y: 0, width: 0, height: 0 }
  }

  const headRect = getRect('ishikawa-head')

  return (
    <g ref={svgRef}>
      <line
        x1={START_X}
        y1={spineY}
        x2={headRect.x + headRect.width / 2}
        y2={headRect.y + headRect.height / 2}
        stroke="#666"
        strokeWidth={3}
        markerEnd="url(#ishikawaArrowHead)"
        pointerEvents="none"
      />

      <defs>
        <marker id="ishikawaArrowHead" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={8} markerHeight={8} orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#666" />
        </marker>
        <marker id="ishikawaArrowSmall" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={5} markerHeight={5} orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#999" />
        </marker>
      </defs>

      <g onMouseDown={e => startDrag(e, 'ishikawa-head', headRect)} style={{ cursor: 'pointer' }}>
        <rect
          x={headRect.x}
          y={headRect.y}
          width={headRect.width}
          height={headRect.height}
          rx={10}
          fill="#fefcbf"
          stroke={diagramStrokeColors['ishikawa-head'] || (selectedIds.has('ishikawa-head') ? '#4a90d9' : '#d69e2e')}
          strokeWidth={selectedIds.has('ishikawa-head') ? 2.5 : 2}
          strokeDasharray={selectedIds.has('ishikawa-head') ? '4 2' : undefined}
        />
        <text
          x={headRect.x + headRect.width / 2}
          y={headRect.y + headRect.height / 2 + 5}
          textAnchor="middle"
          fontFamily="Arial, sans-serif"
          fontSize={13}
          fontWeight={700}
          fill="#333"
          pointerEvents="none"
        >
          {data.problem}
        </text>
        {selectedIds.has('ishikawa-head') && renderHandles(headRect, 'ishikawa-head')}
      </g>

      {data.categories.map((cat, catIdx) => {
        const catRect = getRect(`ishikawa-cat-${catIdx}`)
        const isTop = catIdx % 2 === 0
        const ribEndX = START_X + 100 + catIdx * 150
        const isCatSelected = selectedIds.has(`ishikawa-cat-${catIdx}`)

        return (
          <g key={`cat-${catIdx}`}>
            <line
              x1={ribEndX}
              y1={spineY}
              x2={catRect.x + catRect.width / 2}
              y2={isTop ? catRect.y + catRect.height : catRect.y}
              stroke="#aaa"
              strokeWidth={1.5}
              markerEnd="url(#ishikawaArrowSmall)"
              pointerEvents="none"
            />

            <g onMouseDown={e => startDrag(e, `ishikawa-cat-${catIdx}`, catRect)} style={{ cursor: 'pointer' }}>
              <rect
                x={catRect.x}
                y={catRect.y}
                width={catRect.width}
                height={catRect.height}
                rx={6}
                fill="#bee3f8"
                stroke={diagramStrokeColors[`ishikawa-cat-${catIdx}`] || (isCatSelected ? '#4a90d9' : '#2b6cb0')}
                strokeWidth={isCatSelected ? 2.5 : 1.5}
                strokeDasharray={isCatSelected ? '4 2' : undefined}
              />
              <text
                x={catRect.x + catRect.width / 2}
                y={catRect.y + catRect.height / 2 + 4}
                textAnchor="middle"
                fontFamily="Arial, sans-serif"
                fontSize={12}
                fontWeight={600}
                fill="#333"
                pointerEvents="none"
              >
                {cat.name}
              </text>
              {isCatSelected && renderHandles(catRect, `ishikawa-cat-${catIdx}`)}
            </g>

            {cat.causes.map((cause, ci) => {
              const causeRect = getRect(`ishikawa-cause-${catIdx}-${ci}`)
              const causeKey = `ishikawa-cause-${catIdx}-${ci}`
              const isCauseSelected = selectedIds.has(causeKey)
              const cx = catRect.x + catRect.width / 2

              return (
                <g key={causeKey}>
                  <line
                    x1={cx}
                    y1={isTop ? catRect.y : catRect.y + catRect.height}
                    x2={causeRect.x + causeRect.width / 2}
                    y2={isTop ? causeRect.y + causeRect.height : causeRect.y}
                    stroke="#ccc"
                    strokeWidth={1}
                    pointerEvents="none"
                  />

                  <g onMouseDown={e => startDrag(e, causeKey, causeRect)} style={{ cursor: 'pointer' }}>
                    <rect
                      x={causeRect.x}
                      y={causeRect.y}
                      width={causeRect.width}
                      height={causeRect.height}
                      rx={4}
                      fill="#ffffff"
                      stroke={diagramStrokeColors[causeKey] || (isCauseSelected ? '#4a90d9' : '#ddd')}
                      strokeWidth={isCauseSelected ? 2 : 1}
                      strokeDasharray={isCauseSelected ? '4 2' : undefined}
                    />
                    <text
                      x={causeRect.x + causeRect.width / 2}
                      y={causeRect.y + causeRect.height / 2 + 4}
                      textAnchor="middle"
                      fontFamily="Arial, sans-serif"
                      fontSize={11}
                      fill="#555"
                      pointerEvents="none"
                    >
                      {cause}
                    </text>
                    {isCauseSelected && renderHandles(causeRect, causeKey)}
                  </g>
                </g>
              )
            })}
          </g>
        )
      })}
    </g>
  )
}
