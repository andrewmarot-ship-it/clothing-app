import { createContext, useContext } from 'react'
import type { OccasionKey } from '../domain/occasions'
import type { QuizAnswers } from '../domain/quiz'
import type { DressCode, Item, RatedItem, SavedLook } from '../domain/types'

export type Tab = 'outfit' | 'wardrobe' | 'add' | 'looks' | 'profile'
export type Screen = Tab | 'occasion' | 'match' | 'item' | 'edit' | 'quiz' | 'tones'
export type Filter = 'all' | 'tone' | 'tops' | 'bottoms'

export const TABS: Tab[] = ['outfit', 'wardrobe', 'add', 'looks', 'profile']

/** One outfit worn on one day. */
export interface Wear {
  /** Local date, YYYY-MM-DD. */
  date: string
  topId: string
  botId: string
}

export interface AppState {
  screen: Screen
  /** Previous screen, for back labels. */
  from: Screen
  /** Index into TONES; null until the user finds or picks one. */
  tone: number | null
  items: Item[]
  /** The outfit on the line; null until there's a piece in that category. */
  topId: string | null
  botId: string | null
  saved: SavedLook[]
  wearLog: Wear[]
  /** Colours the user says suit them; pieces close to one count as in tone. */
  myColours: string[]
  filter: Filter
  itemId: string | null
  /** When set, the Add screen retakes the photo of this piece instead of adding a new one. */
  retakeId: string | null
  occText: string
  occKey: OccasionKey
  /** Dress-code override; null follows the occasion. */
  code: DressCode | null
  lookI: number
  quizStep: number
  quiz: QuizAnswers
}

export type Patch = Partial<AppState>

export interface Images {
  photo?: Blob | null
  original?: Blob | null
}

export interface AppContext {
  state: AppState
  /** Apply a patch to the state. */
  set: (patch: Patch | ((s: AppState) => Patch)) => void
  /** Navigate to a screen, remembering where we came from. */
  go: (screen: Screen, patch?: Patch) => void
  /** The tone used for scoring: the user's, or a neutral default until they pick one. */
  userTone: number
  hasTone: boolean
  /** Wardrobe scored against the user's tone. */
  rated: RatedItem[]
  tops: RatedItem[]
  bots: RatedItem[]
  top: RatedItem | undefined
  bot: RatedItem | undefined
  byId: (id: string | null) => RatedItem | undefined
  isSaved: (topId: string, botId: string) => boolean
  toggleSaved: (topId: string, botId: string, occ: string) => void
  openItem: (id: string) => void
  /** Add a piece, storing its images, and hang it on the line. */
  addItem: (item: Item, images: Images) => void
  /** Change a piece; new images replace (and delete) the old ones. */
  updateItem: (id: string, patch: Partial<Item>, images?: Images) => void
  /** Remove a piece, its saved looks and its stored images. */
  removeItem: (id: string) => void
  /** Was this outfit worn today? */
  wornToday: (topId: string, botId: string) => boolean
  /** Log (or undo) wearing this outfit today. */
  toggleWorn: (topId: string, botId: string) => void
}

export const Ctx = createContext<AppContext | null>(null)

export function useApp(): AppContext {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}

/** Today's local date as YYYY-MM-DD. */
export const today = () => new Date().toLocaleDateString('en-CA')
