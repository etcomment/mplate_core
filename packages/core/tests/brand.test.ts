import { describe, expect, it } from 'vitest'
import { parseBrandKit } from '../src/brand/parse.js'
import { render } from '../src/render/render.js'
import { boxesOverlap } from '../src/svg/paths.js'

const LOGO = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32"><rect width="120" height="32" rx="6" fill="#0a7d3b"/></svg>'

const KIT = {
  kind: 'mplate-brand-kit',
  version: 1,
  name: 'Acme',
  extends: 'default',
  palette: ['#0a7d3b', '#1f3a93', '#c0392b'],
  fonts: { heading: 'Georgia, serif' },
  shape: { radius: 2 },
  logo: { src: LOGO, width: 120, height: 32, position: 'top-right' },
  styles: { process: 'steps' },
}

describe('brand kits', () => {
  it('parses a valid kit and inlines SVG logos as data URIs', () => {
    const { kit, diagnostics } = parseBrandKit(KIT)
    expect(diagnostics).toEqual([])
    expect(kit?.logo?.src.startsWith('data:image/svg+xml;utf8,')).toBe(true)
  })

  it('rejects remote logos and malformed values', () => {
    const { kit, diagnostics } = parseBrandKit({ ...KIT, logo: { src: 'https://example.com/logo.png', width: 10, height: 10 }, palette: ['red'] })
    expect(kit).toBeUndefined()
    expect(diagnostics.map((diagnostic) => diagnostic.message).join(' ')).toMatch(/data: URI.*palette|palette.*data: URI/s)
  })

  it('warns about unreadable colours', () => {
    const { kit, diagnostics } = parseBrandKit({ kind: 'mplate-brand-kit', version: 1, name: 'Pale', palette: ['#fefefe'], colors: { text: '#dddddd' } })
    expect(kit).toBeDefined()
    expect(diagnostics.length).toBeGreaterThanOrEqual(2)
    expect(diagnostics.every((diagnostic) => diagnostic.severity === 'warning')).toBe(true)
  })

  it('applies palette, fonts, logo and default styles when rendering', () => {
    const { kit } = parseBrandKit(KIT)
    const result = render('@process "A long title that should not run under the logo of the company in the corner"\n  step "A"\n  step "B"', { brandKit: kit })
    expect(result.template?.id).toBe('process:steps')
    expect(result.svg).toContain('#0a7d3b')
    expect(result.svg).toContain('Georgia, serif')
    expect(result.svg).toContain('data-mplate-logo="top-right"')
    const logo = { x: result.width - 48 - 120, y: 48, width: 120, height: 32 }
    expect(result.layout.textBoxes.filter((box) => boxesOverlap(box, logo))).toEqual([])
  })

  it('keeps an explicit style over the kit default', () => {
    const { kit } = parseBrandKit(KIT)
    expect(render('@process style:chevrons\n  step "A"', { brandKit: kit }).template?.id).toBe('process:chevrons')
  })

  it('places bottom logos under the content', () => {
    const { kit } = parseBrandKit({ ...KIT, logo: { ...KIT.logo, position: 'bottom-left' } })
    const withLogo = render('@cards\n  card "A"', { brandKit: kit })
    const without = render('@cards\n  card "A"')
    expect(withLogo.height).toBeGreaterThan(without.height)
  })
})
