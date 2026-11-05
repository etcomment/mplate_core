import { describe, expect, it } from 'vitest'
import { readHeaderTitle, rewriteElementLine, rewriteHeaderTitle } from '../src/templates/dslLines'

const SOURCE = `@process style:chevrons "Delivery"
  step "Discover" "Interviews" icon:search
  step "Design" icon:pen-tool #e4572e
  step Build`

describe('rewriteElementLine', () => {
  it('replaces a quoted title and keeps the rest of the line', () => {
    const next = rewriteElementLine(SOURCE, { line: 2, field: 'title', value: 'Explore "early"', positional: ['title', 'subtitle'] })
    expect(next.split('\n')[1]).toBe('  step "Explore \\"early\\"" "Interviews" icon:search')
  })

  it('adds a missing subtitle after the title, before attributes', () => {
    const next = rewriteElementLine(SOURCE, { line: 3, field: 'subtitle', value: 'Target model', positional: ['title', 'subtitle'] })
    expect(next.split('\n')[2]).toBe('  step "Design" "Target model" icon:pen-tool #e4572e')
  })

  it('quotes a bare title when rewriting it', () => {
    const next = rewriteElementLine(SOURCE, { line: 4, field: 'title', value: 'Build it', positional: ['title', 'subtitle'] })
    expect(next.split('\n')[3]).toBe('  step "Build it"')
  })

  it('writes values as val: when the element has no positional value', () => {
    const added = rewriteElementLine(SOURCE, { line: 2, field: 'value', value: '€4M', positional: ['title', 'subtitle'] })
    expect(added.split('\n')[1]).toBe('  step "Discover" "Interviews" icon:search val:"€4M"')
    const changed = rewriteElementLine(added, { line: 2, field: 'value', value: '€5M', positional: ['title', 'subtitle'] })
    expect(changed.split('\n')[1]).toBe('  step "Discover" "Interviews" icon:search val:"€5M"')
    const removed = rewriteElementLine(changed, { line: 2, field: 'value', value: '', positional: ['title', 'subtitle'] })
    expect(removed.split('\n')[1]).toBe('  step "Discover" "Interviews" icon:search')
  })

  it('uses the positional slot when the template declares one', () => {
    const source = '@funnel style:bars\n  level "Leads" "" "6,200"'
    const next = rewriteElementLine(source, { line: 2, field: 'value', value: '7,000', positional: ['title', 'subtitle', 'value'] })
    expect(next.split('\n')[1]).toBe('  level "Leads" "" "7,000"')
  })

  it('skips flags when counting positional values', () => {
    const source = '@comparison style:table\n  row "SSO" yes "Enterprise"'
    const next = rewriteElementLine(source, { line: 2, field: 'subtitle', value: 'All plans', positional: ['title', 'subtitle'], flags: ['yes', 'no'] })
    expect(next.split('\n')[1]).toBe('  row "SSO" yes "All plans"')
  })

  it('leaves the source untouched for an unknown line', () => {
    expect(rewriteElementLine(SOURCE, { line: 40, field: 'title', value: 'x', positional: ['title'] })).toBe(SOURCE)
  })
})

describe('header title', () => {
  it('reads and rewrites the title', () => {
    expect(readHeaderTitle(SOURCE)).toEqual({ line: 1, title: 'Delivery' })
    expect(rewriteHeaderTitle(SOURCE, 'Approach').split('\n')[0]).toBe('@process style:chevrons "Approach"')
  })

  it('inserts a title after the style when there is none', () => {
    expect(rewriteHeaderTitle('@process style:steps theme:dark\n  step "A"', 'New').split('\n')[0]).toBe('@process style:steps "New" theme:dark')
  })
})
