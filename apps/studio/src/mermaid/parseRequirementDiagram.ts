import { DiagramModel } from '../core/model/DiagramModel'

interface BlockState {
  type: string
  name: string
  props: Record<string, string>
}

function ensureShape(model: DiagramModel, reqIds: Map<string, string>, name: string, index: { value: number }): void {
  if (reqIds.has(name)) return
  const x = 100 + (index.value % 4) * 200
  const y = 40 + Math.floor(index.value / 4) * 140
  const shape = model.addShape('rectangle', { x, y }, { width: 200, height: 90 })
  model.updateShapeText(shape.id, { content: name, fontSize: 12 })
  reqIds.set(name, shape.id)
  index.value++
}

function addConnection(model: DiagramModel, reqIds: Map<string, string>, sourceName: string, targetName: string): void {
  const sourceId = reqIds.get(sourceName)
  const targetId = reqIds.get(targetName)
  if (sourceId && targetId) {
    model.addConnection(sourceId, targetId)
  }
}

export function parseRequirementDiagram(dsl: string): DiagramModel {
  const model = new DiagramModel()
  const lines = dsl.split('\n')
  const reqIds = new Map<string, string>()
  let index = { value: 0 }

  let currentBlock: BlockState | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('%%') || /^requirementDiagram/i.test(trimmed)) continue

    if (/^direction\s+(TB|BT|LR|RL)$/i.test(trimmed)) continue

    if (currentBlock) {
      if (trimmed === '}') {
        const name = currentBlock.name
        const x = 100 + (index.value % 4) * 200
        const y = 40 + Math.floor(index.value / 4) * 140
        const shape = model.addShape('rectangle', { x, y }, { width: 200, height: 120 })
        const displayParts = [name]
        if (currentBlock.props.id) displayParts.push(`id: ${currentBlock.props.id}`)
        if (currentBlock.props.text) displayParts.push(currentBlock.props.text)
        if (currentBlock.props.risk) displayParts.push(`[${currentBlock.props.risk}]`)
        if (currentBlock.props.verifymethod) displayParts.push(`verify: ${currentBlock.props.verifymethod}`)
        if (currentBlock.props.type) displayParts.push(`type: ${currentBlock.props.type}`)
        if (currentBlock.props.docref) displayParts.push(`docRef: ${currentBlock.props.docref}`)
        model.updateShapeText(shape.id, { content: displayParts.join('\n'), fontSize: 11 })
        reqIds.set(name, shape.id)
        index.value++
        currentBlock = null
        continue
      }

      const idMatch = /^id\s*:\s*(.+)/i.exec(trimmed)
      if (idMatch) { currentBlock.props.id = idMatch[1]!.trim().replace(/^"(.*)"$/, '$1'); continue }
      const textMatch = /^text\s*:\s*(.+)/i.exec(trimmed)
      if (textMatch) { currentBlock.props.text = textMatch[1]!.trim().replace(/^"(.*)"$/, '$1'); continue }
      const riskMatch = /^risk\s*:\s*(.+)/i.exec(trimmed)
      if (riskMatch) { currentBlock.props.risk = riskMatch[1]!.trim(); continue }
      const vmethodMatch = /^verifymethod\s*:\s*(.+)/i.exec(trimmed)
      if (vmethodMatch) { currentBlock.props.verifymethod = vmethodMatch[1]!.trim(); continue }
      const typeMatch = /^type\s*:\s*(.+)/i.exec(trimmed)
      if (typeMatch) { currentBlock.props.type = typeMatch[1]!.trim().replace(/^"(.*)"$/, '$1'); continue }
      const docrefMatch = /^docref\s*:\s*(.+)/i.exec(trimmed)
      if (docrefMatch) { currentBlock.props.docref = docrefMatch[1]!.trim().replace(/^"(.*)"$/, '$1'); continue }
      continue
    }

    const blockMatch = /^(requirement|element|functionalRequirement|interfaceRequirement|performanceRequirement|physicalRequirement|designConstraint)\s+(?:"([^"]*)"|(\w[\w-]*))\s*\{/.exec(trimmed)
    if (blockMatch) {
      const name = blockMatch[2] ?? blockMatch[3]!
      currentBlock = { type: blockMatch[1]!, name, props: {} }
      continue
    }

    const relMatch = /^(?:"([^"]*)"|(\w[\w-]*))\s*-\s*(contains|copies|derives|satisfies|verifies|refines|traces)\s*->\s*(?:"([^"]*)"|(\w[\w-]*))$/.exec(trimmed)
    if (relMatch) {
      const source = relMatch[1] ?? relMatch[2]!
      const target = relMatch[4] ?? relMatch[5]!
      ensureShape(model, reqIds, source, index)
      ensureShape(model, reqIds, target, index)
      addConnection(model, reqIds, source, target)
      continue
    }

    const revRelMatch = /^(?:"([^"]*)"|(\w[\w-]*))\s*<-\s*(contains|copies|derives|satisfies|verifies|refines|traces)\s*-\s*(?:"([^"]*)"|(\w[\w-]*))$/.exec(trimmed)
    if (revRelMatch) {
      const target = revRelMatch[1] ?? revRelMatch[2]!
      const source = revRelMatch[4] ?? revRelMatch[5]!
      ensureShape(model, reqIds, source, index)
      ensureShape(model, reqIds, target, index)
      addConnection(model, reqIds, source, target)
      continue
    }
  }

  return model
}

export function isRequirementDiagram(dsl: string): boolean {
  return /^\s*requirementDiagram/i.test(dsl)
}
