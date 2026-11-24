import { describe, expect, it } from 'vitest'
import { decodeShare, encodeShare } from '../src/share'
import { buildElementCss } from '../src/templates/TemplateRenderer'
import { parentIdOf } from '../src/templates/geometry'

function encodeRaw(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

describe('studio security hardening', () => {
  describe('share link sanitization', () => {
    it('rejects oversized share payloads (> 256 KB)', () => {
      const oversized = 'A'.repeat(270_000)
      expect(decodeShare(oversized)).toBeUndefined()
    })

    it('strips dangerous CSS payloads and invalid adjustment values', () => {
      const payload = encodeRaw({
        source: '@process\n  step "A"',
        theme: 'default',
        width: 999999,
        overrides: {
          'step-0': { title: 'Safe', dx: 500000 },
          'bad id with spaces': { title: 'Ignored' },
          constructor: { title: 'Ignored' },
        },
        adjustments: {
          strokeColors: {
            'step-0': '#ff0000',
            'step-1': 'red; } body { background: url(https://evil.test) }',
            'step-2': '</style><script>alert(1)</script>',
            'step-0"]{display:none}': '#111111',
          },
          strokeWidths: {
            'step-0': 3,
            'step-1': -5,
            'step-2': 999,
            'step-3': '4px; color: red',
          },
          hidden: ['step-0', 'step-1"]{display:block}/*'],
        },
      })

      const decoded = decodeShare(payload)
      expect(decoded).toBeDefined()
      expect(decoded?.width).toBe(3000)
      expect(decoded?.overrides).toEqual({ 'step-0': { title: 'Safe', dx: 10_000 } })
      expect(decoded?.adjustments).toEqual({
        strokeColors: { 'step-0': '#ff0000' },
        strokeWidths: { 'step-0': 3 },
        hidden: ['step-0'],
      })
    })

    it('round-trips clean share states unchanged', () => {
      const clean = {
        source: '@process\n  step "A"',
        theme: 'ocean',
        width: 1000,
        adjustments: {
          strokeColors: { 'step-0': '#112233' },
          strokeWidths: { 'step-0': 2 },
          hidden: ['step-1'],
        },
      }
      expect(decodeShare(encodeShare(clean))).toEqual(clean)
    })
  })

  describe('CSS builder safety', () => {
    it('ignores unsafe ids, colors and out-of-range widths', () => {
      const css = buildElementCss(
        new Set(['step-0', 'evil"]{display:block}']),
        {
          'step-0': '#123456',
          'step-1': 'red; } script { display: block',
          'bad"id': '#000000',
        },
        {
          'step-0': 2,
          'step-1': Number.NaN,
          'step-2': 500,
        },
      )

      expect(css).toContain('[data-mplate-id="step-0"] { display: none !important; }')
      expect(css).toContain('stroke: #123456 !important;')
      expect(css).toContain('stroke-width: 2px !important;')
      expect(css).not.toContain('evil')
      expect(css).not.toContain('script')
      expect(css).not.toContain('NaN')
      expect(css).not.toContain('500px')
    })
  })

  describe('prototype lookup safety', () => {
    it('does not treat Object.prototype properties as parent ids', () => {
      expect(parentIdOf('toString-step-0', {})).toBeUndefined()
      expect(parentIdOf('constructor-step-0', {})).toBeUndefined()
      expect(parentIdOf('lane-0-milestone-0', { 'lane-0': {} })).toBe('lane-0')
    })
  })
})
