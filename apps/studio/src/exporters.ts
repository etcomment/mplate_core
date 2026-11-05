function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function fileNameFor(title: string | undefined, extension: string): string {
  const slug = (title ?? 'mplate')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'mplate'}.${extension}`
}

export function downloadSvg(svg: string, fileName: string): void {
  triggerDownload(new Blob([svg], { type: 'image/svg+xml' }), fileName)
}

export function svgToPngBlob(svg: string, width: number, height: number, scale: number = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(width * scale)
      canvas.height = Math.round(height * scale)
      const context = canvas.getContext('2d')
      if (!context) {
        URL.revokeObjectURL(url)
        reject(new Error('Canvas is not available in this browser'))
        return
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed'))), 'image/png')
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('The SVG could not be rasterised'))
    }
    image.src = url
  })
}

export async function downloadPng(svg: string, width: number, height: number, fileName: string): Promise<void> {
  triggerDownload(await svgToPngBlob(svg, width, height), fileName)
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
