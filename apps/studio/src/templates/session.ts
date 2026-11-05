import type { Overrides } from '@mplate/core'
import { loadDraft, readSharedState, saveDraft, shareUrl, type StudioState } from '../share'
import { currentAdjustments, useTemplateStore, type TemplateAdjustments } from './store'

const DRAFT_DELAY_MS = 500

export function currentStudioState(): StudioState {
  const state = useTemplateStore.getState()
  const { colors, ...layout } = currentAdjustments()
  const overrides: Overrides = {}
  for (const [id, color] of Object.entries(colors)) overrides[id] = { color }
  const studio: StudioState = { source: state.dslText, theme: state.themeName, width: state.templateWidth }
  if (Object.keys(overrides).length > 0) studio.overrides = overrides
  const hasLayout = Object.values(layout).some(value => (Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0))
  if (hasLayout) studio.adjustments = layout
  return studio
}

function adjustmentsOf(state: StudioState): Partial<TemplateAdjustments> {
  const colors: Record<string, string> = {}
  for (const [id, override] of Object.entries(state.overrides ?? {})) {
    if (typeof override.color === 'string') colors[id] = override.color
  }
  return { ...(state.adjustments ?? {}), colors }
}

export function restoreStudioState(state: StudioState): void {
  useTemplateStore.getState().loadDocument(state.source, { theme: state.theme, width: state.width, adjustments: adjustmentsOf(state) })
}

export function restoreInitialState(location: Location, fallbackTemplate: string): void {
  const initial = readSharedState(location) ?? loadDraft()
  if (initial?.source.trim()) restoreStudioState(initial)
  else useTemplateStore.getState().selectTemplate(fallbackTemplate)
}

export function startDraftAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  const unsubscribe = useTemplateStore.subscribe(() => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => saveDraft(currentStudioState()), DRAFT_DELAY_MS)
  })
  return () => {
    if (timer) clearTimeout(timer)
    unsubscribe()
  }
}

export async function copyShareLink(location: Location): Promise<boolean> {
  const url = shareUrl(currentStudioState(), location)
  try {
    await navigator.clipboard.writeText(url)
    history.replaceState(null, '', url)
    return true
  } catch {
    history.replaceState(null, '', url)
    return false
  }
}
