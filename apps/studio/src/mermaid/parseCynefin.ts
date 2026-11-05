import { DiagramModel } from '../core/model/DiagramModel'

export interface CynefinItem {
  text: string
}

export interface CynefinDomain {
  name: string
  items: CynefinItem[]
  shapeId?: string
}

export interface CynefinTransition {
  source: string
  target: string
  label?: string
}

export interface CynefinData {
  title?: string
  domains: CynefinDomain[]
  transitions: CynefinTransition[]
}

const DOMAIN_ALIASES: Record<string, string> = {
  clear: 'clear',
  obvious: 'clear',
  simple: 'clear',
  complicated: 'complicated',
  complex: 'complex',
  chaotic: 'chaotic',
  confusion: 'confusion',
  disorder: 'confusion',
}

const DOMAIN_COLORS: Record<string, { fill: string; stroke: string }> = {
  clear: { fill: '#bee3f8', stroke: '#2b6cb0' },
  complicated: { fill: '#c6f6d5', stroke: '#276749' },
  complex: { fill: '#fefcbf', stroke: '#d69e2e' },
  chaotic: { fill: '#fed7d7', stroke: '#c53030' },
  confusion: { fill: '#e2e8f0', stroke: '#718096' },
}

const DOMAIN_POSITIONS: Record<string, { x: number; y: number }> = {
  clear: { x: 10, y: 10 },
  complicated: { x: 410, y: 10 },
  complex: { x: 10, y: 310 },
  chaotic: { x: 410, y: 310 },
  confusion: { x: 210, y: 210 },
}

const DOMAIN_SIZE = { width: 380, height: 280 }
const CONFUSION_SIZE = { width: 180, height: 100 }

function normalizeDomainName(name: string): string | undefined {
  const lower = name.toLowerCase().trim()
  return DOMAIN_ALIASES[lower]
}

export function parseCynefin(dsl: string): { model: DiagramModel; cynefinData: CynefinData } {
  const model = new DiagramModel()
  const data: CynefinData = {
    domains: [],
    transitions: [],
  }

  const lines = dsl.split('\n')

  let currentDomain: string | undefined

  for (const rawLine of lines) {
    const trimmed = rawLine.trim()
    if (!trimmed || trimmed.startsWith('%%')) continue

    if (/^cynefin-beta/i.test(trimmed)) continue

    const titleMatch = /^title\s+(.+)/i.exec(trimmed)
    if (titleMatch) {
      data.title = titleMatch[1]!.trim()
      const titleShape = model.addShape('rectangle', { x: 200, y: 5 }, { width: 300, height: 40 })
      model.updateShapeText(titleShape.id, { content: data.title, fontSize: 18 })
      model.updateShapeStyle(titleShape.id, { fill: '#ffffff', stroke: 'transparent' })
      continue
    }

    const transitionMatch = /^(\w+)\s*-->\s*(\w+)(?:\s*:\s*(.+))?$/.exec(trimmed)
    if (transitionMatch) {
      const srcRaw = transitionMatch[1]!
      const tgtRaw = transitionMatch[2]!
      const label = transitionMatch[3]?.trim()
      const src = normalizeDomainName(srcRaw)
      const tgt = normalizeDomainName(tgtRaw)
      if (src && tgt && src !== tgt) {
        data.transitions.push({ source: src, target: tgt, label })
      }
      continue
    }

    const domainMatch = /^(\w+)/.exec(trimmed)
    if (domainMatch) {
      const candidate = normalizeDomainName(domainMatch[1]!)
      if (candidate && !trimmed.includes('-->')) {
        currentDomain = candidate
        const existing = data.domains.find(d => d.name === candidate)
        if (!existing) {
          data.domains.push({ name: candidate, items: [] })
        }
        continue
      }
    }

    const itemMatch = /^"([^"]+)"/.exec(trimmed)
    if (itemMatch && currentDomain) {
      const domain = data.domains.find(d => d.name === currentDomain)
      if (domain) {
        domain.items.push({ text: itemMatch[1]! })
      }
      continue
    }
  }

  const allDomains = ['clear', 'complicated', 'complex', 'chaotic', 'confusion']
  for (const name of allDomains) {
    const existing = data.domains.find(d => d.name === name)
    if (!existing) {
      data.domains.push({ name, items: [] })
    }
  }

  for (const domain of data.domains) {
    const pos = DOMAIN_POSITIONS[domain.name] ?? { x: 0, y: 0 }
    const size = domain.name === 'confusion' ? CONFUSION_SIZE : DOMAIN_SIZE
    const colors = DOMAIN_COLORS[domain.name] ?? { fill: '#ffffff', stroke: '#333333' }

    const shape = model.addShape('rectangle', pos, size)
    model.updateShapeStyle(shape.id, { fill: colors.fill, stroke: colors.stroke, strokeWidth: 2 })
    model.updateShapeText(shape.id, {
      content: domain.name.charAt(0).toUpperCase() + domain.name.slice(1),
      fontSize: 16,
    })
    domain.shapeId = shape.id

    let itemY = pos.y + 40
    for (const item of domain.items) {
      const itemShape = model.addShape('rectangle', { x: pos.x + 10, y: itemY }, { width: size.width - 20, height: 30 })
      model.updateShapeText(itemShape.id, { content: item.text, fontSize: 12 })
      model.updateShapeStyle(itemShape.id, { fill: '#ffffff', stroke: colors.stroke, strokeWidth: 1 })
      itemY += 40
    }
  }

  for (const trans of data.transitions) {
    const srcDomain = data.domains.find(d => d.name === trans.source)
    const tgtDomain = data.domains.find(d => d.name === trans.target)
    if (srcDomain?.shapeId && tgtDomain?.shapeId) {
      try {
        model.addConnection(srcDomain.shapeId, tgtDomain.shapeId)
      } catch {
      }
    }
  }

  return { model, cynefinData: data }
}

export function isCynefin(dsl: string): boolean {
  return /^\s*cynefin-beta/i.test(dsl)
}
