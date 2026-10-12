import type { Match } from './types'

export type Season = 'Spring' | 'Summer' | 'Autumn' | 'Winter'

export interface Tone {
  name: string
  season: Season
  /** Temperature, −1 cool … +1 warm. */
  t: number
  /** Value, 0 light … 1 dark. */
  v: number
  /** Chroma, 0 soft … 1 bright. */
  c: number
  /**
   * Eight-colour palette. These hexes are placeholders: production needs
   * TCI's licensed tone palettes.
   */
  palette: string[]
}

/** TCI 12 Tones in natural order: adjacent entries are neighbours (wraps around). */
export const TONES: Tone[] = [
  { name: 'Light Spring', season: 'Spring', t: 0.5, v: 0.15, c: 0.55, palette: ['#f7dcc0', '#f5b7a1', '#f3d27a', '#b5dcc7', '#9fd0de', '#c7b6e6', '#f29e8e', '#e8cfa8'] },
  { name: 'True Spring', season: 'Spring', t: 1, v: 0.35, c: 0.75, palette: ['#f2a23c', '#ef6f4f', '#f4c430', '#7cbf5a', '#2fb5a3', '#e88a5a', '#c98a3b', '#f6e1b3'] },
  { name: 'Bright Spring', season: 'Spring', t: 0.5, v: 0.4, c: 1, palette: ['#ff6f61', '#ffb000', '#00b3a6', '#3fa7f5', '#e8418c', '#7dd35b', '#ff8c42', '#f4f1e8'] },
  { name: 'Bright Winter', season: 'Winter', t: -0.5, v: 0.5, c: 1, palette: ['#e0115f', '#0067c6', '#00a693', '#7b2cbf', '#ffd300', '#e6e8ef', '#1b1d2a', '#ff3e6c'] },
  { name: 'True Winter', season: 'Winter', t: -1, v: 0.6, c: 0.8, palette: ['#c2185b', '#1e3a8a', '#0f766e', '#6d28d9', '#e5e7eb', '#111827', '#b91c1c', '#94a3b8'] },
  { name: 'Dark Winter', season: 'Winter', t: -0.5, v: 0.85, c: 0.55, palette: ['#5b1a2e', '#1f3a5f', '#14532d', '#3b1f5c', '#7a1e3a', '#2a2d3a', '#0f4c5c', '#c8ccd6'] },
  { name: 'Dark Autumn', season: 'Autumn', t: 0.5, v: 0.85, c: 0.45, palette: ['#6b2d1a', '#5a4a1e', '#7a3e14', '#2f4a3a', '#8a5a2b', '#3e2b22', '#9b3d24', '#c49a5a'] },
  { name: 'True Autumn', season: 'Autumn', t: 1, v: 0.55, c: 0.5, palette: ['#c46a2b', '#a0522d', '#b8860b', '#6b7a2a', '#8b4513', '#d4a056', '#2e6b5e', '#d27d46'] },
  { name: 'Soft Autumn', season: 'Autumn', t: 0.5, v: 0.45, c: 0.2, palette: ['#c9a27e', '#a67b5b', '#8f9a6e', '#b5735a', '#d8bf9a', '#7d8c74', '#9c6b5a', '#e3d3b8'] },
  { name: 'Soft Summer', season: 'Summer', t: -0.5, v: 0.5, c: 0.15, palette: ['#8a9bb0', '#9c8fa6', '#7f9c96', '#b0909c', '#6e7b8b', '#a8a39a', '#5f7a83', '#c8c2c6'] },
  { name: 'True Summer', season: 'Summer', t: -1, v: 0.4, c: 0.35, palette: ['#5b7fb3', '#9a6fa8', '#d16b8c', '#4f8a9e', '#7a8fb8', '#b3c1d6', '#8a6d8f', '#6a7f99'] },
  { name: 'Light Summer', season: 'Summer', t: -0.5, v: 0.15, c: 0.35, palette: ['#b8cde8', '#d9b8d4', '#f2b8c6', '#a8d5d1', '#c6c0e8', '#e7e2ea', '#9fb4d6', '#e4a5b8'] },
]

export const SEASONS: Season[] = ['Spring', 'Summer', 'Autumn', 'Winter']

export const DEFAULT_TONE = 'Soft Autumn'

export function toneIndex(name: string): number {
  return TONES.findIndex((t) => t.name === name)
}

export const hueLabel = (t: number) => (t >= 1 ? 'Warm' : t > 0 ? 'Warm-neutral' : t <= -1 ? 'Cool' : 'Cool-neutral')
export const valueLabel = (v: number) => (v < 0.3 ? 'Light' : v > 0.7 ? 'Dark' : 'Medium')
export const chromaLabel = (c: number) => (c > 0.7 ? 'Bright' : c < 0.3 ? 'Soft' : 'Medium')
export const toneDesc = (T: Tone) => `${hueLabel(T.t)} · ${valueLabel(T.v)} · ${chromaLabel(T.c)}`

/** Weighted distance in tone space; null dimensions are ignored. */
function toneDistance(T: Tone, t: number | null, v: number | null, c: number | null): number {
  return (t == null ? 0 : (t - T.t) ** 2 * 0.8) + (v == null ? 0 : (v - T.v) ** 2) + (c == null ? 0 : (c - T.c) ** 2 * 1.2)
}

/** Tone indices sorted nearest first. */
export function rankTones(t: number | null, v: number | null, c: number | null): number[] {
  return TONES.map((T, i) => ({ i, d: toneDistance(T, t, v, c) }))
    .sort((a, b) => a.d - b.d)
    .map((x) => x.i)
}

export function nearestTone(t: number | null, v: number | null, c: number | null): number {
  return rankTones(t, v, c)[0]
}

/** Circular distance on the 12-tone wheel: 0 in, 1 near, otherwise out. */
export function matchOf(itemTone: number, userTone: number): Match {
  const n = TONES.length
  const d = Math.min((itemTone - userTone + n) % n, (userTone - itemTone + n) % n)
  return d === 0 ? 'in' : d === 1 ? 'near' : 'out'
}
