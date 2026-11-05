import type { Canvas } from '../../render/canvas.js'
import { tint } from '../shared.js'
import type { Item, TemplateDefinition } from '../types.js'

interface Quadrant {
  keyword: string
  plural: string
  letter: string
  label: string
  color(canvas: Canvas): string
}

const QUADRANTS: Quadrant[] = [
  { keyword: 'strength', plural: 'strengths', letter: 'S', label: 'Strengths', color: (canvas) => canvas.theme.colors.positive },
  { keyword: 'weakness', plural: 'weaknesses', letter: 'W', label: 'Weaknesses', color: (canvas) => canvas.theme.colors.warning },
  { keyword: 'opportunity', plural: 'opportunities', letter: 'O', label: 'Opportunities', color: (canvas) => canvas.theme.accent(0) },
  { keyword: 'threat', plural: 'threats', letter: 'T', label: 'Threats', color: (canvas) => canvas.theme.colors.negative },
]

const ENTRY_SIZE = 15

export const matrixSwot: TemplateDefinition = {
  card: {
    id: 'matrix:swot',
    family: 'matrix',
    style: 'swot',
    isDefaultStyle: false,
    aliases: ['swot'],
    name: 'SWOT',
    description: 'Strengths, weaknesses, opportunities and threats in four boxes. Write one line per point; each keyword sends the point to its box. labels renames the boxes.',
    useCases: ['strategic analysis', 'project review', 'market entry'],
    items: { min: 1, max: 40, recommended: [8, 16] },
    elements: QUADRANTS.map((quadrant) => ({ keyword: quadrant.keyword, aliases: [quadrant.plural, quadrant.letter.toLowerCase()], description: `A point in ${quadrant.label}`, positional: ['title'] })),
    settings: [{ keyword: 'labels', description: 'Box titles in order S, W, O, T (to translate them)', arguments: ['strengths', 'weaknesses', 'opportunities', 'threats'] }],
    example: `@matrix style:swot "Opening a Lyon office"
  strength "Two clients already in the region"
  strength "Senior team ready to relocate"
  weakness "No local brand awareness"
  opportunity "Public tenders in 2027"
  opportunity "Partnership with a local school"
  threat "Two competitors hiring locally"`,
    tags: ['swot', 'analysis', 'strategy'],
  },
  render(canvas, input) {
    const labels = input.settings.labels ?? []
    const gap = 16
    const boxWidth = (canvas.contentWidth - gap) / 2
    const padding = 20
    const headerHeight = 54
    const entryWidth = boxWidth - padding * 2 - 18
    const groups = QUADRANTS.map((quadrant) => input.items.filter((item) => item.keyword === quadrant.keyword))
    const entryHeight = (item: Item): number => canvas.measure({ text: item.title, x: 0, y: 0, width: entryWidth, size: ENTRY_SIZE, minSize: 12, maxLines: 3 }).height
    const listHeight = (entries: Item[]): number => entries.reduce((sum, item) => sum + entryHeight(item) + 8, 0)
    const rowHeights = [0, 1].map((row) => Math.max(110, padding * 2 + headerHeight + Math.max(listHeight(groups[row * 2]!), listHeight(groups[row * 2 + 1]!))))
    QUADRANTS.forEach((quadrant, index) => {
      const column = index % 2
      const row = Math.floor(index / 2)
      const x = canvas.left + column * (boxWidth + gap)
      const y = canvas.top + (row === 0 ? 0 : rowHeights[0]! + gap)
      const height = rowHeights[row]!
      const color = quadrant.color(canvas)
      canvas.rect({ x, y, width: boxWidth, height }, { rx: canvas.theme.shape.radius, fill: tint(canvas, color, 0.88) })
      canvas.circle(x + padding + 20, y + padding + 20, 20, { fill: color })
      canvas.text({ text: quadrant.letter, x: x + padding, y: y + padding, width: 40, height: 40, size: 20, weight: 800, align: 'middle', valign: 'middle', maxLines: 1, color: canvas.theme.textOn(color), font: 'heading', owner: `quadrant-${quadrant.keyword}` })
      canvas.text({ text: labels[index] ?? quadrant.label, x: x + padding + 54, y: y + padding, width: boxWidth - padding * 2 - 54, height: 40, size: 20, minSize: 14, weight: 800, valign: 'middle', maxLines: 1, color: canvas.theme.ink(color, tint(canvas, color, 0.88)), font: 'heading', owner: `quadrant-${quadrant.keyword}` })
      let cursor = y + padding + headerHeight
      for (const item of groups[index]!) {
        canvas.group(item.id, () => {
          canvas.circle(x + padding + 5, cursor + 10, 4, { fill: color })
          const box = canvas.text({ text: item.title, x: x + padding + 18, y: cursor, width: entryWidth, size: ENTRY_SIZE, minSize: 12, maxLines: 3 })
          cursor = box.y + box.height + 8
        })
      }
    })
    canvas.extendHeight(canvas.top + rowHeights[0]! + gap + rowHeights[1]!)
  },
}
