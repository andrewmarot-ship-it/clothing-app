import { describe, expect, it } from 'vitest'
import { rate } from '../domain/scoring'
import type { Item } from '../domain/types'
import { currentOutfit, hangPatch, lookPatch, migratePicks, shapesAvailable, type Picks } from './outfit'

const piece = (id: string, cat: Item['cat']): Item => ({ id, cat, name: id, kind: cat === 'top' ? 'tee' : cat === 'bottom' ? 'jeans' : 'dress', color: '#b4643c', colorName: 'Rust', fabric: 'Cotton', tone: 7, f: 1, w: 1, wears: 0 })
const items = [piece('t1', 'top'), piece('t2', 'top'), piece('b1', 'bottom'), piece('d1', 'dress'), piece('d2', 'dress')]
const rated = rate(items, 7)
const picks = (p: Partial<Picks> = {}): Picks => ({ topId: null, botId: null, dressId: null, shape: 'separates', ...p })
const ids = (o: ReturnType<typeof currentOutfit>) => o && [o.t.id, o.b?.id ?? null]

describe('the outfit on the Stage', () => {
  it('follows the shape, keeping the picks of the other', () => {
    const p = picks({ topId: 't2', botId: 'b1', dressId: 'd2' })
    expect(ids(currentOutfit(rated, p))).toEqual(['t2', 'b1'])
    expect(ids(currentOutfit(rated, { ...p, shape: 'dress' }))).toEqual(['d2', null])
  })

  it('falls back to the first of each kind', () => {
    expect(ids(currentOutfit(rated, picks()))).toEqual(['t1', 'b1'])
    expect(ids(currentOutfit(rated, picks({ shape: 'dress' })))).toEqual(['d1', null])
  })

  it('uses the other shape when this one cannot be made', () => {
    const noBottoms = rated.filter((i) => i.cat !== 'bottom')
    expect(ids(currentOutfit(noBottoms, picks()))).toEqual(['d1', null])
    const noDresses = rated.filter((i) => i.cat !== 'dress')
    expect(ids(currentOutfit(noDresses, picks({ shape: 'dress' })))).toEqual(['t1', 'b1'])
    expect(currentOutfit(rated.filter((i) => i.cat === 'top'), picks())).toBeNull()
  })

  it('switches shape when a piece is hung', () => {
    expect(hangPatch({ items }, 'd2')).toEqual({ dressId: 'd2', shape: 'dress' })
    expect(hangPatch({ items }, 'b1')).toEqual({ botId: 'b1', shape: 'separates' })
    expect(hangPatch({ items }, 'gone')).toEqual({})
    expect(lookPatch('t1', 'b1')).toEqual({ topId: 't1', botId: 'b1', shape: 'separates' })
    expect(lookPatch('d1', null)).toEqual({ dressId: 'd1', shape: 'dress' })
  })

  it('knows which shapes the wardrobe can make', () => {
    expect(shapesAvailable(items)).toEqual({ separates: true, dress: true })
    expect(shapesAvailable(items.filter((i) => i.cat !== 'bottom'))).toEqual({ separates: false, dress: true })
  })

  it('moves a dress stored as the top to the dress pick', () => {
    expect(migratePicks(picks({ topId: 'd1', botId: 'b1' }), items)).toEqual(picks({ topId: null, botId: 'b1', dressId: 'd1', shape: 'dress' }))
    expect(migratePicks(picks({ topId: 't1' }), items)).toEqual(picks({ topId: 't1' }))
  })
})
