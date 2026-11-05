import './styles.css'
import { BUILT_IN_THEMES, describeTemplate, render, type Diagnostic, type RenderResult } from '@mplate/core'
import { createEditor } from './editor.js'
import { copyText, downloadPng, downloadSvg, fileNameFor } from './exporters.js'
import { fillGallery } from './gallery.js'
import { loadDraft, readSharedState, saveDraft, shareUrl, type StudioState } from './state.js'

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id)
  if (!element) throw new Error(`Missing #${id}`)
  return element as T
}

const sourceInput = byId<HTMLTextAreaElement>('source')
const gutter = byId<HTMLElement>('gutter')
const preview = byId<HTMLElement>('preview')
const status = byId<HTMLElement>('status')
const diagnosticsList = byId<HTMLUListElement>('diagnostics')
const themeSelect = byId<HTMLSelectElement>('theme-select')
const widthSelect = byId<HTMLSelectElement>('width-select')
const dialog = byId<HTMLDialogElement>('templates-dialog')
const gallery = byId<HTMLElement>('gallery')
const toast = byId<HTMLElement>('toast')

const fallbackSource = describeTemplate('process:chevrons')?.example ?? '@process\n  step "Plan"\n  step "Do"'
const initial: StudioState = readSharedState(window.location) ?? loadDraft() ?? { source: fallbackSource, theme: 'default', width: 1200 }

let lastResult: RenderResult | undefined
let lastGoodSvg = ''
let renderTimer: number | undefined
let toastTimer: number | undefined

function currentState(): StudioState {
  return { source: editor.value(), theme: themeSelect.value, width: Number(widthSelect.value) }
}

function showToast(message: string): void {
  toast.textContent = message
  toast.classList.add('visible')
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 2200)
}

function showDiagnostics(diagnostics: Diagnostic[]): void {
  diagnosticsList.replaceChildren(
    ...diagnostics.map((diagnostic) => {
      const item = document.createElement('li')
      const button = document.createElement('button')
      button.type = 'button'
      button.className = `diagnostic diagnostic-${diagnostic.severity}`
      const location = document.createElement('span')
      location.className = 'diagnostic-line'
      location.textContent = `Line ${diagnostic.line}`
      const message = document.createElement('span')
      message.textContent = diagnostic.message + (diagnostic.hint ? ` — ${diagnostic.hint.split('\n')[0]}` : '')
      button.append(location, message)
      button.addEventListener('click', () => editor.focusLine(diagnostic.line))
      item.append(button)
      return item
    }),
  )
  diagnosticsList.hidden = diagnostics.length === 0
}

function refresh(): void {
  const state = currentState()
  const result = render(state.source, { theme: state.theme, width: state.width })
  lastResult = result
  showDiagnostics(result.diagnostics)
  editor.markLines(result.diagnostics)
  if (result.ok) {
    lastGoodSvg = result.svg
    preview.innerHTML = result.svg
    preview.classList.remove('stale')
    const count = result.layout.elementIds.filter((id) => /^[a-zA-Z]+-\d+$/.test(id)).length
    status.textContent = `${result.template?.name ?? ''} · ${result.template?.id ?? ''} · ${count} element${count === 1 ? '' : 's'} · ${result.width}×${result.height}`
  } else {
    preview.classList.toggle('stale', lastGoodSvg !== '')
    status.textContent = 'Fix the errors on the left to update the preview'
  }
  saveDraft(state)
}

function scheduleRefresh(): void {
  window.clearTimeout(renderTimer)
  renderTimer = window.setTimeout(refresh, 120)
}

const editor = createEditor(sourceInput, gutter, scheduleRefresh)

for (const theme of Object.values(BUILT_IN_THEMES)) themeSelect.append(new Option(theme.name, theme.name))
themeSelect.value = initial.theme in BUILT_IN_THEMES ? initial.theme : 'default'
widthSelect.value = [...widthSelect.options].some((option) => option.value === String(initial.width)) ? String(initial.width) : '1200'
themeSelect.addEventListener('change', refresh)
widthSelect.addEventListener('change', refresh)

byId('templates-button').addEventListener('click', () => {
  fillGallery(gallery, themeSelect.value, (card) => {
    editor.setValue(card.example)
    dialog.close()
    refresh()
  })
  dialog.showModal()
})
byId('templates-close').addEventListener('click', () => dialog.close())
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close()
})

function titleOf(result: RenderResult): string | undefined {
  return /<title>([^<]*)<\/title>/.exec(result.svg)?.[1]
}

function requireResult(): RenderResult | undefined {
  if (lastResult?.ok) return lastResult
  showToast('Nothing to export: fix the errors first')
  return undefined
}

byId('svg-button').addEventListener('click', () => {
  const result = requireResult()
  if (result) downloadSvg(result.svg, fileNameFor(titleOf(result), 'svg'))
})
byId('png-button').addEventListener('click', () => {
  const result = requireResult()
  if (!result) return
  downloadPng(result.svg, result.width, result.height, fileNameFor(titleOf(result), 'png')).catch((error: unknown) => {
    showToast(error instanceof Error ? error.message : 'PNG export failed')
  })
})
byId('copy-svg-button').addEventListener('click', async () => {
  const result = requireResult()
  if (result) showToast((await copyText(result.svg)) ? 'SVG copied' : 'Copy is blocked by the browser')
})
byId('share-button').addEventListener('click', async () => {
  const url = shareUrl(currentState(), window.location)
  window.history.replaceState(null, '', url)
  showToast((await copyText(url)) ? 'Link copied: the design is stored in the link itself' : 'Link updated in the address bar')
})

editor.setValue(initial.source)
refresh()
