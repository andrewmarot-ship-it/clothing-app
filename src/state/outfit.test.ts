import { describe, expect, it } from 'vitest'
import { rate } from '../domain/scoring'
import type { Item } from '../domain/types'
import type { AppState } from './context'
import { currentOutfit, hangPatch } from './outfit'

const piece = (id: string, cat: Item['cat']): Item => ({ id, cat, name: id, kind: cat === 'top' ? 'tee' : cat === 'bottom' ? 'jeans' : 'dress', color: '#b4643c', colorName: 'Rust', fabric: 'Cotton', tone: 7, f: 1, w: 1, wears: 0 })
const items = [piece('t1', 'top'), piece('t2', 'top'), piece('b1', 'bottom'), piece('d1', 'dress')]
const rated = rate(items, 7)
const state = (topId: string | null, botId: string | null) => ({ items, topId, botId }) as AppState
const ids = (o: ReturnType<typeof currentOutfit>) => o && [o.t.id, o.b?.id ?? null]

describe('the outfit on the line', () => {
  it('is the chosen dress on its own', () => {
    expect(ids(currentOutfit(rated, 'd1', 'b1'))).toEqual(['d1', null])
  })

  it('is the chosen top and bottom, falling back to the first of each', () => {
    expect(ids(currentOutfit(rated, 't2', 'b1'))).toEqual(['t2', 'b1'])
    expect(ids(currentOutfit(rated, null, null))).toEqual(['t1', 'b1'])
  })

  it('falls back to a dress when there are no bottoms, and to nothing without one', () => {
    const noBottoms = rated.filter((i) => i.cat !== 'bottom')
    expect(ids(currentOutfit(noBottoms, 't1', null))).toEqual(['d1', null])
    expect(currentOutfit(noBottoms.filter((i) => i.cat !== 'dress'), 't1', null)).toBeNull()
  })

  it('swaps a dress for a top when a bottom goes on', () => {
    expect(hangPatch(state('d1', null), 'b1')).toEqual({ botId: 'b1', topId: 't1' })
    expect(hangPatch(state('t2', null), 'b1')).toEqual({ botId: 'b1', topId: 't2' })
    expect(hangPatch(state('t1', 'b1'), 'd1')).toEqual({ topId: 'd1' })
    expect(hangPatch(state('t1', 'b1'), 'gone')).toEqual({})
  })
})
