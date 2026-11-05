import { tint } from '../shared.js'
import type { Item, TemplateDefinition } from '../types.js'
import { collectPeriods, drawPeriodHeader, periodIndex, warnUnknownPeriod } from './periods.js'

const CARD_GAP = 8
const LANE_PADDING = 12

export const timelineSwimlanes: TemplateDefinition = {
  card: {
    id: 'timeline:swimlanes',
    family: 'timeline',
    style: 'swimlanes',
    isDefaultStyle: false,
    aliases: ['roadmap-lanes', 'productroadmap'],
    name: 'Swimlane roadmap',
    description: 'One lane per team or workstream, periods as columns, milestones as cards in the right cell. Indent milestones under their lane.',
    useCases: ['product roadmap by team', 'programme plan by workstream', 'portfolio view'],
    items: { min: 1, max: 8, recommended: [2, 5] },
    elements: [{
      keyword: 'lane',
      aliases: ['team', 'stream', 'workstream'],
      description: 'One lane; its milestones are indented below it',
      positional: ['title', 'subtitle'],
      child: { keyword: 'milestone', aliases: ['item', 'event'], description: 'A milestone in a period of the lane (date: one of the periods)', positional: ['title', 'subtitle'] },
    }],
    settings: [{ keyword: 'periods', description: 'Column labels in order; milestones refer to them with date:', arguments: ['period', '…'] }],
    example: `@timeline style:swimlanes "Roadmap 2027"
  periods "Q1" "Q2" "Q3" "Q4"
  lane "Product"
    milestone "Discovery" "Interviews" date:Q1
    milestone "Beta" "Ten customers" date:Q3
  lane "Platform"
    milestone "New API" date:Q2
    milestone "Scale-out" date:Q4
  lane "Sales"
    milestone "Pilot offer" date:Q2
    milestone "Launch" date:Q4`,
    tags: ['roadmap', 'lanes', 'quarters'],
  },
  render(canvas, input) {
    const lanes = input.items
    const periods = collectPeriods(input.settings.periods, lanes.flatMap((lane) => lane.children.map((child) => child.date)))
    const labelWidth = Math.min(200, canvas.contentWidth * 0.2)
    const gridLeft = canvas.left + labelWidth + 12
    const columnWidth = (canvas.left + canvas.contentWidth - gridLeft) / periods.length
    const cardWidth = columnWidth - 12
    const cardText = (item: Item): number =>
      canvas.measure({ text: item.title, x: 0, y: 0, width: cardWidth - 20, size: 14, minSize: 11, weight: 700, maxLines: 2 }).height +
      (item.subtitle ? 2 + canvas.measure({ text: item.subtitle, x: 0, y: 0, width: cardWidth - 20, size: 12, maxLines: 2 }).height : 0)
    let y = drawPeriodHeader(canvas, periods, gridLeft, columnWidth, canvas.top) + 10
    lanes.forEach((lane, laneIndex) => {
      const cells: Item[][] = periods.map(() => [])
      for (const milestone of lane.children) {
        const index = periodIndex(periods, milestone.date)
        if (index === undefined) warnUnknownPeriod(canvas, milestone, milestone.date, periods)
        cells[index ?? 0]!.push(milestone)
      }
      const cellHeights = cells.map((cell) => cell.reduce((sum, item) => sum + cardText(item) + 16 + CARD_GAP, 0) - (cell.length > 0 ? CARD_GAP : 0))
      const laneLabelHeight = canvas.measure({ text: lane.title, x: 0, y: 0, width: labelWidth - 24, size: 16, minSize: 12, weight: 800, maxLines: 2 }).height + (lane.subtitle ? 18 : 0)
      const laneHeight = Math.max(64, laneLabelHeight + LANE_PADDING * 2, ...cellHeights.map((height) => height + LANE_PADDING * 2))
      canvas.group(lane.id, () => {
        canvas.rect({ x: canvas.left, y, width: canvas.contentWidth, height: laneHeight }, { rx: canvas.theme.shape.radius, fill: laneIndex % 2 === 0 ? canvas.theme.colors.surface : canvas.theme.colors.background })
        canvas.rect({ x: canvas.left, y: y + 10, width: 5, height: laneHeight - 20 }, { rx: 2.5, fill: lane.color })
        const label = canvas.text({ text: lane.title, x: canvas.left + 18, y: y + LANE_PADDING, width: labelWidth - 24, size: 16, minSize: 12, weight: 800, maxLines: 2, color: canvas.theme.ink(lane.color), font: 'heading' })
        if (lane.subtitle) canvas.text({ text: lane.subtitle, x: canvas.left + 18, y: label.y + label.height + 2, width: labelWidth - 24, size: 12, maxLines: 1, color: canvas.theme.colors.textMuted })
        cells.forEach((cell, column) => {
          let cardTop = y + LANE_PADDING
          const x = gridLeft + column * columnWidth + 6
          for (const milestone of cell) {
            canvas.group(milestone.id, () => {
              const color = milestone.hasExplicitColor ? milestone.color : lane.color
              const height = cardText(milestone) + 16
              canvas.rect({ x, y: cardTop, width: cardWidth, height }, { rx: Math.min(8, canvas.theme.shape.radius), fill: tint(canvas, color, 0.82), stroke: color, 'stroke-width': 1.2 })
              const title = canvas.text({ text: milestone.title, x: x + 10, y: cardTop + 8, width: cardWidth - 20, size: 14, minSize: 11, weight: 700, maxLines: 2 })
              if (milestone.subtitle) canvas.text({ text: milestone.subtitle, x: x + 10, y: title.y + title.height + 2, width: cardWidth - 20, size: 12, maxLines: 2, color: canvas.theme.colors.textMuted })
              cardTop += height + CARD_GAP
            })
          }
        })
      })
      y += laneHeight + 8
    })
    canvas.extendHeight(y - 8)
  },
}
