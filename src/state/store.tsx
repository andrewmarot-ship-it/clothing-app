import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { rate } from '../domain/scoring'
import { SEED_ITEMS, SEED_OUTFIT, SEED_SAVED } from '../domain/seed'
import { DEFAULT_TONE, TONES, toneIndex } from '../domain/tones'
import type { Item } from '../domain/types'
import { Ctx, type AppContext, type AppState } from './context'
import { deletePhotos, getPhoto, putPhoto } from './photos'

const STORAGE_KEY = 'clothesline-app-v1'

/** The part of the state that survives a reload. */
type Persisted = Pick<AppState, 'tone' | 'items' | 'saved' | 'topId' | 'botId'>

function initialState(): AppState {
  const base: AppState = {
    screen: 'outfit',
    from: 'outfit',
    tone: null,
    items: SEED_ITEMS,
    ...SEED_OUTFIT,
    saved: SEED_SAVED,
    filter: 'all',
    itemId: null,
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
    const tone = typeof p.tone === 'number' && TONES[p.tone] ? p.tone : null
    const items = Array.isArray(p.items) && p.items.some((i) => i.cat === 'top') && p.items.some((i) => i.cat === 'bottom') ? p.items : base.items
    const ids = new Set(items.map((i) => i.id))
    const saved = Array.isArray(p.saved) ? p.saved.filter((l) => ids.has(l.topId) && ids.has(l.botId)) : base.saved
    return {
      ...base,
      tone,
      items,
      saved,
      topId: p.topId && ids.has(p.topId) ? p.topId : base.topId,
      botId: p.botId && ids.has(p.botId) ? p.botId : base.botId,
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

  const { tone, items, saved, topId, botId } = state
  useEffect(() => {
    const data: Persisted = { tone, items, saved, topId, botId }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Storage full or unavailable: the session still works, it just won't persist.
    }
  }, [tone, items, saved, topId, botId])

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

  const addItem = useCallback<AppContext['addItem']>((item, images) => {
    const next: Item = { ...item }
    if (images.photo) {
      const key = `${item.id}-cut`
      next.photoId = key
      next.cutout = true
      void putPhoto(key, images.photo)
      const url = URL.createObjectURL(images.photo)
      setUrls((u) => ({ ...u, [key]: url }))
    }
    if (images.original) {
      next.originalId = `${item.id}-orig`
      void putPhoto(next.originalId, images.original)
    }
    setState((s) => ({ ...s, items: [...s.items, next], [next.cat === 'top' ? 'topId' : 'botId']: next.id }))
  }, [])

  const removeItem = useCallback<AppContext['removeItem']>((id) => {
    setState((s) => {
      const it = s.items.find((i) => i.id === id)
      if (it) void deletePhotos([it.photoId, it.originalId].filter((k): k is string => !!k))
      return { ...s, items: s.items.filter((i) => i.id !== id), saved: s.saved.filter((l) => l.topId !== id && l.botId !== id) }
    })
  }, [])

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
    return {
      state,
      set,
      go,
      userTone,
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
      removeItem,
    }
  }, [state, set, go, userTone, rated, addItem, removeItem])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
