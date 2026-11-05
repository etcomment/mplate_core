import { useEffect, useMemo, useRef } from 'react'
import { useDiagramStore } from '../../store/diagramStore'
import { useDiagramDragResize } from '../../hooks/useDiagramDragResize'

interface KanbanColumn {
  id: string
  title: string
}

interface KanbanTask {
  id: string
  title: string
  columnId: string
  modifiers: string[]
}

interface KanbanData {
  columns: KanbanColumn[]
  tasks: KanbanTask[]
  colors?: Record<string, string>
}

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

const COLUMN_WIDTH = 200
const COLUMN_GAP = 30
const HEADER_HEIGHT = 36
const CARD_MARGIN = 8
const CARD_PADDING = 10
const CARD_RADIUS = 6
const START_X = 30
const START_Y = 30
const TEXT_LINE_HEIGHT = 16
const BADGE_WIDTH = 40
const BADGE_HEIGHT = 14
const BADGE_GAP = 4
const BADGE_FONT_SIZE = 7
const STRIP_WIDTH = 4
const STRIP_OFFSET = 4
const MIN_CARD_HEIGHT = 56
const DEFAULT_COLUMN_BG = '#f5f5f5'
const DEFAULT_HEADER_BG = '#e0e0e0'
const SELECTION_STROKE = '#2196f3'
const DEFAULT_STRIP_COLOR = '#999'

const MODIFIER_COLORS: Record<string, string> = {
  crit: '#f44336',
  active: '#2196f3',
  done: '#4caf50',
}

const MODIFIER_LABELS: Record<string, string> = {
  crit: 'CRIT',
  active: 'ACTIVE',
  done: 'DONE',
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex
  if (normalized.length === 3) {
    const r = parseInt(normalized[0]! + normalized[0]!, 16)
    const g = parseInt(normalized[1]! + normalized[1]!, 16)
    const b = parseInt(normalized[2]! + normalized[2]!, 16)
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null
    return { r, g, b }
  }
  if (normalized.length !== 6) return null
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null
  return { r, g, b }
}

function darkenColor(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return DEFAULT_HEADER_BG
  const r = Math.max(0, rgb.r - 24)
  const g = Math.max(0, rgb.g - 24)
  const b = Math.max(0, rgb.b - 24)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if (word.length === 0) continue
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars) {
      if (current) {
        lines.push(current)
        current = word
      } else {
        lines.push(word)
      }
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines.length > 0 ? lines : [text]
}

function computeBadges(modifiers: string[]): { label: string; color: string }[] {
  const badges: { label: string; color: string }[] = []
  for (const modifier of modifiers) {
    const color = MODIFIER_COLORS[modifier]
    const label = MODIFIER_LABELS[modifier]
    if (color && label) {
      badges.push({ label, color })
    }
  }
  return badges
}

function cardHeightFromTitle(title: string, hasBadges: boolean): number {
  const lines = wrapText(title, 18)
  const textHeight = lines.length * TEXT_LINE_HEIGHT
  const badgeArea = hasBadges ? BADGE_HEIGHT + 4 : 0
  return Math.max(MIN_CARD_HEIGHT, CARD_PADDING + textHeight + CARD_PADDING + badgeArea)
}

function getStripColor(modifiers: string[]): string {
  if (modifiers.includes('crit')) return MODIFIER_COLORS.crit!
  if (modifiers.includes('active')) return MODIFIER_COLORS.active!
  if (modifiers.includes('done')) return MODIFIER_COLORS.done!
  return DEFAULT_STRIP_COLOR
}

function columnElementId(title: string): string {
  return `col-${title}`
}

function taskElementId(title: string): string {
  return `task-${title}`
}

export function KanbanRenderer() {
  const svgRef = useRef<SVGGElement>(null)
  const diagramType = useDiagramStore(s => s.diagramType)
  const diagramData = useDiagramStore(s => s.diagramData)
  const diagramColors = useDiagramStore(s => s.diagramColors)
  const diagramStrokeColors = useDiagramStore(s => s.diagramStrokeColors)
  const diagramElementPositions = useDiagramStore(s => s.diagramElementPositions)
  const selectedIds = useDiagramStore(s => s.selectedDiagramElementIds)
  const moveDiagramElement = useDiagramStore(s => s.moveDiagramElement)
  const resizeDiagramElement = useDiagramStore(s => s.resizeDiagramElement)

  const { startDrag, renderHandles } = useDiagramDragResize(svgRef)

  const data = (diagramType === 'kanban' && diagramData) ? diagramData as unknown as KanbanData : null

  const columns = data?.columns ?? []
  const tasks = data?.tasks ?? []

  const tasksByColumn = useMemo(() => {
    const map = new Map<string, KanbanTask[]>()
    for (const task of tasks) {
      const list = map.get(task.columnId) ?? []
      list.push(task)
      map.set(task.columnId, list)
    }
    return map
  }, [tasks])

  const computedRects = useMemo(() => {
    const rects = new Map<string, Rect>()
    if (!data) return rects
    let cardY = START_Y + HEADER_HEIGHT + CARD_MARGIN

    for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
      const column = columns[columnIndex]!
      const colX = START_X + columnIndex * (COLUMN_WIDTH + COLUMN_GAP)
      const colY = START_Y
      const colId = columnElementId(column.title)
      const colHeight = HEADER_HEIGHT

      rects.set(colId, { x: colX, y: colY, width: COLUMN_WIDTH, height: colHeight })

      const columnTasks = tasksByColumn.get(column.id) ?? []
      for (const task of columnTasks) {
        const taskId = taskElementId(task.title)
        const cardWidth = COLUMN_WIDTH - CARD_MARGIN * 2
        const badges = computeBadges(task.modifiers)
        const cardHeight = cardHeightFromTitle(task.title, badges.length > 0)
        const cardX = colX + CARD_MARGIN

        rects.set(taskId, {
          x: cardX,
          y: cardY,
          width: cardWidth,
          height: cardHeight,
        })
        cardY += cardHeight + CARD_MARGIN
      }

      cardY += CARD_MARGIN
    }
    return rects
  }, [columns, tasksByColumn])

  useEffect(() => {
    for (const [id, rect] of computedRects) {
      if (diagramElementPositions[id]) continue
      moveDiagramElement(id, { x: rect.x, y: rect.y })
      resizeDiagramElement(id, { width: rect.width, height: rect.height })
    }
  }, [computedRects, diagramElementPositions, moveDiagramElement, resizeDiagramElement])

  if (diagramType !== 'kanban' || !data) return null

  function getRect(id: string): Rect {
    const stored = diagramElementPositions[id]
    const computed = computedRects.get(id)
    if (stored) {
      return {
        x: stored.x,
        y: stored.y,
        width: stored.width || computed?.width || COLUMN_WIDTH - CARD_MARGIN * 2,
        height: stored.height || computed?.height || MIN_CARD_HEIGHT,
      }
    }
    return computed ?? { x: 0, y: 0, width: 0, height: 0 }
  }

  return (
    <g ref={svgRef}>
      {columns.map(column => {
        const colId = columnElementId(column.title)
        const rect = getRect(colId)
        const columnBg = diagramColors[colId] ?? data.colors?.[colId] ?? DEFAULT_COLUMN_BG
        const headerBg = darkenColor(columnBg)
        const isSelected = selectedIds.has(colId)
        const columnTasks = tasksByColumn.get(column.id) ?? []

        let columnBottom = rect.y + HEADER_HEIGHT + CARD_MARGIN
        for (const task of columnTasks) {
          const tr = getRect(taskElementId(task.title))
          columnBottom = Math.max(columnBottom, tr.y + tr.height + CARD_MARGIN)
        }

        return (
          <g key={column.id} onMouseDown={e => startDrag(e, colId, rect)} style={{ cursor: 'pointer' }}>
            <rect
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={columnBottom - rect.y}
              rx={CARD_RADIUS}
              ry={CARD_RADIUS}
              fill={columnBg}
              stroke="none"
            />
            <path
              d={`M ${rect.x} ${rect.y + HEADER_HEIGHT} L ${rect.x} ${rect.y + CARD_RADIUS} Q ${rect.x} ${rect.y} ${rect.x + CARD_RADIUS} ${rect.y} L ${rect.x + rect.width - CARD_RADIUS} ${rect.y} Q ${rect.x + rect.width} ${rect.y} ${rect.x + rect.width} ${rect.y + CARD_RADIUS} L ${rect.x + rect.width} ${rect.y + HEADER_HEIGHT} Z`}
              fill={headerBg}
            />
            <text
              x={rect.x + rect.width / 2}
              y={rect.y + HEADER_HEIGHT / 2 + 5}
              textAnchor="middle"
              fontFamily="Arial, sans-serif"
              fontSize={13}
              fontWeight={700}
              fill="#333"
              pointerEvents="none"
            >
              {column.title}
            </text>
            {isSelected && (
              <rect
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={columnBottom - rect.y}
                rx={CARD_RADIUS}
                ry={CARD_RADIUS}
                fill="none"
                stroke={SELECTION_STROKE}
                strokeWidth={2}
                strokeDasharray="4 2"
                pointerEvents="none"
              />
            )}
            {isSelected && renderHandles(rect, colId)}
          </g>
        )
      })}
      {columns.flatMap(column => {
        const columnTasks = tasksByColumn.get(column.id) ?? []
        return columnTasks.map(task => {
          const taskId = taskElementId(task.title)
          const rect = getRect(taskId)
          const isSelected = selectedIds.has(taskId)
          const badges = computeBadges(task.modifiers)
          const stripColor = getStripColor(task.modifiers)
          const lines = wrapText(task.title, 18)

          return (
            <g key={task.id} onMouseDown={e => startDrag(e, taskId, rect)} style={{ cursor: 'pointer' }}>
              <rect
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                rx={CARD_RADIUS}
                ry={CARD_RADIUS}
                fill="#fff"
                stroke={diagramStrokeColors[taskId] || '#ddd'}
                strokeWidth={1}
              />
              <rect
                x={rect.x + 2}
                y={rect.y + 4}
                width={STRIP_WIDTH}
                height={rect.height - 8}
                rx={2}
                ry={2}
                fill={stripColor}
                pointerEvents="none"
              />
              {lines.map((line, lineIndex) => (
                <text
                  key={`${task.id}-line-${lineIndex}`}
                  x={rect.x + STRIP_WIDTH + STRIP_OFFSET + CARD_PADDING + (rect.width - STRIP_WIDTH - STRIP_OFFSET - CARD_PADDING * 2) / 2}
                  y={rect.y + CARD_PADDING + 12 + lineIndex * TEXT_LINE_HEIGHT}
                  textAnchor="middle"
                  fontFamily="Arial, sans-serif"
                  fontSize={12}
                  fill="#333"
                  fontWeight={500}
                  pointerEvents="none"
                >
                  {line}
                </text>
              ))}
              {badges.length > 0 && (
                <>
                  {badges.map((badge, badgeIndex) => {
                    const totalBadgeWidth = badges.length * BADGE_WIDTH + (badges.length - 1) * BADGE_GAP
                    const badgesStartX = rect.x + rect.width - CARD_PADDING - totalBadgeWidth
                    const badgeY = rect.y + rect.height - CARD_PADDING - BADGE_HEIGHT
                    const badgeX = badgesStartX + badgeIndex * (BADGE_WIDTH + BADGE_GAP)
                    return (
                      <g key={`${task.id}-badge-${badge.label}`}>
                        <rect
                          x={badgeX}
                          y={badgeY}
                          width={BADGE_WIDTH}
                          height={BADGE_HEIGHT}
                          rx={3}
                          ry={3}
                          fill={badge.color}
                          pointerEvents="none"
                        />
                        <text
                          x={badgeX + BADGE_WIDTH / 2}
                          y={badgeY + BADGE_HEIGHT / 2 + 3}
                          textAnchor="middle"
                          fontFamily="Arial, sans-serif"
                          fontSize={BADGE_FONT_SIZE}
                          fontWeight={700}
                          fill="#fff"
                          pointerEvents="none"
                        >
                          {badge.label}
                        </text>
                      </g>
                    )
                  })}
                </>
              )}
              {isSelected && (
                <rect
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  rx={CARD_RADIUS}
                  ry={CARD_RADIUS}
                  fill="none"
                  stroke={SELECTION_STROKE}
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  pointerEvents="none"
                />
              )}
              {isSelected && renderHandles(rect, taskId)}
            </g>
          )
        })
      })}
    </g>
  )
}
