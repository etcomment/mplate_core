export interface GanttTask {
  name: string
  id?: string
  start?: string
  end?: string
  duration?: number
  after?: string
  section?: string
}

function parseDuration(value: string): number | undefined {
  const m = /^(\d+(?:\.\d+)?)([dwmy]?)$/.exec(value)
  if (!m) return undefined
  return parseFloat(m[1]!)
}

function classifyPart(part: string): { type: 'id' | 'start' | 'after' | 'duration' | 'unknown'; value: string } {
  const trimmed = part.trim()

  if (/^after\s+\S+/i.test(trimmed)) {
    return { type: 'after', value: trimmed.replace(/^after\s+/i, '') }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { type: 'start', value: trimmed }
  }

  if (/^\d+(?:\.\d+)?[dwmy]?$/.test(trimmed)) {
    return { type: 'duration', value: trimmed }
  }

  if (/^[a-zA-Z]\w*$/.test(trimmed)) {
    return { type: 'id', value: trimmed }
  }

  return { type: 'unknown', value: trimmed }
}

const DEFAULT_PALETTE = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
  '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000',
  '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9',
];

function generateDefaultColors(sections: Record<string, GanttTask[]>): Record<string, string> {
  const colors: Record<string, string> = {};
  let index = 0;
  for (const tasks of Object.values(sections)) {
    for (const task of tasks) {
      const id = task.id ?? `task-${index}`
      colors[`task-${id}`] = DEFAULT_PALETTE[index % DEFAULT_PALETTE.length]!;
      index++;
    }
  }
  return colors;
}

export function parseGantt(dsl: string): { title?: string; dateFormat?: string; axisFormat?: string; excludes?: string; sections: Record<string, GanttTask[]>; colors?: Record<string, string> } {
  let title: string | undefined
  let dateFormat: string | undefined
  let axisFormat: string | undefined
  let excludes: string | undefined
  const sections: Record<string, GanttTask[]> = {}
  let currentSection = 'Default'
  const lines = dsl.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('%%') || /^gantt/i.test(trimmed)) continue

    if (/^(todayMarker|weekend|tickInterval)\b/i.test(trimmed)) continue

    const titleMatch = /^title\s+(.+)/i.exec(trimmed)
    if (titleMatch) { title = titleMatch[1]!.trim(); continue }

    const formatMatch = /^dateFormat\s+(.+)/i.exec(trimmed)
    if (formatMatch) { dateFormat = formatMatch[1]!.trim(); continue }

    const axisFormatMatch = /^axisFormat\s+(.+)/i.exec(trimmed)
    if (axisFormatMatch) { axisFormat = axisFormatMatch[1]!.trim(); continue }

    const excludesMatch = /^excludes\s+(.+)/i.exec(trimmed)
    if (excludesMatch) { excludes = (excludes ?? '') + ' ' + excludesMatch[1]!.trim(); continue }

    const sectionMatch = /^section\s+(.+)/i.exec(trimmed)
    if (sectionMatch) {
      currentSection = sectionMatch[1]!.trim()
      if (!sections[currentSection]) sections[currentSection] = []
      continue
    }

    const taskMatch = /^(.+?)\s*:/.exec(trimmed)
    if (taskMatch) {
      const taskName = taskMatch[1]!.trim()
      const rest = trimmed.slice(taskMatch[0].length).trim()
      const parts = rest.split(',').map(p => p.trim()).filter(Boolean)

      const tagPattern = /^(active|done|crit|milestone|vert)\b/i
      const dataParts = parts.filter(p => !tagPattern.test(p))

      const task: GanttTask = { name: taskName }

      for (const part of dataParts) {
        const classified = classifyPart(part)
        switch (classified.type) {
          case 'id':
            if (!task.id) task.id = classified.value
            break
          case 'start':
            task.start = classified.value
            break
          case 'after':
            task.after = classified.value
            break
          case 'duration':
            task.duration = parseDuration(classified.value)
            break
        }
      }

      if (!sections[currentSection]) sections[currentSection] = []
      sections[currentSection]!.push(task)
    }
  }

  return { title, dateFormat, axisFormat, excludes, sections, colors: generateDefaultColors(sections) }
}

export function isGantt(dsl: string): boolean {
  return /^\s*gantt/i.test(dsl)
}
