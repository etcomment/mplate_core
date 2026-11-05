import { DiagramModel } from '../core/model/DiagramModel'

interface PacketBlock {
  name: string
  startBit: number
  endBit: number
}

function parseBitRange(token: string): { startBit: number; endBit: number } | null {
  const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(token)
  if (rangeMatch) {
    return { startBit: parseInt(rangeMatch[1]!, 10), endBit: parseInt(rangeMatch[2]!, 10) }
  }
  const plusMatch = /^\+(\d+)$/.exec(token)
  if (plusMatch) {
    return { startBit: -1, endBit: parseInt(plusMatch[1]!, 10) - 1 }
  }
  const singleMatch = /^(\d+)$/.exec(token)
  if (singleMatch) {
    const bit = parseInt(singleMatch[1]!, 10)
    return { startBit: bit, endBit: bit }
  }
  return null
}

function parsePacketBlock(line: string): { range: { startBit: number; endBit: number }; name: string } | null {
  const colonIdx = line.indexOf(':')
  if (colonIdx === -1) return null
  const rangeToken = line.slice(0, colonIdx).trim()
  const nameToken = line.slice(colonIdx + 1).trim()
  const name = nameToken.replace(/^"(.*)"$/, '$1').replace(/\s*%%.*$/, '').trim()
  if (!name) return null
  const range = parseBitRange(rangeToken)
  if (!range) return null
  return { range, name }
}

export function parsePacket(dsl: string): DiagramModel {
  const model = new DiagramModel()
  const lines = dsl.split('\n')

  const blocks: PacketBlock[] = []
  let currentBit = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('%%')) continue
    if (/^packet/i.test(trimmed)) continue
    if (/^title\s+/i.test(trimmed)) continue
    if (/^accTitle/i.test(trimmed)) continue

    const parsed = parsePacketBlock(trimmed)
    if (!parsed) continue

    let { startBit, endBit } = parsed.range
    if (startBit === -1) {
      startBit = currentBit
      endBit = currentBit + endBit
    }
    currentBit = Math.max(currentBit, endBit + 1)

    blocks.push({ name: parsed.name, startBit, endBit })
  }

  let xOffset = 40
  for (const block of blocks) {
    const bitCount = block.endBit - block.startBit + 1
    const width = Math.max(60, bitCount * 20)
    const height = 60
    const shape = model.addShape('rectangle', { x: xOffset, y: 60 }, { width, height })
    model.updateShapeText(shape.id, { content: block.name, fontSize: 11 })
    xOffset += width
  }

  return model
}

export function isPacket(dsl: string): boolean {
  return /^\s*packet\b/i.test(dsl)
}
