import { DiagramModel } from '../core/model/DiagramModel'

export interface VennSet {
  id: string
  label: string
}

export interface VennData {
  sets: VennSet[]
}

function extractLabel(text: string): string {
  const bracketMatch = /^(\w[\w-]*)\s*\["([^"]*)"\]/.exec(text)
  if (bracketMatch) return bracketMatch[2]!
  return text.replace(/\s*:\d+\s*$/, '').trim()
}

function extractIdentifiers(text: string): string[] {
  const colonIdx = text.indexOf(':')
  const beforeColon = colonIdx >= 0 ? text.slice(0, colonIdx).trim() : text.trim()
  const bracketIdx = beforeColon.indexOf('[')
  const idsPart = bracketIdx >= 0 ? beforeColon.slice(0, bracketIdx).trim() : beforeColon
  return idsPart.split(',').map(s => s.trim()).filter(Boolean)
}

export function parseVenn(dsl: string): { model: DiagramModel; vennData: VennData } {
  const model = new DiagramModel()
  const lines = dsl.split('\n')

  const setIds = new Map<string, string>()
  const vennData: VennData = { sets: [] }
  const positions = [
    { x: 120, y: 100 },
    { x: 320, y: 100 },
    { x: 220, y: 220 },
  ]
  let setIndex = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('%%')) continue
    if (/^venn-beta/i.test(trimmed)) continue
    if (/^title\s+/i.test(trimmed)) continue
    if (/^accTitle/i.test(trimmed)) continue

    const setMatch = /^set\s+(.+)/.exec(trimmed)
    if (setMatch) {
      const raw = setMatch[1]!
      const idMatch = /^(\w[\w-]*)/.exec(raw)
      const id = idMatch ? idMatch[1]! : ''
      const label = extractLabel(raw)
      if (!id || setIds.has(id)) continue
      const pos = setIndex < positions.length ? positions[setIndex]! : { x: 100 + setIndex * 40, y: 300 }
      setIndex++
      const shape = model.addShape('ellipse', pos, { width: 160, height: 120 })
      model.updateShapeText(shape.id, { content: label })
      setIds.set(id, shape.id)
      vennData.sets.push({ id, label })
      continue
    }

    const unionMatch = /^union\s+(.+)/.exec(trimmed)
    if (unionMatch) {
      const raw = unionMatch[1]!
      const ids = extractIdentifiers(raw)
      const label = extractLabel(raw)
      const shapeIds = ids.map(i => setIds.get(i)).filter(Boolean) as string[]
      for (let i = 1; i < shapeIds.length; i++) {
        try {
          model.addConnection(shapeIds[i - 1]!, shapeIds[i]!)
        } catch {
        }
      }
      if (shapeIds.length > 0 && label !== ids.join(',')) {
        model.updateShapeText(shapeIds[0]!, { content: label })
      }
      continue
    }

    if (/^style\s+/i.test(trimmed)) continue
    if (/^text\s+/i.test(trimmed)) continue
  }

  return { model, vennData }
}

export function isVenn(dsl: string): boolean {
  return /^\s*venn-beta/i.test(dsl)
}
