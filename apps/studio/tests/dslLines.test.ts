import { describe, expect, it } from 'vitest'
import { readDocumentSubtitle, readHeaderTitle, rewriteDocumentSubtitle, rewriteElementLine, rewriteHeaderTitle } from '../src/templates/dslLines'

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

  it('rewrites and removes sub: attributes in place including multi-line descriptions', () => {
    const kpi = '@kpi "Q3"\n  metric "Roadmap" "72%" pct:72 sub:"of planned items shipped" icon:rocket'
    const positional = ['title', 'value', 'delta', 'subtitle']
    const updated = rewriteElementLine(kpi, { line: 2, field: 'subtitle', value: 'Line 1\nLine 2\nLine 3', positional })
    expect(updated.split('\n')[1]).toBe('  metric "Roadmap" "72%" pct:72 sub:"Line 1\\nLine 2\\nLine 3" icon:rocket')
    const cleared = rewriteElementLine(updated, { line: 2, field: 'subtitle', value: '', positional })
    expect(cleared.split('\n')[1]).toBe('  metric "Roadmap" "72%" pct:72 icon:rocket')
  })

  it('writes sub: attribute when earlier optional positional slots are omitted', () => {
    const kpi = '@kpi "Q3"\n  metric "Revenue" "€4.2M"'
    const updated = rewriteElementLine(kpi, { line: 2, field: 'subtitle', value: 'Recurring ARR', positional: ['title', 'value', 'delta', 'subtitle'] })
    expect(updated.split('\n')[1]).toBe('  metric "Revenue" "€4.2M" sub:"Recurring ARR"')
  })

  it('rewrites value: attributes in place and supports delta editing', () => {
    const gauge = '@kpi style:gauges\n  gauge "Scope" "Features" pct:72 value:"72%"'
    const updatedVal = rewriteElementLine(gauge, { line: 2, field: 'value', value: '80%', positional: ['title', 'subtitle', 'value'] })
    expect(updatedVal.split('\n')[1]).toBe('  gauge "Scope" "Features" pct:72 value:"80%"')

    const kpi = '@kpi\n  metric "Revenue" "€4.2M" "+18%"'
    const updatedDelta = rewriteElementLine(kpi, { line: 2, field: 'delta', value: '+24%', positional: ['title', 'value', 'delta', 'subtitle'] })
    expect(updatedDelta.split('\n')[1]).toBe('  metric "Revenue" "€4.2M" "+24%"')
  })

  it('rewrites date, percent, from, to and label attributes', () => {
    const milestone = '@timeline\n  milestone "Discovery" "Research" date:Q1'
    expect(rewriteElementLine(milestone, { line: 2, field: 'date', value: 'Q2 2027', positional: ['title', 'subtitle'] }).split('\n')[1])
      .toBe('  milestone "Discovery" "Research" date:"Q2 2027"')

    const gantt = '@timeline style:gantt\n  task "Build" from:Mar to:May pct:10'
    const afterPct = rewriteElementLine(gantt, { line: 2, field: 'percent', value: '65', positional: ['title'] })
    expect(afterPct.split('\n')[1]).toBe('  task "Build" from:Mar to:May pct:65')
    const afterFrom = rewriteElementLine(afterPct, { line: 2, field: 'from', value: 'Feb', positional: ['title'] })
    const afterTo = rewriteElementLine(afterFrom, { line: 2, field: 'to', value: 'Jun', positional: ['title'] })
    expect(afterTo.split('\n')[1]).toBe('  task "Build" from:Feb to:Jun pct:65')

    const card = '@cards\n  card "Pillar" "Desc"'
    expect(rewriteElementLine(card, { line: 2, field: 'label', value: 'P1', positional: ['title', 'subtitle'] }).split('\n')[1])
      .toBe('  card "Pillar" "Desc" label:"P1"')
  })
})

describe('header title', () => {
  it('reads, rewrites and removes the header title', () => {
    expect(readHeaderTitle(SOURCE)).toEqual({ line: 1, title: 'Delivery' })
    expect(rewriteHeaderTitle(SOURCE, 'Approach').split('\n')[0]).toBe('@process style:chevrons "Approach"')
    expect(rewriteHeaderTitle(SOURCE, '').split('\n')[0]).toBe('@process style:chevrons')
  })

  it('inserts a title after the style when there is none', () => {
    expect(rewriteHeaderTitle('@process style:steps theme:dark\n  step "A"', 'New').split('\n')[0]).toBe('@process style:steps "New" theme:dark')
  })

  it('reads, updates, inserts and removes document subtitle', () => {
    const withSub = rewriteDocumentSubtitle(SOURCE, 'Overview')
    expect(readDocumentSubtitle(withSub)).toEqual({ line: 2, subtitle: 'Overview' })
    expect(rewriteDocumentSubtitle(withSub, 'Updated').split('\n')[1]).toBe('  subtitle "Updated"')
    expect(rewriteDocumentSubtitle(withSub, '').split('\n')[1]).toBe('  step "Discover" "Interviews" icon:search')
  })
})
