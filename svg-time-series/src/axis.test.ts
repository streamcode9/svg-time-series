import { describe, it, expect } from 'vitest'
import { JSDOM } from 'jsdom'
import { select } from 'd3-selection'
import { scaleLinear } from 'd3-scale'
import { MyAxis, Orientation } from './axis.ts'

const NS = 'http://www.w3.org/2000/svg'

function createGroup() {
  const dom = new JSDOM(`<svg xmlns="${NS}"></svg>`, { contentType: 'image/svg+xml' })
  const svg = dom.window.document.querySelector('svg') as SVGSVGElement
  const g = dom.window.document.createElementNS(NS, 'g') as SVGGElement
  svg.appendChild(g)
  return { g }
}

describe('MyAxis tick creation', () => {
  it('creates ticks for a single scale', () => {
    const { g } = createGroup()
    const scale = scaleLinear().domain([0, 100]).range([0, 100])
    const axis = new MyAxis(Orientation.Bottom, scale).setTickValues([0, 50, 100])
    axis.axis(select(g))

    const ticks = Array.from(g.querySelectorAll('.tick'))
    expect(ticks.map((t) => t.getAttribute('transform'))).toEqual([
      'translate(0,0)',
      'translate(50,0)',
      'translate(100,0)',
    ])
    const labels = ticks.map((t) => t.querySelector('text')!.textContent)
    expect(labels).toEqual(['0', '50', '100'])
  })

  it('creates ticks for dual scales (regression)', () => {
    const { g } = createGroup()
    const scale1 = scaleLinear().domain([0, 100]).range([0, 100])
    const scale2 = scaleLinear().domain([0, 1]).range([0, 100])
    const axis = new MyAxis(Orientation.Bottom, scale1, scale2).ticks(3)
    axis.axis(select(g))

    const ticks = Array.from(g.querySelectorAll('.tick'))
    expect(ticks.length).toBe(3)
    expect(ticks.map((t) => t.getAttribute('transform'))).toEqual([
      'translate(0,0)',
      'translate(50,0)',
      'translate(100,0)',
    ])
    const labels = ticks.map((t) =>
      Array.from(t.querySelectorAll('text')).map((n) => parseFloat(n.textContent || '')),
    )
    expect(labels).toEqual([
      [0, 0],
      [50, 0.5],
      [100, 1],
    ])
  })
})
