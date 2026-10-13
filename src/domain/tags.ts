import type { Category, Item, Kind } from './types.ts'

/** What the vision model tells us about a garment, normalised to the app's scales. */
export interface GarmentTags {
  /** False when the photo isn't of a single clothing item. */
  isGarment: boolean
  /** 'other' covers what the app can't hang yet (outerwear, shoes, bags). */
  category: Category | 'other'
  kind: Kind
  /** Short display name, e.g. "Striped shirt". */
  name: string
  fabric: string
  colourName: string
  /** 1 Casual … 4 Formal. */
  formality: 1 | 2 | 3 | 4
  /** 1 Light … 3 Warm. */
  warmth: 1 | 2 | 3
  pattern: boolean
}

export const KINDS: Record<Category, Kind[]> = {
  top: ['shirt', 'tee', 'tank'],
  bottom: ['jeans', 'shorts', 'skirt'],
  dress: ['dress', 'jumpsuit'],
}

export const CATEGORY_LABELS: Record<Category, string> = { top: 'Top', bottom: 'Bottom', dress: 'Dress' }

export const KIND_LABELS: Record<Kind, string> = {
  shirt: 'Shirt',
  tee: 'Tee',
  tank: 'Tank',
  jeans: 'Trousers',
  shorts: 'Shorts',
  skirt: 'Skirt',
  dress: 'Dress',
  jumpsuit: 'Jumpsuit',
}

const DEFAULT_KIND: Record<Category, Kind> = { top: 'tee', bottom: 'jeans', dress: 'dress' }
export const defaultKind = (cat: Category): Kind => DEFAULT_KIND[cat]

export const isCategory = (v: unknown): v is Category => v === 'top' || v === 'bottom' || v === 'dress'

const str = (v: unknown, fallback: string, max = 40) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : fallback)
const int = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Defensive parse of tags from the network: anything malformed falls back to safe defaults. */
export function normaliseTags(raw: unknown): GarmentTags | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const category = isCategory(r.category) || r.category === 'other' ? r.category : 'top'
  const cat: Category = category === 'other' ? 'top' : category
  const kind = KINDS[cat].includes(r.kind as Kind) ? (r.kind as Kind) : defaultKind(cat)
  return {
    isGarment: r.isGarment !== false,
    category,
    kind,
    name: capitalise(str(r.name, 'New piece', 32)),
    fabric: capitalise(str(r.fabric, 'Cotton', 24)),
    colourName: capitalise(str(r.colourName, '', 24)),
    formality: int(r.formality, 1, 4, 1) as GarmentTags['formality'],
    warmth: int(r.warmth, 1, 3, 1) as GarmentTags['warmth'],
    pattern: r.pattern === true,
  }
}

/** Dresses and jumpsuits by name; "dress shirt" is a shirt. */
const ONE_PIECE = /(dress(?! shirt)|gown|jumpsuit|playsuit|romper)/i
const JUMPSUIT = /(jumpsuit|playsuit|romper)/i

/**
 * Before dresses had their own category they were filed as tops. Move the
 * ones whose name says they're a dress, stamping them so the move syncs.
 */
export function migrateDress(item: Item, now: number): Item {
  if (item.cat !== 'top' || !ONE_PIECE.test(item.name)) return item
  return { ...item, cat: 'dress', kind: JUMPSUIT.test(item.name) ? 'jumpsuit' : 'dress', updatedAt: now }
}
