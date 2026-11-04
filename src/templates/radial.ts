import type { Canvas } from '../render/canvas.js'
import { drawTextStack, measureTextStack, type StackOptions } from './shared.js'
import type { Item } from './types.js'

interface LabelPlacement {
  x: number
  y: number
  align: 'start' | 'middle' | 'end'
}

function labelPlacement(anchorX: number, anchorY: number, centerX: number, centerY: number, width: number, height: number): LabelPlacement {
  if (anchorX > centerX + 12) return { x: anchorX, y: anchorY - height / 2, align: 'start' }
  if (anchorX < centerX - 12) return { x: anchorX - width, y: anchorY - height / 2, align: 'end' }
  return { x: anchorX - width / 2, y: anchorY < centerY ? anchorY - height : anchorY, align: 'middle' }
}

export function drawRadialLabel(canvas: Canvas, item: Item, anchorX: number, anchorY: number, centerX: number, centerY: number, stack: Omit<StackOptions, 'x' | 'y' | 'align'>): { top: number; bottom: number } {
  const height = measureTextStack(canvas, item, { ...stack, x: 0, y: 0 })
  const placement = labelPlacement(anchorX, anchorY, centerX, centerY, stack.width, height)
  drawTextStack(canvas, item, { ...stack, x: placement.x, y: placement.y, align: placement.align })
  return { top: placement.y, bottom: placement.y + height }
}

export function radialLabelHeight(canvas: Canvas, items: Item[], stack: Omit<StackOptions, 'x' | 'y' | 'align'>): number {
  return Math.max(0, ...items.map((item) => measureTextStack(canvas, item, { ...stack, x: 0, y: 0 })))
}
