import { describe, expect, it } from 'vitest'
import { render } from '../src/render/render.js'
import { boxesOverlap } from '../src/svg/paths.js'
import { registry } from '../src/templates/registry.js'
import { generateDsl, sampleCounts } from './helpers.js'

const cards = registry.cards()

describe('identity cards', () => {
  it('have unique ids and aliases', () => {
    const names = cards.flatMap((card) => [card.id, ...card.aliases.map((alias) => alias.toLowerCase())])
    expect(new Set(names).size).toBe(names.length)
  })

  it('have exactly one default style per family', () => {
    for (const family of registry.families()) {
      const defaults = cards.filter((card) => card.family === family && card.isDefaultStyle)
      expect(defaults, family).toHaveLength(1)
    }
  })

  it.each(cards.map((card) => [card.id, card] as const))('%s example renders without diagnostics', (_, card) => {
    const result = render(card.example)
    expect(result.ok).toBe(true)
    expect(result.diagnostics).toEqual([])
    expect(result.template?.id).toBe(card.id)
  })
})

const cases = cards.flatMap((card) => sampleCounts(card).map((count) => [card.id, count, card] as const))

describe('parametric layout', () => {
  it.each(cases)('%s renders %i elements cleanly', (_, count, card) => {
    const result = render(generateDsl(card, count))
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true)
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([])
    expect(result.svg).not.toMatch(/NaN|Infinity|undefined/)
    const topLevel = result.layout.elementIds.filter((id) => /^[a-zA-Z]+-\d+$/.test(id))
    expect(topLevel).toHaveLength(count)
    const boxes = result.layout.textBoxes
    for (const box of boxes) {
      expect(box.x, `${box.text} left`).toBeGreaterThanOrEqual(0)
      expect(box.y, `${box.text} top`).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width, `${box.text} right`).toBeLessThanOrEqual(result.width + 0.5)
      expect(box.y + box.height, `${box.text} bottom`).toBeLessThanOrEqual(result.height + 0.5)
    }
    const overlaps: string[] = []
    for (let first = 0; first < boxes.length; first++) {
      for (let second = first + 1; second < boxes.length; second++) {
        if (boxesOverlap(boxes[first]!, boxes[second]!)) overlaps.push(`"${boxes[first]!.text}" × "${boxes[second]!.text}"`)
      }
    }
    expect(overlaps).toEqual([])
  })

  it.each(cards.map((card) => [card.id, card] as const))('%s renders with every built-in theme', (_, card) => {
    for (const theme of ['default', 'ocean', 'mono', 'dark']) {
      const result = render(card.example, { theme })
      expect(result.ok).toBe(true)
      expect(result.svg).toContain(`data-mplate-theme="${theme}"`)
    }
  })

  it.each(cards.map((card) => [card.id, card] as const))('%s adapts to narrow widths', (_, card) => {
    const result = render(card.example, { width: 800 })
    expect(result.ok).toBe(true)
    expect(result.svg).not.toMatch(/NaN|Infinity/)
  })
})
