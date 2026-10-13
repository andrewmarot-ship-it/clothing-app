/**
 * The category registry: one place that says what each kind of piece is
 * and how it shows on the Stage. Rings, kickers and the Add grid read from
 * here, so later categories (layers, hats, shoes) slot in without hunting
 * down top/bottom checks.
 */
import { FRAMES } from './frame.ts'
import type { Category } from './types.ts'

export interface CategoryInfo {
  id: Category
  label: string
  plural: string
  /** Phosphor icon name, mapped to a component in components/CategoryIcon.tsx. */
  icon: 'TShirt' | 'Pants' | 'Dress'
  /** Its Spectrum filter. */
  filter: 'tops' | 'bottoms' | 'dresses'
  /** How much this piece counts towards tone fit in its outfit shape. */
  toneWeight: number
  /** Its ring on the Stage: px from the top of the stage, height, garment box and Cast spin time. */
  ring: { top: number; height: number; box: [number, number]; spinSeconds: number }
}

/** Garment boxes take the shape of each category's framing canvas, so framed pieces keep their sizes. */
const box = (cat: Category, width: number): [number, number] => [width, Math.round((width * FRAMES[cat].h) / FRAMES[cat].w)]

export const CATEGORIES: Record<Category, CategoryInfo> = {
  top: { id: 'top', label: 'Top', plural: 'Tops', icon: 'TShirt', filter: 'tops', toneWeight: 0.6, ring: { top: 106, height: 196, box: box('top', 150), spinSeconds: 1.5 } },
  bottom: { id: 'bottom', label: 'Bottom', plural: 'Bottoms', icon: 'Pants', filter: 'bottoms', toneWeight: 0.4, ring: { top: 338, height: 214, box: box('bottom', 140), spinSeconds: 1.75 } },
  dress: { id: 'dress', label: 'Dress', plural: 'Dresses', icon: 'Dress', filter: 'dresses', toneWeight: 1, ring: { top: 112, height: 400, box: box('dress', 170), spinSeconds: 1.6 } },
}

/** Every category, in display order. */
export const CATEGORY_LIST = Object.values(CATEGORIES)

/** Outfit shapes: a top with a bottom, or a dress. */
export type Shape = 'separates' | 'dress'
/** What Cast may pick: a fixed shape, or whichever suits the occasion. */
export type BodyPref = Shape | 'auto'

export const SHAPE_CATEGORIES: Record<Shape, Category[]> = { separates: ['top', 'bottom'], dress: ['dress'] }
