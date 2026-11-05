import { DiagramModel } from '../core/model/DiagramModel'

const CENTER_X = 350
const CENTER_Y = 350
const RADIUS = 200
const LABEL_OFFSET = 35
const DOT_SIZE = 8

export interface RadarAxis {
  id: string
  label: string
}

export interface RadarCurve {
  id: string
  label: string
  values: number[]
}

export interface RadarData {
  axes: RadarAxis[]
  curves: RadarCurve[]
  globalMax: number
}

function parseAxisLine(trimmed: string): RadarAxis[] {
  const rest = trimmed.replace(/^\s*axis\s+/i, '')
  const parts = rest.split(',').map(s => s.trim()).filter(Boolean)
  const axes: RadarAxis[] = []
  for (const part of parts) {
    const withLabel = /^(\w[\w-]*)\s*\[([^\]]*)\]$/.exec(part)
    if (withLabel) {
      axes.push({ id: withLabel[1]!, label: withLabel[2]! })
    } else if (/^\w[\w-]*$/.test(part)) {
      axes.push({ id: part, label: part })
    }
  }
  return axes
}

function parseCurveLine(trimmed: string): RadarCurve[] {
  const rest = trimmed.replace(/^\s*curve\s+/i, '')
  const curves: RadarCurve[] = []
  const parts = rest.split(',')
  let buf = ''
  for (const part of parts) {
    buf = buf ? buf + ',' + part : part
    if (buf.includes('}')) {
      const curveMatch = /^(\w[\w-]*)\s*(?:\[([^\]]*)\])?\s*\{([\d.,\s]+)\}$/.exec(buf.trim())
      if (curveMatch) {
        const id = curveMatch[1]!
        const label = curveMatch[2] ?? id
        const values = curveMatch[3]!.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v))
        curves.push({ id, label, values })
      }
      buf = ''
    }
  }
  if (buf.trim()) {
    const curveMatch = /^(\w[\w-]*)\s*(?:\[([^\]]*)\])?\s*\{([\d.,\s]+)\}$/.exec(buf.trim())
    if (curveMatch) {
      curves.push({
        id: curveMatch[1]!,
        label: curveMatch[2] ?? curveMatch[1]!,
        values: curveMatch[3]!.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v)),
      })
    }
  }
  return curves
}

export function parseRadar(dsl: string): { model: DiagramModel; radarData: RadarData } {
  const model = new DiagramModel()
  const lines = dsl.split('\n')

  const axes: RadarAxis[] = []
  const curves: RadarCurve[] = []

  let inConfig = false

  for (const raw of lines) {
    const trimmed = raw.trim()
    if (!trimmed || trimmed.startsWith('%%')) continue

    if (trimmed.startsWith('---')) {
      inConfig = !inConfig
      continue
    }
    if (inConfig) continue

    if (/^radar-beta\b/i.test(trimmed)) continue
    if (/^title\s+/i.test(trimmed)) continue
    if (/^configuration\s+/i.test(trimmed)) continue
    if (/^(max|min|showLegend|graticule|ticks)\b/i.test(trimmed)) continue

    if (/^axis\s+/i.test(trimmed)) {
      const parsed = parseAxisLine(trimmed)
      axes.push(...parsed)
      continue
    }

    if (/^curve\s+/i.test(trimmed)) {
      const parsed = parseCurveLine(trimmed)
      curves.push(...parsed)
      continue
    }
  }

  const numAxes = axes.length

  let globalMax = 0
  for (const curve of curves) {
    for (const v of curve.values) {
      if (v > globalMax) globalMax = v
    }
  }
  if (globalMax === 0) globalMax = 1

  const radarData: RadarData = { axes, curves, globalMax }

  if (numAxes === 0) return { model, radarData }

  const angleStep = (2 * Math.PI) / numAxes

  for (let i = 0; i < numAxes; i++) {
    const angle = angleStep * i - Math.PI / 2
    const lx = CENTER_X + (RADIUS + LABEL_OFFSET) * Math.cos(angle)
    const ly = CENTER_Y + (RADIUS + LABEL_OFFSET) * Math.sin(angle)
    const labelShape = model.addShape('rectangle', { x: lx - 40, y: ly - 10 }, { width: 80, height: 20 })
    model.updateShapeText(labelShape.id, { content: axes[i]!.label, fontSize: 11 })
  }

  for (const curve of curves) {
    const dotIds: string[] = []
    const numValues = curve.values.length
    const effectiveNum = Math.min(numValues, numAxes)

    for (let i = 0; i < effectiveNum; i++) {
      const angle = angleStep * i - Math.PI / 2
      const ratio = curve.values[i]! / globalMax
      const dx = CENTER_X + RADIUS * ratio * Math.cos(angle)
      const dy = CENTER_Y + RADIUS * ratio * Math.sin(angle)
      const dot = model.addShape('ellipse', { x: dx - DOT_SIZE / 2, y: dy - DOT_SIZE / 2 }, { width: DOT_SIZE, height: DOT_SIZE })
      dotIds.push(dot.id)
    }

    for (let i = 0; i < dotIds.length; i++) {
      model.updateShapeText(dotIds[i]!, { content: curve.label })
    }

    for (let i = 0; i < dotIds.length - 1; i++) {
      model.addConnection(dotIds[i]!, dotIds[i + 1]!)
    }
    if (dotIds.length > 2) {
      model.addConnection(dotIds[dotIds.length - 1]!, dotIds[0]!)
    }
  }

  return { model, radarData }
}

export function isRadar(dsl: string): boolean {
  return /^\s*radar-beta\b/i.test(dsl)
}
