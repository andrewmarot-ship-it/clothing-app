import { occasionFor, withWeather, type Occasion } from '../domain/occasions'
import { today, useApp } from './context'
import { useWeather, type WeatherState } from './weather'

export interface OccasionView {
  /** What to dress for, with live weather folded in when there is any. */
  occ: Occasion
  /** Where the reading came from. */
  source: 'claude' | 'keywords'
  weather: WeatherState
}

/** The current occasion: Claude's reading of the typed text when available, keywords otherwise. */
export function useOccasion(): OccasionView {
  const { state } = useApp()
  const weather = useWeather()
  const ai = state.occAi && state.occAi.text === state.occText ? state.occAi.occasion : null
  const base = ai ?? occasionFor(state.occKey, state.occText)
  return { occ: withWeather(base, weather.days, today()), source: ai ? 'claude' : 'keywords', weather }
}
