import type { Canvas } from '../../render/canvas.js'
import { drawTextStack, measureTextStack, tint } from '../shared.js'
import type { ElementSpec, Item, TemplateDefinition } from '../types.js'

const UNIT: ElementSpec = { keyword: 'unit', aliases: ['person', 'team', 'role'], description: 'One box of the chart; indent units under it to create reports', positional: ['title', 'subtitle'] }
UNIT.child = UNIT

interface Entry {
  item: Item
  depth: number
}

function flatten(items: Item[], depth: number): Entry[] {
  return items.flatMap((item) => [{ item, depth }, ...flatten(item.children, depth + 1)])
}

interface BoxOptions {
  x: number
  y: number
  width: number
  color: string
  isProminent: boolean
}

function boxHeight(canvas: Canvas, item: Item, width: number, isProminent: boolean): number {
  return 28 + measureTextStack(canvas, item, { x: 0, y: 0, width: width - 34, titleSize: isProminent ? 17 : 15, subtitleSize: 13, titleLines: 2, subtitleLines: 2 })
}

function drawBox(canvas: Canvas, item: Item, options: BoxOptions): number {
  const height = boxHeight(canvas, item, options.width, options.isProminent)
  canvas.group(item.id, () => {
    const fill = options.isProminent ? tint(canvas, options.color, 0.86) : canvas.theme.colors.surface
    canvas.rect({ x: options.x, y: options.y, width: options.width, height }, { rx: canvas.theme.shape.radius * 0.8, fill })
    canvas.rect({ x: options.x, y: options.y, width: 6, height }, { rx: 3, fill: options.color })
    drawTextStack(canvas, item, { x: options.x + 20, y: options.y + 14, width: options.width - 34, titleSize: options.isProminent ? 17 : 15, subtitleSize: 13, titleLines: 2, subtitleLines: 2 })
  })
  return height
}

export const orgTree: TemplateDefinition = {
  card: {
    id: 'org:tree',
    family: 'org',
    style: 'tree',
    isDefaultStyle: true,
    aliases: ['orgchart', 'organigram', 'org1'],
    name: 'Organisation chart',
    description: 'A top unit, a row of direct reports and, under each of them, their teams as a compact indented column. Indentation in the DSL defines the hierarchy.',
    useCases: ['organisation chart', 'project governance', 'work breakdown structure'],
    items: { min: 1, max: 8, recommended: [1, 1] },
    elements: [UNIT],
    settings: [],
    example: `@org "Programme governance"
  unit "Steering committee" "Monthly decisions"
    unit "Programme director" "Owns the plan"
      unit "PMO" "Planning and reporting"
    unit "Business lead" "Requirements and change"
      unit "Key users" "One per site"
      unit "Training" "Rollout of new ways of working"
    unit "Technical lead" "Architecture and delivery"
      unit "Squad A" "Core platform"
      unit "Squad B" "Integrations"`,
    tags: ['hierarchy', 'organisation', 'tree'],
  },
  render(canvas, input) {
    const hasSingleRoot = input.items.length === 1 && input.items[0]!.children.length > 0
    const root = hasSingleRoot ? input.items[0] : undefined
    const allBranches = root ? root.children : input.items
    const branches = allBranches.slice(0, 8)
    if (allBranches.length > branches.length) {
      canvas.diagnostics.push({ severity: 'warning', line: allBranches[8]!.line, message: `org:tree shows at most 8 direct reports; ${allBranches.length - 8} not shown`, hint: 'Group units under an intermediate unit' })
    }
    const count = branches.length
    const gap = count > 5 ? 14 : 24
    const columnWidth = (canvas.contentWidth - gap * (count - 1)) / count
    const lineColor = canvas.theme.colors.line
    let y = canvas.top
    let busY: number | undefined
    if (root) {
      const width = Math.min(340, canvas.contentWidth)
      const x = canvas.left + (canvas.contentWidth - width) / 2
      const height = drawBox(canvas, root, { x, y, width, color: root.color, isProminent: true })
      busY = y + height + 24
      canvas.line(x + width / 2, y + height, x + width / 2, busY, { stroke: lineColor, 'stroke-width': 2 })
      y = busY + 24
    }
    if (busY !== undefined && count > 1) {
      canvas.line(canvas.left + columnWidth / 2, busY, canvas.left + columnWidth * (count - 0.5) + gap * (count - 1), busY, { stroke: lineColor, 'stroke-width': 2 })
    }
    let bottom = y
    branches.forEach((branch, column) => {
      const color = branch.hasExplicitColor ? branch.color : canvas.theme.accent(column)
      const x = canvas.left + column * (columnWidth + gap)
      if (busY !== undefined) canvas.line(x + columnWidth / 2, busY, x + columnWidth / 2, y, { stroke: lineColor, 'stroke-width': 2 })
      const height = drawBox(canvas, branch, { x, y, width: columnWidth, color, isProminent: true })
      let cursor = y + height + 14
      const indentStep = Math.min(18, columnWidth * 0.08)
      for (const entry of flatten(branch.children, 1)) {
        const entryX = x + indentStep * entry.depth
        const entryWidth = columnWidth - indentStep * entry.depth
        const entryColor = entry.item.hasExplicitColor ? entry.item.color : color
        canvas.line(entryX - indentStep / 2, cursor - 14, entryX - indentStep / 2, cursor + 18, { stroke: lineColor, 'stroke-width': 1.5 })
        canvas.line(entryX - indentStep / 2, cursor + 18, entryX, cursor + 18, { stroke: lineColor, 'stroke-width': 1.5 })
        cursor += drawBox(canvas, entry.item, { x: entryX, y: cursor, width: entryWidth, color: entryColor, isProminent: false }) + 10
      }
      bottom = Math.max(bottom, cursor - 10)
    })
    canvas.extendHeight(bottom)
  },
}
