import { listIcons } from './icons/index.js'
import { registry } from './templates/registry.js'
import type { ElementSpec, IdentityCard } from './templates/types.js'
import { BUILT_IN_THEMES } from './theme/themes.js'

function describeElement(spec: ElementSpec, indent: string = ''): string[] {
  const positional = spec.positional.map((field) => `"${field}"`).join(' ')
  const aliases = spec.aliases && spec.aliases.length > 0 ? ` (aliases: ${spec.aliases.join(', ')})` : ''
  const flags = spec.flags && spec.flags.length > 0 ? ` — flags: ${spec.flags.join(', ')}` : ''
  const lines = [`${indent}- \`${spec.keyword} ${positional}\`${aliases}: ${spec.description}${flags}`]
  if (spec.child === spec) lines.push(`${indent}  - \`${spec.keyword}\` lines can be indented under each other to any depth`)
  else if (spec.child) lines.push(...describeElement(spec.child, `${indent}  `).map((line) => `${line} (indented under ${spec.keyword})`))
  return lines
}

export function formatCard(card: IdentityCard): string {
  const header = card.isDefaultStyle ? `@${card.family}  or  @${card.family} style:${card.style}` : `@${card.family} style:${card.style}`
  const lines = [
    `## ${card.name} — \`${card.id}\``,
    '',
    card.description,
    '',
    `- Header: \`${header}\`${card.aliases.length > 0 ? ` (aliases: ${card.aliases.map((alias) => `@${alias}`).join(', ')})` : ''}`,
    `- Elements: ${card.items.min} to ${card.items.max} (best with ${card.items.recommended[0]} to ${card.items.recommended[1]})`,
    `- Good for: ${card.useCases.join('; ')}`,
    '',
    'Element lines:',
    ...card.elements.flatMap((spec) => describeElement(spec)),
  ]
  if (card.settings.length > 0) {
    lines.push('', 'Settings (at most once):')
    for (const setting of card.settings) lines.push(`- \`${setting.keyword} ${setting.arguments.map((name) => `"${name}"`).join(' ')}\`: ${setting.description}`)
  }
  lines.push('', 'Example:', '', '```mplate', card.example, '```')
  return lines.join('\n')
}

export function listTemplates(): IdentityCard[] {
  return registry.cards()
}

export function describeTemplate(id: string): IdentityCard | undefined {
  const [family, style] = id.replace(/^@/, '').split(/[:\s]+/)
  const direct = registry.byId(id)
  if (direct) return direct.card
  if (!family) return undefined
  return registry.find(family, undefined, style).template?.card
}

export const GRAMMAR = `# mplate DSL

One header line, then one line per element. Indentation creates children.

\`\`\`mplate
@<family> [style:<style>] ["Optional title"] [theme:<name>] [width:<px>]
  subtitle "Optional subtitle under the title"
  theme [name] [palette:"#hex,#hex,..."] [font:"Family"] [background:#hex]
  <keyword> "title" "subtitle" [key:value ...] [flag ...] [#hex]
    <child-keyword> "text" [flag ...]
// comment
\`\`\`

Rules:
- Text values are quoted with "double" or 'single' quotes; \\n inserts a line break.
- Common attributes on any element: \`val:\` (figure), \`pct:\` (0–100), \`icon:\` (icon name), \`date:\`, \`delta:\`, \`label:\`, \`sub:\` (subtitle), \`color:\`.
- Colours: a trailing \`#hex\`, or \`color:accent2\` (palette slot), or \`color:positive|negative|warning|text|textMuted\`. Without a colour, elements take the theme palette in order; beyond the palette length, shades are generated.
- Prefer theme colours: only hard-code a colour when it carries meaning.
- The same content renders with 1 to N elements: add or remove lines and the layout adapts.
`

export function syntaxGuide(): string {
  const themes = Object.values(BUILT_IN_THEMES).map((theme) => `- \`${theme.name}\`: ${theme.description}`)
  return [
    GRAMMAR,
    '## Themes',
    '',
    ...themes,
    '',
    '## Icons',
    '',
    listIcons().join(', '),
    '',
    '# Templates',
    '',
    ...listTemplates().map((card) => formatCard(card) + '\n'),
  ].join('\n')
}
