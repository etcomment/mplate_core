export interface MindmapNode {
  id: string
  text: string
  children: MindmapNode[]
}

function stripIcon(text: string): string {
  return text.replace(/^::icon\([^)]*\)\s*/, '')
}

function cleanNodeText(text: string): string {
  let t = text.replace(/^root\(\((.+)\)\)$/, '$1').replace(/^\w+\(\((.+)\)\)$/, '$1').replace(/^\(\((.+)\)\)$/, '$1')
  t = t.replace(/^\w+\[\((.+)\)\]$/, '$1')
  t = t.replace(/^\w+\[\[(.+)\]\]$/, '$1')
  t = t.replace(/^\w+\["([^"]*)"\]$/, '$1')
  t = t.replace(/^\w+\(([^)]+)\)$/, '$1')
  t = t.replace(/^\w+\[([^\]]+)\]$/, '$1')
  t = t.replace(/^\w+\{([^}]+)\}$/, '$1')
  t = t.replace(/^\w+\{\{([^}]+)\}\}$/, '$1')
  t = t.replace(/^"`([^`]*)`"$/, '$1')
  t = stripIcon(t)
  return t
}

const DEFAULT_PALETTE = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
  '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000',
  '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9',
];

function collectNodes(root: MindmapNode | null): MindmapNode[] {
  if (!root) return [];
  const result: MindmapNode[] = [];
  function walk(node: MindmapNode) {
    result.push(node);
    for (const child of node.children) walk(child);
  }
  walk(root);
  return result;
}

function generateDefaultColors(root: MindmapNode | null): Record<string, string> {
  const colors: Record<string, string> = {};
  const nodes = collectNodes(root);
  nodes.forEach((node, i) => {
    colors[`node-${node.text}`] = DEFAULT_PALETTE[i % DEFAULT_PALETTE.length]!;
  });
  return colors;
}

export function parseMindmap(dsl: string): { root: MindmapNode | null; colors?: Record<string, string> } {
  const lines = dsl.split('\n')
  let root: MindmapNode | null = null
  const stack: { indent: number; node: MindmapNode }[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('%%') || /^(mindmap|md)\b/i.test(trimmed)) continue

    const indent = line.length - line.trimStart().length
    let text = trimmed.replace(/^[*-]\s*/, '')
    text = cleanNodeText(text.trim())

    if (!text) continue

    const node: MindmapNode = { id: `mm-${Math.random().toString(36).slice(2, 8)}`, text, children: [] }

    while (stack.length > 0 && stack[stack.length - 1]!.indent >= indent) {
      stack.pop()
    }

    if (root === null) {
      root = node
    } else if (stack.length === 0) {
      root.children.push(node)
    } else {
      stack[stack.length - 1]!.node.children.push(node)
    }

    stack.push({ indent, node })
  }

  return { root, colors: generateDefaultColors(root) }
}

export function isMindmap(dsl: string): boolean {
  return /^\s*(mindmap|md)\b/i.test(dsl)
}
