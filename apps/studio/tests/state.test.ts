import { describe, expect, it } from 'vitest'
import { decodeShare, encodeShare } from '../src/state.js'
import { fileNameFor } from '../src/exporters.js'

describe('share links', () => {
  it('round-trips the design, including accents and emoji', () => {
    const state = { source: '@cards "Équipe 🚀"\n  card "Qualité"', theme: 'dark', width: 1600 }
    const encoded = encodeShare(state)
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(decodeShare(encoded)).toEqual(state)
  })

  it('ignores malformed links', () => {
    expect(decodeShare('not-base64!!')).toBeUndefined()
    expect(decodeShare(encodeShare({ source: 'x', theme: 'default', width: 1 }).slice(0, 5))).toBeUndefined()
  })
})

describe('file names', () => {
  it('slugifies titles', () => {
    expect(fileNameFor('Feuille de route 2027 — équipe', 'svg')).toBe('feuille-de-route-2027-equipe.svg')
    expect(fileNameFor(undefined, 'png')).toBe('mplate.png')
  })
})
