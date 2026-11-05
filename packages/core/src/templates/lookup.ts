import type { IdentityCard, TemplateDefinition } from './types.js'

export interface TemplateLookup {
  template?: TemplateDefinition
  message?: string
  hint?: string
}

function editDistance(first: string, second: string): number {
  const rows = first.length + 1
  const columns = second.length + 1
  const table: number[][] = Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => (row === 0 ? column : column === 0 ? row : 0)))
  for (let row = 1; row < rows; row++) {
    for (let column = 1; column < columns; column++) {
      const cost = first[row - 1] === second[column - 1] ? 0 : 1
      table[row]![column] = Math.min(table[row - 1]![column]! + 1, table[row]![column - 1]! + 1, table[row - 1]![column - 1]! + cost)
    }
  }
  return table[first.length]![second.length]!
}

export function closest(candidates: string[], value: string): string | undefined {
  let best: string | undefined
  let bestDistance = Infinity
  for (const candidate of candidates) {
    const distance = editDistance(candidate.toLowerCase(), value.toLowerCase())
    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }
  return bestDistance <= Math.max(2, Math.floor(value.length / 3)) ? best : undefined
}

export class TemplateRegistry {
  private readonly templates: TemplateDefinition[]

  constructor(templates: TemplateDefinition[]) {
    this.templates = templates
  }

  all(): TemplateDefinition[] {
    return [...this.templates]
  }

  cards(): IdentityCard[] {
    return this.templates.map((template) => template.card)
  }

  families(): string[] {
    return [...new Set(this.templates.map((template) => template.card.family))].sort()
  }

  byId(id: string): TemplateDefinition | undefined {
    const normalized = id.replace(/^@/, '').toLowerCase()
    return this.templates.find((template) => template.card.id.toLowerCase() === normalized || template.card.aliases.some((alias) => alias.toLowerCase() === normalized))
  }

  find(family: string, variant?: string, style?: string): TemplateLookup {
    const familyName = family.toLowerCase()
    if (variant) {
      const alias = this.templates.find((template) => template.card.aliases.some((name) => name.toLowerCase() === `${familyName}${variant}`))
      if (alias && !style) return { template: alias }
    }
    const familyTemplates = this.templates.filter((template) => template.card.family.toLowerCase() === familyName || template.card.aliases.includes(familyName))
    if (familyTemplates.length === 0) {
      const suggestion = closest(this.families(), family)
      return { message: `Unknown template family "@${family}"`, hint: suggestion ? `Did you mean @${suggestion}?` : `Available: ${this.families().map((name) => `@${name}`).join(', ')}` }
    }
    if (variant && !style) {
      return { message: `Unknown variant "@${family}${variant}"`, hint: `Use a named style instead: ${familyTemplates.map((template) => `@${template.card.family} style:${template.card.style}`).join(', ')}` }
    }
    if (!style) return { template: familyTemplates.find((template) => template.card.isDefaultStyle) ?? familyTemplates[0]! }
    const match = familyTemplates.find((template) => template.card.style.toLowerCase() === style.toLowerCase())
    if (match) return { template: match }
    const styles = familyTemplates.map((template) => template.card.style)
    const suggestion = closest(styles, style)
    return { message: `Unknown style "${style}" for @${family}`, hint: suggestion ? `Did you mean style:${suggestion}?` : `Available styles: ${styles.join(', ')}` }
  }
}
