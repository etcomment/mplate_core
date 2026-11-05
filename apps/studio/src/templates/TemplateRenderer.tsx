import { useLayoutEffect, useMemo, useRef, type ReactElement } from 'react'
import { useTemplateStore, type Rect } from './store'
import { useTemplateDragResize } from './useTemplateDragResize'
import { elementTransform, isTopLevelId, parentIdOf, projectRect } from './geometry'

const ID_ATTRIBUTE = 'data-mplate-id'
const SHAPE_SELECTOR = ':is(rect, path, circle, ellipse, polygon, polyline, line)'

interface SvgContent {
  markup: string
  fontFamily: string
}

function extractContent(svg: string): SvgContent {
  const open = /^<svg\b[^>]*>/.exec(svg.trim())
  const fontFamily = open ? /font-family="([^"]*)"/.exec(open[0])?.[1] ?? '' : ''
  const inner = svg.trim().replace(/^<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title>[\s\S]*?<\/title>/, '')
  return { markup: inner, fontFamily: fontFamily.replace(/&apos;/g, "'").replace(/&quot;/g, '"') }
}

function cssEscape(id: string): string {
  return id.replace(/["\\]/g, '\\$&')
}

function buildElementCss(hidden: ReadonlySet<string>, strokeColors: Record<string, string>, strokeWidths: Record<string, number>): string {
  const rules: string[] = [`[${ID_ATTRIBUTE}] { pointer-events: bounding-box; }`]
  for (const id of hidden) rules.push(`[${ID_ATTRIBUTE}="${cssEscape(id)}"] { display: none !important; }`)
  const strokeIds = new Set([...Object.keys(strokeColors), ...Object.keys(strokeWidths)])
  for (const id of strokeIds) {
    const color = strokeColors[id]
    const width = strokeWidths[id]
    if (!color && width === undefined) continue
    const scope = `[${ID_ATTRIBUTE}="${cssEscape(id)}"]`
    const declarations = [
      color ? `stroke: ${color === 'transparent' ? 'none' : color} !important;` : '',
      width !== undefined ? `stroke-width: ${width}px !important;` : '',
    ].join(' ')
    rules.push(`${scope} ${SHAPE_SELECTOR}:not(${scope} [${ID_ATTRIBUTE}] *) { ${declarations} }`)
  }
  return rules.join('\n')
}

function measureElements(root: SVGGElement): Record<string, Rect> {
  const rects: Record<string, Rect> = {}
  root.querySelectorAll<SVGGraphicsElement>(`[${ID_ATTRIBUTE}]`).forEach(element => {
    const id = element.getAttribute(ID_ATTRIBUTE)
    if (!id) return
    try {
      const box = element.getBBox()
      rects[id] = { x: box.x, y: box.y, width: box.width, height: box.height }
    } catch {
      rects[id] = { x: 0, y: 0, width: 0, height: 0 }
    }
  })
  return rects
}

export function TemplateRenderer(): ReactElement | null {
  const result = useTemplateStore(s => s.result)
  const isTemplateHidden = useTemplateStore(s => s.isTemplateHidden)
  const hiddenIds = useTemplateStore(s => s.hiddenTemplateElementIds)
  const strokeColors = useTemplateStore(s => s.templateStrokeColors)
  const strokeWidths = useTemplateStore(s => s.templateStrokeWidths)
  const positions = useTemplateStore(s => s.templateElementPositions)
  const naturalRects = useTemplateStore(s => s.naturalElementRects)
  const adjustedIds = useTemplateStore(s => s.adjustedTemplateElementIds)
  const rotations = useTemplateStore(s => s.templateElementRotations)
  const selectedIds = useTemplateStore(s => s.selectedTemplateElementIds)
  const setNaturalElementRects = useTemplateStore(s => s.setNaturalElementRects)
  const selectElement = useTemplateStore(s => s.selectTemplateElement)
  const toggleElement = useTemplateStore(s => s.toggleTemplateElement)

  const rootRef = useRef<SVGGElement>(null)
  const contentRef = useRef<SVGGElement>(null)
  const pressRef = useRef<{ id: string; x: number; y: number } | null>(null)
  const { startDrag, renderHandles } = useTemplateDragResize(rootRef)

  const content = useMemo(() => (result?.svg ? extractContent(result.svg) : null), [result?.svg])
  const elementCss = useMemo(() => buildElementCss(hiddenIds, strokeColors, strokeWidths), [hiddenIds, strokeColors, strokeWidths])

  useLayoutEffect(() => {
    const root = contentRef.current
    if (!root || !content) return
    setNaturalElementRects(measureElements(root))
  }, [content, setNaturalElementRects])

  useLayoutEffect(() => {
    const root = contentRef.current
    if (!root) return
    root.querySelectorAll<SVGGElement>(`[${ID_ATTRIBUTE}]`).forEach(element => {
      const id = element.getAttribute(ID_ATTRIBUTE)
      if (!id || !isTopLevelId(id, naturalRects)) return
      const transform = elementTransform(naturalRects[id], positions[id], adjustedIds.has(id), rotations[id])
      if (transform) element.setAttribute('transform', transform)
      else element.removeAttribute('transform')
    })
  }, [content, naturalRects, positions, adjustedIds, rotations])

  if (!result || !content || isTemplateHidden) return null

  const findElementId = (target: EventTarget | null): string | undefined => {
    const element = target instanceof Element ? target.closest(`[${ID_ATTRIBUTE}]`) : null
    return element?.getAttribute(ID_ATTRIBUTE) ?? undefined
  }

  const handleMouseDown = (event: React.MouseEvent<SVGGElement>) => {
    if (event.button !== 0) return
    const id = findElementId(event.target)
    if (!id) return
    const topId = topLevelAncestor(id, naturalRects)
    pressRef.current = { id, x: event.clientX, y: event.clientY }
    startDrag(event, topId, positions[topId] ?? naturalRects[topId] ?? { x: 0, y: 0, width: 0, height: 0 })
  }

  const handleClick = (event: React.MouseEvent<SVGGElement>) => {
    const press = pressRef.current
    pressRef.current = null
    if (!press || isTopLevelId(press.id, naturalRects)) return
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 3) return
    if (event.ctrlKey || event.metaKey) toggleElement(press.id)
    else selectElement(press.id)
  }

  const nestedOutlines = [...selectedIds]
    .filter(id => !isTopLevelId(id, naturalRects) && !hiddenIds.has(id))
    .map(id => {
      const natural = naturalRects[id]
      const topId = topLevelAncestor(id, naturalRects)
      if (!natural) return null
      const rect = projectRect(natural, naturalRects[topId], adjustedIds.has(topId) ? positions[topId] : undefined)
      return <rect key={id} x={rect.x - 3} y={rect.y - 3} width={rect.width + 6} height={rect.height + 6} rx={4} fill="none" stroke="#2196F3" strokeWidth={1.5} strokeDasharray="4 3" pointerEvents="none" data-selection-box="true" />
    })

  return (
    <g ref={rootRef} pointerEvents="all" data-template-layer="true">
      <style>{elementCss}</style>
      <g
        ref={contentRef}
        fontFamily={content.fontFamily || undefined}
        style={{ cursor: 'move' }}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: content.markup }}
      />
      {nestedOutlines}
      {[...selectedIds].filter(id => isTopLevelId(id, naturalRects)).map(id => {
        const rect = positions[id] ?? naturalRects[id]
        return rect ? <g key={id}>{renderHandles(rect, id)}</g> : null
      })}
    </g>
  )
}

export function topLevelAncestor(id: string, rects: Record<string, Rect>): string {
  let current = id
  let parent = parentIdOf(current, rects)
  while (parent) {
    current = parent
    parent = parentIdOf(current, rects)
  }
  return current
}
