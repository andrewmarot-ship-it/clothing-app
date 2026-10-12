/**
 * Turning a forecast into words and into a warmth target on the item scale
 * (1 light … 3 warm). Pure, so the thresholds are testable.
 */

export type TimeOfDay = 'morning' | 'daytime' | 'evening' | 'late'

export interface DayForecast {
  /** Local date, YYYY-MM-DD. */
  date: string
  tMax: number
  tMin: number
  /** WMO weather code. */
  code: number
  /** Highest chance of precipitation that day, 0–100. */
  rain: number
}

export interface CurrentWeather {
  temp: number
  code: number
}

/** WMO weather codes in plain words. */
export function weatherWords(code: number): string {
  if (code === 0) return 'clear'
  if (code === 1) return 'mostly clear'
  if (code === 2) return 'partly cloudy'
  if (code === 3) return 'overcast'
  if (code === 45 || code === 48) return 'foggy'
  if (code >= 51 && code <= 57) return 'drizzle'
  if (code === 61 || code === 80) return 'light rain'
  if (code === 66 || code === 67) return 'freezing rain'
  if (code >= 61 && code <= 65) return code === 65 ? 'heavy rain' : 'rain'
  if (code === 81 || code === 82) return 'showers'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'thunderstorms'
  return 'mixed weather'
}

/** The temperature that matters for when you'll be out: evenings run cooler. */
export function feelsLike(f: DayForecast, time: TimeOfDay): number {
  if (time === 'evening' || time === 'late') return f.tMin * 0.6 + f.tMax * 0.4
  if (time === 'morning') return f.tMin * 0.5 + f.tMax * 0.5
  return f.tMax * 0.7 + f.tMin * 0.3
}

const half = (x: number) => Math.round(x * 2) / 2

/**
 * Warmth target from the weather. Outdoors it follows the temperature; an
 * indoor event is mostly about the room, so it stays near the middle.
 */
export function warmthFor(f: DayForecast, time: TimeOfDay, indoor: boolean): number {
  const t = feelsLike(f, time)
  const outdoor = t >= 22 ? 1 : t >= 17 ? 1.5 : t >= 12 ? 2 : t >= 7 ? 2.5 : 3
  return half(indoor ? 2 + (outdoor - 2) * 0.35 : outdoor)
}

/** e.g. "4° out, light rain" (indoor) or "17° overcast, rain likely" (outdoor). */
export function weatherLine(f: DayForecast, time: TimeOfDay, indoor: boolean): string {
  const t = Math.round(feelsLike(f, time))
  const words = weatherWords(f.code)
  const wet = /rain|drizzle|showers|thunder|snow/.test(words)
  const rain = !wet && f.rain >= 50 ? ', rain likely' : !wet && f.rain >= 30 ? ', chance of rain' : ''
  return indoor ? `${t}° out, ${words}${rain}` : `${t}° ${words}${rain}`
}

export const currentLine = (c: CurrentWeather) => `${Math.round(c.temp)}° ${weatherWords(c.code)}`

/** Forecasts only reach so far ahead; null when the date isn't covered. */
export function forecastFor(days: DayForecast[], date: string): DayForecast | null {
  return days.find((d) => d.date === date) ?? null
}
