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
  /** Second colour, when the garment has one (stripes, prints). */
  color2?: string
  pattern?: boolean
  /** Key of the stored cut-out image (see state/photos.ts). */
  photoId?: string
  /** Key of the stored original photo, kept so items can be reprocessed. */
  originalId?: string
  /**
   * Display URL for the garment image. Resolved at runtime from photoId; a
   * stored data URL here is a pre-cut-out photo from an older version.
   */
  photo?: string
  /** True when `photo` is a transparent cut-out rather than a raw photo. */
  cutout?: boolean
  /** The user's own call on how this piece suits them; beats the classifier. */
  matchOverride?: Match
}

/** Where a piece's match came from. */
export type MatchSource = 'tone' | 'palette' | 'you'

/** An item scored against the user's tone. */
export interface RatedItem extends Item {
  match: Match
  matchSource: MatchSource
  /** OKLCH lightness of the item colour, used for contrast. */
  L: number
}

export interface SavedLook {
  id: string
  topId: string
  botId: string
  occ: string
}
