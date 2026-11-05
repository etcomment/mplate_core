export interface GitCommit {
  id: string
  message: string
  branch: string
  type?: 'commit' | 'merge' | 'cherry-pick'
  tag?: string
}

export interface GitBranch {
  name: string
  order: number
}

const DEFAULT_PALETTE = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
  '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000',
  '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9',
];

function generateDefaultColors(branches: GitBranch[]): Record<string, string> {
  const colors: Record<string, string> = {};
  branches.forEach((branch, i) => {
    colors[`branch-${branch.name}`] = DEFAULT_PALETTE[i % DEFAULT_PALETTE.length]!;
  });
  return colors;
}

export function parseGitGraph(dsl: string): { commits: GitCommit[]; branches: GitBranch[]; colors?: Record<string, string> } {
  const commits: GitCommit[] = []
  const branches: GitBranch[] = [{ name: 'main', order: 0 }]
  const branchOrder = new Map<string, number>([['main', 0]])
  let currentBranch = 'main'
  const lines = dsl.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('%%') || /^gitGraph/i.test(trimmed)) continue

    const branchMatch = /^branch\s+(\S+)(?:\s+order:\s*(\d+))?/i.exec(trimmed)
    if (branchMatch) {
      currentBranch = branchMatch[1]!
      const order = branchMatch[2] ? parseInt(branchMatch[2]!, 10) : branches.length
      if (!branchOrder.has(currentBranch)) {
        branchOrder.set(currentBranch, order)
        branches.push({ name: currentBranch, order })
      }
      continue
    }

    const checkoutMatch = /^checkout\s+(\S+)/i.exec(trimmed)
    if (checkoutMatch) {
      currentBranch = checkoutMatch[1]!
      continue
    }

    const commitMatch = /^commit\b(.*)/i.exec(trimmed)
    if (commitMatch) {
      const rest = commitMatch[1]!
      let id: string | undefined
      let commitType: string | undefined
      let commitTag: string | undefined

      const idMatch = /id:\s*"([^"]+)"/i.exec(rest)
      if (idMatch) id = idMatch[1]

      const typeMatch = /type:\s*(\w+)/i.exec(rest)
      if (typeMatch) commitType = typeMatch[1]

      const tagMatch = /tag:\s*"([^"]+)"/i.exec(rest)
      if (tagMatch) commitTag = tagMatch[1]

      id = id ?? `c${commits.length}`

      let mappedType: 'commit' | 'merge' | 'cherry-pick' | undefined
      if (commitType?.toLowerCase() === 'merge') mappedType = 'merge'
      else if (commitType?.toLowerCase() === 'cherry-pick') mappedType = 'cherry-pick'

      commits.push({ id, message: id, branch: currentBranch, type: mappedType, tag: commitTag })
      continue
    }

    const cherryPickMatch = /^cherry-pick\s+id:\s*"([^"]+)"/i.exec(trimmed)
    if (cherryPickMatch) {
      const cherryId = cherryPickMatch[1]!
      commits.push({ id: `cp-${cherryId}`, message: `Cherry-pick ${cherryId}`, branch: currentBranch, type: 'cherry-pick' })
      continue
    }

    const mergeMatch = /^merge\s+(\S+)\b(.*)/i.exec(trimmed)
    if (mergeMatch) {
      const id = `m${commits.length}`
      commits.push({ id, message: `Merge ${mergeMatch[1]!}`, branch: currentBranch, type: 'merge' })
    }
  }

  return { commits, branches, colors: generateDefaultColors(branches) }
}

export function isGitGraph(dsl: string): boolean {
  return /^\s*gitGraph/i.test(dsl)
}
