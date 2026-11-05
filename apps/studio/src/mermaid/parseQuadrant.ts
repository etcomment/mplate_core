export interface QuadrantData {
  title?: string
  xAxisLabel: string
  yAxisLabel: string
  quadrantLabels: string[]
  quadrants: { label: string; x: number; y: number }[]
  colors?: Record<string, string>
}

const DEFAULT_PALETTE = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
  '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000',
  '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9',
];

function generateDefaultColors(points: { label: string; x: number; y: number }[]): Record<string, string> {
  const colors: Record<string, string> = {};
  points.forEach((_, i) => {
    colors[`point-${i}`] = DEFAULT_PALETTE[i % DEFAULT_PALETTE.length]!;
  });
  return colors;
}

export function parseQuadrant(dsl: string): QuadrantData {
  const data: QuadrantData = { xAxisLabel: 'X', yAxisLabel: 'Y', quadrantLabels: ['Q1', 'Q2', 'Q3', 'Q4'], quadrants: [] }
  const lines = dsl.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('%%') || /^quadrantChart/i.test(trimmed)) continue

    const titleMatch = /^title\s+(.+)/i.exec(trimmed)
    if (titleMatch) { data.title = titleMatch[1]!.trim(); continue }

    const axisMatch = /^([xy])-axis\s+(.+)/i.exec(trimmed)
    if (axisMatch) {
      const axis = axisMatch[1]!.toLowerCase()
      const label = axisMatch[2]!.trim().replace(/\s*-->\s*/g, ' → ')
      if (axis === 'x') data.xAxisLabel = label
      else data.yAxisLabel = label
      continue
    }

    const quadrantMatch = /^quadrant-(\d)\s+(.+)/i.exec(trimmed)
    if (quadrantMatch) {
      const index = parseInt(quadrantMatch[1]!, 10) - 1
      if (index >= 0 && index < 4) {
        data.quadrantLabels[index] = quadrantMatch[2]!.trim()
      }
      continue
    }

    const pointMatch = /^(.+?)\s*:\s*\[?\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\]?$/i.exec(trimmed)
    if (pointMatch) {
      data.quadrants.push({
        label: pointMatch[1]!.trim(),
        x: parseFloat(pointMatch[2]!),
        y: parseFloat(pointMatch[3]!),
      })
    }
  }

  data.colors = generateDefaultColors(data.quadrants)
  return data
}

export function isQuadrant(dsl: string): boolean {
  return /^\s*quadrant/i.test(dsl)
}
