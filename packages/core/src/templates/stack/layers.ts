import type { Canvas } from '../../render/canvas.js'
import { measureText } from '../../text/metrics.js'
import { tint } from '../shared.js'
import type { Item, TemplateDefinition } from '../types.js'

const CHIP_HEIGHT = 34
const CHIP_GAP = 10
const PADDING = 14

interface ChipPlacement {
  item: Item
  x: number
  y: number
  width: number
}

function placeChips(chips: Item[], left: number, width: number): { placements: ChipPlacement[]; height: number } {
  const placements: ChipPlacement[] = []
  let x = left
  let y = 0
  for (const chip of chips) {
    const chipWidth = Math.min(width, Math.max(90, measureText(chip.title, 14, 600) + (chip.icon ? 50 : 28)))
    if (x > left && x + chipWidth > left + width) {
      x = left
      y += CHIP_HEIGHT + CHIP_GAP
    }
    placements.push({ item: chip, x, y, width: chipWidth })
    x += chipWidth + CHIP_GAP
  }
  return { placements, height: chips.length > 0 ? y + CHIP_HEIGHT : 0 }
}

function drawChip(canvas: Canvas, placement: ChipPlacement, top: number, color: string): void {
  const { item, x, width } = placement
  const y = top + placement.y
  canvas.group(item.id, () => {
    const chipColor = item.hasExplicitColor ? item.color : color
    canvas.rect({ x, y, width, height: CHIP_HEIGHT }, { rx: Math.min(8, canvas.theme.shape.radius), fill: canvas.theme.colors.background, stroke: tint(canvas, chipColor, 0.45), 'stroke-width': 1.5 })
    let textLeft = x + 12
    if (item.icon && canvas.icon(item.icon, x + 22, y + CHIP_HEIGHT / 2, 18, canvas.theme.ink(chipColor, canvas.theme.colors.background))) textLeft = x + 38
    canvas.text({ text: item.title, x: textLeft, y, width: x + width - 10 - textLeft, height: CHIP_HEIGHT, size: 14, minSize: 10, weight: 600, valign: 'middle', maxLines: 1 })
  })
}

export const stackLayers: TemplateDefinition = {
  card: {
    id: 'stack:layers',
    family: 'stack',
    style: 'layers',
    isDefaultStyle: true,
    aliases: ['architecture', 'layers', 'stack1'],
    name: 'Layered stack',
    description: 'Horizontal layers from top to bottom, each with its components as chips that wrap onto several lines. Indent components under their layer.',
    useCases: ['application architecture', 'capability map', 'technology stack'],
    items: { min: 1, max: 10, recommended: [3, 6] },
    elements: [{
      keyword: 'layer',
      aliases: ['tier', 'level'],
      description: 'One layer; its components are indented below it',
      positional: ['title', 'subtitle'],
      child: { keyword: 'component', aliases: ['item', 'block', 'app'], description: 'One component of the layer', positional: ['title'] },
    }],
    settings: [],
    example: `@stack "Target architecture"
  layer "Channels" "Where users meet us"
    component "Website" icon:globe
    component "Mobile app" icon:smartphone
    component "Partner API" icon:link
  layer "Services"
    component "Orders" icon:shopping-cart
    component "Billing" icon:credit-card
    component "Identity" icon:lock
  layer "Data" "Single source of truth"
    component "Warehouse" icon:database
    component "Event bus" icon:share-2`,
    tags: ['architecture', 'layers', 'it'],
  },
  render(canvas, input) {
    const labelWidth = Math.min(230, canvas.contentWidth * 0.22)
    const chipsLeft = canvas.left + labelWidth + 16
    const chipsWidth = canvas.left + canvas.contentWidth - chipsLeft - PADDING
    let y = canvas.top
    input.items.forEach((layer) => {
      const { placements, height: chipsHeight } = placeChips(layer.children, chipsLeft, chipsWidth)
      const title = canvas.measure({ text: layer.title, x: 0, y: 0, width: labelWidth - 30, size: 17, minSize: 12, weight: 800, maxLines: 2 }).height
      const subtitle = layer.subtitle ? canvas.measure({ text: layer.subtitle, x: 0, y: 0, width: labelWidth - 30, size: 13, maxLines: 2 }).height + 2 : 0
      const height = Math.max(64, title + subtitle + PADDING * 2, chipsHeight + PADDING * 2)
      canvas.group(layer.id, () => {
        canvas.rect({ x: canvas.left, y, width: canvas.contentWidth, height }, { rx: canvas.theme.shape.radius, fill: tint(canvas, layer.color, 0.86) })
        canvas.rect({ x: canvas.left, y, width: labelWidth, height }, { rx: canvas.theme.shape.radius, fill: layer.color })
        const foreground = canvas.theme.textOn(layer.color)
        const labelTop = y + (height - title - subtitle) / 2
        const box = canvas.text({ text: layer.title, x: canvas.left + 16, y: labelTop, width: labelWidth - 30, size: 17, minSize: 12, weight: 800, maxLines: 2, color: foreground, font: 'heading' })
        if (layer.subtitle) canvas.text({ text: layer.subtitle, x: canvas.left + 16, y: box.y + box.height + 2, width: labelWidth - 30, size: 13, maxLines: 2, color: foreground })
        const chipsTop = y + (height - chipsHeight) / 2
        for (const placement of placements) drawChip(canvas, placement, chipsTop, layer.color)
      })
      y += height + 10
    })
    canvas.extendHeight(y - 10)
  },
}
