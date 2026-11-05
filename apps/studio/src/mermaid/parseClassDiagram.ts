import { DiagramModel } from '../core/model/DiagramModel'

interface ClassDef {
  name: string
  attributes: string[]
  methods: string[]
  stereotype: string
  label?: string
}

function stripGenerics(name: string): string {
  let result = name
  let prev: string
  do {
    prev = result
    result = result.replace(/~([^~]+)~/, '<$1>')
  } while (result !== prev)
  result = result.replace(/~+$/, '')
  return result
}

export function parseClassDiagram(dsl: string): DiagramModel {
  const model = new DiagramModel()
  const lines = dsl.split('\n')
  const classes: ClassDef[] = []
  const relations: { source: string; target: string }[] = []
  const notes: { text: string; forClass?: string }[] = []

  let currentClass: ClassDef | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('%%') || /^classDiagram/i.test(trimmed)) continue

    if (/^namespace\s/i.test(trimmed)) continue
    if (/^end\s*$/i.test(trimmed)) continue
    if (/^direction\s/i.test(trimmed)) continue
    if (/^(link|callback|click|cssClass|classDef)\s/i.test(trimmed)) continue

    const annotationClassMatch = /^<<(\w+)>>\s+class\s+(\w[\w-]*)/.exec(trimmed)
    if (annotationClassMatch) {
      currentClass = { name: annotationClassMatch[2]!, attributes: [], methods: [], stereotype: annotationClassMatch[1]! }
      classes.push(currentClass)
      if (!trimmed.endsWith('{')) {
        currentClass = null
      }
      continue
    }

    const classMatch = /^class\s+(?:`([^`]+)`|([\w-]+(?:~[^~]+~)?))\s*(?:\["([^"]*)"\]|\[`([^`]*)`\])?\s*(?:<<(\w+)>>)?\s*(\{?)/.exec(trimmed)
    if (classMatch) {
      const rawName = classMatch[1] ?? classMatch[2] ?? ''
      const name = stripGenerics(rawName)
      const label = classMatch[3] ?? classMatch[4] ?? ''
      const stereotype = classMatch[5] ?? ''
      currentClass = { name, attributes: [], methods: [], stereotype }
      if (label) currentClass.label = label
      classes.push(currentClass)
      if (!classMatch[6]) {
        currentClass = null
      }
      continue
    }

    const noteMatch = /^note\s+(?:for\s+(\w[\w-]*)\s+)?[""]([^""]+)[""]/.exec(trimmed)
    if (noteMatch) {
      const text = noteMatch[2]!.replace(/\\n/g, '\n')
      notes.push({ text, forClass: noteMatch[1] })
      continue
    }

    if (trimmed === '}') {
      currentClass = null
      continue
    }

    if (currentClass) {
      const inlineStereoMatch = /^<<(\w+)>>$/.exec(trimmed)
      if (inlineStereoMatch) {
        currentClass.stereotype = inlineStereoMatch[1]!
        continue
      }

      const memberMatch = /^([+\-#~]?)\s*(.+)$/.exec(trimmed)
      if (memberMatch) {
        const rawVisibility = memberMatch[1] ?? ''
        const rest = (memberMatch[2] ?? '').trim()

        let visibility = ''
        if (rawVisibility === '+') visibility = '+ '
        else if (rawVisibility === '-') visibility = '- '
        else if (rawVisibility === '#') visibility = '# '
        else if (rawVisibility === '~') visibility = '~ '

        const methodMatch = /^(\w[\w-]*)\s*\(([^)]*)\)(?:\s*:?\s*(.*))?$/.exec(rest)
        if (methodMatch) {
          const methodName = methodMatch[1]!
          const params = methodMatch[2] ?? ''
          const returnType = methodMatch[3]?.trim() ?? ''
          const methodStr = params ? `${visibility}${methodName}(${params})` : `${visibility}${methodName}()`
          const fullMethod = returnType ? `${methodStr}: ${returnType}` : methodStr
          currentClass.methods.push(fullMethod)
        } else {
          const attrMatch = /^(\S+)\s+(\w[\w-]*)$/.exec(rest)
          if (attrMatch) {
            const attrType = attrMatch[1]!
            const attrName = attrMatch[2]!
            currentClass.attributes.push(`${visibility}${attrName}: ${attrType}`)
          }
        }
        continue
      }
      continue
    }

    const relationMatch = /^(\w[\w-]*)\s*(<\|--|--\|>|\*--|--\*|o--|--o|-->|<--|--|\.\.>|\.\.\|>|<\|\.\.|<\.\.\.|\.\.\.>)\s*(\w[\w-]*)/.exec(trimmed)
    if (relationMatch) {
      const sourceName = relationMatch[1]!
      const arrowType = relationMatch[2]!
      const targetName = relationMatch[3]!

      let source = sourceName
      let target = targetName

      if (arrowType.includes('<') && !arrowType.startsWith('<')) {
        source = targetName
        target = sourceName
      } else if (arrowType.includes('>') && arrowType.startsWith('<')) {
        source = targetName
        target = sourceName
      }

      relations.push({ source, target })
      continue
    }
  }

  const classByName = new Map<string, ClassDef>()
  for (const cls of classes) {
    classByName.set(cls.name, cls)
  }

  const classNameById = new Map<string, string>()
  let col = 0
  let row = 0
  const maxPerRow = 4

  for (const [name, cls] of classByName) {
    const displayName = cls.stereotype
      ? `\u00ab${cls.stereotype}\u00bb\n${cls.label ?? name}`
      : (cls.label ?? name)
    const totalLines = 1 + cls.attributes.length + cls.methods.length
    const classHeight = 30 + totalLines * 16 + 20
    const x = 100 + col * 220
    const y = 20 + row * 280

    const shape = model.addShape('rectangle', { x, y }, { width: 200, height: classHeight })
    const textLines = [displayName, ...cls.attributes, ...cls.methods]
    model.updateShapeText(shape.id, { content: textLines.join('\n'), fontAlign: 'left', fontSize: 12 })

    classNameById.set(name, shape.id)

    col++
    if (col >= maxPerRow) { col = 0; row++ }
  }

  for (const { source, target } of relations) {
    const sourceId = classNameById.get(source)
    const targetId = classNameById.get(target)
    if (sourceId && targetId) {
      model.addConnection(sourceId, targetId)
    }
  }

  for (const note of notes) {
    const x = 100 + col * 220
    const y = 20 + row * 280
    const shape = model.addShape('rectangle', { x, y }, { width: 200, height: 60 })
    model.updateShapeText(shape.id, { content: note.text, fontAlign: 'left', fontSize: 12 })
    model.updateShapeStyle(shape.id, { fill: '#fef9c3', stroke: '#ca8a04' })

    if (note.forClass) {
      const targetId = classNameById.get(note.forClass)
      if (targetId) {
        model.addConnection(shape.id, targetId)
      }
    }

    col++
    if (col >= maxPerRow) { col = 0; row++ }
  }

  return model
}
