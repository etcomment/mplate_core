export type ShapeType =
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'stadium'
  | 'hexagon'
  | 'cylinder'
  | 'parallelogram'
  | 'parallelogramAlt'
  | 'trapezoid'
  | 'trapezoidAlt'
  | 'document'
  | 'subroutine'
  | 'icon'

export type ArrowStyle = 'solid' | 'dashed' | 'dotted' | 'thick'
export type ArrowHead = 'filled' | 'open' | 'none' | 'cross' | 'circle' | 'diamond'
export type ArrowDirection = 'forward' | 'backward' | 'both' | 'none'

export interface ConnectionType {
  readonly id: string
  readonly sourceId: string
  readonly targetId: string
  readonly label?: string
  readonly arrowStyle?: ArrowStyle
  readonly arrowHead?: ArrowHead
  readonly arrowDirection?: ArrowDirection
  readonly lineColor?: string
}

export interface Position {
  readonly x: number
  readonly y: number
}

export interface Dimensions {
  readonly width: number
  readonly height: number
}

export interface ShapeStyle {
  fill: string
  stroke: string
  strokeWidth: number
  opacity: number
}

export interface ShapeText {
  content: string
  fontSize: number
  fontFamily: string
  fontAlign: 'left' | 'center' | 'right'
}

export interface Group {
  readonly id: string
  readonly shapeIds: readonly string[]
}

export interface Shape {
  readonly id: string
  readonly type: ShapeType
  readonly position: Position
  readonly dimensions: Dimensions
  readonly style: ShapeStyle
  readonly text: ShapeText
  readonly iconName?: string
  readonly groupId?: string
  readonly isHidden?: boolean
  readonly isLocked?: boolean
  readonly rotation?: number
}

export function createDefaultStyle(): ShapeStyle {
  return {
    fill: '#ffffff',
    stroke: '#333333',
    strokeWidth: 2,
    opacity: 1,
  }
}

export function createDefaultText(): ShapeText {
  return {
    content: '',
    fontSize: 14,
    fontFamily: 'Arial, sans-serif',
    fontAlign: 'center',
  }
}
