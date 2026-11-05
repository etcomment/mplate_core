import { useDiagramStore } from '../store/diagramStore'
import { useTemplateStore } from './store'

const FIT_MARGIN = 32

export function fitTemplateToCanvas(): void {
  const result = useTemplateStore.getState().result
  const canvas = document.querySelector('svg[data-canvas-svg="true"]')
  if (!result || !canvas) return
  const bounds = canvas.getBoundingClientRect()
  const scale = Math.min(1, (bounds.width - FIT_MARGIN * 2) / result.width, (bounds.height - FIT_MARGIN * 2) / result.height)
  if (!Number.isFinite(scale) || scale <= 0) return
  const rounded = Number(scale.toFixed(3))
  useDiagramStore.getState().setViewBox({
    x: Math.max(FIT_MARGIN, (bounds.width - result.width * rounded) / 2),
    y: FIT_MARGIN,
    scale: rounded,
  })
}
