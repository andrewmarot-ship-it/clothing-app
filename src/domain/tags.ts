import type { Category, Kind } from './types.ts'

/** What the vision model tells us about a garment, normalised to the app's scales. */
export interface GarmentTags {
  /** False when the photo isn't of a single clothing item. */
  isGarment: boolean
  /** 'other' covers what the app can't hang yet (dresses, outerwear, shoes). */
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
}

export const KIND_LABELS: Record<Kind, string> = {
  shirt: 'Shirt',
  tee: 'Tee',
  tank: 'Tank',
  jeans: 'Trousers',
  shorts: 'Shorts',
  skirt: 'Skirt',
}

export const defaultKind = (cat: Category): Kind => (cat === 'top' ? 'tee' : 'jeans')

const str = (v: unknown, fallback: string, max = 40) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : fallback)
const int = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Defensive parse of tags from the network: anything malformed falls back to safe defaults. */
export function normaliseTags(raw: unknown): GarmentTags | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const category = r.category === 'top' || r.category === 'bottom' || r.category === 'other' ? r.category : 'top'
  const cat: Category = category === 'bottom' ? 'bottom' : 'top'
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
