import type { Shape } from './model/Shape'

export interface EdgePoints {
  startX: number
  startY: number
  endX: number
  endY: number
}

export function computeEdgePoints(source: Shape, target: Shape): EdgePoints {
  const sCenterX = source.position.x + source.dimensions.width / 2
  const sCenterY = source.position.y + source.dimensions.height / 2
  const tCenterX = target.position.x + target.dimensions.width / 2
  const tCenterY = target.position.y + target.dimensions.height / 2

  const dx = tCenterX - sCenterX
  const dy = tCenterY - sCenterY

  let startX: number, startY: number, endX: number, endY: number

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) {
      startX = source.position.x + source.dimensions.width
      startY = sCenterY
      endX = target.position.x
      endY = tCenterY
    } else {
      startX = source.position.x
      startY = sCenterY
      endX = target.position.x + target.dimensions.width
      endY = tCenterY
    }
  } else {
    if (dy > 0) {
      startX = sCenterX
      startY = source.position.y + source.dimensions.height
      endX = tCenterX
      endY = target.position.y
    } else {
      startX = sCenterX
      startY = source.position.y
      endX = tCenterX
      endY = target.position.y + target.dimensions.height
    }
  }

  return { startX, startY, endX, endY }
}
