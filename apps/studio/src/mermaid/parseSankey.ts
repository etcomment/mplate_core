export interface SankeyLink {
  source: string
  target: string
  value: number
}

const DEFAULT_PALETTE = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
  '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000',
  '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9',
];

function generateDefaultColors(nodes: string[]): Record<string, string> {
  const colors: Record<string, string> = {};
  nodes.forEach((node, i) => {
    colors[`node-${node}`] = DEFAULT_PALETTE[i % DEFAULT_PALETTE.length]!;
  });
  return colors;
}

export function parseSankey(dsl: string): { links: SankeyLink[]; nodes: string[]; colors?: Record<string, string> } {
  const links: SankeyLink[] = []
  const nodeSet = new Set<string>()
  const lines = dsl.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('%%') || /^sankey-beta/i.test(trimmed)) continue

    const parts = trimmed.split(',').map(p => p.trim())
    if (parts.length >= 3) {
      const source = parts[0]!
      const target = parts[1]!
      const value = parseFloat(parts[2]!)
      if (!isNaN(value) && source && target) {
        links.push({ source, target, value })
        nodeSet.add(source)
        nodeSet.add(target)
      }
    }
  }

  return { links, nodes: Array.from(nodeSet), colors: generateDefaultColors(Array.from(nodeSet)) }
}

export function isSankey(dsl: string): boolean {
  return /^\s*sankey-beta/i.test(dsl)
}
