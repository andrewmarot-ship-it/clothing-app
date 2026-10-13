import { describe, expect, it } from 'vitest'
import { oklch } from './color'
import { galaxyLayout } from './galaxy'

const dist = (p: { x: number; y: number }) => Math.hypot(p.x - 50, p.y - 50)

describe('colour galaxy', () => {
  it('puts a colour at its hue, further out the more saturated it is', () => {
    const [vivid, muted] = galaxyLayout(['#e0115f', '#9c8f84'])
    const angle = (Math.atan2(vivid.y - 50, vivid.x - 50) * 180) / Math.PI
    expect(((angle % 360) + 360) % 360).toBeCloseTo(oklch('#e0115f').h, 0)
    expect(dist(vivid)).toBeGreaterThan(dist(muted))
  })

  it('stays inside the square', () => {
    const nodes = galaxyLayout(Array.from({ length: 30 }, (_, i) => `#${(i * 8).toString(16).padStart(2, '0')}4060`))
    for (const n of nodes) expect(dist(n)).toBeLessThanOrEqual(45)
  })

  it('spreads greys around instead of stacking them', () => {
    const [a, b, c] = galaxyLayout(['#808080', '#7a7a7a', '#858585'])
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(5)
    expect(Math.hypot(b.x - c.x, b.y - c.y)).toBeGreaterThan(5)
  })

  it('nudges same-coloured pieces apart', () => {
    const [a, b] = galaxyLayout(['#b4643c', '#b4643c'])
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(13)
  })
})
