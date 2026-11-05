import { describe, expect, it } from 'vitest'
import { createRenderer, defineTemplate } from '../src/renderer.js'
import { DEFAULT_THEME } from '../src/theme/themes.js'

const ribbon = defineTemplate({
  card: {
    id: 'ribbon:plain',
    family: 'ribbon',
    style: 'plain',
    isDefaultStyle: true,
    aliases: [],
    name: 'Ribbon',
    description: 'A test template',
    useCases: ['tests'],
    items: { min: 1, max: 5, recommended: [1, 3] },
    elements: [{ keyword: 'band', description: 'One band', positional: ['title'] }],
    settings: [],
    example: '@ribbon\n  band "A"',
    tags: [],
  },
  render(canvas, input) {
    input.items.forEach((item, index) => {
      canvas.group(item.id, () => {
        canvas.rect({ x: canvas.left, y: canvas.top + index * 50, width: canvas.contentWidth, height: 40 }, { fill: item.color })
        canvas.text({ text: item.title, x: canvas.left + 10, y: canvas.top + index * 50, width: 300, height: 40, size: 16, valign: 'middle', color: canvas.theme.textOn(item.color) })
      })
    })
    canvas.extendHeight(canvas.top + input.items.length * 50)
  },
})

describe('createRenderer', () => {
  it('adds custom templates next to the built-in ones', () => {
    const renderer = createRenderer({ templates: [ribbon] })
    expect(renderer.render('@ribbon\n  band "Hello"').template?.id).toBe('ribbon:plain')
    expect(renderer.render('@process\n  step "A"').ok).toBe(true)
    expect(renderer.listTemplates().some((card) => card.id === 'ribbon:plain')).toBe(true)
    expect(renderer.syntaxGuide()).toContain('ribbon:plain')
  })

  it('can run with custom templates only', () => {
    const renderer = createRenderer({ templates: [ribbon], includeBuiltInTemplates: false })
    expect(renderer.render('@process\n  step "A"').ok).toBe(false)
    expect(renderer.listTemplates()).toHaveLength(1)
  })

  it('lets a custom template replace the default style of a built-in family', () => {
    const custom = defineTemplate({ ...ribbon, card: { ...ribbon.card, id: 'process:ribbon', family: 'process', style: 'ribbon', example: '@process\n  band "A"' } })
    const renderer = createRenderer({ templates: [custom] })
    expect(renderer.render('@process\n  band "A"').template?.id).toBe('process:ribbon')
    expect(renderer.render('@process style:chevrons\n  step "A"').template?.id).toBe('process:chevrons')
  })

  it('rejects duplicate names and malformed ids', () => {
    expect(() => createRenderer({ templates: [{ ...ribbon, card: { ...ribbon.card, aliases: ['process1'] } }] })).toThrow(/process1/)
    expect(() => createRenderer({ templates: [{ ...ribbon, card: { ...ribbon.card, id: 'Ribbon' } }] })).toThrow(/family:style/)
  })

  it('registers custom themes by name', () => {
    const brand = { ...DEFAULT_THEME, name: 'acme', description: 'Acme', palette: ['#0a7d3b'] }
    const renderer = createRenderer({ themes: [brand] })
    const result = renderer.render('@cards theme:acme\n  card "A"')
    expect(result.svg).toContain('data-mplate-theme="acme"')
    expect(result.svg).toContain('#0a7d3b')
    expect(renderer.listThemes().map((theme) => theme.name)).toContain('acme')
  })
})

describe('built-in catalogue', () => {
  it('passes the same checks as custom templates', async () => {
    const { BUILT_IN_TEMPLATES } = await import('../src/templates/registry.js')
    const { checkTemplates } = await import('../src/renderer.js')
    expect(() => checkTemplates(BUILT_IN_TEMPLATES)).not.toThrow()
    expect(BUILT_IN_TEMPLATES).toHaveLength(25)
  })
})
