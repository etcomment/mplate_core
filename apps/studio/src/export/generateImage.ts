import { generateSvg, getContentSvg } from './generateSvg'
import type { DiagramModel } from '../core/model/DiagramModel'

export async function generatePng(model: DiagramModel): Promise<Blob> {
  const svg = generateSvg(model)
  return rasterizeSvg(svg, 'image/png')
}

export async function generateJpg(model: DiagramModel): Promise<Blob> {
  const svg = generateSvg(model)
  return rasterizeSvg(svg, 'image/jpeg', 0.9)
}

export async function generateCanvasPng(): Promise<Blob> {
  const svg = await getContentSvg()
  return rasterizeSvg(svg, 'image/png')
}

export async function generateCanvasJpg(): Promise<Blob> {
  const svg = await getContentSvg()
  return rasterizeSvg(svg, 'image/jpeg', 0.9)
}

async function rasterizeSvg(svg: string, mimeType: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)

    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scale = 3
      canvas.width = (img.naturalWidth || img.width) * scale
      canvas.height = (img.naturalHeight || img.height) * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Canvas context not available'))
        return
      }
      ctx.scale(scale, scale)
      if (mimeType === 'image/jpeg') {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width / scale, canvas.height / scale)
      }
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(
        (result) => {
          URL.revokeObjectURL(url)
          if (result) resolve(result)
          else reject(new Error('Rasterization failed'))
        },
        mimeType,
        quality,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load SVG'))
    }

    img.src = url
  })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function copyCanvasToClipboard(): Promise<boolean> {
  let svgString: string
  try {
    svgString = await getContentSvg()
  } catch {
    return false
  }

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(svgBlob)

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = async () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width * 2
      canvas.height = img.height * 2
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        resolve(false)
        return
      }
      ctx.scale(2, 2)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, img.width, img.height)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)

      try {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            resolve(false)
            return
          }
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob }),
            ])
            resolve(true)
          } catch {
            resolve(false)
          }
        }, 'image/png')
      } catch {
        resolve(false)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(false)
    }
    img.src = url
  })
}
