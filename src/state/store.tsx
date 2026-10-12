import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { rate } from '../domain/scoring'
import { SEED_ITEMS, SEED_OUTFIT, SEED_SAVED } from '../domain/seed'
import { DEFAULT_TONE, TONES, toneIndex } from '../domain/tones'
import { Ctx, type AppContext, type AppState } from './context'

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

  const userTone = tone ?? Math.max(0, toneIndex(DEFAULT_TONE))
  const rated = useMemo(() => rate(items, userTone), [items, userTone])

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
    }
  }, [state, set, go, userTone, rated])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
