import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const nodesPath = require.resolve('lucide-static/icon-nodes.json')
const allNodes = JSON.parse(readFileSync(nodesPath, 'utf8'))
const version = JSON.parse(readFileSync(require.resolve('lucide-static/package.json'), 'utf8')).version

const selected = `activity alarm-clock arrow-down arrow-right arrow-up award badge-check banknote battery bell book-open bot brain briefcase building calendar camera chart-bar chart-column chart-line chart-pie check circle-check circle-dollar-sign circle-x clipboard-list clock cloud code cog compass cpu credit-card database dollar-sign droplet euro eye factory file-text flag flame folder gauge gem gift git-branch globe graduation-cap hammer handshake heart house hourglass image key landmark laptop layers leaf lightbulb link lock mail map map-pin megaphone message-circle mic monitor moon mountain package palette pen-tool phone play puzzle recycle refresh-cw rocket ruler scale search send server settings share-2 shield shield-check shopping-cart smartphone sparkles star sun tag target thumbs-up timer trending-down trending-up trophy truck umbrella user user-check users wallet wifi wrench x zap`.split(/\s+/)

const missing = selected.filter((name) => !allNodes[name])
if (missing.length > 0) {
  console.error(`Unknown Lucide icons: ${missing.join(', ')}`)
  process.exit(1)
}

const entries = selected.map((name) => `  ${JSON.stringify(name)}: ${JSON.stringify(allNodes[name])},`).join('\n')
const output = `import type { IconNode } from './types.js'

export const LUCIDE_VERSION = ${JSON.stringify(version)}

export const LUCIDE_ICONS: Record<string, IconNode> = {
${entries}
}
`
writeFileSync(new URL('../src/icons/lucide.generated.ts', import.meta.url), output)
console.log(`Wrote ${selected.length} icons from lucide-static ${version}`)
