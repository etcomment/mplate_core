export interface SubgraphStyle {
  fill: string
  stroke: string
  textColor: string
}

export function createDefaultSubgraphStyle(): SubgraphStyle {
  return {
    fill: '#f0f4ff',
    stroke: '#90a4d0',
    textColor: '#555',
  }
}
