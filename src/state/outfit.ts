import type { RatedItem } from '../domain/types'
import type { AppState, Outfit, Patch } from './context'

/** The change that puts a piece on the line. A bottom replaces a dress with a top, if there is one. */
export function hangPatch(s: AppState, id: string): Patch {
  const it = s.items.find((i) => i.id === id)
  if (!it) return {}
  if (it.cat !== 'bottom') return { topId: id }
  const current = s.items.find((i) => i.id === s.topId)
  return { botId: id, topId: current?.cat === 'top' ? current.id : (s.items.find((i) => i.cat === 'top')?.id ?? s.topId) }
}

/** The outfit on the line: the chosen dress, or the chosen (else first) top and bottom, else the first dress. */
export function currentOutfit(rated: RatedItem[], topId: string | null, botId: string | null): Outfit | null {
  const main = rated.find((i) => i.id === topId)
  if (main?.cat === 'dress') return { t: main, b: null }
  const chosenBot = rated.find((i) => i.id === botId)
  const t = main?.cat === 'top' ? main : rated.find((i) => i.cat === 'top')
  const b = chosenBot?.cat === 'bottom' ? chosenBot : rated.find((i) => i.cat === 'bottom')
  if (t && b) return { t, b }
  const dress = rated.find((i) => i.cat === 'dress')
  return dress ? { t: dress, b: null } : null
}
