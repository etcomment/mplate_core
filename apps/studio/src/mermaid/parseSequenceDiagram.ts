import { DiagramModel } from '../core/model/DiagramModel'

export interface SequenceParticipant {
  name: string
  shapeId: string
}

export type SequenceMessageType = 'solid' | 'dashed' | 'open' | 'cross' | 'filled' | 'dotted-open'

export interface SequenceMessage {
  sourceId: string
  targetId: string
  sourceName: string
  targetName: string
  label: string
  type: SequenceMessageType
}

export interface SequenceNote {
  text: string
  placement: 'right of' | 'left of' | 'over'
  actorNames: string[]
  messageIndex: number
}

export interface SequenceActivation {
  actorName: string
  startMessageIndex: number
  endMessageIndex: number
}

export interface SequenceBoxSection {
  label: string
  messageIndex: number
}

export interface SequenceBox {
  type: 'loop' | 'alt' | 'opt' | 'par' | 'critical' | 'break' | 'rect'
  label: string
  startMessageIndex: number
  endMessageIndex: number
  actorNames: string[]
  sections?: SequenceBoxSection[]
}

export interface SequenceData {
  participants: SequenceParticipant[]
  messages: SequenceMessage[]
  notes: SequenceNote[]
  activations: SequenceActivation[]
  boxes: SequenceBox[]
}

function parseDisplayName(raw: string | undefined): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function mapArrowType(arrow: string): SequenceMessageType {
  if (arrow === '--x') return 'cross'
  if (arrow === '-x') return 'cross'
  if (arrow === '-->>') return 'dotted-open'
  if (arrow === '->>') return 'open'
  if (arrow === '-->') return 'dashed'
  return 'solid'
}

export function parseSequenceDiagram(dsl: string): { model: DiagramModel; sequenceData: SequenceData } {
  const model = new DiagramModel()
  const participants: SequenceParticipant[] = []
  const messages: SequenceMessage[] = []
  const notes: SequenceNote[] = []
  const activations: SequenceActivation[] = []
  const boxes: SequenceBox[] = []

  const participantsByName = new Map<string, SequenceParticipant>()
  const lines = dsl.split('\n')

  let participantIndex = 0
  const activationStacks = new Map<string, { startMessageIndex: number }[]>()
  const boxStack: SequenceBox[] = []

  function createParticipant(internalId: string, displayName: string): SequenceParticipant {
    let participant = participantsByName.get(internalId)
    if (!participant) {
      const x = 100 + participantIndex * 200
      const shape = model.addShape('rectangle', { x, y: 20 }, { width: 140, height: 50 })
      model.updateShapeText(shape.id, { content: displayName })
      participant = { name: internalId, shapeId: shape.id }
      participants.push(participant)
      participantsByName.set(internalId, participant)
      participantIndex++
    }
    return participant
  }

  function getOrCreateParticipant(name: string): SequenceParticipant {
    let participant = participantsByName.get(name)
    if (!participant) {
      participant = createParticipant(name, name)
    }
    return participant
  }

  function startActivation(actorName: string, messageIndex: number): void {
    if (!activationStacks.has(actorName)) {
      activationStacks.set(actorName, [])
    }
    activationStacks.get(actorName)!.push({ startMessageIndex: messageIndex })
  }

  function endActivation(actorName: string, messageIndex: number): void {
    const stack = activationStacks.get(actorName)
    if (!stack || stack.length === 0) return
    const start = stack.pop()!
    activations.push({ actorName, startMessageIndex: start.startMessageIndex, endMessageIndex: messageIndex })
  }

  function closeAllActivations(messageIndex: number): void {
    for (const [actorName, stack] of activationStacks) {
      while (stack.length > 0) {
        const start = stack.pop()!
        activations.push({ actorName, startMessageIndex: start.startMessageIndex, endMessageIndex: messageIndex })
      }
    }
  }

  function collectActorNamesInRange(start: number, end: number): string[] {
    const names = new Set<string>()
    for (let i = start; i < end; i++) {
      const message = messages[i]
      if (message) {
        names.add(message.sourceName)
        names.add(message.targetName)
      }
    }
    return Array.from(names)
  }

  function closeAllBoxes(): void {
    while (boxStack.length > 0) {
      const box = boxStack.pop()!
      box.endMessageIndex = messages.length
      box.actorNames = collectActorNamesInRange(box.startMessageIndex, box.endMessageIndex)
      boxes.push(box)
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('%%')) continue

    if (/^sequenceDiagram/i.test(trimmed)) continue

    if (/^autonumber\b/i.test(trimmed)) continue

    if (/^links?\s+/i.test(trimmed)) continue

    if (/^box\b/i.test(trimmed)) continue

    const boxStartMatch = /^(loop|alt|opt|par|critical|break|rect)\b(?:\s+(.+))?$/i.exec(trimmed)
    if (boxStartMatch) {
      const type = boxStartMatch[1]!.toLowerCase() as SequenceBox['type']
      const label = parseDisplayName(boxStartMatch[2])
      boxStack.push({ type, label, startMessageIndex: messages.length, endMessageIndex: messages.length, actorNames: [], sections: [] })
      continue
    }

    const sectionMatch = /^(else|and|option)\b(?:\s+(.+))?$/i.exec(trimmed)
    if (sectionMatch && boxStack.length > 0) {
      const currentBox = boxStack[boxStack.length - 1]!
      const sectionLabel = parseDisplayName(sectionMatch[2])
      currentBox.sections = currentBox.sections ?? []
      currentBox.sections.push({ label: sectionLabel, messageIndex: messages.length })
      continue
    }

    if (/^end\b/i.test(trimmed)) {
      if (boxStack.length > 0) {
        const box = boxStack.pop()!
        box.endMessageIndex = messages.length
        box.actorNames = collectActorNamesInRange(box.startMessageIndex, box.endMessageIndex)
        boxes.push(box)
      }
      continue
    }

    const activationMatch = /^(activate|deactivate)\s+(\w[\w-]*)\s*$/i.exec(trimmed)
    if (activationMatch) {
      const action = activationMatch[1]!.toLowerCase()
      const actorName = activationMatch[2]!
      if (action === 'activate') {
        startActivation(actorName, messages.length)
      } else {
        endActivation(actorName, messages.length)
      }
      continue
    }

    const createMatch = /^create\s+(?:participant|actor)\s+(\w[\w-]*)(?:\s+as\s+(.+?))?\s*$/i.exec(trimmed)
    if (createMatch) {
      const internalId = createMatch[1]!
      const displayName = parseDisplayName(createMatch[2]) || internalId
      createParticipant(internalId, displayName)
      continue
    }

    const quotedAsMatch = /^(?:participant|actor)\s+"([^"]+)"\s+as\s+(\w[\w-]*)\s*$/i.exec(trimmed)
    if (quotedAsMatch) {
      const displayName = quotedAsMatch[1]!
      const internalId = quotedAsMatch[2]!
      createParticipant(internalId, displayName)
      continue
    }

    const aliasMatch = /^(?:participant|actor)\s+(\w[\w-]*)\s+as\s+(.+?)\s*$/i.exec(trimmed)
    if (aliasMatch) {
      const internalId = aliasMatch[1]!
      const displayName = parseDisplayName(aliasMatch[2])
      createParticipant(internalId, displayName)
      continue
    }

    const participantMatch = /^(?:participant|actor)\s+(\w[\w-]*)\s*$/i.exec(trimmed)
    if (participantMatch) {
      const internalId = participantMatch[1]!
      createParticipant(internalId, internalId)
      continue
    }

    const noteMatch = /^Note\s+(right of|left of|over)\s+(\w[\w-]*)(?:\s*,\s*(\w[\w-]*))?\s*:\s*(.*)$/i.exec(trimmed)
    if (noteMatch) {
      const placement = noteMatch[1]!.toLowerCase() as SequenceNote['placement']
      const actorName1 = noteMatch[2]!
      const actorName2 = noteMatch[3]
      const text = (noteMatch[4] ?? '').trim()
      const actorNames = actorName2 ? [actorName1, actorName2] : [actorName1]
      notes.push({ text, placement, actorNames, messageIndex: messages.length })
      continue
    }

    const messageMatch = /^(\S+?)\s*(-->>|->>|--x|-x|-->|->)([+-]?)\s*(\S+)\s*:?\s*(.*)$/.exec(trimmed)
    if (messageMatch) {
      const sourceName = messageMatch[1]!
      const arrow = messageMatch[2]!
      const activationSuffix = messageMatch[3]!
      let targetName = messageMatch[4]!
      let label = (messageMatch[5] ?? '').trim()

      const colonInTarget = targetName.indexOf(':')
      if (colonInTarget >= 0) {
        const afterColon = targetName.slice(colonInTarget + 1)
        targetName = targetName.slice(0, colonInTarget)
        if (afterColon && !label) label = afterColon.trim()
      }

      const sourceParticipant = getOrCreateParticipant(sourceName)
      const targetParticipant = getOrCreateParticipant(targetName)

      if (activationSuffix === '+') {
        startActivation(targetName, messages.length)
      } else if (activationSuffix === '-') {
        endActivation(sourceName, messages.length)
      }

      model.addConnection(sourceParticipant.shapeId, targetParticipant.shapeId, { label: label || undefined })

      messages.push({
        sourceId: sourceParticipant.shapeId,
        targetId: targetParticipant.shapeId,
        sourceName,
        targetName,
        label,
        type: mapArrowType(arrow),
      })
      continue
    }
  }

  closeAllActivations(messages.length)
  closeAllBoxes()

  return { model, sequenceData: { participants, messages, notes, activations, boxes } }
}

export function isSequenceDiagram(dsl: string): boolean {
  return /^\s*sequenceDiagram/mi.test(dsl)
}

export function isClassDiagram(dsl: string): boolean {
  return /^\s*classDiagram/mi.test(dsl)
}
