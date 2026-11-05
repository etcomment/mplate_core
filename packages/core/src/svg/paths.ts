import { formatNumber } from './node.js'

export interface Point {
  x: number
  y: number
}

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

const n = formatNumber

export function polygonPath(points: Point[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${n(point.x)} ${n(point.y)}`).join(' ') + ' Z'
}

export function polarPoint(center: Point, radius: number, angleDegrees: number): Point {
  const radians = ((angleDegrees - 90) * Math.PI) / 180
  return { x: center.x + radius * Math.cos(radians), y: center.y + radius * Math.sin(radians) }
}

export function ringSegmentPath(center: Point, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number): string {
  const sweep = endAngle - startAngle
  if (sweep >= 359.99) {
    const outerTop = polarPoint(center, outerRadius, 0)
    const outerBottom = polarPoint(center, outerRadius, 180)
    const innerTop = polarPoint(center, innerRadius, 0)
    const innerBottom = polarPoint(center, innerRadius, 180)
    return [
      `M${n(outerTop.x)} ${n(outerTop.y)}`,
      `A${n(outerRadius)} ${n(outerRadius)} 0 1 1 ${n(outerBottom.x)} ${n(outerBottom.y)}`,
      `A${n(outerRadius)} ${n(outerRadius)} 0 1 1 ${n(outerTop.x)} ${n(outerTop.y)}`,
      `M${n(innerTop.x)} ${n(innerTop.y)}`,
      `A${n(innerRadius)} ${n(innerRadius)} 0 1 0 ${n(innerBottom.x)} ${n(innerBottom.y)}`,
      `A${n(innerRadius)} ${n(innerRadius)} 0 1 0 ${n(innerTop.x)} ${n(innerTop.y)} Z`,
    ].join(' ')
  }
  const largeArc = sweep > 180 ? 1 : 0
  const outerStart = polarPoint(center, outerRadius, startAngle)
  const outerEnd = polarPoint(center, outerRadius, endAngle)
  const innerEnd = polarPoint(center, innerRadius, endAngle)
  const innerStart = polarPoint(center, innerRadius, startAngle)
  return [
    `M${n(outerStart.x)} ${n(outerStart.y)}`,
    `A${n(outerRadius)} ${n(outerRadius)} 0 ${largeArc} 1 ${n(outerEnd.x)} ${n(outerEnd.y)}`,
    `L${n(innerEnd.x)} ${n(innerEnd.y)}`,
    `A${n(innerRadius)} ${n(innerRadius)} 0 ${largeArc} 0 ${n(innerStart.x)} ${n(innerStart.y)} Z`,
  ].join(' ')
}

export function chevronPath(box: Box, notch: number, isFirst: boolean): string {
  const { x, y, width, height } = box
  const middle = y + height / 2
  const points: Point[] = [
    { x, y },
    { x: x + width - notch, y },
    { x: x + width, y: middle },
    { x: x + width - notch, y: y + height },
    { x, y: y + height },
  ]
  if (!isFirst) points.push({ x: x + notch, y: middle })
  return polygonPath(points)
}

export function roundedTopPath(box: Box, radius: number): string {
  const { x, y, width, height } = box
  const r = Math.min(radius, width / 2, height)
  return `M${n(x)} ${n(y + height)} L${n(x)} ${n(y + r)} Q${n(x)} ${n(y)} ${n(x + r)} ${n(y)} L${n(x + width - r)} ${n(y)} Q${n(x + width)} ${n(y)} ${n(x + width)} ${n(y + r)} L${n(x + width)} ${n(y + height)} Z`
}

export function boxesOverlap(first: Box, second: Box, tolerance: number = 0.5): boolean {
  return (
    first.x + tolerance < second.x + second.width &&
    second.x + tolerance < first.x + first.width &&
    first.y + tolerance < second.y + second.height &&
    second.y + tolerance < first.y + first.height
  )
}
