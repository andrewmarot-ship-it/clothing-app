import { describe, expect, it } from 'vitest'
import { isFront, nextSpin, relAngle, ringOpacity, spinTicks } from './ring'

describe('ring clotheslines', () => {
  it('turns the shorter way round', () => {
    expect(nextSpin(0, 1, 7)).toBe(1)
    expect(nextSpin(0, 6, 7)).toBe(-1)
    expect(nextSpin(13, 0, 7)).toBe(14)
    expect(nextSpin(-3, 2, 7)).toBe(-5)
  })

  it('adds whole turns for a Cast or shuffle', () => {
    expect(nextSpin(0, 2, 7, 2)).toBe(16)
    expect(nextSpin(5, 5, 5, 1)).toBe(10)
  })

  it('brings the target to the front', () => {
    for (const [spin, target, n] of [[0, 3, 7], [11, 1, 4], [-9, 2, 5]]) expect(isFront(target, nextSpin(spin, target, n), n)).toBe(true)
  })

  it('fades items towards the back', () => {
    expect(ringOpacity(0, 0, 8)).toBe(1)
    expect(ringOpacity(1, 0, 8)).toBeCloseTo(0.43, 2)
    expect(ringOpacity(4, 0, 8)).toBe(0.05)
    expect(relAngle(7, 0, 8)).toBeCloseTo(-45, 5)
  })

  it('spreads twelve ticks over the spin on the handoff schedule', () => {
    const t = spinTicks(1600)
    expect(t).toHaveLength(12)
    expect(t[0]).toBe(Math.round(1600 * (1 - Math.pow(12 / 13, 2.2))))
    expect(t[11]).toBeLessThan(1600)
    for (let i = 1; i < 12; i++) expect(t[i]).toBeGreaterThan(t[i - 1])
  })
})
