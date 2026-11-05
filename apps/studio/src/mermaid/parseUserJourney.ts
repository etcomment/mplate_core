export interface JourneyTask {
  name: string
  score: number
  actors: string[]
}

export interface JourneySection {
  title: string
  tasks: JourneyTask[]
}

export interface JourneyData {
  title?: string
  sections: JourneySection[]
  colors?: Record<string, string>
}

const DEFAULT_PALETTE = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
  '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000',
  '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9',
];

function generateDefaultColors(sections: JourneySection[]): Record<string, string> {
  const colors: Record<string, string> = {};
  let index = 0;
  for (const section of sections) {
    for (const _ of section.tasks) {
      colors[`task-${index}`] = DEFAULT_PALETTE[index % DEFAULT_PALETTE.length]!;
      index++;
    }
  }
  return colors;
}

export function parseUserJourney(dsl: string): JourneyData {
  const sections: JourneySection[] = []
  let title: string | undefined
  const lines = dsl.split('\n')
  let currentSection: JourneySection | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('%%') || /^journey/i.test(trimmed)) continue

    const titleMatch = /^title\s+(.+)/i.exec(trimmed)
    if (titleMatch) { title = titleMatch[1]!.trim(); continue }

    const sectionMatch = /^section\s+(.+)/i.exec(trimmed)
    if (sectionMatch) {
      currentSection = { title: sectionMatch[1]!.trim(), tasks: [] }
      sections.push(currentSection)
      continue
    }

    if (currentSection) {
      const taskMatch = /^(.+?)\s*:\s*(\d+)\s*:\s*(.+)$/.exec(trimmed)
      if (taskMatch) {
        const name = taskMatch[1]!.trim()
        const score = parseInt(taskMatch[2]!, 10)
        const actors = taskMatch[3]!.split(',').map(a => a.trim())
        currentSection.tasks.push({ name, score, actors })
      }
    }
  }

  const result: JourneyData = { title, sections }
  result.colors = generateDefaultColors(sections)
  return result
}

export function isUserJourney(dsl: string): boolean {
  return /^\s*journey/i.test(dsl)
}
