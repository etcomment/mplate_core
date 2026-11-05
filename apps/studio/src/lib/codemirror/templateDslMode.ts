import { StreamLanguage, type StreamParser } from '@codemirror/language'
import { templateDslUnifiedCompletionSource } from './iconAutocomplete'

import { listTemplates, type ElementSpec } from '@mplate/core'

function collectKeywords(specs: ElementSpec[], into: Set<string>): void {
  for (const spec of specs) {
    into.add(spec.keyword)
    for (const alias of spec.aliases ?? []) into.add(alias)
    if (spec.child && spec.child !== spec) collectKeywords([spec.child], into)
  }
}

const DIRECTIVE_KEYWORDS = new Set(['subtitle', 'theme', 'style', 'width', 'background'])

const ITEM_KEYWORDS = new Set<string>()
for (const card of listTemplates()) {
  collectKeywords(card.elements, ITEM_KEYWORDS)
  for (const setting of card.settings) DIRECTIVE_KEYWORDS.add(setting.keyword)
}

const KV_PREFIX = /^(val|pct|icon|date|delta|label|style|theme|width|palette|font|background):/

const templateDslParser: StreamParser<Record<string, never>> = {
  name: 'templateDsl',
  startState: () => ({}),
  token(stream) {
    if (stream.eatSpace()) return null

    if (stream.match(/^\/\//) || (stream.column() === stream.indentation() && stream.match(/^# /))) {
      stream.skipToEnd()
      return 'lineComment'
    }

    if (stream.match(/^@[A-Za-z][\w-]*/)) return 'meta'

    const word = stream.match(/^([\w-]+)/)
    if (word && typeof word !== 'boolean') {
      const value = word[1]!
      if (DIRECTIVE_KEYWORDS.has(value)) return 'keyword'
      if (ITEM_KEYWORDS.has(value)) return 'keyword'
      if (KV_PREFIX.test(value + 'x')) return 'propertyName'
      return 'variableName'
    }

    if (stream.match(/^"([^"]*)"|^'([^']*)'/)) return 'string'
    if (stream.match(/^#[0-9a-fA-F]{3,8}\b/)) return 'color'
    if (stream.match(/^\d+(\.\d+)?[%$€£¥]?/)) return 'number'
    if (stream.match(/^->/)) return 'operator'
    if (stream.match(/^[{}[\]()]/)) return 'bracket'
    if (stream.match(/^:/)) return 'operator'

    stream.next()
    return null
  },
}

export const templateDslLanguage = StreamLanguage.define(templateDslParser)
export const templateDslAutocomplete = templateDslLanguage.data.of({
  autocomplete: templateDslUnifiedCompletionSource,
})
