import type { ElementInfo, ElementOverride, Overrides } from '@mplate/core'

export interface InspectorOptions {
  preview: HTMLElement
  getOverrides(): Overrides
  setOverrides(next: Overrides): void
  getElements(): ElementInfo[]
  focusLine(line: number): void
}

export interface Inspector {
  afterRender(): void
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const DRAG_THRESHOLD = 3

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id)
  if (!element) throw new Error(`Missing #${id}`)
  return element as T
}

function isEmptyOverride(override: ElementOverride): boolean {
  return Object.values(override).every((value) => value === undefined || value === 0)
}

function withOverride(overrides: Overrides, id: string, patch: Partial<ElementOverride>): Overrides {
  const merged: ElementOverride = { ...overrides[id], ...patch }
  for (const key of Object.keys(merged) as (keyof ElementOverride)[]) {
    if (merged[key] === undefined) delete merged[key]
  }
  const next = { ...overrides }
  if (isEmptyOverride(merged)) delete next[id]
  else next[id] = merged
  return next
}

function findGroup(preview: HTMLElement, id: string): SVGGElement | undefined {
  return [...preview.querySelectorAll<SVGGElement>('g[data-mplate-id]')].find((group) => group.dataset.mplateId === id)
}

function firstFill(group: SVGGElement): string | undefined {
  const shape = group.querySelector('path[fill^="#"], rect[fill^="#"], circle[fill^="#"]')
  const fill = shape?.getAttribute('fill') ?? undefined
  return fill && /^#[0-9a-f]{6}$/i.test(fill) ? fill : undefined
}

function svgScale(preview: HTMLElement): number {
  const svg = preview.querySelector('svg')
  if (!svg) return 1
  const rendered = svg.getBoundingClientRect().width
  return rendered > 0 ? svg.viewBox.baseVal.width / rendered : 1
}

export function createInspector(options: InspectorOptions): Inspector {
  const panel = byId<HTMLElement>('inspector')
  const name = byId<HTMLElement>('inspector-name')
  const lineButton = byId<HTMLButtonElement>('inspector-line')
  const colorInput = byId<HTMLInputElement>('inspector-color')
  const dxInput = byId<HTMLInputElement>('inspector-dx')
  const dyInput = byId<HTMLInputElement>('inspector-dy')
  const adjustments = byId<HTMLElement>('adjustments')
  const adjustmentsCount = byId<HTMLElement>('adjustments-count')
  let selectedId: string | undefined
  let drag: { id: string; startX: number; startY: number; baseDx: number; baseDy: number; isMoving: boolean } | undefined

  const selectedInfo = (): ElementInfo | undefined => options.getElements().find((element) => element.id === selectedId)
  const update = (patch: Partial<ElementOverride>): void => {
    if (selectedId) options.setOverrides(withOverride(options.getOverrides(), selectedId, patch))
  }

  const drawSelection = (): void => {
    options.preview.querySelectorAll('.mplate-selection').forEach((node) => node.remove())
    const group = selectedId ? findGroup(options.preview, selectedId) : undefined
    if (!group) return
    const box = group.getBBox()
    const outline = document.createElementNS(SVG_NAMESPACE, 'rect')
    outline.setAttribute('class', 'mplate-selection')
    outline.setAttribute('x', String(box.x - 6))
    outline.setAttribute('y', String(box.y - 6))
    outline.setAttribute('width', String(box.width + 12))
    outline.setAttribute('height', String(box.height + 12))
    outline.setAttribute('rx', '6')
    group.append(outline)
  }

  const refreshPanel = (): void => {
    const info = selectedInfo()
    const group = selectedId ? findGroup(options.preview, selectedId) : undefined
    if (!info || !group) {
      selectedId = undefined
      panel.hidden = true
      return
    }
    const override = options.getOverrides()[info.id] ?? {}
    panel.hidden = false
    name.textContent = info.title || info.id
    lineButton.textContent = `Line ${info.line}`
    colorInput.value = override.color && /^#[0-9a-f]{6}$/i.test(override.color) ? override.color : firstFill(group) ?? '#888888'
    dxInput.value = String(Math.round(override.dx ?? 0))
    dyInput.value = String(Math.round(override.dy ?? 0))
  }

  const refreshCount = (): void => {
    const count = Object.keys(options.getOverrides()).length
    adjustments.hidden = count === 0
    adjustmentsCount.textContent = `${count} adjusted element${count === 1 ? '' : 's'}`
  }

  const select = (id: string | undefined): void => {
    selectedId = id
    drawSelection()
    refreshPanel()
  }

  options.preview.addEventListener('pointerdown', (event) => {
    const group = (event.target as Element).closest<SVGGElement>('g[data-mplate-id]')
    if (!group?.dataset.mplateId) {
      select(undefined)
      return
    }
    const id = group.dataset.mplateId
    if (id !== selectedId) select(id)
    const override = options.getOverrides()[id] ?? {}
    drag = { id, startX: event.clientX, startY: event.clientY, baseDx: override.dx ?? 0, baseDy: override.dy ?? 0, isMoving: false }
    options.preview.setPointerCapture(event.pointerId)
  })
  options.preview.addEventListener('pointermove', (event) => {
    if (!drag) return
    const scale = svgScale(options.preview)
    const deltaX = (event.clientX - drag.startX) * scale
    const deltaY = (event.clientY - drag.startY) * scale
    if (!drag.isMoving && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD * scale) return
    drag.isMoving = true
    findGroup(options.preview, drag.id)?.setAttribute('transform', `translate(${drag.baseDx + deltaX} ${drag.baseDy + deltaY})`)
  })
  options.preview.addEventListener('pointerup', (event) => {
    if (!drag) return
    const current = drag
    drag = undefined
    options.preview.releasePointerCapture(event.pointerId)
    if (!current.isMoving) return
    const scale = svgScale(options.preview)
    update({ dx: Math.round(current.baseDx + (event.clientX - current.startX) * scale), dy: Math.round(current.baseDy + (event.clientY - current.startY) * scale) })
  })
  options.preview.addEventListener('keydown', (event) => {
    if (!selectedId) return
    const step = event.shiftKey ? 10 : 1
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    const move = moves[event.key]
    if (event.key === 'Escape') select(undefined)
    if (!move) return
    event.preventDefault()
    const override = options.getOverrides()[selectedId] ?? {}
    update({ dx: (override.dx ?? 0) + move[0], dy: (override.dy ?? 0) + move[1] })
  })

  colorInput.addEventListener('input', () => update({ color: colorInput.value }))
  dxInput.addEventListener('change', () => update({ dx: Number(dxInput.value) || 0 }))
  dyInput.addEventListener('change', () => update({ dy: Number(dyInput.value) || 0 }))
  byId('inspector-color-reset').addEventListener('click', () => update({ color: undefined }))
  byId('inspector-reset').addEventListener('click', () => {
    if (!selectedId) return
    const next = { ...options.getOverrides() }
    delete next[selectedId]
    options.setOverrides(next)
  })
  byId('inspector-close').addEventListener('click', () => select(undefined))
  lineButton.addEventListener('click', () => {
    const info = selectedInfo()
    if (info) options.focusLine(info.line)
  })
  byId('adjustments-clear').addEventListener('click', () => options.setOverrides({}))

  return {
    afterRender: () => {
      drawSelection()
      refreshPanel()
      refreshCount()
    },
  }
}
