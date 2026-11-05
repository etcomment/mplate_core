import { polygonPath } from '../../svg/paths.js'
import { tint } from '../shared.js'
import type { TemplateDefinition } from '../types.js'
import { collectPeriods, drawPeriodHeader, periodIndex, warnUnknownPeriod } from './periods.js'

const ROW_HEIGHT = 38

export const timelineGantt: TemplateDefinition = {
  card: {
    id: 'timeline:gantt',
    family: 'timeline',
    style: 'gantt',
    isDefaultStyle: false,
    aliases: ['gantt'],
    name: 'Gantt chart',
    description: 'Tasks as bars across periods, from: and to: name the first and last period. pct: shows progress; the flag milestone draws a diamond.',
    useCases: ['project schedule', 'release plan', 'phasing of a programme'],
    items: { min: 1, max: 30, recommended: [4, 15] },
    elements: [{ keyword: 'task', aliases: ['bar', 'activity'], description: 'One task from a period to a period (from:, to:)', positional: ['title'], flags: ['milestone'], attributes: ['from', 'to'] }],
    settings: [{ keyword: 'periods', description: 'Column labels in order (months, sprints, quarters)', arguments: ['period', '…'] }],
    example: `@timeline style:gantt "Delivery plan"
  periods "Jan" "Feb" "Mar" "Apr" "May" "Jun"
  task "Scoping" from:Jan to:Jan pct:100
  task "Design" from:Feb to:Mar pct:60
  task "Build" from:Mar to:May pct:10
  task "Training" from:May to:Jun
  task "Go live" from:Jun milestone`,
    tags: ['schedule', 'bars', 'planning'],
  },
  render(canvas, input) {
    const tasks = input.items
    const periods = collectPeriods(input.settings.periods, tasks.flatMap((task) => [task.attributes.from ?? task.date, task.attributes.to]))
    const labelWidth = Math.min(240, canvas.contentWidth * 0.24)
    const gridLeft = canvas.left + labelWidth + 12
    const columnWidth = (canvas.left + canvas.contentWidth - gridLeft) / periods.length
    const headerBottom = drawPeriodHeader(canvas, periods, gridLeft, columnWidth, canvas.top)
    const top = headerBottom + 8
    const gridBottom = top + tasks.length * ROW_HEIGHT
    periods.forEach((_, index) => {
      if (index > 0) canvas.line(gridLeft + index * columnWidth, top, gridLeft + index * columnWidth, gridBottom, { stroke: canvas.theme.colors.line, 'stroke-width': 1, 'stroke-dasharray': '2 4' })
    })
    tasks.forEach((task, row) => {
      canvas.group(task.id, () => {
        const y = top + row * ROW_HEIGHT
        if (row % 2 === 0) canvas.rect({ x: canvas.left, y, width: canvas.contentWidth, height: ROW_HEIGHT }, { fill: canvas.theme.colors.surface })
        canvas.text({ text: task.title, x: canvas.left + 10, y, width: labelWidth - 10, height: ROW_HEIGHT, size: 14, minSize: 10, weight: 600, valign: 'middle', maxLines: 1 })
        const fromLabel = task.attributes.from ?? task.date
        const fromIndex = periodIndex(periods, fromLabel)
        if (fromIndex === undefined) warnUnknownPeriod(canvas, task, fromLabel, periods)
        const start = fromIndex ?? 0
        const toIndex = periodIndex(periods, task.attributes.to)
        const end = Math.max(start, toIndex ?? start)
        const middleY = y + ROW_HEIGHT / 2
        if (task.flags.includes('milestone')) {
          const centerX = gridLeft + (start + 0.5) * columnWidth
          canvas.path(polygonPath([{ x: centerX, y: middleY - 11 }, { x: centerX + 11, y: middleY }, { x: centerX, y: middleY + 11 }, { x: centerX - 11, y: middleY }]), { fill: task.color })
          return
        }
        const x = gridLeft + start * columnWidth + 4
        const width = (end - start + 1) * columnWidth - 8
        const barHeight = ROW_HEIGHT - 14
        canvas.rect({ x, y: middleY - barHeight / 2, width, height: barHeight }, { rx: Math.min(6, barHeight / 2), fill: tint(canvas, task.color, 0.6) })
        if (task.percent !== undefined) {
          const ratio = Math.min(1, Math.max(0, task.percent / 100))
          canvas.rect({ x, y: middleY - barHeight / 2, width: width * ratio, height: barHeight }, { rx: Math.min(6, barHeight / 2), fill: task.color })
          if (width > 54) canvas.text({ text: `${Math.round(task.percent)}%`, x: x + 6, y: middleY - barHeight / 2, width: width - 12, height: barHeight, size: 12, minSize: 9, weight: 700, align: 'end', valign: 'middle', maxLines: 1, color: canvas.theme.textOn(ratio > 0.85 ? task.color : tint(canvas, task.color, 0.6)) })
        }
      })
    })
    canvas.extendHeight(gridBottom)
  },
}
