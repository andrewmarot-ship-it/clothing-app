import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { rate } from '../domain/scoring'
import { lookExists } from '../domain/sync'
import { isCategory, migrateDress } from '../domain/tags'
import { DEFAULT_TONE, TONES, toneIndex } from '../domain/tones'
import type { Item } from '../domain/types'
import { Ctx, today, type AppContext, type AppState, type Images, type Wear } from './context'
import { currentOutfit, hangPatch } from './outfit'
import { deletePhotos, getPhoto, putPhoto } from './photos'
import { useCloudSync } from './useCloudSync'

const STORAGE_KEY = 'clothesline-app-v1'

/** Version of the stored data. 2: dresses have their own category. */
const DATA_VERSION = 2

/** The part of the state that survives a reload. */
type Persisted = Pick<AppState, 'tone' | 'items' | 'saved' | 'topId' | 'botId' | 'wearLog' | 'myColours' | 'deleted' | 'profileUpdatedAt'> & { v?: number }

/** Fields that make up the synced profile record; changing any of them stamps profileUpdatedAt. */
const PROFILE_KEYS = ['tone', 'myColours', 'saved', 'wearLog', 'topId', 'botId'] as const

/** Pieces from the old built-in demo wardrobe, cleared out of existing browsers. */
const LEGACY_DEMO = /^[tb][1-7]$/

const isItem = (i: unknown): i is Item => {
  const o = i as Item
  return !!o && typeof o.id === 'string' && isCategory(o.cat) && typeof o.color === 'string' && typeof o.tone === 'number'
}

function blankState(): AppState {
  return {
    screen: 'outfit',
    from: 'outfit',
    tone: null,
    items: [],
    topId: null,
    botId: null,
    saved: [],
    wearLog: [],
    myColours: [],
    deleted: {},
    profileUpdatedAt: 0,
    filter: 'all',
    itemId: null,
    retakeId: null,
    occText: '',
    occKey: 'today',
    occAi: null,
    code: null,
    lookI: 0,
    quizStep: 0,
    quiz: [null, null, null],
  }
}

function initialState(): AppState {
  const base = blankState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const p = JSON.parse(raw) as Partial<Persisted>
    const now = Date.now()
    const items = (Array.isArray(p.items) ? p.items : [])
      .filter(isItem)
      .filter((i) => !(LEGACY_DEMO.test(i.id) && !i.photoId && !i.photo))
      .map((i) => ((p.v ?? 1) < 2 ? migrateDress(i, now) : i))
    const ids = new Set(items.map((i) => i.id))
    const pair = lookExists(ids)
    return {
      ...base,
      tone: typeof p.tone === 'number' && TONES[p.tone] ? p.tone : null,
      items,
      saved: Array.isArray(p.saved) ? p.saved.filter(pair) : [],
      wearLog: Array.isArray(p.wearLog) ? p.wearLog.filter(pair) : [],
      myColours: Array.isArray(p.myColours) ? p.myColours.filter((c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)) : [],
      deleted: p.deleted && typeof p.deleted === 'object' ? p.deleted : {},
      profileUpdatedAt: typeof p.profileUpdatedAt === 'number' ? p.profileUpdatedAt : 0,
      topId: p.topId && ids.has(p.topId) ? p.topId : null,
      botId: p.botId && ids.has(p.botId) ? p.botId : null,
    }
  } catch {
    return base
  }
}

/** Stamp profile changes so sync knows which copy is newer (unless the change set its own stamp). */
function stampProfile(prev: AppState, next: AppState): AppState {
  if (next === prev || next.profileUpdatedAt !== prev.profileUpdatedAt) return next
  return PROFILE_KEYS.some((k) => prev[k] !== next[k]) ? { ...next, profileUpdatedAt: Date.now() } : next
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState)

  const update = useCallback((fn: (s: AppState) => AppState) => setState((s) => stampProfile(s, fn(s))), [])

  const set = useCallback<AppContext['set']>(
    (patch) => update((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) })),
    [update],
  )

  const go = useCallback<AppContext['go']>(
    (screen, patch = {}) => {
      update((s) => ({ ...s, screen, from: s.screen, ...patch }))
      window.scrollTo(0, 0)
    },
    [update],
  )

  const { tone, items, saved, topId, botId, wearLog, myColours, deleted, profileUpdatedAt } = state
  useEffect(() => {
    const data: Persisted = { v: DATA_VERSION, tone, items, saved, topId, botId, wearLog, myColours, deleted, profileUpdatedAt }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Storage full or unavailable: the session still works, it just won't persist.
    }
  }, [tone, items, saved, topId, botId, wearLog, myColours, deleted, profileUpdatedAt])

  // Stored images → object URLs for display. Items keep only the storage key.
  const [urls, setUrls] = useState<Record<string, string>>({})
  const startItems = useRef(items)
  useEffect(() => {
    let live = true
    const made: string[] = []
    for (const it of startItems.current) {
      const key = it.photoId
      if (!key) continue
      getPhoto(key).then((blob) => {
        if (!blob || !live) return
        const url = URL.createObjectURL(blob)
        made.push(url)
        setUrls((u) => ({ ...u, [key]: url }))
      })
    }
    return () => {
      live = false
      made.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [])

  /** Store images under fresh keys and return the item fields that point at them. */
  const storeImages = useCallback((id: string, images: Images): Partial<Item> => {
    const out: Partial<Item> = {}
    const stamp = Date.now().toString(36)
    if (images.photo) {
      const key = `${id}-cut-${stamp}`
      out.photoId = key
      out.cutout = true
      void putPhoto(key, images.photo)
      const url = URL.createObjectURL(images.photo)
      setUrls((u) => ({ ...u, [key]: url }))
    }
    if (images.original) {
      out.originalId = `${id}-orig-${stamp}`
      void putPhoto(out.originalId, images.original)
    }
    return out
  }, [])

  const addItem = useCallback<AppContext['addItem']>(
    (item, images) => {
      const next: Item = { ...item, ...storeImages(item.id, images), updatedAt: Date.now() }
      update((s) => {
        const added = { ...s, items: [...s.items, next] }
        return { ...added, ...hangPatch(added, next.id) }
      })
    },
    [storeImages, update],
  )

  const updateItem = useCallback<AppContext['updateItem']>(
    (id, patch, images) => {
      const stored = images ? storeImages(id, images) : {}
      update((s) => {
        const old = s.items.find((i) => i.id === id)
        if (!old) return s
        // A retake replaces the images: drop the old ones, or the drawn fallback if there's no new cut-out.
        if (images) {
          void deletePhotos([old.photoId, old.originalId].filter((k): k is string => !!k))
          if (!stored.photoId) Object.assign(stored, { photoId: undefined, cutout: undefined, photo: undefined })
        }
        const next: Item = { ...old, ...patch, ...stored, updatedAt: Date.now() }
        const catChanged = next.cat !== old.cat
        return {
          ...s,
          items: s.items.map((i) => (i.id === id ? next : i)),
          // Moving a piece between tops, bottoms and dresses breaks the looks it was part of.
          saved: catChanged ? s.saved.filter((l) => l.topId !== id && l.botId !== id) : s.saved,
          topId: catChanged && s.topId === id ? null : s.topId,
          botId: catChanged && s.botId === id ? null : s.botId,
        }
      })
    },
    [storeImages, update],
  )

  const removeItem = useCallback<AppContext['removeItem']>((id) => {
    update((s) => {
      const it = s.items.find((i) => i.id === id)
      if (it) void deletePhotos([it.photoId, it.originalId].filter((k): k is string => !!k))
      return {
        ...s,
        items: s.items.filter((i) => i.id !== id),
        deleted: { ...s.deleted, [id]: Date.now() },
        saved: s.saved.filter((l) => l.topId !== id && l.botId !== id),
        wearLog: s.wearLog.filter((w) => w.topId !== id && w.botId !== id),
        topId: s.topId === id ? null : s.topId,
        botId: s.botId === id ? null : s.botId,
      }
    })
  }, [update])

  const toggleWorn = useCallback<AppContext['toggleWorn']>((t, b) => {
    update((s) => {
      const date = today()
      const existing = s.wearLog.find((w) => w.date === date && w.topId === t && (w.botId ?? null) === b)
      const delta = existing ? -1 : 1
      const wearLog: Wear[] = existing ? s.wearLog.filter((w) => w !== existing) : [...s.wearLog, { date, topId: t, botId: b }]
      const now = Date.now()
      return { ...s, wearLog, items: s.items.map((i) => (i.id === t || i.id === b ? { ...i, wears: Math.max(0, i.wears + delta), updatedAt: now } : i)) }
    })
  }, [update])

  const onPhoto = useCallback((key: string, blob: Blob) => {
    const url = URL.createObjectURL(blob)
    setUrls((u) => ({ ...u, [key]: url }))
  }, [])
  const reset = useCallback(() => setState({ ...blankState(), screen: 'profile' }), [])
  const cloud = useCloudSync(state, update, onPhoto, reset)

  const hasTone = tone != null
  const userTone = tone ?? Math.max(0, toneIndex(DEFAULT_TONE))
  const rated = useMemo(
    () => rate(items.map((i) => (i.photoId && urls[i.photoId] ? { ...i, photo: urls[i.photoId] } : i)), userTone, myColours),
    [items, urls, userTone, myColours],
  )

  const value = useMemo<AppContext>(() => {
    const byId = (id: string | null) => rated.find((i) => i.id === id)
    const tops = rated.filter((i) => i.cat === 'top')
    const bots = rated.filter((i) => i.cat === 'bottom')
    const dresses = rated.filter((i) => i.cat === 'dress')
    const same = (l: { topId: string; botId: string | null }, t: string, b: string | null) => l.topId === t && (l.botId ?? null) === b
    const find = (t: string, b: string | null) => state.saved.find((l) => same(l, t, b))
    const date = today()
    return {
      state,
      set,
      go,
      userTone,
      hasTone,
      rated,
      tops,
      bots,
      dresses,
      outfit: currentOutfit(rated, state.topId, state.botId),
      byId,
      isSaved: (t, b) => !!find(t, b),
      toggleSaved: (t, b, occ) =>
        set((s) => {
          const existing = s.saved.find((l) => same(l, t, b))
          return {
            saved: existing ? s.saved.filter((l) => l !== existing) : [{ id: `s${Date.now()}`, topId: t, botId: b, occ }, ...s.saved],
          }
        }),
      openItem: (id) => go('item', { itemId: id }),
      hang: (id) => set((s) => hangPatch(s, id)),
      addItem,
      updateItem,
      removeItem,
      wornToday: (t, b) => state.wearLog.some((w) => w.date === date && same(w, t, b)),
      toggleWorn,
      cloud,
    }
  }, [state, set, go, userTone, hasTone, rated, addItem, updateItem, removeItem, toggleWorn, cloud])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
