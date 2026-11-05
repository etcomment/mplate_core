export interface TimelineEvent {
  date: string
  title: string
  description?: string
}

const DEFAULT_PALETTE = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
  '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000',
  '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9',
];

function generateDefaultColors(events: TimelineEvent[]): Record<string, string> {
  const colors: Record<string, string> = {};
  events.forEach((_, i) => {
    colors[`event-${i}`] = DEFAULT_PALETTE[i % DEFAULT_PALETTE.length]!;
  });
  return colors;
}

export function parseTimeline(dsl: string): { title?: string; sections?: Record<string, TimelineEvent[]>; events: TimelineEvent[]; colors?: Record<string, string> } {
  const events: TimelineEvent[] = []
  const sections: Record<string, TimelineEvent[]> = {}
  let currentSection = ''
  let lastDate = ''
  const lines = dsl.split('\n')

  let title: string | undefined

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('%%') || /^timeline/i.test(trimmed)) continue

    const titleMatch = /^title\s+(.+)/i.exec(trimmed)
    if (titleMatch) {
      title = titleMatch[1]!.trim()
      continue
    }

    const sectionMatch = /^section\s+(.+)/i.exec(trimmed)
    if (sectionMatch) {
      currentSection = sectionMatch[1]!.trim()
      if (!sections[currentSection]) sections[currentSection] = []
      continue
    }

    const continuationMatch = /^:\s*(.+)$/.exec(trimmed)
    if (continuationMatch) {
      const extra = continuationMatch[1]!.trim()
      if (lastDate) {
        const event: TimelineEvent = { date: lastDate, title: extra }
        if (currentSection) sections[currentSection]!.push(event)
        events.push(event)
      }
      continue
    }

    const eventMatch = /^(.+?)\s*:\s*(.+)$/.exec(trimmed)
    if (eventMatch) {
      const date = eventMatch[1]!.trim()
      lastDate = date
      const rest = eventMatch[2]!.trim()
      const parts = rest.split(':').map(p => p.trim())
      for (const part of parts) {
        const event: TimelineEvent = { date, title: part }
        if (currentSection) sections[currentSection]!.push(event)
        events.push(event)
      }
      continue
    }
  }

  return { title, sections: Object.keys(sections).length > 0 ? sections : undefined, events, colors: generateDefaultColors(events) }
}

export function isTimeline(dsl: string): boolean {
  return /^\s*timeline/i.test(dsl)
}
