import { describe, expect, it } from 'vitest'
import { render } from '../src/render/render.js'

const SOURCE = '@process "Plan"\n  step "Discover" "Research"\n  step "Build" "Sprints"\n  step "Run"'

describe('overrides', () => {
  it('lists every element with its DSL line', () => {
    const result = render('@comparison\n  column "A"\n    point "one"\n  column "B"')
    expect(result.layout.elements).toEqual([
      { id: 'column-0', keyword: 'column', line: 2, title: 'A' },
      { id: 'column-0-point-0', keyword: 'point', line: 3, title: 'one', parentId: 'column-0' },
      { id: 'column-1', keyword: 'column', line: 4, title: 'B' },
    ])
  })

  it('replaces text and colour of one element', () => {
    const result = render(SOURCE, { overrides: { 'step-1': { title: 'Ship it', color: '#123456' } } })
    expect(result.diagnostics).toEqual([])
    expect(result.svg).toContain('Ship it')
    expect(result.svg).not.toContain('>Build<')
    expect(result.svg).toContain('#123456')
  })

  it('accepts palette and theme tokens as colours', () => {
    const result = render(SOURCE, { overrides: { 'step-0': { color: 'negative' }, 'step-2': { color: 'accent4' } } })
    expect(result.diagnostics).toEqual([])
    expect(result.svg).toContain('fill="#c9372c"')
  })

  it('moves an element and its text boxes, and grows the canvas', () => {
    const base = render(SOURCE)
    const moved = render(SOURCE, { overrides: { 'step-2': { dx: 10, dy: 200 } } })
    expect(moved.svg).toContain('data-mplate-id="step-2" transform="translate(10.00 200.00)"')
    const before = base.layout.textBoxes.find((box) => box.text === 'Run')!
    const after = moved.layout.textBoxes.find((box) => box.text === 'Run')!
    expect(after.x - before.x).toBeCloseTo(10)
    expect(after.y - before.y).toBeCloseTo(200)
    expect(moved.height).toBeGreaterThan(base.height)
  })

  it('reports adjustments whose element disappeared', () => {
    const result = render(SOURCE, { overrides: { 'step-7': { color: '#000000' }, 'step-0': { color: 'nope' } } })
    expect(result.ok).toBe(true)
    expect(result.unusedOverrides).toEqual(['step-7'])
    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual(['Override: invalid colour "nope" on step-0', 'Adjustment for "step-7" ignored: that element no longer exists'])
  })

  it('applies to children', () => {
    const result = render('@comparison\n  column "A"\n    point "one"', { overrides: { 'column-0-point-0': { title: 'changed' } } })
    expect(result.svg).toContain('changed')
  })
})
