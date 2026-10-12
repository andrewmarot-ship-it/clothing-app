import { createContext, useContext } from 'react'
import type { OccasionKey } from '../domain/occasions'
import type { QuizAnswers } from '../domain/quiz'
import type { DressCode, Item, RatedItem, SavedLook } from '../domain/types'

export type Tab = 'outfit' | 'wardrobe' | 'add' | 'looks' | 'profile'
export type Screen = Tab | 'occasion' | 'match' | 'item' | 'quiz' | 'tones'
export type Filter = 'all' | 'tone' | 'tops' | 'bottoms'

export const TABS: Tab[] = ['outfit', 'wardrobe', 'add', 'looks', 'profile']

export interface AppState {
  screen: Screen
  /** Previous screen, for back labels. */
  from: Screen
  /** Index into TONES; null until the user picks one. */
  tone: number | null
  items: Item[]
  topId: string
  botId: string
  saved: SavedLook[]
  filter: Filter
  itemId: string | null
  occText: string
  occKey: OccasionKey
  /** Dress-code override; null follows the occasion. */
  code: DressCode | null
  lookI: number
  quizStep: number
  quiz: QuizAnswers
}

export type Patch = Partial<AppState>

export interface AppContext {
  state: AppState
  /** Apply a patch to the state. */
  set: (patch: Patch | ((s: AppState) => Patch)) => void
  /** Navigate to a screen, remembering where we came from. */
  go: (screen: Screen, patch?: Patch) => void
  userTone: number
  /** Wardrobe scored against the user's tone. */
  rated: RatedItem[]
  tops: RatedItem[]
  bots: RatedItem[]
  top: RatedItem
  bot: RatedItem
  byId: (id: string | null) => RatedItem | undefined
  isSaved: (topId: string, botId: string) => boolean
  toggleSaved: (topId: string, botId: string, occ: string) => void
  openItem: (id: string) => void
}

export const Ctx = createContext<AppContext | null>(null)

export function useApp(): AppContext {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
