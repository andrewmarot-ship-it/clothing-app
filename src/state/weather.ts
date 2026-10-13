/**
 * Live weather from Open-Meteo (no key; called from the browser). Location
 * is asked for only when the user taps for it, kept coarse, and stays on
 * this device. Swap this module to change provider: Open-Meteo's free tier
 * is for non-commercial use.
 */
import { useSyncExternalStore } from 'react'
import type { CurrentWeather, DayForecast } from '../domain/weather'

export type WeatherStatus = 'off' | 'asking' | 'loading' | 'ready' | 'denied' | 'error'

export interface WeatherState {
  status: WeatherStatus
  current: CurrentWeather | null
  days: DayForecast[]
}

interface Place {
  lat: number
  lon: number
}

const PLACE_KEY = 'clothesline-location-v1'
const STALE_MS = 30 * 60 * 1000

function savedPlace(): Place | null {
  try {
    const p = JSON.parse(localStorage.getItem(PLACE_KEY) ?? 'null') as Place | null
    return p && typeof p.lat === 'number' && typeof p.lon === 'number' ? p : null
  } catch {
    return null
  }
}

let state: WeatherState = { status: savedPlace() ? 'loading' : 'off', current: null, days: [] }
let fetchedAt = 0
let inFlight: Promise<void> | null = null
const listeners = new Set<() => void>()

function setState(next: Partial<WeatherState>) {
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}

interface OpenMeteo {
  current?: { temperature_2m: number; weather_code: number }
  daily?: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; weather_code: number[]; precipitation_probability_max: (number | null)[] }
}

async function load(place: Place): Promise<void> {
  const q = new URLSearchParams({
    latitude: String(place.lat),
    longitude: String(place.lon),
    current: 'temperature_2m,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '16',
  })
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`)
    if (!res.ok) throw new Error(`open-meteo ${res.status}`)
    const data = (await res.json()) as OpenMeteo
    const d = data.daily
    const days: DayForecast[] = d
      ? d.time.map((date, i) => ({ date, tMax: d.temperature_2m_max[i], tMin: d.temperature_2m_min[i], code: d.weather_code[i], rain: d.precipitation_probability_max[i] ?? 0 }))
      : []
    const current = data.current ? { temp: data.current.temperature_2m, code: data.current.weather_code } : null
    fetchedAt = Date.now()
    setState({ status: 'ready', current, days })
  } catch {
    setState({ status: state.days.length ? 'ready' : 'error' })
  }
}

/** Refresh the forecast if we have a place and it's stale. */
export function refreshWeather(): Promise<void> {
  const place = savedPlace()
  if (!place || Date.now() - fetchedAt < STALE_MS) return Promise.resolve()
  inFlight ??= load(place).finally(() => (inFlight = null))
  return inFlight
}

/** Ask for the user's location (once they tap), then load the forecast. */
export function askForLocation(): void {
  if (!('geolocation' in navigator)) return setState({ status: 'denied' })
  setState({ status: 'asking' })
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      // About 1km of precision is plenty for weather, and kinder to privacy.
      const place = { lat: Math.round(pos.coords.latitude * 100) / 100, lon: Math.round(pos.coords.longitude * 100) / 100 }
      try {
        localStorage.setItem(PLACE_KEY, JSON.stringify(place))
      } catch {
        // Still works for this visit.
      }
      fetchedAt = 0
      setState({ status: 'loading' })
      void load(place)
    },
    () => setState({ status: 'denied' }),
    { maximumAge: 60 * 60 * 1000, timeout: 15000 },
  )
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  void refreshWeather()
  return () => listeners.delete(l)
}

export function useWeather(): WeatherState {
  return useSyncExternalStore(subscribe, () => state)
}
