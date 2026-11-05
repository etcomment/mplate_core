import { create } from 'zustand'
import { describeTemplate, render, type Diagnostic, type ElementInfo, type IdentityCard, type Overrides } from '@mplate/core'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface TemplateRender {
  ok: boolean
  svg: string
  width: number
  height: number
  card?: IdentityCard
  diagnostics: Diagnostic[]
  elements: ElementInfo[]
}

export interface TemplateAdjustments {
  colors: Record<string, string>
  strokeColors: Record<string, string>
  strokeWidths: Record<string, number>
  positions: Record<string, Rect>
  rotations: Record<string, number>
  hidden: string[]
}

export const DEFAULT_TEMPLATE_WIDTH = 1200

interface TemplateStore {
  readonly activeTemplate: string | null
  readonly dslText: string
  readonly themeName: string
  readonly templateWidth: number
  readonly result: TemplateRender | null
  readonly isTemplateHidden: boolean
  readonly selectedTemplateElementIds: ReadonlySet<string>
  readonly templateElementColors: Record<string, string>
  readonly templateStrokeColors: Record<string, string>
  readonly templateStrokeWidths: Record<string, number>
  readonly naturalElementRects: Record<string, Rect>
  readonly templateElementPositions: Record<string, Rect>
  readonly adjustedTemplateElementIds: ReadonlySet<string>
  readonly hiddenTemplateElementIds: ReadonlySet<string>
  readonly templateElementRotations: Record<string, number>
  readonly templateGroups: Record<string, string[]>
  readonly templateElementGroupIds: Record<string, string>

  selectTemplate: (id: string) => void
  loadDocument: (source: string, options?: { theme?: string; width?: number; adjustments?: Partial<TemplateAdjustments> }) => void
  setDslText: (source: string) => void
  setTheme: (theme: string) => void
  setTemplateWidth: (width: number) => void
  clearTemplate: () => void
  toggleTemplateHidden: () => void
  toggleTemplateElementHidden: (id: string) => void
  selectTemplateElement: (id: string) => void
  toggleTemplateElement: (id: string) => void
  clearTemplateElementSelection: () => void
  updateTemplateColor: (id: string, color: string) => void
  updateTemplateStrokeColor: (id: string, color: string) => void
  updateTemplateStrokeWidth: (id: string, width: number) => void
  moveTemplateElement: (id: string, pos: { x: number; y: number }) => void
  resizeTemplateElement: (id: string, size: { width: number; height: number }) => void
  rotateTemplateElement: (id: string, angle: number) => void
  initTemplateElement: (id: string, rect: Rect) => void
  setNaturalElementRects: (rects: Record<string, Rect>) => void
  resetTemplateElements: (ids: string[]) => void
  groupTemplateElements: (ids?: string[]) => void
  ungroupTemplateElements: (groupId?: string) => void
}

const EMPTY_ADJUSTMENTS = {
  selectedTemplateElementIds: new Set<string>(),
  templateElementColors: {},
  templateStrokeColors: {},
  templateStrokeWidths: {},
  naturalElementRects: {},
  templateElementPositions: {},
  adjustedTemplateElementIds: new Set<string>(),
  hiddenTemplateElementIds: new Set<string>(),
  templateElementRotations: {},
  templateGroups: {},
  templateElementGroupIds: {},
}

function colorOverrides(colors: Record<string, string>): Overrides {
  const overrides: Overrides = {}
  for (const [id, color] of Object.entries(colors)) {
    if (color && color !== 'transparent' && color !== 'none') overrides[id] = { color }
  }
  return overrides
}

export function renderTemplate(source: string, theme: string, width: number, colors: Record<string, string>): TemplateRender | null {
  if (!source.trim()) return null
  const result = render(source, { theme, width, background: false, overrides: colorOverrides(colors) })
  const outcome: TemplateRender = {
    ok: result.ok,
    svg: result.svg,
    width: result.width,
    height: result.height,
    diagnostics: result.diagnostics,
    elements: result.layout.elements,
  }
  if (result.template) outcome.card = result.template
  return outcome
}

function elementIdsOf(result: TemplateRender | null): string[] {
  return result?.elements.map((element) => element.id) ?? []
}

function haveSameElements(previous: TemplateRender | null, next: TemplateRender | null): boolean {
  if (!previous?.ok || !next?.ok) return previous?.ok === next?.ok
  return previous.card?.id === next.card?.id && elementIdsOf(previous).join('|') === elementIdsOf(next).join('|')
}

function removeKeys<T>(record: Record<string, T>, ids: ReadonlySet<string>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([id]) => !ids.has(id)))
}

export const useTemplateStore = create<TemplateStore>((set, get) => {
  const rerender = (source: string, overrides: Partial<Pick<TemplateStore, 'themeName' | 'templateWidth' | 'templateElementColors'>> = {}): void => {
    const state = get()
    const themeName = overrides.themeName ?? state.themeName
    const templateWidth = overrides.templateWidth ?? state.templateWidth
    const colors = overrides.templateElementColors ?? state.templateElementColors
    const result = renderTemplate(source, themeName, templateWidth, colors)
    const keepsLayout = haveSameElements(state.result, result) && templateWidth === state.templateWidth
    const lastGoodResult = result?.ok || !state.result?.ok ? result : { ...state.result, diagnostics: result?.diagnostics ?? [] }
    set({
      dslText: source,
      themeName,
      templateWidth,
      templateElementColors: colors,
      result: lastGoodResult,
      activeTemplate: lastGoodResult?.card?.id ?? (source.trim() ? state.activeTemplate : null),
      ...(keepsLayout || !result?.ok ? {} : { templateElementPositions: {}, adjustedTemplateElementIds: new Set<string>(), templateElementRotations: {}, selectedTemplateElementIds: new Set<string>(), templateGroups: {}, templateElementGroupIds: {} }),
    })
  }

  const markAdjusted = (id: string): ReadonlySet<string> => {
    const adjusted = get().adjustedTemplateElementIds
    if (adjusted.has(id)) return adjusted
    return new Set([...adjusted, id])
  }

  return {
    activeTemplate: null,
    dslText: '',
    themeName: 'default',
    templateWidth: DEFAULT_TEMPLATE_WIDTH,
    result: null,
    isTemplateHidden: false,
    ...EMPTY_ADJUSTMENTS,

    selectTemplate: (id) => {
      const card = describeTemplate(id)
      if (!card) return
      set({ ...EMPTY_ADJUSTMENTS, result: null, isTemplateHidden: false })
      rerender(card.example)
    },

    loadDocument: (source, options = {}) => {
      const adjustments = options.adjustments ?? {}
      set({
        ...EMPTY_ADJUSTMENTS,
        result: null,
        isTemplateHidden: false,
        templateStrokeColors: adjustments.strokeColors ?? {},
        templateStrokeWidths: adjustments.strokeWidths ?? {},
        templateElementRotations: adjustments.rotations ?? {},
        hiddenTemplateElementIds: new Set(adjustments.hidden ?? []),
      })
      rerender(source, {
        templateElementColors: adjustments.colors ?? {},
        ...(options.theme ? { themeName: options.theme } : {}),
        ...(options.width ? { templateWidth: options.width } : {}),
      })
      const positions = adjustments.positions ?? {}
      set({
        templateElementPositions: { ...positions },
        adjustedTemplateElementIds: new Set(Object.keys(positions)),
        templateElementRotations: adjustments.rotations ?? {},
      })
    },

    setDslText: (source) => rerender(source),

    setTheme: (themeName) => rerender(get().dslText, { themeName }),

    setTemplateWidth: (templateWidth) => rerender(get().dslText, { templateWidth }),

    clearTemplate: () => {
      set({ ...EMPTY_ADJUSTMENTS, activeTemplate: null, dslText: '', result: null, isTemplateHidden: false })
    },

    toggleTemplateHidden: () => {
      set(s => ({ isTemplateHidden: !s.isTemplateHidden }))
    },

    toggleTemplateElementHidden: (id) => {
      set(s => {
        const next = new Set(s.hiddenTemplateElementIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return { hiddenTemplateElementIds: next }
      })
    },

    selectTemplateElement: (id) => {
      const { templateElementGroupIds, templateGroups } = get()
      const groupId = templateElementGroupIds[id]
      set({ selectedTemplateElementIds: new Set(groupId ? templateGroups[groupId] ?? [] : [id]) })
    },

    toggleTemplateElement: (id) => {
      const { selectedTemplateElementIds, templateElementGroupIds, templateGroups } = get()
      const next = new Set(selectedTemplateElementIds)
      const groupId = templateElementGroupIds[id]
      const elementsToToggle = groupId && templateGroups[groupId] ? templateGroups[groupId] : [id]
      const isAllSelected = elementsToToggle.every(elementId => next.has(elementId))
      for (const elementId of elementsToToggle) {
        if (isAllSelected) next.delete(elementId)
        else next.add(elementId)
      }
      set({ selectedTemplateElementIds: next })
    },

    clearTemplateElementSelection: () => {
      set({ selectedTemplateElementIds: new Set() })
    },

    updateTemplateColor: (id, color) => {
      const colors = { ...get().templateElementColors }
      if (!color || color === 'transparent' || color === 'none') delete colors[id]
      else colors[id] = color
      rerender(get().dslText, { templateElementColors: colors })
    },

    updateTemplateStrokeColor: (id, color) => {
      set(s => ({ templateStrokeColors: { ...s.templateStrokeColors, [id]: color } }))
    },

    updateTemplateStrokeWidth: (id, width) => {
      set(s => ({ templateStrokeWidths: { ...s.templateStrokeWidths, [id]: width } }))
    },

    moveTemplateElement: (id, pos) => {
      const { templateElementPositions, naturalElementRects } = get()
      const current = templateElementPositions[id] ?? naturalElementRects[id] ?? { x: 0, y: 0, width: 0, height: 0 }
      set({
        templateElementPositions: { ...templateElementPositions, [id]: { ...current, x: pos.x, y: pos.y } },
        adjustedTemplateElementIds: markAdjusted(id),
      })
    },

    resizeTemplateElement: (id, size) => {
      const { templateElementPositions, naturalElementRects } = get()
      const current = templateElementPositions[id] ?? naturalElementRects[id] ?? { x: 0, y: 0, width: 0, height: 0 }
      set({
        templateElementPositions: { ...templateElementPositions, [id]: { ...current, width: size.width, height: size.height } },
        adjustedTemplateElementIds: markAdjusted(id),
      })
    },

    rotateTemplateElement: (id, angle) => {
      set(s => ({ templateElementRotations: { ...s.templateElementRotations, [id]: angle } }))
    },

    initTemplateElement: (id, rect) => {
      const { templateElementPositions } = get()
      if (templateElementPositions[id]) return
      set({ templateElementPositions: { ...templateElementPositions, [id]: { ...rect } } })
    },

    setNaturalElementRects: (rects) => {
      const { templateElementPositions, adjustedTemplateElementIds } = get()
      const positions: Record<string, Rect> = {}
      for (const [id, rect] of Object.entries(rects)) {
        const adjusted = templateElementPositions[id]
        positions[id] = adjustedTemplateElementIds.has(id) && adjusted ? adjusted : { ...rect }
      }
      set({ naturalElementRects: rects, templateElementPositions: positions })
    },

    resetTemplateElements: (ids) => {
      const { naturalElementRects, templateElementPositions, adjustedTemplateElementIds, templateElementRotations, templateStrokeColors, templateStrokeWidths, templateElementColors } = get()
      const targets = new Set(ids)
      const positions = { ...templateElementPositions }
      for (const id of ids) {
        const natural = naturalElementRects[id]
        if (natural) positions[id] = { ...natural }
      }
      set({
        templateElementPositions: positions,
        adjustedTemplateElementIds: new Set([...adjustedTemplateElementIds].filter(id => !targets.has(id))),
        templateElementRotations: removeKeys(templateElementRotations, targets),
        templateStrokeColors: removeKeys(templateStrokeColors, targets),
        templateStrokeWidths: removeKeys(templateStrokeWidths, targets),
      })
      rerender(get().dslText, { templateElementColors: removeKeys(templateElementColors, targets) })
    },

    groupTemplateElements: (ids) => {
      const { selectedTemplateElementIds, templateGroups, templateElementGroupIds } = get()
      const isExplicitCall = Boolean(ids)
      const elementsToGroup = ids ?? Array.from(selectedTemplateElementIds)
      if (elementsToGroup.length < 2) return
      const groupId = `group_${Math.random().toString(36).substring(2, 9)}`
      const nextGroups: Record<string, string[]> = { ...templateGroups, [groupId]: elementsToGroup }
      const nextElementGroupIds = { ...templateElementGroupIds }
      for (const id of elementsToGroup) {
        const oldGroupId = nextElementGroupIds[id]
        const oldGroup = oldGroupId ? nextGroups[oldGroupId] : undefined
        if (oldGroupId && oldGroup) {
          nextGroups[oldGroupId] = oldGroup.filter(elementId => elementId !== id)
          if (nextGroups[oldGroupId]!.length === 0) delete nextGroups[oldGroupId]
        }
        nextElementGroupIds[id] = groupId
      }
      set({
        templateGroups: nextGroups,
        templateElementGroupIds: nextElementGroupIds,
        selectedTemplateElementIds: isExplicitCall ? selectedTemplateElementIds : new Set(elementsToGroup),
      })
    },

    ungroupTemplateElements: (groupId) => {
      const { selectedTemplateElementIds, templateGroups, templateElementGroupIds } = get()
      const groupsToUngroup = new Set<string>()
      if (groupId) groupsToUngroup.add(groupId)
      else {
        for (const id of selectedTemplateElementIds) {
          const owner = templateElementGroupIds[id]
          if (owner) groupsToUngroup.add(owner)
        }
      }
      if (groupsToUngroup.size === 0) return
      const nextGroups = { ...templateGroups }
      const nextElementGroupIds = { ...templateElementGroupIds }
      for (const id of groupsToUngroup) {
        for (const elementId of nextGroups[id] ?? []) delete nextElementGroupIds[elementId]
        delete nextGroups[id]
      }
      set({ templateGroups: nextGroups, templateElementGroupIds: nextElementGroupIds })
    },
  }
})

export function currentAdjustments(): TemplateAdjustments {
  const state = useTemplateStore.getState()
  const positions: Record<string, Rect> = {}
  for (const id of state.adjustedTemplateElementIds) {
    const rect = state.templateElementPositions[id]
    if (rect) positions[id] = rect
  }
  return {
    colors: state.templateElementColors,
    strokeColors: state.templateStrokeColors,
    strokeWidths: state.templateStrokeWidths,
    positions,
    rotations: state.templateElementRotations,
    hidden: [...state.hiddenTemplateElementIds],
  }
}
