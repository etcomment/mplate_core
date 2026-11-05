import type { IdentityCard } from '../src/templates/types.js'

interface Block {
  lines: string[]
  isElement: boolean
}

function splitBlocks(card: IdentityCard): { header: string; blocks: Block[] } {
  const [header, ...rest] = card.example.split('\n')
  const elementKeywords = new Set(card.elements.flatMap((spec) => [spec.keyword, ...(spec.aliases ?? [])]))
  const blocks: Block[] = []
  for (const line of rest) {
    const indent = line.length - line.trimStart().length
    const keyword = line.trim().split(/\s+/)[0] ?? ''
    const isTopLevel = indent <= 2
    if (isTopLevel) blocks.push({ lines: [line], isElement: elementKeywords.has(keyword) })
    else blocks[blocks.length - 1]?.lines.push(line)
  }
  return { header: header ?? '', blocks }
}

export function sampleCounts(card: IdentityCard): number[] {
  const counts = [1, 4, 10, 30].map((count) => Math.min(card.items.max, Math.max(card.items.min, count)))
  return [...new Set(counts)]
}

export function generateDsl(card: IdentityCard, count: number): string {
  const { header, blocks } = splitBlocks(card)
  const settings = blocks.filter((block) => !block.isElement)
  const elements = blocks.filter((block) => block.isElement)
  const generated: string[] = []
  for (let index = 0; index < count; index++) {
    const source = elements[index % elements.length]!
    const cycle = Math.floor(index / elements.length)
    const lines = cycle === 0 ? source.lines : source.lines.map((line, position) => (position === 0 ? line.replace(/"([^"]*)"/, `"$1 ${cycle + 1}"`) : line))
    generated.push(...lines)
  }
  return [header, ...settings.flatMap((block) => block.lines), ...generated].join('\n')
}
