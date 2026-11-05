import { listTemplates, render, type IdentityCard } from '@mplate/core'

function thumbnail(card: IdentityCard, theme: string): HTMLElement {
  const frame = document.createElement('div')
  frame.className = 'thumbnail'
  const result = render(card.example, { theme, width: 1200 })
  if (result.ok) frame.innerHTML = result.svg
  return frame
}

function card(template: IdentityCard, theme: string, onPick: (card: IdentityCard) => void): HTMLElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'gallery-card'
  const title = document.createElement('strong')
  title.textContent = template.name
  const meta = document.createElement('span')
  meta.className = 'gallery-meta'
  meta.textContent = `${template.id} · ${template.items.min}–${template.items.max} elements`
  const description = document.createElement('span')
  description.className = 'gallery-description'
  description.textContent = template.useCases.join(', ')
  button.append(thumbnail(template, theme), title, meta, description)
  button.addEventListener('click', () => onPick(template))
  return button
}

export function fillGallery(container: HTMLElement, theme: string, onPick: (card: IdentityCard) => void): void {
  container.replaceChildren(...listTemplates().map((template) => card(template, theme, onPick)))
}
