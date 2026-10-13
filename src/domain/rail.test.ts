import { describe, expect, it } from 'vitest'
import { railSlot } from './rail'

const layout = (centre: number, n: number) => Array.from({ length: n }, (_, i) => railSlot(i, centre, n))

describe('closet rail', () => {
  it('puts the centre piece biggest and neighbours smaller and fainter', () => {
    const [far2, far1, mid, near1, near2] = layout(2, 5)
    expect(mid).toMatchObject({ offset: 0, x: 0, width: 132, opacity: 1, z: 4, hidden: false })
    expect(near1).toMatchObject({ offset: 1, x: 102, width: 84, opacity: 0.6, z: 3 })
    expect(far1).toMatchObject({ offset: -1, x: -102 })
    expect(near2).toMatchObject({ offset: 2, x: 162, width: 58, opacity: 0.3, z: 2 })
    expect(far2).toMatchObject({ offset: -2, x: -162 })
  })

  it('wraps around, so the last piece sits left of the first', () => {
    const slots = layout(0, 7)
    expect(slots[6]).toMatchObject({ offset: -1, x: -102 })
    expect(slots[5]).toMatchObject({ offset: -2, x: -162 })
  })

  it('hides pieces more than two steps away, off the ends of the rail', () => {
    const slots = layout(0, 7)
    expect(slots[3]).toMatchObject({ hidden: true, opacity: 0, x: 240 })
    expect(slots[4]).toMatchObject({ hidden: true, x: -240 })
  })

  it('copes with one, two and three pieces', () => {
    expect(layout(0, 1)).toEqual([expect.objectContaining({ offset: 0, hidden: false })])
    expect(layout(0, 2).map((s) => s.offset)).toEqual([0, 1])
    expect(layout(1, 3).map((s) => s.offset)).toEqual([-1, 0, 1])
  })
})
