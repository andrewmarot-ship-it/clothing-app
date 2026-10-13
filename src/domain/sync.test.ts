import { describe, expect, it } from 'vitest'
import { mergeItems, mergeProfile, pruneProfile, type ItemRow, type ProfileData } from './sync'
import type { Item } from './types'

const item = (id: string, updatedAt: number, extra: Partial<Item> = {}): Item => ({
  id,
  cat: 'top',
  name: id,
  kind: 'tee',
  color: '#b4643c',
  colorName: 'Rust',
  fabric: 'Cotton',
  tone: 7,
  f: 1,
  w: 1,
  wears: 0,
  updatedAt,
  ...extra,
})
const row = (it: Item, deleted = false): ItemRow => {
  const { photo: _p, ...data } = it
  return { id: it.id, data, client_updated_at: it.updatedAt ?? 0, deleted }
}

describe('mergeItems', () => {
  it('pushes pieces that only exist here and takes pieces that only exist in the cloud', () => {
    const m = mergeItems([item('a', 1)], {}, [row(item('b', 2))])
    expect(m.items.map((i) => i.id)).toEqual(['a', 'b'])
    expect(m.push.map((i) => i.id)).toEqual(['a'])
  })

  it('keeps the newer copy of a piece', () => {
    const local = item('a', 10, { name: 'Local name' })
    const remote = item('a', 20, { name: 'Cloud name' })
    expect(mergeItems([local], {}, [row(remote)]).items[0].name).toBe('Cloud name')
    const m = mergeItems([{ ...local, updatedAt: 30 }], {}, [row(remote)])
    expect(m.items[0].name).toBe('Local name')
    expect(m.push).toHaveLength(1)
  })

  it('applies deletions from other devices unless the piece changed here since', () => {
    expect(mergeItems([item('a', 5)], {}, [row(item('a', 9), true)]).items).toEqual([])
    expect(mergeItems([item('a', 12)], {}, [row(item('a', 9), true)]).items).toHaveLength(1)
  })

  it('sends local deletions up and forgets the tombstone once the cloud has it', () => {
    const m = mergeItems([], { a: 15 }, [row(item('a', 9))])
    expect(m.pushDeletes).toEqual(['a'])
    expect(m.deleted).toEqual({ a: 15 })
    const done = mergeItems([], { a: 15 }, [row(item('a', 15), true)])
    expect(done.pushDeletes).toEqual([])
    expect(done.deleted).toEqual({})
  })

  it('lets a newer cloud edit win over an older local deletion', () => {
    expect(mergeItems([], { a: 5 }, [row(item('a', 9))]).items.map((i) => i.id)).toEqual(['a'])
  })

  it("keeps this device's photo URL when the photo hasn't changed", () => {
    const local = item('a', 1, { photoId: 'a-cut-1', photo: 'blob:local' })
    const remote = item('a', 2, { photoId: 'a-cut-1', name: 'Renamed' })
    expect(mergeItems([local], {}, [row(remote)]).items[0]).toMatchObject({ photo: 'blob:local', name: 'Renamed' })
    const newPhoto = item('a', 3, { photoId: 'a-cut-2' })
    expect(mergeItems([local], {}, [row(newPhoto)]).items[0].photo).toBeUndefined()
  })

  it('never sends display URLs to the cloud', () => {
    const m = mergeItems([item('a', 1, { photo: 'blob:x' })], {}, [])
    expect(m.push[0]).not.toHaveProperty('photo')
  })
})

describe('mergeProfile', () => {
  const p = (tone: number): ProfileData => ({ tone, myColours: [], saved: [], wearLog: [], topId: null, botId: null })
  it('keeps whichever side changed last', () => {
    expect(mergeProfile(p(1), 10, { data: p(2), client_updated_at: 20 })).toMatchObject({ profile: { tone: 2 }, push: false })
    expect(mergeProfile(p(1), 30, { data: p(2), client_updated_at: 20 })).toMatchObject({ profile: { tone: 1 }, push: true })
    expect(mergeProfile(p(1), 0, null).push).toBe(true)
  })

  it('drops references to pieces that no longer exist', () => {
    const prof = { ...p(1), topId: 'gone', saved: [{ id: 's', topId: 'a', botId: 'gone', occ: 'Today' }] }
    expect(pruneProfile(prof, [item('a', 1)])).toMatchObject({ topId: null, saved: [] })
  })

  it('keeps a dress look, which has no bottom', () => {
    const prof = { ...p(1), saved: [{ id: 's', topId: 'd', botId: null, occ: 'Today' }], wearLog: [{ date: '2026-10-13', topId: 'd', botId: null }] }
    expect(pruneProfile(prof, [item('d', 1, { cat: 'dress', kind: 'dress' })])).toMatchObject({ saved: [{ id: 's' }], wearLog: [{ topId: 'd' }] })
  })
})
