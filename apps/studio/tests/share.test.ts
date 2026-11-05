import { describe, expect, it } from 'vitest'
import { decodeShare, encodeShare } from '../src/share'

describe('share links', () => {
  it('round-trips the design, including accents and emoji', () => {
    const state = { source: '@cards "Équipe 🚀"\n  card "Qualité"', theme: 'dark', width: 1600 }
    const encoded = encodeShare(state)
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(decodeShare(encoded)).toEqual(state)
  })

  it('keeps colours and layout adjustments', () => {
    const state = {
      source: '@process\n  step "A"',
      theme: 'default',
      width: 1200,
      overrides: { 'step-0': { color: '#e4572e' } },
      adjustments: { positions: { 'step-0': { x: 10, y: 20, width: 100, height: 50 } }, rotations: { 'step-0': 15 }, hidden: ['step-1'] },
    }
    expect(decodeShare(encodeShare(state))).toEqual(state)
  })

  it('ignores malformed links', () => {
    expect(decodeShare('not-base64!!')).toBeUndefined()
    expect(decodeShare(encodeShare({ source: 'x', theme: 'default', width: 1 }).slice(0, 5))).toBeUndefined()
  })
})
