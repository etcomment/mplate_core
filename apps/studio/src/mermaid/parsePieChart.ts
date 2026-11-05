export interface PieSlice {
  label: string
  value: number
}

export interface PieData {
  title?: string
  showData?: boolean
  slices: PieSlice[]
  colors?: Record<string, string>
}

const DEFAULT_PALETTE = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
  '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000',
  '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9',
];

function generateDefaultColors(slices: PieSlice[]): Record<string, string> {
  const colors: Record<string, string> = {};
  slices.forEach((slice, i) => {
    colors[`slice-${slice.label}`] = DEFAULT_PALETTE[i % DEFAULT_PALETTE.length]!;
  });
  return colors;
}

export function parsePieChart(dsl: string): PieData {
  const data: PieData = { slices: [] }
  const lines = dsl.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('%%')) continue

    if (/^pie/i.test(trimmed)) {
      if (/\bshowData\b/i.test(trimmed)) data.showData = true
      const titleMatch = /^pie\s+title\s+(.+)/i.exec(trimmed)
      if (titleMatch) data.title = titleMatch[1]!.trim()
      continue
    }

    if (/^title\s+(.+)/i.test(trimmed) && !data.title) {
      const titleMatch = /^title\s+(.+)/i.exec(trimmed)
      if (titleMatch) data.title = titleMatch[1]!.trim()
      continue
    }

    if (trimmed.startsWith('accTitle')) continue

    const quoted = /^"([^"]+)"\s*:\s*([\d.]+)/.exec(trimmed)
    if (quoted) {
      data.slices.push({ label: quoted[1]!, value: parseFloat(quoted[2]!) })
      continue
    }

    const plain = /^(\w[\w\s-]*?)\s*:\s*([\d.]+)/.exec(trimmed)
    if (plain) {
      data.slices.push({ label: plain[1]!.trim(), value: parseFloat(plain[2]!) })
      continue
    }
  }

  data.colors = generateDefaultColors(data.slices)
  return data
}

export function isPieChart(dsl: string): boolean {
  return /^\s*pie/i.test(dsl)
}
