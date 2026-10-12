import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { rate } from '../domain/scoring'
import { DEFAULT_TONE, TONES, toneIndex } from '../domain/tones'
import type { Item } from '../domain/types'
import { Ctx, today, type AppContext, type AppState, type Images, type Wear } from './context'
import { deletePhotos, getPhoto, putPhoto } from './photos'

const STORAGE_KEY = 'clothesline-app-v1'

/** The part of the state that survives a reload. */
type Persisted = Pick<AppState, 'tone' | 'items' | 'saved' | 'topId' | 'botId' | 'wearLog'>

/** Pieces from the old built-in demo wardrobe, cleared out of existing browsers. */
const LEGACY_DEMO = /^[tb][1-7]$/

const isItem = (i: unknown): i is Item => {
  const o = i as Item
  return !!o && typeof o.id === 'string' && (o.cat === 'top' || o.cat === 'bottom') && typeof o.color === 'string' && typeof o.tone === 'number'
}

function initialState(): AppState {
  const base: AppState = {
    screen: 'outfit',
    from: 'outfit',
    tone: null,
    items: [],
    topId: null,
    botId: null,
    saved: [],
    wearLog: [],
    filter: 'all',
    itemId: null,
    retakeId: null,
    occText: '',
    occKey: 'today',
    code: null,
    lookI: 0,
    quizStep: 0,
    quiz: [null, null, null],
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const p = JSON.parse(raw) as Partial<Persisted>
    const items = (Array.isArray(p.items) ? p.items : []).filter(isItem).filter((i) => !(LEGACY_DEMO.test(i.id) && !i.photoId && !i.photo))
    const ids = new Set(items.map((i) => i.id))
    const pair = (l: { topId: string; botId: string }) => ids.has(l.topId) && ids.has(l.botId)
    return {
      ...base,
      tone: typeof p.tone === 'number' && TONES[p.tone] ? p.tone : null,
      items,
      saved: Array.isArray(p.saved) ? p.saved.filter(pair) : [],
      wearLog: Array.isArray(p.wearLog) ? p.wearLog.filter(pair) : [],
      topId: p.topId && ids.has(p.topId) ? p.topId : null,
      botId: p.botId && ids.has(p.botId) ? p.botId : null,
    }
  } catch {
    return base
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState)

  const set = useCallback<AppContext['set']>((patch) => {
    setState((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }))
  }, [])

  const go = useCallback<AppContext['go']>((screen, patch = {}) => {
    setState((s) => ({ ...s, screen, from: s.screen, ...patch }))
    window.scrollTo(0, 0)
  }, [])

  const { tone, items, saved, topId, botId, wearLog } = state
  useEffect(() => {
    const data: Persisted = { tone, items, saved, topId, botId, wearLog }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Storage full or unavailable: the session still works, it just won't persist.
    }
  }, [tone, items, saved, topId, botId, wearLog])

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
      const next: Item = { ...item, ...storeImages(item.id, images) }
      setState((s) => ({ ...s, items: [...s.items, next], [next.cat === 'top' ? 'topId' : 'botId']: next.id }))
    },
    [storeImages],
  )

  const updateItem = useCallback<AppContext['updateItem']>(
    (id, patch, images) => {
      const stored = images ? storeImages(id, images) : {}
      setState((s) => {
        const old = s.items.find((i) => i.id === id)
        if (!old) return s
        // A retake replaces the images: drop the old ones, or the drawn fallback if there's no new cut-out.
        if (images) {
          void deletePhotos([old.photoId, old.originalId].filter((k): k is string => !!k))
          if (!stored.photoId) Object.assign(stored, { photoId: undefined, cutout: undefined, photo: undefined })
        }
        const next: Item = { ...old, ...patch, ...stored }
        const catChanged = next.cat !== old.cat
        return {
          ...s,
          items: s.items.map((i) => (i.id === id ? next : i)),
          // Moving a piece between tops and bottoms breaks the looks it was part of.
          saved: catChanged ? s.saved.filter((l) => l.topId !== id && l.botId !== id) : s.saved,
          topId: catChanged && s.topId === id ? null : s.topId,
          botId: catChanged && s.botId === id ? null : s.botId,
        }
      })
    },
    [storeImages],
  )

  const removeItem = useCallback<AppContext['removeItem']>((id) => {
    setState((s) => {
      const it = s.items.find((i) => i.id === id)
      if (it) void deletePhotos([it.photoId, it.originalId].filter((k): k is string => !!k))
      return {
        ...s,
        items: s.items.filter((i) => i.id !== id),
        saved: s.saved.filter((l) => l.topId !== id && l.botId !== id),
        wearLog: s.wearLog.filter((w) => w.topId !== id && w.botId !== id),
        topId: s.topId === id ? null : s.topId,
        botId: s.botId === id ? null : s.botId,
      }
    })
  }, [])

  const toggleWorn = useCallback<AppContext['toggleWorn']>((t, b) => {
    setState((s) => {
      const date = today()
      const existing = s.wearLog.find((w) => w.date === date && w.topId === t && w.botId === b)
      const delta = existing ? -1 : 1
      const wearLog: Wear[] = existing ? s.wearLog.filter((w) => w !== existing) : [...s.wearLog, { date, topId: t, botId: b }]
      return { ...s, wearLog, items: s.items.map((i) => (i.id === t || i.id === b ? { ...i, wears: Math.max(0, i.wears + delta) } : i)) }
    })
  }, [])

  const hasTone = tone != null
  const userTone = tone ?? Math.max(0, toneIndex(DEFAULT_TONE))
  const rated = useMemo(
    () => rate(items.map((i) => (i.photoId && urls[i.photoId] ? { ...i, photo: urls[i.photoId] } : i)), userTone),
    [items, urls, userTone],
  )

  const value = useMemo<AppContext>(() => {
    const byId = (id: string | null) => rated.find((i) => i.id === id)
    const tops = rated.filter((i) => i.cat === 'top')
    const bots = rated.filter((i) => i.cat === 'bottom')
    const find = (topId: string, botId: string) => state.saved.find((l) => l.topId === topId && l.botId === botId)
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
      top: byId(state.topId) ?? tops[0],
      bot: byId(state.botId) ?? bots[0],
      byId,
      isSaved: (t, b) => !!find(t, b),
      toggleSaved: (t, b, occ) =>
        set((s) => {
          const existing = s.saved.find((l) => l.topId === t && l.botId === b)
          return {
            saved: existing ? s.saved.filter((l) => l !== existing) : [{ id: `s${Date.now()}`, topId: t, botId: b, occ }, ...s.saved],
          }
        }),
      openItem: (id) => go('item', { itemId: id }),
      addItem,
      updateItem,
      removeItem,
      wornToday: (t, b) => state.wearLog.some((w) => w.date === date && w.topId === t && w.botId === b),
      toggleWorn,
    }
  }, [state, set, go, userTone, hasTone, rated, addItem, updateItem, removeItem, toggleWorn])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
