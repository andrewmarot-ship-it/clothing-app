import { toneIndex } from './tones'
import type { Item } from './types'

type SeedItem = Omit<Item, 'tone'> & { tone: string }

const seed: SeedItem[] = [
  { id: 't1', cat: 'top', name: 'Linen shirt', kind: 'shirt', color: '#e6dcc6', colorName: 'Cream', fabric: 'Linen', tone: 'Soft Autumn', f: 2, w: 1, wears: 11 },
  { id: 't2', cat: 'top', name: 'Crew tee', kind: 'tee', color: '#34446b', colorName: 'Navy', fabric: 'Cotton', tone: 'Dark Winter', f: 1, w: 1, wears: 24 },
  { id: 't3', cat: 'top', name: 'Rib tank', kind: 'tank', color: '#9aab8c', colorName: 'Sage', fabric: 'Rib knit', tone: 'Soft Autumn', f: 1, w: 1, wears: 9 },
  { id: 't4', cat: 'top', name: 'Fisherman knit', kind: 'shirt', color: '#b4643c', colorName: 'Rust', fabric: 'Wool', tone: 'True Autumn', f: 2, w: 3, wears: 6 },
  { id: 't5', cat: 'top', name: 'Silk blouse', kind: 'shirt', color: '#c2185b', colorName: 'Fuchsia', fabric: 'Silk', tone: 'True Winter', f: 3, w: 1, wears: 2 },
  { id: 't6', cat: 'top', name: 'Overshirt', kind: 'shirt', color: '#4d4f58', colorName: 'Charcoal', fabric: 'Twill', tone: 'Soft Summer', f: 2, w: 2, wears: 14 },
  { id: 't7', cat: 'top', name: 'Boxy tee', kind: 'tee', color: '#b8cde8', colorName: 'Powder blue', fabric: 'Cotton', tone: 'Light Summer', f: 1, w: 1, wears: 5 },
  { id: 'b1', cat: 'bottom', name: 'Straight jeans', kind: 'jeans', color: '#3e5180', colorName: 'Indigo', fabric: 'Denim', tone: 'True Summer', f: 1, w: 2, wears: 31 },
  { id: 'b2', cat: 'bottom', name: 'Wide jeans', kind: 'jeans', color: '#d6cab0', colorName: 'Ecru', fabric: 'Denim', tone: 'Soft Autumn', f: 2, w: 2, wears: 12 },
  { id: 'b3', cat: 'bottom', name: 'Utility shorts', kind: 'shorts', color: '#6f7448', colorName: 'Olive', fabric: 'Cotton', tone: 'Soft Autumn', f: 1, w: 1, wears: 7 },
  { id: 'b4', cat: 'bottom', name: 'Midi skirt', kind: 'skirt', color: '#5a5c66', colorName: 'Slate', fabric: 'Satin', tone: 'Soft Summer', f: 3, w: 1, wears: 3 },
  { id: 'b5', cat: 'bottom', name: 'Chinos', kind: 'jeans', color: '#b8946a', colorName: 'Camel', fabric: 'Twill', tone: 'Soft Autumn', f: 2, w: 2, wears: 15 },
  { id: 'b6', cat: 'bottom', name: 'Cords', kind: 'jeans', color: '#5c3a26', colorName: 'Chocolate', fabric: 'Corduroy', tone: 'Dark Autumn', f: 2, w: 3, wears: 4 },
]

/** A sample wardrobe for tests (the app itself starts empty). */
export const FIXTURE_ITEMS: Item[] = seed.map((it) => ({ ...it, tone: toneIndex(it.tone) }))
