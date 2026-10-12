import { TONES } from '../domain/tones'
import type { Match, RatedItem } from '../domain/types'

export interface MatchInfo {
  label: string
  short: string
  /** Dot fill. */
  dot: string
  /** Text colour. */
  color: string
}

export function matchInfo(match: Match, toneName: string): MatchInfo {
  if (match === 'in') return { label: 'In your tone', short: 'In your tone', dot: 'var(--color-accent)', color: 'var(--color-accent-300)' }
  if (match === 'near') return { label: `Near your tone · ${toneName}`, short: 'Near your tone', dot: 'var(--color-neutral-400)', color: 'var(--color-neutral-300)' }
  return { label: `Outside your tone · ${toneName}`, short: 'Outside your tone', dot: 'transparent', color: 'var(--color-neutral-500)' }
}

/** Match info for a piece, saying so when the call is the user's rather than the classifier's. */
export function itemMatch(it: RatedItem): MatchInfo {
  const m = matchInfo(it.match, TONES[it.tone].name)
  if (it.matchSource === 'tone') return m
  const why = it.matchSource === 'you' ? 'your call' : 'one of your colours'
  return { ...m, label: `${m.short} · ${why}` }
}
