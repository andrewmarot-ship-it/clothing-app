import { colourDistance, oklch } from './color.ts'
import type { Occasion } from './occasions.ts'
import { TONES, matchOf, type Tone } from './tones.ts'
import type { Item, Match, MatchSource, RatedItem } from './types.ts'

const FIT: Record<Match, number> = { in: 100, near: 72, out: 38 }
const MATCH_SCORE: Record<Match, number> = { in: 2, near: 1, out: 0 }

/** How close a colour must be to one of the user's own colours to count as in tone. */
export const PALETTE_MATCH_DISTANCE = 0.07

/**
 * Score each piece against the user. Their own call on a piece wins, then a
 * colour they've added to their palette, then the tone classifier.
 */
export function rate(items: Item[], userTone: number, myColours: string[] = []): RatedItem[] {
  return items.map((it) => {
    let match: Match
    let matchSource: MatchSource
    if (it.matchOverride) {
      match = it.matchOverride
      matchSource = 'you'
    } else if (myColours.some((c) => colourDistance(c, it.color) < PALETTE_MATCH_DISTANCE)) {
      match = 'in'
      matchSource = 'palette'
    } else {
      match = matchOf(it.tone, userTone)
      matchSource = 'tone'
    }
    return { ...it, match, matchSource, L: oklch(it.color).L }
  })
}

/** Tone fit, 0–100. The top weighs more because it sits near the face; a dress is the whole look. */
export function toneFit(top: RatedItem, bot: RatedItem | null): number {
  return bot ? Math.round(FIT[top.match] * 0.6 + FIT[bot.match] * 0.4) : FIT[top.match]
}

export type ContrastLabel = 'Low' | 'Medium' | 'High'

export function contrastLabel(top: RatedItem, bot: RatedItem): ContrastLabel {
  const dl = Math.abs(top.L - bot.L)
  return dl > 0.3 ? 'High' : dl < 0.12 ? 'Low' : 'Medium'
}

/** Overall suitability of a look (a top and bottom, or a dress with b = null) for an occasion, roughly 0–1. */
export function scoreLook(t: RatedItem, b: RatedItem | null, occ: Occasion, code: number): number {
  const pieces = b ? [t, b] : [t]
  const fs = pieces.map((p) => p.f)
  const tone = b ? (MATCH_SCORE[t.match] * 0.6 + MATCH_SCORE[b.match] * 0.4) / 2 : MATCH_SCORE[t.match] / 2
  let form = 1 - Math.abs(fs.reduce((a, f) => a + f, 0) / fs.length - code) / 3
  // A dressy event needs at least one dressy piece.
  if (code >= 3 && Math.max(...fs) < code) form -= 0.5
  if (code <= 1 && Math.min(...fs) > 2) form -= 0.3
  const warm = 1 - Math.abs(Math.max(...pieces.map((p) => p.w)) - occ.warmth) / 2
  // Contrast is between two pieces; a dress sits in the middle.
  const dl = b ? Math.abs(t.L - b.L) : 0
  const con =
    !b ? 0.75
    : occ.contrast === 'high' ? Math.min(1, dl / 0.35)
    : occ.contrast === 'medium' ? 1 - Math.abs(dl - 0.2) / 0.3
    : dl > 0.08 && dl < 0.4 ? 1 : 0.5
  return tone * 0.45 + form * 0.35 + warm * 0.15 + con * 0.05
}

/** A look: a top with a bottom, or a dress on its own (b is null). */
export interface Look {
  t: RatedItem
  b: RatedItem | null
  score: number
}

export interface Pair extends Look {
  b: RatedItem
}

/** Every top × bottom pair and every dress, best first. */
export function rankLooks(items: RatedItem[], occ: Occasion, code: number, limit = 5): Look[] {
  const tops = items.filter((i) => i.cat === 'top')
  const bots = items.filter((i) => i.cat === 'bottom')
  const out: Look[] = []
  for (const t of tops) for (const b of bots) out.push({ t, b, score: scoreLook(t, b, occ, code) })
  for (const d of items) if (d.cat === 'dress') out.push({ t: d, b: null, score: scoreLook(d, null, occ, code) })
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

/** Best partners for a top or bottom from the other category, for an everyday occasion. A dress needs none. */
export function bestPartners(item: RatedItem, items: RatedItem[], everyday: Occasion, limit = 3): Pair[] {
  if (item.cat === 'dress') return []
  const other = item.cat === 'top' ? 'bottom' : 'top'
  return items
    .filter((o) => o.cat === other)
    .map((o) => {
      const [t, b] = item.cat === 'top' ? [item, o] : [o, item]
      return { t, b, score: scoreLook(t, b, everyday, 1) }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export const lookTitle = (t: Item, b: Item | null) => (b ? `${t.colorName} & ${b.colorName.toLowerCase()}` : t.name)

export interface Reason {
  k: 'Occasion' | 'Tone' | 'Weather'
  v: string
}

/** Generated copy explaining why a look works. */
export function describe(t: RatedItem, b: RatedItem | null, occ: Occasion, code: number, userTone: number): Reason[] {
  const T = TONES[userTone]
  const dressier = !b || t.f >= b.f ? t : b
  const dn = dressier.name.toLowerCase()
  const df = dressier.fabric.toLowerCase()
  const dLabel = dn.includes(df) ? dn : `${df} ${dn}`
  const occTxt =
    `${occ.line} ` +
    (code >= 3
      ? dressier.f >= code
        ? `The ${dLabel} does the dressing up.`
        : 'Nothing you own is quite that dressy, so lift it with the accessories below.'
      : code <= 1
        ? 'Nothing here needs fussing over.'
        : 'Smart enough to sit down to, relaxed enough to stay in all day.')

  const mw = b ? Math.max(t.w, b.w) : t.w
  const prefix = occ.weather ? `${occ.weather}. ` : ''
  const wTxt =
    mw < occ.warmth - 0.4 ? `${prefix}Bring a warm layer.`
    : mw > occ.warmth + 0.6 ? `${prefix}This runs warm, fine indoors.`
    : `${prefix}Right weight for it.`

  return [
    { k: 'Occasion', v: occTxt },
    { k: 'Tone', v: b ? pairToneText(t, b, T) : pieceToneText(t, T) },
    { k: 'Weather', v: wTxt },
  ]
}

function pieceToneText(d: RatedItem, T: Tone): string {
  if (d.match === 'in') return `${d.colorName} sits in your ${T.name} palette, head to toe.`
  if (d.match === 'near')
    return d.matchSource === 'tone'
      ? `${d.colorName} borrows from ${TONES[d.tone].name}, next door to ${T.name}, so it still flatters.`
      : `You rate ${d.colorName.toLowerCase()} close enough to ${T.name} to work.`
  return `${d.colorName} sits outside your tone. Wear an in-tone scarf or necklace near your face.`
}

function pairToneText(t: RatedItem, b: RatedItem, T: Tone): string {
  const dl = Math.abs(t.L - b.L)
  const conTxt = dl > 0.3 ? 'Strong light–dark contrast.' : dl < 0.12 ? 'Tonal and low-contrast.' : 'Medium contrast, easy to wear.'
  let toneTxt: string
  if (t.match === 'in' && b.match === 'in') {
    toneTxt = `${t.colorName} and ${b.colorName.toLowerCase()} both sit in your ${T.name} palette. ${conTxt}`
  } else if (t.match === 'in' || b.match === 'in') {
    const a = t.match === 'in' ? t : b
    const o = a === t ? b : t
    toneTxt =
      o.match === 'near'
        ? o.matchSource === 'tone'
          ? `${a.colorName} is core ${T.name}; ${o.colorName.toLowerCase()} borrows from ${TONES[o.tone].name} next door, so it still flatters. ${conTxt}`
          : `${a.colorName} is core ${T.name}, and you rate ${o.colorName.toLowerCase()} close enough to work. ${conTxt}`
        : `${a.colorName} is in your tone. ${o.colorName} sits outside it, so keep it ${o === t ? 'under a layer' : 'away from your face'}. ${conTxt}`
  } else if (t.match === 'near' || b.match === 'near') {
    toneTxt = `Close to ${T.name} rather than in it. Add an in-tone accessory near your face. ${conTxt}`
  } else {
    toneTxt = `Neither piece is in your tone. It works for the occasion, but it won’t flatter you as much. ${conTxt}`
  }
  return toneTxt
}
