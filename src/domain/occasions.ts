import type { DressCode } from './types'

export interface Occasion {
  label: string
  code: DressCode
  when: string
  setting: string
  weather: string
  /** Target warmth on the item scale, 1 light … 3 warm. */
  warmth: number
  contrast?: 'high' | 'medium'
  /** One-line summary used in the reason copy. */
  line: string
  /** Accessories: [name, colour]. */
  finish: [string, string][]
}

export type PresetKey = 'today' | 'holiday' | 'thanksgiving' | 'garden' | 'night' | 'date' | 'interview'
export type OccasionKey = PresetKey | 'custom'

export const CODES = ['Casual', 'Smart', 'Dressy', 'Formal'] as const

export const PRESETS: Record<PresetKey, Occasion> = {
  today: { label: 'Today', code: 1, when: 'Today · daytime', setting: 'Out and about', weather: '17° overcast', warmth: 2, line: 'An easy everyday look.', finish: [['White trainers', '#e3d3b8'], ['Canvas tote', '#c9a27e']] },
  holiday: { label: 'Holiday party', code: 3, when: 'Evening', setting: 'Indoors, standing, then a bar', weather: '4° out, warm inside', warmth: 2, line: 'Dressed up enough for a party, relaxed enough for a work crowd.', finish: [['Gold hoops', '#c9a24a'], ['Tan ankle boots', '#a67b5b'], ['Bronze lip', '#9c5a44']] },
  thanksgiving: { label: 'Thanksgiving', code: 2, when: 'Afternoon into evening', setting: 'Indoors, long sit-down meal', weather: '6° out, cosy inside', warmth: 3, line: 'Smart-casual for a long table: comfortable, warm and photo-ready.', finish: [['Suede loafers', '#8a5a3b'], ['Knit scarf', '#b5735a'], ['Gold studs', '#c9a24a']] },
  garden: { label: 'Botanical garden walk', code: 1, when: 'Daytime', setting: 'Outdoors, lots of walking', weather: '17° overcast', warmth: 1.5, line: 'Easy to move in for a couple of hours on your feet.', finish: [['White trainers', '#e3d3b8'], ['Woven tote', '#c9a27e'], ['Sage scarf', '#8f9a6e']] },
  night: { label: 'Night out with the girls', code: 3, when: 'Late evening', setting: 'Bars, maybe dancing', weather: '9° out', warmth: 1.5, contrast: 'high', line: 'A bit of shine and contrast for later in the evening.', finish: [['Heeled boots', '#3e2b22'], ['Statement earrings', '#c9a24a'], ['Cropped jacket', '#5c3a26']] },
  date: { label: 'Date night', code: 3, when: 'Evening', setting: 'Dinner', weather: '11° out', warmth: 2, line: 'Polished without looking like you tried too hard.', finish: [['Fine gold chain', '#c9a24a'], ['Block heels', '#5c3a26']] },
  interview: { label: 'Interview', code: 3, when: 'Morning', setting: 'Office', weather: '14° out', warmth: 2, contrast: 'medium', line: 'Clean lines and quiet colour so the focus stays on you.', finish: [['Leather loafers', '#5c3a26'], ['Structured bag', '#a67b5b']] },
}

/** Quick-pick chips on the Occasion screen. */
export const CHIPS: PresetKey[] = ['holiday', 'thanksgiving', 'garden', 'night', 'date', 'interview']

/** Keyword lists, checked in order. */
const KEYWORDS: [PresetKey, string[]][] = [
  ['holiday', ['holiday', 'christmas', 'xmas', 'party', 'festive', 'new year']],
  ['thanksgiving', ['thanksgiving', 'friendsgiving', 'family dinner']],
  ['night', ['girls', 'night out', 'club', 'bar', 'drinks', 'dancing']],
  ['date', ['date', 'anniversary']],
  ['garden', ['garden', 'botanical', 'walk', 'park', 'hike', 'museum', 'picnic']],
  ['interview', ['interview', 'office', 'work', 'meeting', 'presentation']],
  ['thanksgiving', ['dinner', 'lunch', 'brunch']],
]

/**
 * Keyword parser for free-text occasions. Production should hand the text
 * to an LLM for structured output and keep this as the offline fallback.
 */
export function parseOccasion(text: string): OccasionKey {
  const t = text.toLowerCase().trim()
  if (!t) return 'today'
  for (const [key, words] of KEYWORDS) if (words.some((w) => t.includes(w))) return key
  return 'custom'
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function occasionFor(key: OccasionKey, text: string): Occasion {
  if (key !== 'custom') return PRESETS[key]
  return {
    ...PRESETS.today,
    label: capitalise(text.trim()).slice(0, 32),
    code: 2,
    when: 'As described',
    setting: 'As described',
    line: 'Smart-casual is the safe middle ground here.',
  }
}
