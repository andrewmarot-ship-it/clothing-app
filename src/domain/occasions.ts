import type { DressCode } from './types.ts'
import { forecastFor, warmthFor, weatherLine, type DayForecast, type TimeOfDay } from './weather.ts'

export interface Occasion {
  label: string
  code: DressCode
  when: string
  setting: string
  /** Weather line from the live forecast; empty until there is one. */
  weather: string
  /** Target warmth on the item scale, 1 light … 3 warm. Live weather replaces the default. */
  warmth: number
  /** Mostly indoors: the weather matters less. */
  indoor: boolean
  time: TimeOfDay
  /** Local date (YYYY-MM-DD); null means today. */
  date: string | null
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
  today: { label: 'Today', code: 1, when: 'Today · daytime', setting: 'Out and about', weather: '', warmth: 2, indoor: false, time: 'daytime', date: null, line: 'An easy everyday look.', finish: [['White trainers', '#e3d3b8'], ['Canvas tote', '#c9a27e']] },
  holiday: { label: 'Holiday party', code: 3, when: 'Evening', setting: 'Indoors, standing, then a bar', weather: '', warmth: 2, indoor: true, time: 'evening', date: null, line: 'Dressed up enough for a party, relaxed enough for a work crowd.', finish: [['Gold hoops', '#c9a24a'], ['Tan ankle boots', '#a67b5b'], ['Bronze lip', '#9c5a44']] },
  thanksgiving: { label: 'Thanksgiving', code: 2, when: 'Afternoon into evening', setting: 'Indoors, long sit-down meal', weather: '', warmth: 3, indoor: true, time: 'daytime', date: null, line: 'Smart-casual for a long table: comfortable, warm and photo-ready.', finish: [['Suede loafers', '#8a5a3b'], ['Knit scarf', '#b5735a'], ['Gold studs', '#c9a24a']] },
  garden: { label: 'Botanical garden walk', code: 1, when: 'Daytime', setting: 'Outdoors, lots of walking', weather: '', warmth: 1.5, indoor: false, time: 'daytime', date: null, line: 'Easy to move in for a couple of hours on your feet.', finish: [['White trainers', '#e3d3b8'], ['Woven tote', '#c9a27e'], ['Sage scarf', '#8f9a6e']] },
  night: { label: 'Night out with the girls', code: 3, when: 'Late evening', setting: 'Bars, maybe dancing', weather: '', warmth: 1.5, indoor: true, time: 'late', date: null, contrast: 'high', line: 'A bit of shine and contrast for later in the evening.', finish: [['Heeled boots', '#3e2b22'], ['Statement earrings', '#c9a24a'], ['Cropped jacket', '#5c3a26']] },
  date: { label: 'Date night', code: 3, when: 'Evening', setting: 'Dinner', weather: '', warmth: 2, indoor: true, time: 'evening', date: null, line: 'Polished without looking like you tried too hard.', finish: [['Fine gold chain', '#c9a24a'], ['Block heels', '#5c3a26']] },
  interview: { label: 'Interview', code: 3, when: 'Morning', setting: 'Office', weather: '', warmth: 2, indoor: true, time: 'morning', date: null, contrast: 'medium', line: 'Clean lines and quiet colour so the focus stays on you.', finish: [['Leather loafers', '#5c3a26'], ['Structured bag', '#a67b5b']] },
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

/** Keyword parser for free-text occasions: instant, and the fallback when Claude isn't available. */
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

/** Fill in the weather line and warmth from the forecast for the occasion's day, when there is one. */
export function withWeather(occ: Occasion, days: DayForecast[], today: string): Occasion {
  const f = forecastFor(days, occ.date ?? today)
  if (!f) return occ
  return { ...occ, weather: weatherLine(f, occ.time, occ.indoor), warmth: warmthFor(f, occ.time, occ.indoor) }
}

const TIME_LABEL: Record<TimeOfDay, string> = { morning: 'morning', daytime: 'daytime', evening: 'evening', late: 'late evening' }
const TIMES = Object.keys(TIME_LABEL) as TimeOfDay[]
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** "Today · evening", "Tomorrow · morning" or "Fri 17 Oct · evening". */
export function formatWhen(date: string | null, time: TimeOfDay, today: string): string {
  const t = TIME_LABEL[time]
  if (!date || date === today) return `Today · ${t}`
  const d = new Date(`${date}T12:00`)
  const next = new Date(`${today}T12:00`)
  next.setDate(next.getDate() + 1)
  if (date === next.toLocaleDateString('en-CA')) return `Tomorrow · ${t}`
  return `${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${t}`
}

const CODE_WORDS: Record<string, DressCode> = { casual: 1, smart: 2, dressy: 3, formal: 4 }
const HEX = /^#[0-9a-f]{6}$/i

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '')

/**
 * Defensive conversion of Claude's reading of an occasion into an Occasion.
 * Anything missing or out of range falls back to a sensible default.
 */
export function occasionFromAi(raw: unknown, typed: string, today: string): Occasion | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const code = typeof r.code === 'number' ? (Math.min(4, Math.max(1, Math.round(r.code))) as DressCode) : (CODE_WORDS[String(r.code)] ?? 2)
  // Accept Claude's raw reading and an already-normalised Occasion alike, so a second pass is harmless.
  const t = r.timeOfDay ?? r.time
  const time = TIMES.includes(t as TimeOfDay) ? (t as TimeOfDay) : 'daytime'
  const date = typeof r.date === 'string' && ISO_DATE.test(r.date) && !Number.isNaN(Date.parse(r.date)) ? r.date : null
  const finish = (Array.isArray(r.finish) ? r.finish : [])
    .map((f): [string, string] => {
      if (Array.isArray(f)) return [text(f[0], 30), String(f[1] ?? '')]
      const o = f && typeof f === 'object' ? (f as Record<string, unknown>) : {}
      return [text(o.name, 30), String(o.colour ?? '')]
    })
    .filter(([name, colour]) => name && HEX.test(colour))
    .slice(0, 3)
  const label = text(r.label, 32) || capitalise(typed.trim()).slice(0, 32)
  if (!label) return null
  return {
    label,
    code,
    when: formatWhen(date, time, today),
    setting: text(r.setting, 60) || 'As described',
    weather: '',
    warmth: 2,
    indoor: r.indoor !== false,
    time,
    date,
    contrast: r.contrast === 'high' || r.contrast === 'medium' ? r.contrast : undefined,
    line: text(r.line, 140) || 'Smart-casual is the safe middle ground here.',
    finish: finish.length ? finish : PRESETS.today.finish,
  }
}
