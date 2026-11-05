import { DiagramModel } from '../core/model/DiagramModel'

export interface ZenUmlParticipant {
  name: string
  shapeId: string
  isActor: boolean
}

export interface ZenUmlMessage {
  sourceId: string
  targetId: string
  label: string
}

export interface ZenUmlData {
  title?: string
  participants: ZenUmlParticipant[]
  messages: ZenUmlMessage[]
}

const BLOCK_KEYWORDS = new Set([
  'opt', 'alt', 'loop', 'par', 'break', 'if', 'else', 'else if',
  'while', 'for', 'forEach', 'foreach', 'try', 'catch', 'finally',
])

function isBlockStart(word: string): boolean {
  const match = /^(\w+)/.exec(word)
  return match ? BLOCK_KEYWORDS.has(match[1]!.toLowerCase()) : false
}

export function parseZenUml(dsl: string): { model: DiagramModel; zenUmlData: ZenUmlData } {
  const model = new DiagramModel()
  const data: ZenUmlData = {
    participants: [],
    messages: [],
  }

  const lines = dsl.split('\n')
  const participantsByName = new Map<string, ZenUmlParticipant>()
  let participantIndex = 0
  let blockDepth = 0

  for (const rawLine of lines) {
    const trimmed = rawLine.trim()
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue

    if (/^zenuml\b/i.test(trimmed)) continue

    const titleMatch = /^title\s+(.+)/i.exec(trimmed)
    if (titleMatch) {
      data.title = titleMatch[1]!.trim()
      const shape = model.addShape('rectangle', { x: 100, y: 10 }, { width: 300, height: 40 })
      model.updateShapeText(shape.id, { content: data.title, fontSize: 18 })
      model.updateShapeStyle(shape.id, { fill: '#ffffff', stroke: 'transparent' })
      continue
    }

    if (trimmed === '{') {
      blockDepth++
      continue
    }
    if (trimmed === '}') {
      blockDepth = Math.max(0, blockDepth - 1)
      continue
    }

    if (isBlockStart(trimmed)) {
      continue
    }

    const actorMatch = /^@Actor\s+(\S+)/.exec(trimmed)
    if (actorMatch) {
      const name = actorMatch[1]!
      if (!participantsByName.has(name)) {
        const x = 100 + participantIndex * 200
        const shape = model.addShape('rectangle', { x, y: 70 }, { width: 140, height: 50 })
        model.updateShapeText(shape.id, { content: name })
        model.updateShapeStyle(shape.id, { fill: '#fefcbf', stroke: '#d69e2e' })
        const participant: ZenUmlParticipant = { name, shapeId: shape.id, isActor: true }
        participantsByName.set(name, participant)
        data.participants.push(participant)
        participantIndex++
      }
      continue
    }

    const exclusiveParticipantMatch = /^(\w+)$/.exec(trimmed)
    if (exclusiveParticipantMatch && !participantsByName.has(exclusiveParticipantMatch[1]!)) {
      const name = exclusiveParticipantMatch[1]!
      const x = 100 + participantIndex * 200
      const shape = model.addShape('rectangle', { x, y: 70 }, { width: 140, height: 50 })
      model.updateShapeText(shape.id, { content: name })
      const participant: ZenUmlParticipant = { name, shapeId: shape.id, isActor: false }
      participantsByName.set(name, participant)
      data.participants.push(participant)
      participantIndex++
      continue
    }

    const messageMatch = /^(\w[\w-]*)\s*->\s*(\w[\w-]*)\s*:\s*(.*)$/.exec(trimmed)
    if (messageMatch) {
      const sourceName = messageMatch[1]!
      const targetName = messageMatch[2]!
      const label = messageMatch[3]?.trim() ?? ''

      for (const name of [sourceName, targetName]) {
        if (!participantsByName.has(name)) {
          const x = 100 + participantIndex * 200
          const shape = model.addShape('rectangle', { x, y: 70 }, { width: 140, height: 50 })
          model.updateShapeText(shape.id, { content: name })
          const participant: ZenUmlParticipant = { name, shapeId: shape.id, isActor: false }
          participantsByName.set(name, participant)
          data.participants.push(participant)
          participantIndex++
        }
      }

      const src = participantsByName.get(sourceName)!
      const tgt = participantsByName.get(targetName)!
      model.addConnection(src.shapeId, tgt.shapeId)
      data.messages.push({ sourceId: src.shapeId, targetId: tgt.shapeId, label })
      continue
    }
  }

  return { model, zenUmlData: data }
}

export function isZenUml(dsl: string): boolean {
  return /^\s*zenuml\b/i.test(dsl)
}
