import { useDiagramStore } from '../store/diagramStore'
import { Collapsible } from '../ui/Collapsible'
import { ColorGrid } from '../ui/ColorGrid'

const COLORS = [
  '#f44336', '#e91e63', '#9c27b0', '#673ab7',
  '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688',
  '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107',
  '#ff9800', '#ff5722', '#795548', '#9e9e9e', '#607d8b',
  '#333333', '#666666', '#90a4d0', '#f0f4ff',
]

export function SubgraphStylePanel() {
  const subgraphStyle = useDiagramStore(s => s.subgraphStyle)
  const updateSubgraphStyle = useDiagramStore(s => s.updateSubgraphStyle)
  const subgraphGroups = useDiagramStore(s => s.subgraphGroups)

  if (subgraphGroups.length === 0) return null

  return (
    <Collapsible title="Subgraph Style">
      <ColorGrid
        label="Stroke"
        colors={COLORS}
        value={subgraphStyle.stroke}
        onSelect={color => updateSubgraphStyle({ stroke: color })}
      />
      <ColorGrid
        label="Background"
        colors={COLORS.filter(c => c !== '#ffffff')}
        value={subgraphStyle.fill}
        onSelect={color => updateSubgraphStyle({ fill: color })}
      />
      <ColorGrid
        label="Text"
        colors={['#333333', '#666666', '#ffffff']}
        value={subgraphStyle.textColor}
        onSelect={color => updateSubgraphStyle({ textColor: color })}
      />
    </Collapsible>
  )
}
