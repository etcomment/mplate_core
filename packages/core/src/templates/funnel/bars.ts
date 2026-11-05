import { formatNumber as n } from '../../svg/node.js'
import type { Item, TemplateDefinition } from '../types.js'

function numericValue(item: Item): number | undefined {
  const source = item.value ?? item.percentLabel
  if (!source) return item.percent
  const compact = source.replace(/[\s  ]/g, '')
  const match = /(-?\d+(?:[.,]\d+)*)\s*([kKmM])?/.exec(compact)
  if (!match) return undefined
  const digits = match[1]!
  const normalized = /^\d{1,3}([.,]\d{3})+$/.test(digits) ? digits.replace(/[.,]/g, '') : digits.replace(',', '.')
  const base = Number(normalized)
  if (!Number.isFinite(base)) return undefined
  const unit = match[2]?.toLowerCase()
  return unit === 'k' ? base * 1000 : unit === 'm' ? base * 1000000 : base
}

function formatRate(rate: number): string {
  return rate >= 10 ? `${Math.round(rate)}%` : `${rate.toFixed(1).replace(/\.0$/, '')}%`
}

export const funnelBars: TemplateDefinition = {
  card: {
    id: 'funnel:bars',
    family: 'funnel',
    style: 'bars',
    isDefaultStyle: false,
    aliases: ['funnel2', 'conversion'],
    name: 'Conversion bars',
    description: 'One horizontal bar per stage, sized by its figure (val: or pct:), with the conversion rate from one stage to the next.',
    useCases: ['sales conversion', 'recruitment pipeline', 'adoption funnel'],
    items: { min: 1, max: 12, recommended: [3, 7] },
    elements: [{ keyword: 'level', aliases: ['stage', 'step'], description: 'One stage with its figure in val: (or pct:)', positional: ['title', 'subtitle', 'value'] }],
    settings: [],
    example: `@funnel style:bars "Recruitment pipeline"
  level "Applications" val:"1,240"
  level "Screened" val:"410"
  level "Interviewed" val:"96"
  level "Offers" val:"18"
  level "Hired" val:"14"`,
    tags: ['conversion', 'bars', 'pipeline'],
  },
  render(canvas, input) {
    const { items } = input
    const values = items.map(numericValue)
    const maximum = Math.max(1, ...values.map((value) => value ?? 0))
    const labelWidth = Math.min(240, canvas.contentWidth * 0.24)
    const rateWidth = 90
    const barLeft = canvas.left + labelWidth + 16
    const barSpace = canvas.left + canvas.contentWidth - barLeft - rateWidth
    const rowHeight = items.length > 8 ? 40 : 52
    const gap = items.length > 8 ? 10 : 16
    items.forEach((item, index) => {
      canvas.group(item.id, () => {
        const y = canvas.top + index * (rowHeight + gap)
        const value = values[index]
        if (value === undefined) canvas.diagnostics.push({ severity: 'warning', line: item.line, message: `"${item.title}" has no figure; add val:"…" or pct:`, hint: 'Example: level "Leads" val:"6,200"' })
        canvas.text({ text: item.title, x: canvas.left, y, width: labelWidth, height: item.subtitle ? rowHeight * 0.6 : rowHeight, size: 16, minSize: 11, weight: 700, align: 'end', valign: item.subtitle ? 'bottom' : 'middle', maxLines: 1 })
        if (item.subtitle) canvas.text({ text: item.subtitle, x: canvas.left, y: y + rowHeight * 0.6, width: labelWidth, size: 12, maxLines: 1, align: 'end', color: canvas.theme.colors.textMuted })
        const width = Math.max(6, barSpace * ((value ?? 0) / maximum))
        canvas.rect({ x: barLeft, y, width, height: rowHeight }, { rx: Math.min(6, canvas.theme.shape.radius), fill: item.color })
        const label = item.value ?? item.percentLabel
        if (label) {
          const isInside = width > 110
          canvas.text({ text: label, x: isInside ? barLeft + 12 : barLeft + width + 10, y, width: isInside ? width - 24 : 110, height: rowHeight, size: 17, minSize: 11, weight: 800, valign: 'middle', maxLines: 1, color: isInside ? canvas.theme.textOn(item.color) : canvas.theme.colors.text, font: 'heading' })
        }
        const next = values[index + 1]
        if (index < items.length - 1 && value && next !== undefined && next <= value) {
          const rateY = y + rowHeight + gap / 2
          const x = canvas.left + canvas.contentWidth - rateWidth
          canvas.path(`M${n(x + 8)} ${n(rateY - 6)} l6 6 l6 -6`, { fill: 'none', stroke: canvas.theme.colors.textMuted, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
          canvas.text({ text: formatRate((next / value) * 100), x: x + 26, y: rateY - 12, width: rateWidth - 26, height: 24, size: 14, minSize: 10, weight: 700, valign: 'middle', maxLines: 1, color: canvas.theme.colors.textMuted })
        }
      })
    })
    canvas.extendHeight(canvas.top + items.length * (rowHeight + gap) - gap)
  },
}
