import { describe, expect, it } from 'vitest'
import { parseDsl } from '../src/dsl/parse.js'
import { tokenizeLine } from '../src/dsl/tokenize.js'

describe('tokenizeLine', () => {
  it('splits bare words, quoted strings and quoted attribute values', () => {
    const { tokens } = tokenizeLine('step "Hello world" val:"1 200 €" icon:rocket #fff')
    expect(tokens.map((token) => token.text)).toEqual(['step', 'Hello world', 'val:1 200 €', 'icon:rocket', '#fff'])
    expect(tokens[1]!.quoted).toBe(true)
  })

  it('supports escapes', () => {
    const { tokens } = tokenizeLine('node "Line one\\nLine \\"two\\""')
    expect(tokens[1]!.text).toBe('Line one\nLine "two"')
  })

  it('reports unterminated strings', () => {
    expect(tokenizeLine('step "oops').unterminatedQuoteColumn).toBe(6)
  })
})

describe('parseDsl', () => {
  it('parses the header with family, style, title and attributes', () => {
    const { document, diagnostics } = parseDsl('@brain style:arc "My map" theme:dark\n  center "Core"')
    expect(diagnostics).toEqual([])
    expect(document?.header).toMatchObject({ family: 'brain', style: 'arc', title: 'My map', attributes: { theme: 'dark' } })
  })

  it('keeps numeric variants for legacy aliases', () => {
    const { document } = parseDsl('@brain2')
    expect(document?.header).toMatchObject({ family: 'brain', variant: '2' })
  })

  it('builds nested children from indentation and skips comments', () => {
    const source = `@comparison
  // a comment
  column "A"
    point "one" yes
    point "two"
  # another comment
  column "B" #ff0000
    point "three"`
    const { document, diagnostics } = parseDsl(source)
    expect(diagnostics).toEqual([])
    expect(document?.nodes).toHaveLength(2)
    expect(document?.nodes[0]!.children.map((child) => child.values[0]!.text)).toEqual(['one', 'two'])
    expect(document?.nodes[0]!.children[0]!.values[1]).toEqual({ text: 'yes', quoted: false })
    expect(document?.nodes[1]!.color).toBe('#ff0000')
  })

  it('accepts unindented element lines', () => {
    const { document } = parseDsl('@process\nstep "A"\nstep "B"')
    expect(document?.nodes).toHaveLength(2)
  })

  it('reports a missing header', () => {
    const { document, diagnostics } = parseDsl('step "A"')
    expect(document).toBeUndefined()
    expect(diagnostics[0]!.severity).toBe('error')
  })

  it('reports an empty document', () => {
    expect(parseDsl('   \n').diagnostics[0]!.message).toMatch(/empty/)
  })

  it('warns about malformed colours', () => {
    const { diagnostics } = parseDsl('@process\n  step "A" #zzz')
    expect(diagnostics[0]!.severity).toBe('warning')
  })
})
