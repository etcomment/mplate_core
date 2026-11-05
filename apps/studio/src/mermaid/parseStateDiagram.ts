import { DiagramModel } from '../core/model/DiagramModel'

interface RawTransition {
  source: string
  target: string
  label?: string
}

interface RawNote {
  side: 'right' | 'left'
  stateId: string
  text: string
}

const STATE_HEADER = /^\s*stateDiagram/i
const DIRECTION = /^\s*direction\s+(LR|RL|TB|TD|BT)\s*$/i
const COMPOSITE_WITH_DESC = /^state\s+"([^"]*)"\s+as\s+(\S+)\s*\{\s*$/
const COMPOSITE_BEGIN = /^state\s+(\S+)\s*\{\s*$/
const STATE_AS = /^state\s+"([^"]*)"\s+as\s+(\S+)\s*$/
const STATE_SIMPLE = /^state\s+(\S+)\s*$/
const TRANSITION = /^\s*(\S+)\s*-->\s*(\S+)\s*(?::\s*(.*))?$/
const CONCURRENCY = /^--+$/
const NOTE_BLOCK_BEGIN = /^note\s+(right|left)\s+of\s+\S+\s*$/
const NOTE_INLINE = /^note\s+(right|left)\s+of\s+(\S+)\s*:\s*(.*)$/
const NOTE_END = /^\s*end\s+note\s*$/i
const COLON_DESC = /^(\S+)\s*:\s*(.+)$/
const CLASSDEF = /^\s*classDef\s/i
const CLASS_STMT = /^\s*class\s/i
const BARE_NAME = /^[\w\u00C0-\u024F][\w\u00C0-\u024F-]*$/

export function parseStateDiagram(dsl: string): DiagramModel {
  const model = new DiagramModel()
  const lines = dsl.split('\n')

  const transitions: RawTransition[] = []
  const regularStates = new Set<string>()
  const choiceStates = new Set<string>()
  const stateDescriptions = new Map<string, string>()
  const notes: RawNote[] = []

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim()
    if (!trimmed || trimmed.startsWith('%%')) continue
    if (STATE_HEADER.test(trimmed)) continue
    if (DIRECTION.test(trimmed)) continue
    if (CLASSDEF.test(trimmed)) continue
    if (CLASS_STMT.test(trimmed)) continue

    const compositeWithDescMatch = COMPOSITE_WITH_DESC.exec(trimmed)
    if (compositeWithDescMatch) {
      const desc = compositeWithDescMatch[1]!
      const id = compositeWithDescMatch[2]!
      regularStates.add(id)
      stateDescriptions.set(id, desc)
      continue
    }

    const compositeBeginMatch = COMPOSITE_BEGIN.exec(trimmed)
    if (compositeBeginMatch) {
      regularStates.add(compositeBeginMatch[1]!)
      continue
    }

    if (trimmed === '}') {
      continue
    }

    if (CONCURRENCY.test(trimmed)) continue

    if (NOTE_BLOCK_BEGIN.test(trimmed)) {
      while (i + 1 < lines.length) {
        i++
        if (NOTE_END.test(lines[i]!.trim())) break
      }
      continue
    }

    const noteInlineMatch = NOTE_INLINE.exec(trimmed)
    if (noteInlineMatch) {
      const side = noteInlineMatch[1] as 'right' | 'left'
      const stateId = noteInlineMatch[2]!
      const text = noteInlineMatch[3]!
      notes.push({ side, stateId, text })
      continue
    }

    const arrowMatch = TRANSITION.exec(trimmed)
    if (arrowMatch) {
      const source = arrowMatch[1]!
      const target = arrowMatch[2]!
      const label = arrowMatch[3] ?? undefined

      transitions.push({ source, target, label })

      if (source !== '[*]') {
        if (/^<<.+>>$/.test(source)) choiceStates.add(source)
        else regularStates.add(source)
      }
      if (target !== '[*]') {
        if (/^<<.+>>$/.test(target)) choiceStates.add(target)
        else regularStates.add(target)
      }
      continue
    }

    const stateAsMatch = STATE_AS.exec(trimmed)
    if (stateAsMatch) {
      const desc = stateAsMatch[1]!
      const id = stateAsMatch[2]!
      regularStates.add(id)
      stateDescriptions.set(id, desc)
      continue
    }

    const stateMatch = STATE_SIMPLE.exec(trimmed)
    if (stateMatch) {
      const name = stateMatch[1]!
      if (/^<<.+>>$/.test(name)) choiceStates.add(name)
      else regularStates.add(name)
      continue
    }

    const colonDescMatch = COLON_DESC.exec(trimmed)
    if (colonDescMatch) {
      const id = colonDescMatch[1]!
      const desc = colonDescMatch[2]!
      regularStates.add(id)
      stateDescriptions.set(id, desc)
      continue
    }

    if (BARE_NAME.test(trimmed)) {
      regularStates.add(trimmed)
    }
  }

  const stateLayout = new Map<string, { x: number; y: number }>()
  const allStates = [...regularStates, ...choiceStates]
  let index = 0
  for (const state of allStates) {
    const col = index % 4
    const row = Math.floor(index / 4)
    stateLayout.set(state, { x: 100 + col * 180, y: 40 + row * 120 })
    index++
  }

  const stateIds = new Map<string, string>()

  for (const name of regularStates) {
    const pos = stateLayout.get(name)!
    const shape = model.addShape('rectangle', pos, { width: 140, height: 60 })
    const desc = stateDescriptions.get(name)
    model.updateShapeText(shape.id, { content: desc || name })
    stateIds.set(name, shape.id)
  }

  for (const name of choiceStates) {
    const pos = stateLayout.get(name)!
    const shape = model.addShape('diamond', pos, { width: 60, height: 60 })
    const bare = /^<<(.+)>>$/.exec(name)?.[1] ?? name
    model.updateShapeText(shape.id, { content: bare })
    stateIds.set(name, shape.id)
  }

  for (const { source, target, label } of transitions) {
    if (source === '[*]' || target === '[*]') continue
    const sourceId = stateIds.get(source)
    const targetId = stateIds.get(target)
    if (sourceId && targetId) {
      model.addConnection(sourceId, targetId, { label })
    }
  }

  for (const note of notes) {
    const statePos = stateLayout.get(note.stateId)
    if (!statePos) continue

    const offsetX = note.side === 'right' ? 160 : -180
    const x = statePos.x + offsetX
    const y = statePos.y
    const shape = model.addShape('rectangle', { x, y }, { width: 160, height: 50 })
    model.updateShapeText(shape.id, { content: note.text, fontAlign: 'left', fontSize: 12 })
    model.updateShapeStyle(shape.id, { fill: '#fef9c3', stroke: '#ca8a04' })

    const stateId = stateIds.get(note.stateId)
    if (stateId) {
      model.addConnection(shape.id, stateId)
    }
  }

  return model
}

export function isStateDiagram(dsl: string): boolean {
  return STATE_HEADER.test(dsl)
}
