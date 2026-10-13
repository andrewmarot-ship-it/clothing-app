import { MapPin, Sparkle } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { BackRow, Kicker } from '../components/Chrome'
import { CHIPS, CODES, PRESETS, parseOccasion } from '../domain/occasions'
import { TONES } from '../domain/tones'
import type { DressCode } from '../domain/types'
import { today, useApp } from '../state/context'
import { readOccasion } from '../state/occasionApi'
import { useOccasion } from '../state/useOccasion'
import { askForLocation, type WeatherState } from '../state/weather'

/** Wait for a pause in typing before asking Claude. */
const READ_DELAY_MS = 700
const CHIP_LABELS = new Set(CHIPS.map((k) => PRESETS[k].label))

function WeatherValue({ text, weather }: { text: string; weather: WeatherState }) {
  if (text) return <span>{text}</span>
  if (weather.status === 'asking' || weather.status === 'loading') return <span className="muted">Getting the forecast…</span>
  if (weather.status === 'denied') return <span className="muted">Location is off. Allow it in your browser for weather</span>
  if (weather.status === 'ready') return <span className="muted">Too far ahead for a forecast</span>
  if (weather.status === 'error') return <span className="muted">Couldn’t get the forecast</span>
  return (
    <button type="button" className="btn btn-ghost btn-sm weather-ask" onClick={askForLocation}>
      <MapPin size={14} />
      Add your location for weather
    </button>
  )
}

export function Occasion() {
  const { state, set, go, userTone, hasTone, rated, outfit, cloud } = useApp()
  const { occ, source, weather } = useOccasion()
  const code = state.code ?? occ.code
  const [reading, setReading] = useState(false)

  // Ask Claude to read free text (not a quick-pick chip) once typing pauses.
  const text = state.occText.trim()
  const wantsReading = !!cloud.user && text.length >= 4 && !CHIP_LABELS.has(text) && state.occAi?.text !== state.occText
  useEffect(() => {
    if (!wantsReading) return
    const typed = state.occText
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setReading(true)
      const occasion = await readOccasion(typed, today(), ctrl.signal)
      if (ctrl.signal.aborted) return
      setReading(false)
      if (occasion) set({ occAi: { text: typed, occasion } })
    }, READ_DELAY_MS)
    return () => {
      clearTimeout(t)
      ctrl.abort()
      setReading(false)
    }
  }, [wantsReading, state.occText, set])

  return (
    <>
      <BackRow label="Outfit" onBack={() => go('outfit')} right="Match me" />
      <div className="pad stack-2 top-6">
        <Kicker>Occasion</Kicker>
        <h1 className="title">What’s it for?</h1>
      </div>
      <div className="pad top-6">
        <textarea
          className="input occ-input"
          aria-label="Describe the occasion"
          rows={3}
          placeholder="e.g. Work holiday party, Friday evening"
          value={state.occText}
          onChange={(e) => set({ occText: e.target.value, occKey: parseOccasion(e.target.value), code: null })}
        />
      </div>
      <div className="pad top-4 chips">
        {CHIPS.map((k) => (
          <button
            key={k}
            type="button"
            className={`chip ${state.occKey === k ? 'is-active' : ''}`}
            aria-pressed={state.occKey === k}
            onClick={() => set({ occText: PRESETS[k].label, occKey: k, code: null })}
          >
            {PRESETS[k].label}
          </button>
        ))}
      </div>
      <div className="pad top-8 col">
        <Kicker className="kicker-pad">
          {reading ? 'Reading your occasion…' : `What we picked up · ${occ.label}`}
          {!reading && source === 'claude' && <Sparkle size={11} className="kicker-spark" aria-label="Read by Claude" />}
        </Kicker>
        {[
          ['When', <span key="v">{occ.when}</span>],
          ['Setting', <span key="v">{occ.setting}</span>],
          ['Weather', <WeatherValue key="v" text={occ.weather} weather={weather} />],
        ].map(([k, v]) => (
          <div key={k as string} className={`kv-row ${reading ? 'is-reading' : ''}`} style={{ gridTemplateColumns: '84px minmax(0,1fr)' }}>
            <span className="kv-key">{k}</span>
            {v}
          </div>
        ))}
      </div>
      <div className="pad top-6 stack-3">
        <Kicker>Dress code</Kicker>
        <div className="seg-grid" role="radiogroup" aria-label="Dress code">
          {CODES.map((label, i) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={code === i + 1}
              className={`btn ${code === i + 1 ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => set({ code: (i + 1) as DressCode })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="pad top-8 stack-3">
        <button type="button" className="btn btn-primary btn-block btn-tall glow" disabled={!outfit} onClick={() => go('match', { lookI: 0 })}>
          <Sparkle size={16} />
          Find my outfit
        </button>
        <span className="hint">
          {!outfit
            ? 'Add a top and a bottom, or a dress, to get a match'
            : hasTone
              ? `Uses your ${TONES[userTone].name} profile and the ${rated.length} pieces you own`
              : `Uses the ${rated.length} pieces you own. Find your tone on Profile to match on colour too`}
        </span>
      </div>
    </>
  )
}
