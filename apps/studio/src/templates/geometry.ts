import type { Rect } from './store'

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

export function parentIdOf(id: string, known: Record<string, unknown>): string | undefined {
  const parent = id.replace(/-[A-Za-z]+-\d+$/, '')
  return parent !== id && parent in known ? parent : undefined
}

export function isTopLevelId(id: string, known: Record<string, unknown>): boolean {
  return parentIdOf(id, known) === undefined
}

export function elementTransform(natural: Rect | undefined, position: Rect | undefined, isAdjusted: boolean, rotation: number | undefined): string | undefined {
  const parts: string[] = []
  const target = isAdjusted && position ? position : natural
  if (rotation && target) parts.push(`rotate(${round(rotation)} ${round(target.x + target.width / 2)} ${round(target.y + target.height / 2)})`)
  if (isAdjusted && natural && position) {
    const scaleX = natural.width > 0 ? position.width / natural.width : 1
    const scaleY = natural.height > 0 ? position.height / natural.height : 1
    const isMoved = Math.abs(position.x - natural.x) > 0.01 || Math.abs(position.y - natural.y) > 0.01
    const isScaled = Math.abs(scaleX - 1) > 0.0001 || Math.abs(scaleY - 1) > 0.0001
    if (isScaled) parts.push(`translate(${round(position.x)} ${round(position.y)}) scale(${round(scaleX)} ${round(scaleY)}) translate(${round(-natural.x)} ${round(-natural.y)})`)
    else if (isMoved) parts.push(`translate(${round(position.x - natural.x)} ${round(position.y - natural.y)})`)
  }
  return parts.length > 0 ? parts.join(' ') : undefined
}

export function projectRect(rect: Rect, parentNatural: Rect | undefined, parentPosition: Rect | undefined): Rect {
  if (!parentNatural || !parentPosition) return rect
  const scaleX = parentNatural.width > 0 ? parentPosition.width / parentNatural.width : 1
  const scaleY = parentNatural.height > 0 ? parentPosition.height / parentNatural.height : 1
  return {
    x: parentPosition.x + (rect.x - parentNatural.x) * scaleX,
    y: parentPosition.y + (rect.y - parentNatural.y) * scaleY,
    width: rect.width * scaleX,
    height: rect.height * scaleY,
  }
}

export function boundingRect(rects: Rect[]): Rect | undefined {
  if (rects.length === 0) return undefined
  const minX = Math.min(...rects.map(rect => rect.x))
  const minY = Math.min(...rects.map(rect => rect.y))
  const maxX = Math.max(...rects.map(rect => rect.x + rect.width))
  const maxY = Math.max(...rects.map(rect => rect.y + rect.height))
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}
