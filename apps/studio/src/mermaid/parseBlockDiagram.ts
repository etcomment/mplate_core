import { DiagramModel } from '../core/model/DiagramModel'

function extractBlockName(token: string): string | null {
  const clean = token.replace(/\[.*?\]|\(.*?\)|\{.*?\}|<.*?>|".*?"/g, '').trim()
  if (!clean || /^(block|end|space)$/i.test(clean)) return null
  if (/^block:/i.test(token)) {
    return token.replace(/^block:/i, '').replace(/:\d+$/, '')
  }
  return clean || null
}

export function parseBlockDiagram(dsl: string): DiagramModel {
  const model = new DiagramModel()
  const lines = dsl.split('\n')
  const blockIds = new Map<string, string>()
  const connections: { source: string; target: string }[] = []

  const blockLines: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('%%') || /^block-beta/i.test(trimmed)) continue

    if (/^columns\s+\d+/i.test(trimmed)) continue

    if (/^(block|end)\b/i.test(trimmed)) continue

    if (/^style\s+/i.test(trimmed)) continue

    if (/^classDef\s+/i.test(trimmed)) continue

    if (/^class\s+/i.test(trimmed)) continue

    if (/-->/.test(trimmed)) {
      const parts = trimmed.split(/\s+/)
      for (let i = 0; i < parts.length - 2; i++) {
        const src = parts[i]?.replace(/[[({].*/, '')
        const arrow = parts[i + 1]
        const tgt = parts[i + 2]?.replace(/[[({].*/, '')
        if (arrow === '-->' && src && tgt && /^\w/.test(src!) && /^\w/.test(tgt!)) {
          connections.push({ source: src!, target: tgt! })
        }
      }
      continue
    }

    blockLines.push(trimmed)
  }

  let row = 0
  for (const line of blockLines) {
    const tokens = line.split(/\s+/).filter(b => b.length > 0)
    const blocks = tokens.filter(t => {
      if (/^space(?::\d+)?$/i.test(t)) return false
      return extractBlockName(t) !== null
    })
    for (let col = 0; col < blocks.length; col++) {
      const token = blocks[col]!
      const name = extractBlockName(token)!
      if (!blockIds.has(name)) {
        const x = 80 + col * 160
        const y = 40 + row * 100
        const shape = model.addShape('rectangle', { x, y }, { width: 130, height: 70 })
        model.updateShapeText(shape.id, { content: name })
        blockIds.set(name, shape.id)
      }
    }
    row++
  }

  for (const { source, target } of connections) {
    const sourceId = blockIds.get(source)
    const targetId = blockIds.get(target)
    if (sourceId && targetId) {
      model.addConnection(sourceId, targetId)
    }
  }

  return model
}

export function isBlockDiagram(dsl: string): boolean {
  return /^\s*block-beta/i.test(dsl)
}
