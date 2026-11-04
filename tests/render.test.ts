import { describe, expect, it } from 'vitest'
import { render } from '../src/render/render.js'
import { validate } from '../src/validate.js'

describe('render', () => {
  it('produces a standalone SVG with stable element ids', () => {
    const result = render('@process "Plan"\n  step "A"\n  step "B"')
    expect(result.ok).toBe(true)
    expect(result.svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    expect(result.svg).toContain('data-mplate-id="step-0"')
    expect(result.svg).toContain('data-mplate-id="step-1"')
    expect(result.svg).toContain('<title>Plan</title>')
  })

  it('maps legacy numbered headers to named styles', () => {
    expect(render('@brain2\n  node "A"').template?.id).toBe('brain:arc')
    expect(render('@brain\n  node "A"').template?.id).toBe('brain:spokes')
    expect(render('@brain style:arc\n  node "A"').template?.id).toBe('brain:arc')
  })

  it('suggests the closest family or style', () => {
    const family = render('@proces\n  step "A"')
    expect(family.ok).toBe(false)
    expect(family.diagnostics[0]!.hint).toContain('@process')
    const style = render('@process style:chevron\n  step "A"')
    expect(style.diagnostics[0]!.hint).toContain('style:chevrons')
  })

  it('rejects unknown keywords with the allowed list', () => {
    const result = render('@funnel\n  stepp "A"')
    expect(result.ok).toBe(false)
    expect(result.diagnostics[0]!.hint).toContain('level')
  })

  it('applies theme directives and explicit colours', () => {
    const result = render('@cards\n  theme dark palette:"#ff0000,#00ff00"\n  card "A"\n  card "B" #0000ff')
    expect(result.svg).toContain('data-mplate-theme="dark"')
    expect(result.svg).toContain('#ff0000')
    expect(result.svg).toContain('#0000ff')
    expect(result.svg).not.toContain('#00ff00')
  })

  it('truncates beyond the maximum with a warning', () => {
    const lines = Array.from({ length: 12 }, (_, index) => `  layer "L${index}"`).join('\n')
    const result = render(`@pyramid\n${lines}`)
    expect(result.ok).toBe(true)
    expect(result.diagnostics.some((diagnostic) => diagnostic.message.includes('up to 8'))).toBe(true)
  })

  it('warns about unknown icons and attributes but still renders', () => {
    const result = render('@cards\n  card "A" icon:unicorn wobble:3')
    expect(result.ok).toBe(true)
    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual(['Unknown icon "unicorn"', 'Unknown attribute "wobble" on card'])
  })

  it('accepts camelCase and alias icon names', () => {
    const result = render('@cards\n  card "A" icon:arrowUp\n  card "B" icon:people')
    expect(result.diagnostics).toEqual([])
    expect(result.svg).toContain('data-icon="arrow-up"')
    expect(result.svg).toContain('data-icon="users"')
  })

  it('escapes XML special characters', () => {
    const result = render('@cards "R&D <2027>"\n  card "Tom & Jerry"')
    expect(result.svg).toContain('R&amp;D &lt;2027&gt;')
    expect(result.svg).toContain('Tom &amp; Jerry')
  })

  it('can omit the background', () => {
    expect(render('@cards background:none\n  card "A"').svg).not.toMatch(/<rect width="1200"/)
  })
})

describe('validate', () => {
  it('reports validity and the element count', () => {
    expect(validate('@process\n  step "A"\n  step "B"')).toMatchObject({ isValid: true, template: 'process:chevrons', elementCount: 2 })
    expect(validate('@process').isValid).toBe(false)
  })
})

describe('layout checks', () => {
  it('detects overlapping boxes, so the template tests are meaningful', async () => {
    const { boxesOverlap } = await import('../src/svg/paths.js')
    expect(boxesOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 })).toBe(true)
    expect(boxesOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 0, width: 10, height: 10 })).toBe(false)
  })
})
