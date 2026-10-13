import type { Shape } from '../domain/categories'
import type { Category, Item, RatedItem } from '../domain/types'
import type { AppState, Outfit, Patch } from './context'

/** The picks on the Stage: the last top and bottom and the last dress are all kept, so switching shape loses nothing. */
export type Picks = Pick<AppState, 'topId' | 'botId' | 'dressId' | 'shape'>

/** The change that puts a piece on the line, switching to its outfit shape. */
export function hangPatch(s: Pick<AppState, 'items'>, id: string): Patch {
  const it = s.items.find((i) => i.id === id)
  if (!it) return {}
  if (it.cat === 'dress') return { dressId: id, shape: 'dress' }
  return it.cat === 'top' ? { topId: id, shape: 'separates' } : { botId: id, shape: 'separates' }
}

/** The change that wears a saved or cast look: a top and bottom, or a dress (no bottom). */
export const lookPatch = (topId: string, botId: string | null): Patch => (botId ? { topId, botId, shape: 'separates' } : { dressId: topId, shape: 'dress' })

/** Which shapes the wardrobe can make. */
export function shapesAvailable(items: Pick<Item, 'cat'>[]): Record<Shape, boolean> {
  const has = (c: Category) => items.some((i) => i.cat === c)
  return { separates: has('top') && has('bottom'), dress: has('dress') }
}

/**
 * The outfit on the Stage: the chosen (else first) piece of each kind in the
 * current shape, falling back to the other shape when this one can't be made.
 */
export function currentOutfit(rated: RatedItem[], p: Picks): Outfit | null {
  const pick = (id: string | null, cat: Category) => rated.find((i) => i.id === id && i.cat === cat) ?? rated.find((i) => i.cat === cat)
  const top = pick(p.topId, 'top')
  const bot = pick(p.botId, 'bottom')
  const dress = pick(p.dressId, 'dress')
  if (p.shape === 'dress' && dress) return { t: dress, b: null }
  if (top && bot) return { t: top, b: bot }
  return dress ? { t: dress, b: null } : null
}

/** Before dresses had their own pick they were stored as the top; move one there to the dress pick. */
export function migratePicks(p: Picks, items: Pick<Item, 'id' | 'cat'>[]): Picks {
  const top = items.find((i) => i.id === p.topId)
  if (top?.cat !== 'dress') return p
  return { ...p, topId: null, dressId: p.dressId ?? top.id, shape: 'dress' }
}
