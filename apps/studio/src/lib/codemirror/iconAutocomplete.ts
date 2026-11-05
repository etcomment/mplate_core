import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { autocompletion } from '@codemirror/autocomplete'
import { listIcons, listTemplates, type ElementSpec, type IdentityCard } from '@mplate/core'

const ICON_COMPLETIONS: Completion[] = listIcons().map(name => ({ label: name, type: 'constant', detail: 'mplate', boost: 10 }))

const CARDS: IdentityCard[] = listTemplates()

const HEADER_COMPLETIONS: Completion[] = CARDS.map(card => ({
  label: card.isDefaultStyle ? `@${card.family}` : `@${card.family} style:${card.style}`,
  type: 'keyword',
  detail: card.name,
  info: card.description,
  boost: card.isDefaultStyle ? 10 : 5,
}))

const ATTRIBUTE_COMPLETIONS: Completion[] = [
  { label: 'val:', type: 'property', detail: 'Valeur affichée' },
  { label: 'pct:', type: 'property', detail: 'Pourcentage 0–100' },
  { label: 'icon:', type: 'property', detail: 'Icône' },
  { label: 'date:', type: 'property', detail: 'Date ou période' },
  { label: 'delta:', type: 'property', detail: 'Variation' },
  { label: 'label:', type: 'property', detail: 'Étiquette' },
]

const SETTING_COMPLETIONS: Completion[] = [
  { label: 'subtitle', type: 'keyword', detail: 'Sous-titre du visuel' },
  { label: 'theme', type: 'keyword', detail: 'Thème, palette, police' },
]

function collectKeywords(specs: ElementSpec[], into: Map<string, string>): void {
  for (const spec of specs) {
    if (!into.has(spec.keyword)) into.set(spec.keyword, spec.description)
    if (spec.child && spec.child !== spec) collectKeywords([spec.child], into)
  }
}

function findCard(document: string): IdentityCard | undefined {
  const header = /^\s*@([A-Za-z]+)(\d*)(?:\s+style:([A-Za-z-]+))?/m.exec(document)
  if (!header) return undefined
  const [, family, variant, style] = header
  const familyCards = CARDS.filter(card => card.family === family || card.aliases.includes(`${family}${variant ?? ''}`))
  return familyCards.find(card => (style ? card.style === style : card.isDefaultStyle)) ?? familyCards[0]
}

function elementCompletions(card: IdentityCard | undefined): Completion[] {
  const keywords = new Map<string, string>()
  if (card) {
    collectKeywords(card.elements, keywords)
    for (const setting of card.settings) if (!keywords.has(setting.keyword)) keywords.set(setting.keyword, setting.description)
  }
  return [
    ...[...keywords].map(([label, detail]): Completion => ({ label, type: 'keyword', detail, boost: 10 })),
    ...SETTING_COMPLETIONS,
  ]
}

export function iconCompletionSource(context: CompletionContext): CompletionResult | null {
  const match = context.matchBefore(/icon:\s*"?([A-Za-z0-9_-]*)$/)
  if (!match) return null
  const colonIndex = match.text.indexOf(':')
  const quoteIndex = match.text.indexOf('"', colonIndex)
  const from = match.from + (quoteIndex !== -1 ? quoteIndex + 1 : colonIndex + 1)
  return { from, options: ICON_COMPLETIONS, validFor: /^[A-Za-z0-9_-]*$/ }
}

function headerCompletionSource(context: CompletionContext): CompletionResult | null {
  const match = context.matchBefore(/^@[A-Za-z]*$/)
  if (!match) return null
  return { from: match.from, options: HEADER_COMPLETIONS, validFor: /^@[A-Za-z]*$/ }
}

function lineCompletionSource(context: CompletionContext): CompletionResult | null {
  const line = context.state.doc.lineAt(context.pos)
  const before = line.text.slice(0, context.pos - line.from)
  if (/^\s+[A-Za-z]*$/.test(before)) {
    const word = context.matchBefore(/[A-Za-z]*$/)
    if (!word || (word.from === word.to && !context.explicit)) return null
    return { from: word.from, options: elementCompletions(findCard(context.state.doc.toString())), validFor: /^[A-Za-z]*$/ }
  }
  if (/^\s+[A-Za-z]+\s.*\s[a-z]*$/.test(before) && (before.match(/"/g) ?? []).length % 2 === 0) {
    const word = context.matchBefore(/[a-z]*$/)
    if (!word || (word.from === word.to && !context.explicit)) return null
    return { from: word.from, options: ATTRIBUTE_COMPLETIONS, validFor: /^[a-z]*:?$/ }
  }
  return null
}

export function templateDslUnifiedCompletionSource(context: CompletionContext): CompletionResult | null {
  return iconCompletionSource(context) ?? headerCompletionSource(context) ?? lineCompletionSource(context)
}

export const iconAutocompleteExtension = autocompletion({
  override: [templateDslUnifiedCompletionSource],
})
