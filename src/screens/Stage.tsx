import { CaretRight, Check, Dress, Heart, Shuffle, Sparkle, TShirt } from '@phosphor-icons/react'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { BodyPicker } from '../components/BodyPicker'
import { Ring, type SpinBoost } from '../components/Ring'
import { Sheet } from '../components/Sheet'
import type { Shape } from '../domain/categories'
import { CHIPS, CHIP_LABELS, PRESETS, withWeather, type Occasion, type PresetKey } from '../domain/occasions'
import { spinTicks } from '../domain/ring'
import { contrastLabel, rankLooks, toneFit } from '../domain/scoring'
import { TONES } from '../domain/tones'
import { currentLine } from '../domain/weather'
import { today, useApp } from '../state/context'
import { fx } from '../state/feedback'
import { lookPatch, shapesAvailable } from '../state/outfit'
import { paletteConic, useGlowPref } from '../state/theme'
import { useOccasion } from '../state/useOccasion'
import { useWeather } from '../state/weather'
import { CastAsk, CastResult } from './Cast'

/** Time for the stage to switch between separates and a dress before a Cast spins. */
const MODE_SWITCH_MS = 600
const LONG_PRESS_MS = 500
/** A random element, or undefined for an empty list. */
const anyOf = <T,>(list: T[]): T | undefined => list[Math.floor(Math.random() * list.length)]

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

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
    <section className="pad stage-setup">
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

/** The outfit's colours, faintly, across the stage: two pools for separates, one for a dress. */
function washFor(glow: string, t: string, b: string | null): string {
  if (glow === 'off') return 'none'
  if (glow === 'accent') return 'radial-gradient(70% 40% at 50% 40%, color-mix(in oklch, var(--color-accent-800) 60%, transparent), transparent)'
  if (!b) return `radial-gradient(70% 50% at 50% 42%, color-mix(in oklch, ${t} 28%, transparent), transparent)`
  return `radial-gradient(70% 34% at 50% 26%, color-mix(in oklch, ${t} 26%, transparent), transparent), radial-gradient(70% 30% at 50% 58%, color-mix(in oklch, ${b} 22%, transparent), transparent)`
}

export function Stage() {
  const { state, set, go, hang, rated, tops, bots, dresses, outfit, hasTone, userTone, isSaved, toggleSaved, wornToday, toggleWorn } = useApp()
  const weather = useWeather()
  const { occ } = useOccasion()
  const [glow] = useGlowPref()
  const [now] = useState(() => new Date())
  const T = TONES[userTone]
  const can = shapesAvailable(rated)

  // Spins: a boost adds whole turns to every ring; `spinning` gives them the long settling ease.
  const [boost, setBoost] = useState<SpinBoost>({ key: 0, turns: 0 })
  const [spinning, setSpinning] = useState(false)
  const [casting, setCasting] = useState(false)
  const [phase, setPhase] = useState<'ask' | 'result'>('ask')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms))

  /** Put a look on the rings with a spin: ticks as it turns, then `onLand`. */
  const spinTo = (topId: string, botId: string | null, turns: number, ms: number, landAt: number, onLand: () => void) => {
    if (reducedMotion()) {
      set(lookPatch(topId, botId))
      return onLand()
    }
    setSpinning(true)
    set(lookPatch(topId, botId))
    setBoost((b) => ({ key: b.key + 1, turns }))
    for (const t of spinTicks(ms)) later(t, () => fx('tick'))
    later(landAt, () => {
      setSpinning(false)
      onLand()
    })
  }

  const code = state.code ?? occ.code
  const looksFor = (o: Occasion, c: number) => rankLooks(rated, o, c, 5, state.bodyPref)
  const looks = looksFor(occ, code)

  /** Cast: land the rings on look `j`, switching shape first if the look needs it. */
  const castLook = (list: typeof looks, j: number, turns: number) => {
    clearTimers()
    if (!list.length) return
    const k = ((j % list.length) + list.length) % list.length
    const L = list[k]
    set({ sheet: 'cast', lookI: k })
    setPhase('result')
    setCasting(true)
    const run = () =>
      spinTo(L.t.id, L.b?.id ?? null, turns, 1600, 1780, () => {
        fx('match')
        setCasting(false)
      })
    const shape: Shape = L.b ? 'separates' : 'dress'
    const showing: Shape = outfit && !outfit.b ? 'dress' : 'separates'
    if (shape === showing) return run()
    fx('peg')
    set({ shape })
    later(MODE_SWITCH_MS, run)
  }

  const castPreset = (k: PresetKey) => {
    fx('tap')
    set({ occText: PRESETS[k].label, occKey: k, code: null, occAi: null })
    const o = withWeather(PRESETS[k], weather.days, today())
    castLook(looksFor(o, o.code), 0, 2)
  }

  const shuffle = () => {
    if (!outfit) return
    const options = rankLooks(rated, PRESETS.today, 1, Infinity, outfit.b ? 'separates' : 'dress').filter((o) => o.t.id !== outfit.t.id || o.b?.id !== outfit.b?.id)
    const next = anyOf(options)
    if (!next) return
    clearTimers()
    spinTo(next.t.id, next.b?.id ?? null, 1, 1400, 1700, () => fx('peg'))
  }

  const switchShape = (shape: Shape) => {
    if (!can[shape]) return
    if (outfit && (shape === 'dress') === !outfit.b) {
      // Tapping the active shape opens the body picker.
      fx('tap')
      return set({ sheet: 'body' })
    }
    fx('peg')
    set({ shape, bodyPref: state.bodyPref === 'auto' ? 'auto' : shape })
  }

  const closeSheet = () => {
    clearTimers()
    setSpinning(false)
    setCasting(false)
    setPhase('ask')
    set({ sheet: null })
  }

  // Long-press anywhere on the stage opens the body picker.
  const press = useRef<{ x: number; y: number; t: ReturnType<typeof setTimeout> } | null>(null)
  const pressStart = (e: PointerEvent) => {
    if (state.sheet || !outfit) return
    const t = setTimeout(() => {
      press.current = null
      fx('tap')
      set({ sheet: 'body' })
    }, LONG_PRESS_MS)
    press.current = { x: e.clientX, y: e.clientY, t }
  }
  const pressMove = (e: PointerEvent) => {
    const p = press.current
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) pressEnd()
  }
  const pressEnd = () => {
    if (press.current) clearTimeout(press.current.t)
    press.current = null
  }

  const wearingDress = !!outfit && !outfit.b
  const t = outfit?.t
  const b = outfit?.b ?? null
  const saved = !!t && isSaved(t.id, b?.id ?? null)
  const worn = !!t && wornToday(t.id, b?.id ?? null)
  const ready = hasTone && !!outfit
  const dateLine = [`${now.toLocaleDateString('en-GB', { weekday: 'short' })} ${now.getDate()}`, weather.current ? currentLine(weather.current) : null].filter(Boolean).join(' · ')
  // Separates rings show the picks even while a dress is worn, so switching back finds them in place.
  const top = rated.find((i) => i.id === state.topId && i.cat === 'top') ?? tops[0]
  const bot = rated.find((i) => i.id === state.botId && i.cat === 'bottom') ?? bots[0]
  const dress = rated.find((i) => i.id === state.dressId && i.cat === 'dress') ?? dresses[0]
  const vars = { '--aura': paletteConic(T.palette) } as CSSProperties
  // Only the rings on show take a Cast's extra turns.
  const idle: SpinBoost = { key: boost.key, turns: 0 }
  const pick = (id: string) => {
    fx('tick')
    hang(id)
  }

  return (
    <div className={`stage-screen ${state.sheet ? 'has-sheet' : ''}`} style={vars}>
      <div className="stage-scene" onPointerDown={pressStart} onPointerMove={pressMove} onPointerUp={pressEnd} onPointerCancel={pressEnd} onContextMenu={(e) => e.preventDefault()}>
        <div className="stage-aura" aria-hidden="true" />
        {t && <div className="stage-wash" style={{ background: washFor(glow, t.color, b?.color ?? null) }} aria-hidden="true" />}
        {ready && (
          <>
            <div className={`ghost ghost--top ${wearingDress ? 'is-off' : ''}`} aria-hidden="true">
              {top?.colorName}
            </div>
            <div className={`ghost ghost--bot ${wearingDress ? 'is-off' : ''}`} aria-hidden="true">
              {bot?.colorName}
            </div>
            <div className={`ghost ghost--dress ${wearingDress ? '' : 'is-off'}`} aria-hidden="true">
              {dress?.colorName}
            </div>
          </>
        )}

        <header className="stage-head">
          <span className="stage-date">{dateLine}</span>
          <button
            type="button"
            className="tone-pill"
            onClick={() => {
              fx('tap')
              go('profile')
            }}
          >
            <span className="tone-dots" aria-hidden="true">
              {T.palette.slice(0, 3).map((c) => (
                <span key={c} style={{ background: c }} />
              ))}
            </span>
            {hasTone ? T.name : 'Find your tone'}
          </button>
        </header>

        {outfit && (
          <div className="mode-pill" role="radiogroup" aria-label="Outfit shape">
            {(['separates', 'dress'] as Shape[]).map((s) => {
              const on = (s === 'dress') === wearingDress
              const Icon = s === 'dress' ? Dress : TShirt
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`mode-seg ${on ? 'is-on' : ''}`}
                  disabled={!can[s]}
                  title={!can[s] ? (s === 'dress' ? 'Add a dress to use this' : 'Add a top and a bottom to use this') : undefined}
                  onClick={() => switchShape(s)}
                >
                  <Icon size={12} />
                  {s === 'dress' ? 'Dress' : 'Separates'}
                </button>
              )
            })}
          </div>
        )}
        {outfit && !can.dress && <span className="mode-hint">Add a dress to use this</span>}

        {!ready && <Setup />}

        {ready && (
          <>
            <div className={`ring-group ring-group--sep ${wearingDress ? 'is-off' : ''}`} inert={wearingDress || undefined}>
              {top && <Ring cat="top" list={tops} current={top} onPick={pick} boost={wearingDress ? idle : boost} spinning={spinning} dim={casting} />}
              {bot && <Ring cat="bottom" list={bots} current={bot} onPick={pick} boost={wearingDress ? idle : boost} spinning={spinning} dim={casting} />}
            </div>
            {dress && (
              <div className={`ring-group ring-group--dress ${wearingDress ? '' : 'is-off'}`} inert={!wearingDress || undefined}>
                <Ring cat="dress" list={dresses} current={dress} onPick={pick} boost={wearingDress ? boost : idle} spinning={spinning} dim={casting} />
              </div>
            )}

            <div className={`fit-readout ${wearingDress ? 'is-dress' : ''}`}>
              <span className="fit-num">{toneFit(outfit.t, outfit.b)}</span>
              <span className="fit-cap">{outfit.b ? `Tone fit · ${contrastLabel(outfit.t, outfit.b)}` : 'Tone fit'}</span>
              <div className="row gap-1 top-3">
                <button type="button" className="btn btn-ghost btn-icon round-btn" aria-label={wearingDress ? 'Spin the line' : 'Spin both lines'} onClick={shuffle}>
                  <Shuffle size={18} />
                </button>
                <button
                  type="button"
                  className={`btn btn-ghost btn-icon round-btn ${saved ? 'is-saved' : ''}`}
                  aria-label={saved ? 'Unsave look' : 'Save look'}
                  aria-pressed={saved}
                  onClick={() => {
                    fx('peg')
                    toggleSaved(outfit.t.id, outfit.b?.id ?? null, 'Today')
                  }}
                >
                  <Heart size={18} weight={saved ? 'fill' : 'regular'} />
                </button>
              </div>
              <button type="button" className={`worn-pill ${worn ? 'is-on' : ''}`} aria-pressed={worn} onClick={() => toggleWorn(outfit.t.id, outfit.b?.id ?? null)}>
                {worn ? (
                  <>
                    <Check size={12} weight="bold" />
                    Worn today
                  </>
                ) : (
                  'I wore this today'
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {ready && (
        <div className="command">
          <div className="command-chips">
            {CHIPS.map((k) => (
              <button key={k} type="button" className="command-chip" onClick={() => castPreset(k)}>
                {CHIP_LABELS[k]}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="dress-me"
            onClick={() => {
              fx('tap')
              setPhase('ask')
              set({ sheet: 'cast' })
            }}
          >
            <Sparkle size={18} className="dress-me-icon" />
            <span className="dress-me-text">Dress me for…</span>
            <span className="dress-me-cast">Cast</span>
          </button>
        </div>
      )}

      <Sheet open={state.sheet === 'cast'} label="Cast a look" kicker={phase === 'ask' ? 'Cast a look' : 'Your cast'} onClose={closeSheet}>
        {phase === 'ask' ? (
          <CastAsk onCast={() => castLook(looks, 0, 2)} />
        ) : (
          <CastResult
            looks={looks}
            casting={casting}
            onSpinAgain={() => {
              fx('tick')
              castLook(looks, state.lookI + 1, 1)
            }}
            onWear={() => {
              fx('peg')
              closeSheet()
            }}
          />
        )}
      </Sheet>
      <Sheet open={state.sheet === 'body'} label="Build with" kicker="Build with" onClose={closeSheet}>
        <BodyPicker />
      </Sheet>
    </div>
  )
}
