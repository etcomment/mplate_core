import { useDiagramStore } from '../store/diagramStore'
import { snapToGrid } from '../core/grid'
import { Panel } from '../ui/Panel'
import { theme } from '../lib/theme'
import type { ShapeType } from '../core/model/Shape'

interface ShapeTemplate {
  readonly type: ShapeType
  readonly label: string
}

const SHAPES: readonly ShapeTemplate[] = [
  { type: 'rectangle', label: 'Rectangle' },
  { type: 'stadium', label: 'Stadium' },
  { type: 'ellipse', label: 'Ellipse' },
  { type: 'diamond', label: 'Diamond' },
  { type: 'hexagon', label: 'Hexagon' },
  { type: 'cylinder', label: 'Cylinder' },
  { type: 'parallelogram', label: 'Parallelogram' },
  { type: 'subroutine', label: 'Subroutine' },
]

export function ShapeLibrary() {
  const addShape = useDiagramStore(s => s.addShape)

  const handleAddShape = (type: ShapeType) => {
    addShape(type, { x: snapToGrid(100), y: snapToGrid(100) }, { width: 120, height: 80 })
  }

  return (
    <Panel title="Shapes">
      <div style={styles.grid}>
        {SHAPES.map((shape) => (
          <button
            key={shape.type}
            style={styles.shapeButton}
            onClick={() => handleAddShape(shape.type)}
            onDragStart={(e) => {
              e.dataTransfer.setData('shapeType', shape.type)
            }}
            draggable
          >
            <ShapeIcon type={shape.type} />
            <span style={styles.label}>{shape.label}</span>
          </button>
        ))}
      </div>
    </Panel>
  )
}

function ShapeIcon({ type }: { readonly type: ShapeType }) {
  const size = 32
  const half = size / 2
  switch (type) {
    case 'rectangle':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <rect x={2} y={8} width={size - 4} height={size - 16} rx={3} fill="white" stroke="#999" strokeWidth={1.5} />
        </svg>
      )
    case 'ellipse':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <ellipse cx={half} cy={half} rx={half - 4} ry={half - 6} fill="white" stroke="#999" strokeWidth={1.5} />
        </svg>
      )
    case 'diamond':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon
            points={`${half},4 ${size - 4},${half} ${half},${size - 4} 4,${half}`}
            fill="white"
            stroke="#999"
            strokeWidth={1.5}
          />
        </svg>
      )
    case 'stadium':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <rect x={4} y={8} width={size - 8} height={size - 16} rx={12} ry={12} fill="white" stroke="#999" strokeWidth={1.5} />
        </svg>
      )
    case 'hexagon':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon points={`${half},4 ${size - 6},${half} ${half},${size - 4} 6,${half}`} fill="white" stroke="#999" strokeWidth={1.5} />
        </svg>
      )
    case 'cylinder':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <path d={`M 6 ${half - 4} C 6 8, ${size - 6} 8, ${size - 6} ${half - 4} L ${size - 6} ${half + 4} C ${size - 6} ${size - 8}, 6 ${size - 8}, 6 ${half + 4} Z`} fill="white" stroke="#999" strokeWidth={1.5} />
          <ellipse cx={half} cy={half - 4} rx={half - 6} ry={4} fill="white" stroke="#999" strokeWidth={1.5} />
        </svg>
      )
    case 'parallelogram':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon points={`10,8 ${size - 4},8 ${size - 10},${size - 8} 4,${size - 8}`} fill="white" stroke="#999" strokeWidth={1.5} />
        </svg>
      )
    case 'subroutine':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <rect x={4} y={8} width={size - 8} height={size - 16} rx={3} fill="white" stroke="#999" strokeWidth={1.5} />
          <line x1={8} y1={8} x2={8} y2={size - 8} stroke="#999" strokeWidth={1.5} />
          <line x1={size - 8} y1={8} x2={size - 8} y2={size - 8} stroke="#999" strokeWidth={1.5} />
        </svg>
      )
    default:
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <rect x={4} y={8} width={size - 8} height={size - 16} rx={3} fill="white" stroke="#999" strokeWidth={1.5} />
        </svg>
      )
  }
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))',
    gap: theme.spacing.xs,
  },
  shapeButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    padding: theme.spacing.xs,
    border: `1px solid ${theme.color.border}`,
    borderRadius: theme.radius.sm,
    background: theme.color.bgSurfaceHover,
    cursor: 'grab',
    transition: theme.transition.fast,
  },
  label: {
    fontSize: theme.font.sizeXs,
    color: theme.color.textSecondary,
  },
}
