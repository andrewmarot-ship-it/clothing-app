export type Category = 'top' | 'bottom'
export type Kind = 'shirt' | 'tee' | 'tank' | 'jeans' | 'shorts' | 'skirt'
export type Match = 'in' | 'near' | 'out'

/** 1 Casual · 2 Smart · 3 Dressy · 4 Formal */
export type DressCode = 1 | 2 | 3 | 4

export interface Item {
  id: string
  cat: Category
  name: string
  kind: Kind
  /** Dominant colour as #rrggbb. */
  color: string
  colorName: string
  fabric: string
  /** Index into TONES. */
  tone: number
  /** Formality, 1 casual … 4 formal. */
  f: number
  /** Warmth, 1 light … 3 warm. */
  w: number
  wears: number
  /** Cut-out image (data URL or remote URL). */
  photo?: string
}

/** An item scored against the user's tone. */
export interface RatedItem extends Item {
  match: Match
  /** OKLCH lightness of the item colour, used for contrast. */
  L: number
}

export interface SavedLook {
  id: string
  topId: string
  botId: string
  occ: string
}
