import { beforeEach, describe, expect, it } from 'vitest'
import { describeTemplate } from '@mplate/core'
import { currentAdjustments, useTemplateStore } from '../src/templates/store'
import { readElementFields } from '../src/templates/elementFields'
import { currentStudioState, restoreStudioState } from '../src/templates/session'

const store = () => useTemplateStore.getState()

describe('template store', () => {
  beforeEach(() => store().clearTemplate())

  it('loads a template example and renders it with the core engine', () => {
    store().selectTemplate('funnel:bars')
    expect(store().activeTemplate).toBe('funnel:bars')
    expect(store().dslText).toBe(describeTemplate('funnel:bars')!.example)
    expect(store().result?.ok).toBe(true)
    expect(store().result?.svg).toContain('data-mplate-id="level-0"')
    expect(store().result?.elements.map(element => element.id)).toContain('level-4')
  })

  it('renders templates without a background so they sit directly on the canvas', () => {
    store().selectTemplate('process:chevrons')
    expect(store().result?.svg).not.toMatch(/<rect width="\d+" height="[\d.]+" fill="#ffffff"\/>/)
  })

  it('recolours an element through core overrides', () => {
    store().selectTemplate('process:chevrons')
    store().updateTemplateColor('step-1', '#123456')
    expect(store().result?.svg).toContain('#123456')
    store().updateTemplateColor('step-1', 'transparent')
    expect(store().templateElementColors['step-1']).toBeUndefined()
  })

  it('keeps manual positions while the element list is unchanged, and resets them otherwise', () => {
    store().selectTemplate('process:chevrons')
    store().setNaturalElementRects({ 'step-0': { x: 0, y: 0, width: 100, height: 50 } })
    store().moveTemplateElement('step-0', { x: 40, y: 10 })
    store().setDslText(store().dslText.replace('Discover', 'Explore'))
    store().setNaturalElementRects({ 'step-0': { x: 0, y: 0, width: 110, height: 50 } })
    expect(store().templateElementPositions['step-0']).toEqual({ x: 40, y: 10, width: 100, height: 50 })
    store().setDslText(`${store().dslText}\n  step "Extra"`)
    expect(store().adjustedTemplateElementIds.size).toBe(0)
    expect(store().templateElementPositions).toEqual({})
  })

  it('keeps the last valid visual while the source has errors', () => {
    store().selectTemplate('process:chevrons')
    const svg = store().result?.svg
    store().setDslText('@nonexistent "Oops"')
    expect(store().result?.svg).toBe(svg)
    expect(store().result?.diagnostics.some(diagnostic => diagnostic.severity === 'error')).toBe(true)
  })

  it('resets selected elements to their natural layout', () => {
    store().selectTemplate('process:chevrons')
    store().setNaturalElementRects({ 'step-0': { x: 0, y: 0, width: 100, height: 50 } })
    store().resizeTemplateElement('step-0', { width: 300, height: 50 })
    store().rotateTemplateElement('step-0', 30)
    store().resetTemplateElements(['step-0'])
    expect(store().templateElementPositions['step-0']).toEqual({ x: 0, y: 0, width: 100, height: 50 })
    expect(store().templateElementRotations['step-0']).toBeUndefined()
  })

  it('round-trips the studio state used by drafts and share links', () => {
    store().selectTemplate('process:chevrons')
    store().setTheme('dark')
    store().updateTemplateColor('step-0', '#e4572e')
    store().setNaturalElementRects({ 'step-0': { x: 0, y: 0, width: 100, height: 50 } })
    store().moveTemplateElement('step-0', { x: 5, y: 5 })
    store().toggleTemplateElementHidden('step-2')
    const saved = currentStudioState()
    store().clearTemplate()
    restoreStudioState(saved)
    expect(store().themeName).toBe('dark')
    expect(store().templateElementColors).toEqual({ 'step-0': '#e4572e' })
    expect(currentAdjustments().positions['step-0']).toEqual({ x: 5, y: 5, width: 100, height: 50 })
    expect([...store().hiddenTemplateElementIds]).toEqual(['step-2'])
  })
})

describe('element fields', () => {
  it('reads the positional and attribute values of an element line', () => {
    const card = describeTemplate('process:chevrons')
    const fields = readElementFields('@process\n  step "Discover" "Interviews" val:"3 weeks"', 2, card)
    expect(fields).toMatchObject({ title: 'Discover', subtitle: 'Interviews', value: '3 weeks' })
    expect(fields.editable).toEqual(['title', 'subtitle', 'value'])
  })
})
