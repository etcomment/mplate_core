import { useMemo, useRef, useEffect } from 'react'
import { useDiagramStore } from '../../store/diagramStore'
import { useDiagramDragResize } from '../../hooks/useDiagramDragResize'
import type { GitCommit } from '../../mermaid/parseGitGraph'

const BRANCH_COLORS = ['#4a90d9', '#e91e63', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4', '#ff5722', '#607d8b']
const COMMIT_R = 7
const LANE_W = 36
const COMMIT_SPACING = 42
const LABEL_W = 120
const TOP_OFFSET = 50

function computeBranchLanes(commits: GitCommit[], branchOrder: Map<string, number>): Map<string, number> {
  const lanes = new Map<string, number>()
  let nextLane = 0
  for (const commit of commits) {
    if (!lanes.has(commit.branch)) {
      const order = branchOrder.get(commit.branch)
      if (order !== undefined) {
        lanes.set(commit.branch, order)
      } else {
        lanes.set(commit.branch, nextLane++)
      }
    }
  }
  return lanes
}

interface CommitLayout {
  commit: GitCommit
  x: number
  y: number
  lane: number
  index: number
}

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

interface MergePath {
  from: { x: number; y: number }
  to: { x: number; y: number }
  color: string
  elementKey: string
}

export function GitGraphRenderer() {
  const svgRef = useRef<SVGGElement>(null)
  const diagramType = useDiagramStore(s => s.diagramType)
  const diagramData = useDiagramStore(s => s.diagramData)
  const diagramColors = useDiagramStore(s => s.diagramColors)
  const diagramStrokeColors = useDiagramStore(s => s.diagramStrokeColors)
  const diagramElementPositions = useDiagramStore(s => s.diagramElementPositions)
  const moveDiagramElement = useDiagramStore(s => s.moveDiagramElement)
  const resizeDiagramElement = useDiagramStore(s => s.resizeDiagramElement)
  const selectedIds = useDiagramStore(s => s.selectedDiagramElementIds)

  const { startDrag, renderHandles } = useDiagramDragResize(svgRef)

  const commits = (diagramData?.commits ?? []) as GitCommit[]
  const branchList = (diagramData?.branches as { name: string; order: number }[]) ?? []

  const branchOrder = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of branchList) map.set(b.name, b.order)
    return map
  }, [branchList])

  const layout = useMemo(() => {
    if (diagramType !== 'gitGraph' || commits.length === 0) {
      return { commitLayouts: [] as CommitLayout[], merges: [] as MergePath[], xBase: LABEL_W + 20 }
    }
    const commitLayouts: CommitLayout[] = []
    const merges: MergePath[] = []
    const lanes = computeBranchLanes(commits, branchOrder)
    const xBase = LABEL_W + 20
    const prevCommitByBranch = new Map<string, GitCommit>()

    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i]!
      const lane = lanes.get(commit.branch) ?? 0
      const x = xBase + lane * LANE_W
      const y = TOP_OFFSET + i * COMMIT_SPACING
      commitLayouts.push({ commit, x, y, lane, index: i })

      if (commit.type === 'merge') {
        const prev = prevCommitByBranch.get(commit.branch)
        if (prev) {
          const prevLayout = commitLayouts.find(cl => cl.commit.id === prev.id)
          if (prevLayout) {
            const prevLane = lanes.get(prev.branch) ?? 0
            merges.push({
              from: { x: xBase + prevLane * LANE_W, y: prevLayout.y },
              to: { x, y: y - COMMIT_SPACING / 2 },
              color: BRANCH_COLORS[lane % BRANCH_COLORS.length]!,
              elementKey: `merge-${commit.id}`,
            })
          }
        }
      }
      prevCommitByBranch.set(commit.branch, commit)
    }

    return { commitLayouts, merges, xBase }
  }, [commits, branchOrder, diagramType])

  const { commitLayouts, merges, xBase } = layout

  const computedRects = useMemo(() => {
    const map = new Map<string, Rect>()
    for (const { commit, x, y } of commitLayouts) {
      const elementKey = `commit-${commit.id}`
      const rectSize = COMMIT_R * 2 + 4
      map.set(elementKey, { x: x - rectSize / 2, y: y - rectSize / 2, width: rectSize, height: rectSize })
    }
    return map
  }, [commitLayouts])

  useEffect(() => {
    for (const [id, rect] of computedRects) {
      if (diagramElementPositions[id]) continue
      moveDiagramElement(id, { x: rect.x, y: rect.y })
      resizeDiagramElement(id, { width: rect.width, height: rect.height })
    }
  }, [computedRects, diagramElementPositions, moveDiagramElement, resizeDiagramElement])

  function getRect(id: string): Rect {
    const stored = diagramElementPositions[id]
    const computed = computedRects.get(id)
    if (stored) {
      return {
        x: stored.x,
        y: stored.y,
        width: stored.width || computed?.width || (COMMIT_R * 2 + 4),
        height: stored.height || computed?.height || (COMMIT_R * 2 + 4),
      }
    }
    return computed ?? { x: 0, y: 0, width: 0, height: 0 }
  }

  if (diagramType !== 'gitGraph') return null

  return (
    <g ref={svgRef}>
      {Array.from(branchOrder.entries()).map(([name, order]) => {
        const elementKey = `branch-${name}`
        const color = diagramColors[elementKey] ?? BRANCH_COLORS[order % BRANCH_COLORS.length]!
        const isSelected = selectedIds.has(elementKey)
        const cx = xBase + order * LANE_W

        const branchCommits = commitLayouts.filter(cl => cl.commit.branch === name)
        const firstY = branchCommits.length > 0 ? branchCommits[0]!.y : TOP_OFFSET
        const lastY = branchCommits.length > 0 ? branchCommits[branchCommits.length - 1]!.y : TOP_OFFSET + commits.length * COMMIT_SPACING

        return (
          <g key={name}>
            <text
              x={16}
              y={order * 20 + 30}
              fontFamily="Arial, sans-serif"
              fontSize={12}
              fontWeight={700}
              fill={color}
              style={{ cursor: 'pointer' }}
            >
              {name}
            </text>
            <line
              x1={cx}
              y1={firstY - COMMIT_SPACING / 2}
              x2={cx}
              y2={lastY + COMMIT_SPACING / 2}
              stroke={color}
              strokeWidth={isSelected ? 3 : 2}
              strokeOpacity={0.4}
              strokeDasharray={isSelected ? undefined : 'none'}
            />
          </g>
        )
      })}

      {merges.map((merge, i) => {
        const isSelected = selectedIds.has(merge.elementKey)
        return (
          <path
            key={`merge-${i}`}
            d={`M ${merge.from.x} ${merge.from.y} C ${merge.from.x} ${(merge.from.y + merge.to.y) / 2}, ${merge.to.x} ${(merge.from.y + merge.to.y) / 2}, ${merge.to.x} ${merge.to.y}`}
            fill="none"
            stroke={isSelected ? '#4a90d9' : merge.color}
            strokeWidth={isSelected ? 3 : 2}
            strokeDasharray={isSelected ? '4 2' : undefined}
            opacity={0.6}
            style={{ cursor: 'pointer' }}
          />
        )
      })}

      {commitLayouts.map(({ commit, lane }) => {
        const elementKey = `commit-${commit.id}`
        const rect = getRect(elementKey)
        const color = diagramColors[elementKey] ?? BRANCH_COLORS[lane % BRANCH_COLORS.length]!
        const isSelected = selectedIds.has(elementKey)
        const centerX = rect.x + rect.width / 2
        const centerY = rect.y + rect.height / 2

        return (
          <g key={commit.id} onMouseDown={e => startDrag(e, elementKey, rect)} style={{ cursor: 'pointer' }}>
            <circle
              cx={centerX}
              cy={centerY}
              r={COMMIT_R}
              fill={color}
              stroke={diagramStrokeColors[elementKey] || (isSelected ? '#4a90d9' : 'white')}
              strokeWidth={isSelected ? 2.5 : 1.5}
              strokeDasharray={isSelected ? '4 2' : undefined}
            />
            {commit.type === 'merge' && (
              <circle cx={centerX} cy={centerY} r={COMMIT_R - 2} fill="none" stroke="white" strokeWidth={1} opacity={0.5} />
            )}
            {commit.type === 'cherry-pick' && (
              <circle cx={centerX} cy={centerY} r={COMMIT_R - 2} fill="none" stroke="white" strokeWidth={1.5} strokeDasharray="2 2" opacity={0.7} />
            )}
            <text x={centerX + COMMIT_R + 8} y={centerY + 4} fontFamily="Arial, sans-serif" fontSize={11} fill="#333" fontWeight={500}>
              {commit.message}
            </text>
            <text x={centerX} y={centerY - COMMIT_R - 6} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={8} fill="#999">
              {commit.id}
            </text>
            {commit.tag && (
              <g transform={`translate(${centerX + COMMIT_R + 4}, ${centerY - COMMIT_R - 4})`}>
                <rect x={0} y={-1} width={commit.tag.length * 7 + 8} height={14} rx={3} fill="#ffd700" />
                <text x={4} y={10} fontFamily="Arial, sans-serif" fontSize={8} fontWeight={600} fill="#333">
                  {commit.tag}
                </text>
              </g>
            )}
            {isSelected && renderHandles(rect, elementKey)}
          </g>
        )
      })}
    </g>
  )
}
