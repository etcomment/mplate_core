import { brainArc } from './brain/arc.js'
import { brainSpokes } from './brain/spokes.js'
import { cardsGrid } from './cards/grid.js'
import { comparisonColumns } from './comparison/columns.js'
import { comparisonTable } from './comparison/table.js'
import { cycleOrbit } from './cycle/orbit.js'
import { cycleRing } from './cycle/ring.js'
import { funnelBars } from './funnel/bars.js'
import { funnelStack } from './funnel/stack.js'
import { kpiGauges } from './kpi/gauges.js'
import { kpiTiles } from './kpi/tiles.js'
import { TemplateRegistry } from './lookup.js'
import { matrixQuadrant } from './matrix/quadrant.js'
import { matrixSwot } from './matrix/swot.js'
import { orgTree } from './org/tree.js'
import { processChevrons } from './process/chevrons.js'
import { processLoop } from './process/loop.js'
import { processSteps } from './process/steps.js'
import { processVertical } from './process/vertical.js'
import { pyramidLayers } from './pyramid/layers.js'
import { stackLayers } from './stack/layers.js'
import { timelineAxis } from './timeline/axis.js'
import { timelineGantt } from './timeline/gantt.js'
import { timelineSwimlanes } from './timeline/swimlanes.js'
import { timelineVertical } from './timeline/vertical.js'
import type { TemplateDefinition } from './types.js'
import { vennCircles } from './venn/circles.js'

export const BUILT_IN_TEMPLATES: TemplateDefinition[] = [
  processChevrons,
  processSteps,
  processVertical,
  processLoop,
  timelineAxis,
  timelineVertical,
  timelineSwimlanes,
  timelineGantt,
  funnelStack,
  funnelBars,
  pyramidLayers,
  cycleRing,
  cycleOrbit,
  brainSpokes,
  brainArc,
  cardsGrid,
  kpiTiles,
  kpiGauges,
  comparisonColumns,
  comparisonTable,
  matrixQuadrant,
  matrixSwot,
  orgTree,
  stackLayers,
  vennCircles,
]

export const registry = new TemplateRegistry(BUILT_IN_TEMPLATES)
