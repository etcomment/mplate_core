import { StreamLanguage, type StreamParser } from '@codemirror/language'

const DIAGRAM_KEYWORDS = new Set([
  'graph', 'flowchart', 'subgraph', 'end', 'direction',
  'sequenceDiagram', 'participant', 'actor', 'activate', 'deactivate',
  'loop', 'alt', 'else', 'opt', 'par', 'critical', 'rect', 'Note', 'Notes',
  'stateDiagram', 'stateDiagram-v2',
  'classDiagram', 'class',
  'erDiagram', 'entity', 'key', 'relationship',
  'gantt', 'dateFormat', 'axisFormat', 'todayMarker', 'section', 'task', 'done',
  'active', 'crit', 'milestone', 'after',
  'pie', 'title',
  'gitGraph', 'commit', 'branch', 'checkout', 'merge', 'reset', 'tag',
  'mindmap', 'root', 'plus',
  'timeline', 'period',
  'xyChart', 'x-axis', 'y-axis', 'subplot', 'line', 'bar',
  'quadrantChart', 'quadrant-1', 'quadrant-2', 'quadrant-3', 'quadrant-4',
  'journey', 'sankey', 'link', 'kanban', 'task', 'extra',
  'C4Context', 'C4Container', 'C4Component', 'C4Deployment', 'Person', 'Person_Ext',
  'System', 'System_Ext', 'Container', 'ContainerDb', 'Component', 'Db', 'Queue', 'External_Entity',
  'zenuml', 'autoNumber', 'if', 'while', 'option',
])

const DIRECTIONS = new Set(['TB', 'BT', 'LR', 'RL', 'TD'])

const EDGE_PATTERN = /^<{1,2}[-=~.]{2,}>|^[-=~.]{2,}[a-z]?|^<--[a-z]|^o--|^--o|^x--|^--x/

const NODE_BRACKETS = /^\(\(|^\)\)|^\[\[|^\]\]|^\[\(|^\)\]|^\{\{|^\}\}|^\[|^\]|^\(|^\)|^\{|\}|^\{\s*$/

const mermaidParser: StreamParser<Record<string, never>> = {
  name: 'mermaid',
  startState: () => ({}),
  token(stream) {
    if (stream.eatSpace()) return null

    if (stream.match(/^%%\{/)) {
      stream.skipToEnd()
      return 'meta'
    }
    if (stream.match(/^%%/)) {
      stream.skipToEnd()
      return 'lineComment'
    }

    const word = stream.match(/^([\w-]+)/)
    if (word && typeof word !== 'boolean') {
      const value = word[1]!
      if (DIAGRAM_KEYWORDS.has(value)) return 'keyword'
      if (DIRECTIONS.has(value)) return 'keyword'
      return 'variableName'
    }

    if (stream.match(/^"([^"]*)"|^'([^']*)'/)) return 'string'
    if (stream.match(/^#[0-9a-fA-F]{3,8}\b/)) return 'color'
    if (stream.match(/^\d+(\.\d+)?/)) return 'number'

    if (stream.match(EDGE_PATTERN)) return 'operator'
    if (stream.match(NODE_BRACKETS)) return 'bracket'
    if (stream.match(/^[:;]/)) return 'operator'
    if (stream.match(/^[,.]/)) return 'operator'

    stream.next()
    return null
  },
}

export const mermaidLanguage = StreamLanguage.define(mermaidParser)
