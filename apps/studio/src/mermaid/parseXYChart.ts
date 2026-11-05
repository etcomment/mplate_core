export interface XYSeries {
  label: string
  data: number[]
}

export interface XYChartData {
  title?: string
  xLabels: string[]
  xTitle?: string
  yLabel?: string
  yMin?: number
  yMax?: number
  series: XYSeries[]
  chartType: 'bar' | 'line'
  orientation?: 'vertical' | 'horizontal'
  colors?: Record<string, string>
}

const DEFAULT_PALETTE = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
  '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000',
  '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9',
];

function generateDefaultColors(series: XYSeries[]): Record<string, string> {
  const colors: Record<string, string> = {};
  series.forEach((s, i) => {
    colors[`series-${s.label}`] = DEFAULT_PALETTE[i % DEFAULT_PALETTE.length]!;
  });
  return colors;
}

function extractValues(text: string): number[] {
  return text.split(',').map(v => {
    const m = /^[+-]?[\d.]+/.exec(v.trim())
    return m ? parseFloat(m[0]) : 0
  })
}

export function parseXYChart(dsl: string): XYChartData {
  const data: XYChartData = { xLabels: [], series: [], chartType: 'bar' }
  const lines = dsl.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('%%') || /^xychart-beta/i.test(trimmed)) continue

    if (/^xychart\s+horizontal/i.test(trimmed)) {
      data.orientation = 'horizontal'
      continue
    }

    const titleMatch = /^title\s+"([^"]+)"/i.exec(trimmed)
    if (titleMatch) { data.title = titleMatch[1]!; continue }

    const xCategorical = /^x-axis(?:\s+"([^"]+)")?\s+\[(.+)\]/i.exec(trimmed)
    if (xCategorical) {
      if (xCategorical[1]) data.xTitle = xCategorical[1]
      data.xLabels = xCategorical[2]!.split(',').map(s => s.trim().replace(/"/g, ''))
      continue
    }

    const xNumeric = /^x-axis\s+(.+?)\s+([\d.-]+)\s*-->\s*([\d.-]+)$/i.exec(trimmed)
    if (xNumeric) {
      data.xTitle = xNumeric[1]!.trim()
      continue
    }

    const xSimpleCategorical = /^x-axis\s+\[(.+)\]/.exec(trimmed)
    if (xSimpleCategorical) {
      data.xLabels = xSimpleCategorical[1]!.split(',').map(s => s.trim().replace(/"/g, ''))
      continue
    }

    const yWithRange = /^y-axis\s+"([^"]+)"\s+([\d.-]+)\s*-->\s*([\d.-]+)$/i.exec(trimmed)
    if (yWithRange) {
      data.yLabel = yWithRange[1]!
      data.yMin = parseFloat(yWithRange[2]!)
      data.yMax = parseFloat(yWithRange[3]!)
      continue
    }

    const ySimple = /^y-axis\s+"([^"]+)"/i.exec(trimmed)
    if (ySimple) { data.yLabel = ySimple[1]!; continue }

    const barWithName = /^bar\s+"([^"]+)"\s+\[(.+)\]/.exec(trimmed)
    if (barWithName) {
      data.series.push({ label: barWithName[1]!, data: extractValues(barWithName[2]!) })
      continue
    }

    const barSimple = /^bar\s+\[(.+)\]/.exec(trimmed)
    if (barSimple) {
      data.series.push({ label: data.series.length === 0 ? 'Bar' : `Bar ${data.series.length + 1}`, data: extractValues(barSimple[1]!) })
      continue
    }

    const lineWithName = /^line\s+"([^"]+)"\s+\[(.+)\]/.exec(trimmed)
    if (lineWithName) {
      data.chartType = 'line'
      data.series.push({ label: lineWithName[1]!, data: extractValues(lineWithName[2]!) })
      continue
    }

    const lineSimple = /^line\s+\[(.+)\]/.exec(trimmed)
    if (lineSimple) {
      data.chartType = 'line'
      data.series.push({ label: data.series.length === 0 ? 'Line' : `Line ${data.series.length + 1}`, data: extractValues(lineSimple[1]!) })
      continue
    }
  }

  data.colors = generateDefaultColors(data.series)
  return data
}

export function isXYChart(dsl: string): boolean {
  return /^\s*xychart-beta/i.test(dsl)
}
