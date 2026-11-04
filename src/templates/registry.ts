import { brainArc } from './brain/arc.js'
import { brainSpokes } from './brain/spokes.js'
import { cardsGrid } from './cards/grid.js'
import { comparisonColumns } from './comparison/columns.js'
import { cycleRing } from './cycle/ring.js'
import { funnelStack } from './funnel/stack.js'
import { kpiTiles } from './kpi/tiles.js'
import { TemplateRegistry } from './lookup.js'
import { matrixQuadrant } from './matrix/quadrant.js'
import { orgTree } from './org/tree.js'
import { processChevrons } from './process/chevrons.js'
import { processSteps } from './process/steps.js'
import { pyramidLayers } from './pyramid/layers.js'
import { timelineAxis } from './timeline/axis.js'
import { timelineVertical } from './timeline/vertical.js'
import type { TemplateDefinition } from './types.js'

export const BUILT_IN_TEMPLATES: TemplateDefinition[] = [
  processChevrons,
  processSteps,
  timelineAxis,
  timelineVertical,
  funnelStack,
  pyramidLayers,
  cycleRing,
  brainSpokes,
  brainArc,
  cardsGrid,
  kpiTiles,
  comparisonColumns,
  matrixQuadrant,
  orgTree,
]

export const registry = new TemplateRegistry(BUILT_IN_TEMPLATES)
