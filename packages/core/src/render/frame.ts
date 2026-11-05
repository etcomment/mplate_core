import type { BrandLogo } from '../brand/types.js'
import { element } from '../svg/node.js'
import type { Canvas } from './canvas.js'

const LOGO_GAP = 20

export function drawHeading(canvas: Canvas, title: string | undefined, subtitle: string | undefined, logo?: BrandLogo): void {
  const isLogoOnTop = logo !== undefined && (logo.position ?? 'top-right').startsWith('top')
  const reserved = isLogoOnTop ? logo.width + LOGO_GAP : 0
  const x = logo?.position === 'top-left' ? canvas.left + reserved : canvas.left
  const width = canvas.contentWidth - reserved
  let bottom = canvas.top
  if (title) {
    const box = canvas.text({ text: title, x, y: bottom, width, size: 30, minSize: 22, maxLines: 2, weight: 700, font: 'heading', owner: 'heading' })
    bottom = box.y + box.height + 6
  }
  if (subtitle) {
    const box = canvas.text({ text: subtitle, x, y: bottom, width, size: 17, maxLines: 2, color: canvas.theme.colors.textMuted, owner: 'heading' })
    bottom = box.y + box.height
  }
  if (isLogoOnTop) bottom = Math.max(bottom, canvas.top + logo.height)
  if (bottom > canvas.top) canvas.top = bottom + 32
}

export function drawLogo(canvas: Canvas, logo: BrandLogo, contentBottom: number): void {
  const position = logo.position ?? 'top-right'
  const isTop = position.startsWith('top')
  const x = position.endsWith('left') ? canvas.left : canvas.left + canvas.contentWidth - logo.width
  const y = isTop ? canvas.padding : contentBottom + LOGO_GAP
  canvas.add(element('image', { href: logo.src, x, y, width: logo.width, height: logo.height, preserveAspectRatio: 'xMidYMid meet', 'data-mplate-logo': position }))
  if (!isTop) canvas.extendHeight(y + logo.height)
}
