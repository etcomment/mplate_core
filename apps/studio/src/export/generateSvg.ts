import type { DiagramModel } from '../core/model/DiagramModel'
import type { Shape } from '../core/model/Shape'

interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

function computeBounds(shapes: readonly Shape[]): Bounds {
  if (shapes.length === 0) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600 }
  }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const shape of shapes) {
    const { x, y } = shape.position
    const { width, height } = shape.dimensions
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x + width > maxX) maxX = x + width
    if (y + height > maxY) maxY = y + height
  }

  return { minX, minY, maxX, maxY }
}

function shapeToSvg(shape: Shape): string {
  const { dimensions, position, style, text, type } = shape
  const { width: w, height: h } = dimensions
  const { x, y } = position

  const styleAttrs = [
    `fill="${escapeXml(style.fill)}"`,
    `stroke="${escapeXml(style.stroke)}"`,
    `stroke-width="${style.strokeWidth}"`,
    `opacity="${style.opacity}"`,
  ].join(' ')

  const cx = x + w / 2
  const cy = y + h / 2

  let shapeSvg = ''

  switch (type) {
    case 'rectangle':
      shapeSvg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" ${styleAttrs}/>`
      break
    case 'ellipse':
      shapeSvg = `<ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${h / 2}" ${styleAttrs}/>`
      break
    case 'diamond': {
      const points = `${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}`
      shapeSvg = `<polygon points="${points}" ${styleAttrs}/>`
      break
    }
  }

  if (text.content) {
    const textAlign = text.fontAlign === 'left' ? 'start' : text.fontAlign === 'right' ? 'end' : 'middle'
    shapeSvg += `<text x="${cx}" y="${cy}" text-anchor="${textAlign}" dominant-baseline="central" font-size="${text.fontSize}" font-family="${escapeXml(text.fontFamily)}" fill="${escapeXml(style.stroke)}" pointer-events="none">${escapeXml(text.content)}</text>`
  }

  return shapeSvg
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function generateSvg(model: DiagramModel): string {
  const shapes = model.shapes
  const bounds = computeBounds(shapes)

  const padding = 40
  const viewMinX = bounds.minX - padding
  const viewMinY = bounds.minY - padding
  const viewWidth = bounds.maxX - bounds.minX + padding * 2
  const viewHeight = bounds.maxY - bounds.minY + padding * 2

  const shapesSvg = shapes.map(shapeToSvg).join('\n  ')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewMinX} ${viewMinY} ${viewWidth} ${viewHeight}" width="${viewWidth}" height="${viewHeight}">\n  ${shapesSvg}\n</svg>`
}

export function downloadSvg(model: DiagramModel, filename: string = 'diagram.svg'): void {
  const svg = generateSvg(model)
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportCanvasToSvg(): string {
  const svgElement = (document.querySelector('svg[data-canvas-svg="true"]') || document.querySelector('svg')) as SVGSVGElement | null
  if (!svgElement) throw new Error('No SVG element found on canvas')
  return new XMLSerializer().serializeToString(svgElement)
}

export function downloadCanvasSvg(filename: string = 'diagram.svg'): void {
  const svg = exportCanvasToSvg()
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function inlineFonts(svgStr: string): Promise<string> {
  const fonts = new Set<string>()
  const match = svgStr.matchAll(/font-family="([^"]+)"/g)
  for (const m of match) {
    fonts.add(m[1]!.split(',')[0]!.trim().replace(/['"]/g, ''))
  }
  
  let styleContent = ''
  for (const font of fonts) {
    if (['Arial', 'sans-serif', 'serif', 'Times New Roman', 'Courier New', 'system-ui'].includes(font)) continue
    try {
      const url = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`
      const response = await fetch(url)
      if (!response.ok) continue
      let css = await response.text()
      const urls = css.match(/url\(([^)]+)\)/g) || []
      for (const u of urls) {
        const fontUrl = u.match(/url\((['"]?)([^'"]+)\1\)/)?.[2]
        if (fontUrl) {
          const fontRes = await fetch(fontUrl)
          if (fontRes.ok) {
            const blob = await fontRes.blob()
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result as string)
              reader.readAsDataURL(blob)
            })
            css = css.replace(u, `url(${base64})`)
          }
        }
      }
      styleContent += css + '\n'
    } catch (e) {}
  }

  if (styleContent) {
    return svgStr.replace(/(<svg[^>]*>)/, `$1<style>${styleContent}</style>`)
  }
  return svgStr
}

export async function getContentSvg(): Promise<string> {
  const svgElement = (document.querySelector('svg[data-canvas-svg="true"]') || document.querySelector('svg')) as SVGSVGElement | null
  if (!svgElement) throw new Error('No SVG element found on canvas')

  const mainGroup = svgElement.querySelector('g[transform]')
  if (!mainGroup) return inlineFonts(exportCanvasToSvg())

  const clonedGroup = mainGroup.cloneNode(true) as SVGGElement

  // Remove background grid rect
  const gridRect = clonedGroup.querySelector('rect[fill="url(#grid)"]')
  if (gridRect) gridRect.remove()

  // Remove selection marquee or interactive handles
  clonedGroup.querySelectorAll('[data-selection-handles], [data-selection-box], [stroke-dasharray="4 2"], [stroke-dasharray="4 4"], .handle, [data-handle], rect[fill*="rgba(74, 144, 217"]').forEach(el => el.remove())

  // Remove data-shape-id if present
  clonedGroup.querySelectorAll('[data-shape-id]').forEach(el => {
    el.removeAttribute('data-shape-id')
  })

  // Measure bounding box if possible via SVG API or fallback to viewBox
  let bbox: { x: number; y: number; width: number; height: number } | null = null
  try {
    const rawGroup = mainGroup as SVGGElement
    // Temporarily hide grid rect to compute accurate bbox of diagram contents
    const rawGrid = rawGroup.querySelector('rect[fill="url(#grid)"]') as SVGElement | null
    if (rawGrid) rawGrid.style.display = 'none'

    const svgBBox = rawGroup.getBBox()

    if (rawGrid) rawGrid.style.display = ''

    if (svgBBox && svgBBox.width > 0 && svgBBox.height > 0) {
      bbox = {
        x: svgBBox.x,
        y: svgBBox.y,
        width: svgBBox.width,
        height: svgBBox.height,
      }
    }
  } catch {
    bbox = null
  }

  const vb = svgElement.viewBox.baseVal
  const padding = 40

  const vx = bbox ? bbox.x - padding : vb.x
  const vy = bbox ? bbox.y - padding : vb.y
  const vw = bbox ? bbox.width + padding * 2 : vb.width
  const vh = bbox ? bbox.height + padding * 2 : vb.height

  // Remove any remaining root transform from cloned group so elements align with computed viewbox
  clonedGroup.removeAttribute('transform')

  // Remove all defs from clonedGroup to avoid duplicates inside inner
  clonedGroup.querySelectorAll('defs').forEach(el => el.remove())
  const inner = clonedGroup.innerHTML

  // Grab all defs from the original SVG and merge them
  const allDefs = svgElement.querySelectorAll('defs')
  const defsContent = Array.from(allDefs).map(d => d.innerHTML).join('\n')
  const defsString = defsContent ? `<defs>\n${defsContent}\n</defs>` : ''

  let rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}" width="${vw}" height="${vh}">\n  ${defsString}\n  ${inner}\n</svg>`
  
  // Fix Safari/Chrome absolute URL resolution for masks and clipPaths in SPAs
  rawSvg = rawSvg.replace(/url\(['"]?https?:\/\/[^#]*#([^)'"]+)['"]?\)/g, 'url(#$1)')
  
  return inlineFonts(rawSvg)
}

export async function downloadContentSvg(filename: string = 'diagram.svg'): Promise<void> {
  const svg = await getContentSvg()
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
