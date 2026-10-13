import { createContext, useContext } from 'react'
import type { BodyPref, CategoryInfo, Shape } from '../domain/categories'
import type { Occasion, OccasionKey } from '../domain/occasions'
import type { QuizAnswers } from '../domain/quiz'
import type { DressCode, Item, RatedItem, SavedLook } from '../domain/types'
import type { CloudState } from './useCloudSync'

export type Tab = 'outfit' | 'wardrobe' | 'add' | 'looks' | 'profile'
export type Screen = Tab | 'item' | 'edit' | 'quiz' | 'tones'
export type Filter = 'all' | 'tone' | CategoryInfo['filter']

export const TABS: Tab[] = ['outfit', 'wardrobe', 'add', 'looks', 'profile']

/** One outfit worn on one day. */
export interface Wear {
  /** Local date, YYYY-MM-DD. */
  date: string
  /** The top, or the dress. */
  topId: string
  /** The bottom; null for a dress. */
  botId: string | null
}

export interface AppState {
  screen: Screen
  /** Previous screen, for back labels. */
  from: Screen
  /** Index into TONES; null until the user finds or picks one. */
  tone: number | null
  items: Item[]
  /** The picks on the Stage. Each shape keeps its own, so switching between them loses nothing. */
  topId: string | null
  botId: string | null
  dressId: string | null
  /** The outfit shape on the Stage. */
  shape: Shape
  /** What Cast may pick: a fixed shape, or whichever suits the occasion. */
  bodyPref: BodyPref
  saved: SavedLook[]
  wearLog: Wear[]
  /** Colours the user says suit them; pieces close to one count as in tone. */
  myColours: string[]
  /** Pieces deleted here that the cloud hasn't been told about yet: id → time. */
  deleted: Record<string, number>
  /** Client time (ms) of the last change to tone, colours, looks, wear log or outfit. */
  profileUpdatedAt: number
  filter: Filter
  itemId: string | null
  /** When set, the Add screen retakes the photo of this piece instead of adding a new one. */
  retakeId: string | null
  occText: string
  occKey: OccasionKey
  /** Claude's reading of `text`, when it has answered for the text currently typed. */
  occAi: { text: string; occasion: Occasion } | null
  /** Dress-code override; null follows the occasion. */
  code: DressCode | null
  lookI: number
  /** A bottom sheet over the Stage; the dock hides while one is open. */
  sheet: 'cast' | 'body' | null
  quizStep: number
  quiz: QuizAnswers
}

export type Patch = Partial<AppState>

export interface Outfit {
  /** The top, or the dress. */
  t: RatedItem
  /** The bottom; null for a dress. */
  b: RatedItem | null
}

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
  dresses: RatedItem[]
  /** The outfit on the line: a top and bottom, or a dress (b is null). Null until one is possible. */
  outfit: Outfit | null
  byId: (id: string | null) => RatedItem | undefined
  isSaved: (topId: string, botId: string | null) => boolean
  toggleSaved: (topId: string, botId: string | null, occ: string) => void
  openItem: (id: string) => void
  /** Put a piece on the line, switching to its outfit shape. */
  hang: (id: string) => void
  /** Wear a look: a top and bottom, or a dress (no bottom). */
  wear: (topId: string, botId: string | null) => void
  /** Add a piece, storing its images, and hang it on the line. */
  addItem: (item: Item, images: Images) => void
  /** Change a piece; new images replace (and delete) the old ones. */
  updateItem: (id: string, patch: Partial<Item>, images?: Images) => void
  /** Remove a piece, its saved looks and its stored images. */
  removeItem: (id: string) => void
  /** Was this outfit worn today? */
  wornToday: (topId: string, botId: string | null) => boolean
  /** Log (or undo) wearing this outfit today. */
  toggleWorn: (topId: string, botId: string | null) => void
  /** Sign-in and sync. */
  cloud: CloudState
}

export const Ctx = createContext<AppContext | null>(null)

export function useApp(): AppContext {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}

/** Today's local date as YYYY-MM-DD. */
export const today = () => new Date().toLocaleDateString('en-CA')
