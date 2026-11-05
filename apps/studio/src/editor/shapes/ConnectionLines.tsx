import { useDiagramStore } from '../../store/diagramStore'
import { computeEdgePoints } from '../../core/geometry'
import type { ArrowDirection, ArrowHead, ArrowStyle } from '../../core/model/Shape'

const MARKER_ID_PREFIX = 'arrow-marker-'

function getMarkerId(head: ArrowHead): string {
  return `${MARKER_ID_PREFIX}${head}`
}

function getStrokeDasharray(style?: ArrowStyle): string | undefined {
  switch (style) {
    case 'dashed':
      return '8 4'
    case 'dotted':
      return '3 3'
    default:
      return undefined
  }
}

function getStrokeWidth(style?: ArrowStyle, defaultWidth = 2): number {
  if (style === 'thick') return 3
  return defaultWidth
}

function shouldRenderStartMarker(direction?: ArrowDirection): boolean {
  if (!direction) return false
  return direction === 'backward' || direction === 'both'
}

function shouldRenderEndMarker(direction?: ArrowDirection): boolean {
  if (!direction) return true
  return direction === 'forward' || direction === 'both'
}

function ArrowheadDefs() {
  return (
    <defs>
      <marker
        id={getMarkerId('filled')}
        markerWidth="10"
        markerHeight="10"
        refX="9"
        refY="5"
        orient="auto"
        markerUnits="userSpaceOnUse"
      >
        <polygon points="0,0 10,5 0,10" fill="context-stroke" />
      </marker>
      <marker
        id={getMarkerId('open')}
        markerWidth="10"
        markerHeight="10"
        refX="9"
        refY="5"
        orient="auto"
        markerUnits="userSpaceOnUse"
      >
        <polygon points="0,0 10,5 0,10" fill="none" stroke="context-stroke" strokeWidth="1.5" />
      </marker>
      <marker
        id={getMarkerId('cross')}
        markerWidth="10"
        markerHeight="10"
        refX="5"
        refY="5"
        orient="auto"
        markerUnits="userSpaceOnUse"
      >
        <g stroke="context-stroke" strokeWidth="1.5">
          <line x1="0" y1="0" x2="10" y2="10" />
          <line x1="0" y1="10" x2="10" y2="0" />
        </g>
      </marker>
      <marker
        id={getMarkerId('circle')}
        markerWidth="10"
        markerHeight="10"
        refX="5"
        refY="5"
        orient="auto"
        markerUnits="userSpaceOnUse"
      >
        <circle cx="5" cy="5" r="4" fill="context-stroke" />
      </marker>
      <marker
        id={getMarkerId('diamond')}
        markerWidth="10"
        markerHeight="10"
        refX="9"
        refY="5"
        orient="auto"
        markerUnits="userSpaceOnUse"
      >
        <polygon points="5,0 10,5 5,10 0,5" fill="context-stroke" />
      </marker>
    </defs>
  )
}

export function ConnectionLines() {
  const shapes = useDiagramStore(s => s.shapes)
  const connections = useDiagramStore(s => s.connections)

  const shapeMap = new Map(shapes.map(s => [s.id, s]))

  return (
    <>
      <ArrowheadDefs />
      <g>
        {connections.map((conn) => {
          const source = shapeMap.get(conn.sourceId)
          const target = shapeMap.get(conn.targetId)
          if (!source || !target) return null

          const { startX, startY, endX, endY } = computeEdgePoints(source, target)

          const dx = Math.abs(endX - startX)
          const controlOffset = Math.min(dx * 0.5, 80)

          const pathD = `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`

          const midX = (startX + 3 * (startX + controlOffset) + 3 * (endX - controlOffset) + endX) / 8
          const midY = (startY + 3 * startY + 3 * endY + endY) / 8

          const strokeColor = conn.lineColor ?? '#666'
          const strokeW = getStrokeWidth(conn.arrowStyle)
          const dasharray = getStrokeDasharray(conn.arrowStyle)
          const noMarkers = conn.arrowDirection === 'none' || conn.arrowHead === 'none'
          const showStartMarker = !noMarkers && shouldRenderStartMarker(conn.arrowDirection)
          const showEndMarker = !noMarkers && shouldRenderEndMarker(conn.arrowDirection)
          const headType = conn.arrowHead ?? 'filled'

          const markerStartUrl = showStartMarker ? `url(#${getMarkerId(headType)})` : undefined
          const markerEndUrl = showEndMarker ? `url(#${getMarkerId(headType)})` : undefined

          return (
            <g key={conn.id}>
              <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeW}
                strokeDasharray={dasharray}
                strokeLinecap="round"
                markerStart={markerStartUrl}
                markerEnd={markerEndUrl}
              />
              {conn.label ? (
                <g transform={`translate(${midX}, ${midY - 6})`}>
                  <rect
                    x={-conn.label.length * 3.5 - 4}
                    y={-8}
                    width={conn.label.length * 7 + 8}
                    height={16}
                    fill="white"
                    rx={2}
                  />
                  <text
                    textAnchor="middle"
                    fontSize={11}
                    fontFamily="Arial"
                    fill="#333"
                    dominantBaseline="central"
                  >
                    {conn.label}
                  </text>
                </g>
              ) : null}
            </g>
          )
        })}
      </g>
    </>
  )
}
