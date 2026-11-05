import type { Shape } from '../../core/model/Shape'
import { ResizeHandles } from './ResizeHandles'
import { useDiagramStore } from '../../store/diagramStore'
import { TEMPLATE_ICONS } from '../../icons/registry'
import { INK_COLOR } from '../../lib/theme'

const diamondPoints = (x: number, y: number, w: number, h: number): string => {
  const cx = x + w / 2
  const cy = y + h / 2
  return `${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}`
}

function wrapText(content: string, maxWidth: number, fontSize: number): string[] {
  const explicitLines = content.split('\n')
  if (explicitLines.length > 1) {
    return explicitLines
  }

  const charWidth = fontSize * 0.6
  const maxChars = Math.max(1, Math.floor(maxWidth / charWidth) - 2)

  const words = content.split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (testLine.length <= maxChars || currentLine.length === 0) {
      currentLine = testLine
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines.length > 0 ? lines : [content]
}

interface ShapeRendererProps {
  readonly shape: Shape
  readonly isSelected: boolean
}

export function ShapeRenderer({ shape, isSelected }: ShapeRendererProps) {
  const isGroupFullySelected = useDiagramStore(s => {
    if (!shape.groupId) return false
    const groupShapes = s.shapes.filter(sh => sh.groupId === shape.groupId)
    return groupShapes.length > 1 && groupShapes.every(sh => s.selectedShapeIds.has(sh.id))
  })

  if (shape.isHidden) {
    return null
  }
  
  const showHandles = isSelected && !isGroupFullySelected
  const { dimensions, position, style, text, type } = shape
  const { width: w, height: h } = dimensions
  const { x, y } = position

  const commonProps = {
    fill: style.fill,
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    opacity: style.opacity,
    cursor: 'pointer',
  }

  const bounds = {
    x: x - 1,
    y: y - 1,
    width: w + 2,
    height: h + 2,
  }

  if (type === 'icon' && shape.iconName) {
    const Icon = TEMPLATE_ICONS[shape.iconName]
    if (Icon) {
      const iconSize = Math.min(w, h) * 0.85
      const iconColor = style.stroke && style.stroke !== 'none' && style.stroke !== 'transparent' ? style.stroke : INK_COLOR
      return (
        <g transform={`rotate(${shape.rotation || 0}, ${x + w / 2}, ${y + h / 2})`}>
          <rect x={x} y={y} width={w} height={h} fill={style.fill} stroke="none" opacity={0} cursor="pointer" />
          <g transform={`translate(${x + w / 2 - iconSize / 2}, ${y + h / 2 - iconSize / 2})`}>
            <Icon size={iconSize} color={iconColor} />
          </g>
          {showHandles && (
            <>
              <rect {...bounds} fill="none" stroke="#4a90d9" strokeWidth={1} strokeDasharray="4 2" />
              <ResizeHandles shape={shape} />
            </>
          )}
        </g>
      )
    }
  }

  return (
    <g transform={`rotate(${shape.rotation || 0}, ${x + w / 2}, ${y + h / 2})`}>
      {renderShape(type, x, y, w, h, commonProps)}
      {showHandles && (
        <>
          <rect
            {...bounds}
            fill="none"
            stroke="#4a90d9"
            strokeWidth={1}
            strokeDasharray="4 2"
          />
          <ResizeHandles shape={shape} />
        </>
      )}
      {text.content && (
        <WrappedText
          content={text.content}
          x={x + w / 2}
          y={y + h / 2}
          width={w - 12}
          fontSize={text.fontSize}
          fontFamily={text.fontFamily}
          textAlign={text.fontAlign === 'left' ? 'start' : text.fontAlign === 'right' ? 'end' : 'middle'}
          fill={style.stroke}
        />
      )}
    </g>
  )
}

interface CommonProps {
  fill: string
  stroke: string
  strokeWidth: number
  opacity: number
  cursor: string
}

interface WrappedTextProps {
  content: string
  x: number
  y: number
  width: number
  fontSize: number
  fontFamily: string
  textAlign: 'start' | 'middle' | 'end'
  fill: string
}

function WrappedText({ content, x, y, width, fontSize, fontFamily, textAlign, fill }: WrappedTextProps) {
  const lines = wrapText(content, width, fontSize)
  const lineHeight = fontSize * 1.4
  const totalHeight = lines.length * lineHeight
  const startY = y - totalHeight / 2 + fontSize * 0.5

  return (
    <text
      x={x}
      y={startY}
      textAnchor={textAlign}
      fontFamily={fontFamily}
      fontSize={fontSize}
      fill={fill}
      pointerEvents="none"
    >
      {lines.map((line, i) => (
        <tspan
          key={i}
          x={x}
          dy={i === 0 ? 0 : lineHeight}
        >
          {line}
        </tspan>
      ))}
    </text>
  )
}

const hexagonPoints = (x: number, y: number, w: number, h: number): string => {
  const hw = w / 2
  const hh = h / 2
  const cx = x + hw
  const cy = y + hh
  const inset = w * 0.2
  return `${cx - hw + inset},${y} ${cx + hw - inset},${y} ${cx + hw},${cy} ${cx + hw - inset},${y + h} ${cx - hw + inset},${y + h} ${x},${cy}`
}

const parallelogramPoints = (x: number, y: number, w: number, h: number, offset: number): string => {
  return `${x + offset},${y} ${x + w},${y} ${x + w - offset},${y + h} ${x},${y + h}`
}

function renderShape(
  type: Shape['type'],
  x: number,
  y: number,
  w: number,
  h: number,
  props: CommonProps,
): React.ReactElement {
  switch (type) {
    case 'rectangle':
      return (
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={4}
          ry={4}
          {...props}
        />
      )
    case 'ellipse':
      return (
        <ellipse
          cx={x + w / 2}
          cy={y + h / 2}
          rx={w / 2}
          ry={h / 2}
          {...props}
        />
      )
    case 'diamond':
      return (
        <polygon
          points={diamondPoints(x, y, w, h)}
          {...props}
        />
      )
    case 'stadium':
      return (
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={h / 2}
          ry={h / 2}
          {...props}
        />
      )
    case 'hexagon':
      return (
        <polygon
          points={hexagonPoints(x, y, w, h)}
          {...props}
        />
      )
    case 'cylinder':
      return (
        <g>
          <path
            d={`M ${x} ${y + h * 0.2} C ${x} ${y}, ${x + w} ${y}, ${x + w} ${y + h * 0.2} L ${x + w} ${y + h * 0.8} C ${x + w} ${y + h}, ${x} ${y + h}, ${x} ${y + h * 0.8} Z`}
            {...props}
          />
          <ellipse
            cx={x + w / 2}
            cy={y + h * 0.2}
            rx={w / 2}
            ry={h * 0.1}
            fill={props.fill}
            stroke={props.stroke}
            strokeWidth={props.strokeWidth}
            opacity={props.opacity}
          />
        </g>
      )
    case 'parallelogram':
      return (
        <polygon
          points={parallelogramPoints(x, y, w, h, w * 0.25)}
          {...props}
        />
      )
    case 'parallelogramAlt':
      return (
        <polygon
          points={parallelogramPoints(x, y, w, h, -w * 0.25)}
          {...props}
        />
      )
    case 'trapezoid':
      return (
        <polygon
          points={`${x + w * 0.2},${y} ${x + w - w * 0.2},${y} ${x + w},${y + h} ${x},${y + h}`}
          {...props}
        />
      )
    case 'trapezoidAlt':
      return (
        <polygon
          points={`${x},${y} ${x + w},${y} ${x + w - w * 0.2},${y + h} ${x + w * 0.2},${y + h}`}
          {...props}
        />
      )
    case 'subroutine':
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} rx={4} ry={4} {...props} />
          <line x1={x + 8} y1={y} x2={x + 8} y2={y + h} stroke={props.stroke} strokeWidth={props.strokeWidth} />
          <line x1={x + w - 8} y1={y} x2={x + w - 8} y2={y + h} stroke={props.stroke} strokeWidth={props.strokeWidth} />
        </g>
      )
    case 'document':
      return (
        <g>
          <path
            d={`M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h - 12} Q ${x + w},${y + h - 6} ${x + w - 12},${y + h - 6} L ${x},${y + h - 6} Q ${x - 6},${y + h - 6} ${x - 6},${y + h} L ${x - 6},${y} Z`}
            fill={props.fill}
            stroke={props.stroke}
            strokeWidth={props.strokeWidth}
            opacity={props.opacity}
            strokeLinejoin="round"
          />
          <path
            d={`M ${x + w - 12} ${y + h - 6} Q ${x + w - 6},${y + h - 3} ${x + w - 6},${y + h} Q ${x + w - 6},${y + h - 6} ${x + w},${y + h - 6}`}
            fill={props.stroke}
            stroke={props.stroke}
            strokeWidth={1}
            opacity={props.opacity}
            strokeLinejoin="round"
          />
        </g>
      )
    case 'icon':
      return <rect x={x} y={y} width={w} height={h} rx={4} ry={4} {...props} />
    default:
      return (
        <rect x={x} y={y} width={w} height={h} rx={4} ry={4} {...props} />
      )
  }
}
