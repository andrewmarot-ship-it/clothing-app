import { CaretRight, Check, Heart, MapPin, Shuffle, Sparkle } from '@phosphor-icons/react'
import { useState } from 'react'
import { itemMatch } from '../components/match'
import { Rail } from '../components/Rail'
import { FRAMES } from '../domain/frame'
import type { Category } from '../domain/types'
import { PRESETS, type PresetKey } from '../domain/occasions'
import { contrastLabel, rankLooks, toneFit } from '../domain/scoring'
import { currentLine, forecastFor, tempBars, timeOfDay, warmthFor, warmthNote } from '../domain/weather'
import { useApp, type Outfit as Look } from '../state/context'
import { fx } from '../state/feedback'
import { outfitColour, useGlowPref, washFill } from '../state/theme'
import { askForLocation, useWeather } from '../state/weather'

/** Quick-pick occasions on the home screen. */
const HOME_CHIPS: [PresetKey, string][] = [
  ['holiday', 'Holiday party'],
  ['thanksgiving', 'Thanksgiving'],
  ['night', 'Girls’ night'],
  ['garden', 'Garden walk'],
]

/** Rail box shapes match each category's canvas, so framed pieces keep their sizes. */
const RAIL: Record<Category, { aspect: number; reach: number }> = {
  top: { aspect: FRAMES.top.h / FRAMES.top.w, reach: 0.86 },
  bottom: { aspect: FRAMES.bottom.h / FRAMES.bottom.w, reach: 0.8 },
  dress: { aspect: FRAMES.dress.h / FRAMES.dress.w, reach: 0.92 },
}

/** Circumference of the tone-fit ring (r = 34). */
const RING = 2 * Math.PI * 34

/** First-run checklist: a tone, then something to wear: a top and a bottom, or a dress. */
function Setup() {
  const { go, hasTone, tops, bots, dresses } = useApp()
  const steps = [
    { done: hasTone, label: 'Find your colour tone', hint: 'Three quick questions', on: () => go('quiz', { quizStep: 0, quiz: [null, null, null] }) },
    { done: tops.length > 0 || dresses.length > 0, label: 'Add a top or a dress', hint: 'Lay it flat and take a photo', on: () => go('add') },
    // A dress is a whole outfit, so bottoms are optional once there is one.
    ...(dresses.length ? [] : [{ done: bots.length > 0, label: 'Add a bottom', hint: 'Jeans, trousers, a skirt…', on: () => go('add') }]),
  ]
  const fresh = !steps.some((st) => st.done)
  return (
    <section className="pad top-6 rel">
      <div className="card setup">
        <span className="card-kicker">{fresh ? 'Welcome to Clothesline' : 'Almost there'}</span>
        <span className="setup-title">{fresh ? `Set up your line in ${steps.length} steps` : 'Finish setting up to start matching'}</span>
        <ol className="setup-steps">
          {steps.map((st) => (
            <li key={st.label}>
              <button type="button" className={`setup-step ${st.done ? 'is-done' : ''}`} onClick={st.on} disabled={st.done}>
                <span className="setup-check" aria-hidden="true">
                  {st.done && <Check size={12} weight="bold" />}
                </span>
                <span className="col gap-2px">
                  <span className="setup-label">{st.label}</span>
                  <span className="meta">{st.done ? 'Done' : st.hint}</span>
                </span>
                {!st.done && <CaretRight size={14} className="muted" />}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/** The pieces being worn: swatch, name and how they suit you. Tap for details. */
function Pieces({ look }: { look: Look }) {
  const { openItem } = useApp()
  return (
    <div className="pad pieces rel">
      {(look.b ? [look.t, look.b] : [look.t]).map((p) => {
        const m = itemMatch(p)
        return (
          <button key={p.id} type="button" className="pieces-cell" onClick={() => openItem(p.id)}>
            <span className="pieces-swatch" style={{ background: p.color }} />
            <span className="col gap-1px min-0">
              <span className="pieces-name">{p.name}</span>
              <span style={{ color: m.color }}>{m.short}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function FitCard({ look }: { look: Look }) {
  const fit = toneFit(look.t, look.b)
  return (
    <div className="card bento-fit">
      <svg viewBox="0 0 80 80" className="fit-ring" aria-hidden="true">
        <circle cx="40" cy="40" r="34" className="fit-ring-track" />
        <circle cx="40" cy="40" r="34" className="fit-ring-arc" strokeDasharray={`${(fit / 100) * RING} ${RING}`} />
      </svg>
      <div className="col">
        <span className="bento-num">{fit}</span>
        <span className="bento-cap">Tone fit</span>
        <span className="meta">{look.b ? `${contrastLabel(look.t, look.b)} contrast` : 'One piece'}</span>
      </div>
    </div>
  )
}

function WeatherCard({ look, hour, today }: { look: Look; hour: number; today: string }) {
  const weather = useWeather()
  if (!weather.current) {
    const note =
      weather.status === 'asking' || weather.status === 'loading' ? 'Getting the forecast…'
      : weather.status === 'denied' ? 'Location is off. Allow it in your browser for weather'
      : weather.status === 'error' ? 'Couldn’t get the forecast'
      : null
    return (
      <div className="card bento-weather">
        <span className="bento-cap">Weather</span>
        {note ? (
          <span className="meta">{note}</span>
        ) : (
          <button type="button" className="btn btn-ghost btn-sm weather-ask" onClick={askForLocation}>
            <MapPin size={14} />
            Add location
          </button>
        )}
      </div>
    )
  }
  const { temp, code } = weather.current
  // Today's target warmth for this time of day; the current temperature stands in if there's no forecast.
  const day = forecastFor(weather.days, today) ?? { date: today, tMax: temp, tMin: temp, code, rain: 0 }
  const target = warmthFor(day, timeOfDay(hour), false)
  const warmth = Math.max(look.t.w, look.b?.w ?? 0)
  const words = currentLine(weather.current).replace(/^-?\d+° /, '')
  return (
    <div className="card bento-weather">
      <span className="bento-num">{Math.round(temp)}°</span>
      <span className="bento-cap">
        {words.charAt(0).toUpperCase() + words.slice(1)} · {warmthNote(warmth, target)}
      </span>
      <div className="temp-bars" aria-hidden="true">
        {tempBars(weather.hours).map((h, i) => (
          <span key={i} style={{ height: h }} />
        ))}
      </div>
    </div>
  )
}

function OccasionCard() {
  const { go } = useApp()
  return (
    <div className="card bento-occasion">
      <span className="card-kicker">Dressing for something?</span>
      <div className="chips">
        {HOME_CHIPS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            className="tag tag-neutral tag-btn"
            onClick={() => {
              fx('tap')
              go('occasion', { occKey: k, occText: PRESETS[k].label, code: null })
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn btn-primary btn-block btn-tall glow"
        onClick={() => {
          fx('tap')
          go('occasion')
        }}
      >
        <Sparkle size={16} />
        Match me
      </button>
    </div>
  )
}

export function Outfit() {
  const { set, hang, rated, tops, bots, dresses, outfit, hasTone, isSaved, toggleSaved, wornToday, toggleWorn } = useApp()
  const [glow] = useGlowPref()
  const [now] = useState(() => new Date())
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const date = `${now.toLocaleDateString('en-GB', { weekday: 'short' })} ${now.getDate()}`

  const t = outfit?.t
  const b = outfit?.b ?? null
  const saved = !!t && isSaved(t.id, b?.id ?? null)
  const worn = !!t && wornToday(t.id, b?.id ?? null)
  const canSeparate = tops.length > 0 && bots.length > 0
  const wearingDress = !!outfit && !outfit.b

  // Any other look you could put together, dresses included.
  const options = rankLooks(rated, PRESETS.today, 1, Infinity)
  const shuffle = () => {
    const others = options.filter((o) => o.t.id !== t?.id || o.b?.id !== b?.id)
    const next = others[Math.floor(Math.random() * others.length)]
    if (!next) return
    fx('tick')
    set(next.b ? { topId: next.t.id, botId: next.b.id } : { topId: next.t.id })
  }
  const save = () => {
    if (!t) return
    fx('peg')
    toggleSaved(t.id, b?.id ?? null, 'Today')
  }

  // Rails for what's being worn; before there's an outfit, whatever pieces exist.
  const rails = outfit
    ? wearingDress
      ? [{ label: 'Dresses', list: dresses, current: outfit.t, ...RAIL.dress }]
      : [
          { label: 'Tops', list: tops, current: outfit.t, ...RAIL.top },
          { label: 'Bottoms', list: bots, current: outfit.b!, ...RAIL.bottom },
        ]
    : [
        { label: 'Tops', list: tops, current: tops[0], ...RAIL.top },
        { label: 'Bottoms', list: bots, current: bots[0], ...RAIL.bottom },
      ].filter((r) => r.list.length > 0)

  return (
    <div className="outfit">
      <div className="outfit-wash" style={{ background: t ? washFill(glow, outfitColour(t.color, b?.color)) : 'none' }} aria-hidden="true" />
      <header className="outfit-head rel">
        <div className="col gap-2px">
          <span className="meta">
            {greeting} · {date}
          </span>
          <h1 className="outfit-title">What are we wearing?</h1>
        </div>
        <div className="row gap-1 flex-none">
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Shuffle" onClick={shuffle} disabled={options.length < 2}>
            <Shuffle size={18} />
          </button>
          <button
            type="button"
            className={`btn btn-ghost btn-icon ${saved ? 'is-saved' : ''}`}
            aria-label={saved ? 'Unsave look' : 'Save look'}
            aria-pressed={saved}
            onClick={save}
            disabled={!t}
          >
            <Heart size={18} weight={saved ? 'fill' : 'regular'} />
          </button>
        </div>
      </header>

      {!(hasTone && outfit) && <Setup />}

      {canSeparate && dresses.length > 0 && (
        <div className="pad top-4 rel">
          <div className="seg-grid seg-grid--2" role="radiogroup" aria-label="What to wear">
            {[
              { label: 'Separates', on: !wearingDress, pick: () => hang(tops[0].id) },
              { label: 'Dress', on: wearingDress, pick: () => hang(dresses[0].id) },
            ].map((m) => (
              <button
                key={m.label}
                type="button"
                role="radio"
                aria-checked={m.on}
                className={`btn btn-sm ${m.on ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => {
                  if (m.on) return
                  fx('tick')
                  m.pick()
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {rails.map((r) => (
        <Rail key={r.label} label={r.label} list={r.list} current={r.current} aspect={r.aspect} reach={r.reach} onPick={hang} />
      ))}

      {outfit && (
        <>
          <Pieces look={outfit} />
          <div className="pad top-3 rel">
            <button
              type="button"
              className={`btn btn-block btn-tall ${worn ? 'btn-secondary worn' : 'btn-secondary'}`}
              aria-pressed={worn}
              onClick={() => toggleWorn(outfit.t.id, outfit.b?.id ?? null)}
            >
              {worn ? (
                <>
                  <Check size={16} />
                  Worn today · tap to undo
                </>
              ) : (
                'I wore this today'
              )}
            </button>
          </div>
          <div className="pad top-4 bento rel">
            <FitCard look={outfit} />
            <WeatherCard look={outfit} hour={hour} today={now.toLocaleDateString('en-CA')} />
            <OccasionCard />
          </div>
        </>
      )}
    </div>
  )
}
