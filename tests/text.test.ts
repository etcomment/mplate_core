import { describe, expect, it } from 'vitest'
import { measureText } from '../src/text/metrics.js'
import { fitText, wrapText } from '../src/text/wrap.js'

describe('text layout', () => {
  it('measures wider text as wider', () => {
    expect(measureText('WWW', 16)).toBeGreaterThan(measureText('iii', 16))
    expect(measureText('abc', 16, 700)).toBeGreaterThan(measureText('abc', 16))
  })

  it('wraps on word boundaries and keeps explicit line breaks', () => {
    const lines = wrapText('one two three four five six', 80, 16)
    expect(lines.length).toBeGreaterThan(1)
    expect(lines.every((line) => measureText(line, 16) <= 80)).toBe(true)
    expect(wrapText('a\nb', 500, 16)).toEqual(['a', 'b'])
  })

  it('splits words that are longer than the line', () => {
    const lines = wrapText('Supercalifragilisticexpialidocious', 60, 16)
    expect(lines.length).toBeGreaterThan(2)
  })

  it('shrinks then truncates to respect the line limit', () => {
    const fitted = fitText('A fairly long sentence that will not fit on one short line at all', { maxWidth: 120, fontSize: 18, minFontSize: 12, maxLines: 2 })
    expect(fitted.lines).toHaveLength(2)
    expect(fitted.fontSize).toBe(12)
    expect(fitted.isTruncated).toBe(true)
    expect(fitted.lines[1]!.endsWith('…')).toBe(true)
  })
})
