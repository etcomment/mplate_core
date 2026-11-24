import { describe, expect, it } from 'vitest'
import { boundingRect, connectorGeometry, elementTransform, isTopLevelId, parentIdOf, projectRect } from '../src/templates/geometry'

const natural = { x: 100, y: 50, width: 200, height: 100 }

describe('element transforms', () => {
  it('leaves untouched elements alone', () => {
    expect(elementTransform(natural, natural, false, undefined)).toBeUndefined()
  })

  it('translates a moved element', () => {
    expect(elementTransform(natural, { ...natural, x: 130, y: 40 }, true, undefined)).toBe('translate(30 -10)')
  })

  it('scales a resized element from its natural box', () => {
    expect(elementTransform(natural, { x: 0, y: 0, width: 400, height: 50 }, true, undefined)).toBe('translate(0 0) scale(2 0.5) translate(-100 -50)')
  })

  it('rotates around the centre of the displayed box', () => {
    expect(elementTransform(natural, natural, false, 90)).toBe('rotate(90 200 100)')
  })
})

describe('element hierarchy', () => {
  const known = { 'column-0': 1, 'column-0-point-1': 1, 'step-0': 1 }

  it('finds parents from structured ids', () => {
    expect(parentIdOf('column-0-point-1', known)).toBe('column-0')
    expect(parentIdOf('column-0', known)).toBeUndefined()
    expect(isTopLevelId('step-0', known)).toBe(true)
    expect(isTopLevelId('column-0-point-1', known)).toBe(false)
  })

  it('projects a child box through its moved parent', () => {
    const child = { x: 120, y: 60, width: 20, height: 10 }
    expect(projectRect(child, natural, { x: 0, y: 0, width: 400, height: 200 })).toEqual({ x: 40, y: 20, width: 40, height: 20 })
    expect(projectRect(child, natural, undefined)).toEqual(child)
  })

  it('computes the bounding box of a selection', () => {
    expect(boundingRect([natural, { x: 0, y: 0, width: 10, height: 10 }])).toEqual({ x: 0, y: 0, width: 300, height: 150 })
    expect(boundingRect([])).toBeUndefined()
  })
})

describe('elastic connectors', () => {
  it('updates line, quad, elbow and elbow-left connectors from endpoint deltas', () => {
    expect(connectorGeometry('line', 0, 0, 100, 50, { dx: 10, dy: 5 }, { dx: -20, dy: 15 })).toEqual({
      x1: 10,
      y1: 5,
      x2: 80,
      y2: 65,
    })
    expect(connectorGeometry('quad', 0, 0, 100, 100, { dx: 0, dy: 0 }, { dx: 100, dy: 0 })).toEqual({
      d: 'M0 0 Q70 100 200 100',
    })
    expect(connectorGeometry('elbow', 50, 20, 150, 80, { dx: 0, dy: 0 }, { dx: 50, dy: 20 })).toEqual({
      d: 'M50 20 L50 60 L200 60 L200 100',
    })
    expect(connectorGeometry('elbow-left', 10, 20, 30, 50, { dx: 5, dy: 5 }, { dx: 10, dy: 20 })).toEqual({
      d: 'M15 25 L15 70 L40 70',
    })
  })
})
