import { CaretLeft, CaretRight, Check, Sparkle } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Garment, Line } from '../components/Garment'
import { itemMatch } from '../components/match'
import { PRESETS } from '../domain/occasions'
import { contrastLabel, rankLooks, toneFit } from '../domain/scoring'
import { TONES } from '../domain/tones'
import type { Category, RatedItem } from '../domain/types'
import { useApp, type Outfit as Look } from '../state/context'
import { useWeather } from '../state/weather'
import { currentLine } from '../domain/weather'

/** Piece sizes on the line. Bottoms and dresses get taller boxes because they're tall. */
const SIZES: Record<Category, { w: number; h: number; selW: number; selH: number }> = {
  top: { w: 64, h: 64, selW: 104, selH: 104 },
  bottom: { w: 52, h: 72, selW: 84, selH: 120 },
  dress: { w: 52, h: 84, selW: 84, selH: 136 },
}
const GAP = 14

/** One line of pieces. `current` is the piece being worn from this line, if any. */
function Strip({ label, cat, list, current, onSelect }: { label: string; cat: Category; list: RatedItem[]; current: RatedItem | null; onSelect: (id: string) => void }) {
  const n = list.length
  const worn = list.findIndex((i) => i.id === current?.id)
  const idx = Math.max(0, worn)
  const size = SIZES[cat]
  const select = (i: number) => onSelect(list[(i + n) % n].id)
  const scroller = useRef<HTMLDivElement>(null)
  const first = useRef(true)

  // Keep the selected piece centred. The track is padded by half the view on each
  // side, so piece i is centred exactly when the line is scrolled by i pitches.
  useEffect(() => {
    scroller.current?.scrollTo({ left: idx * (size.w + GAP), behavior: first.current ? 'auto' : 'smooth' })
    first.current = false
  }, [idx, size.w])

  return (
    <section className="strip">
      <div className="strip-head">
        <span className="kicker">
          {worn >= 0 ? `${label} · ${idx + 1} / ${n}` : `${label} · ${n}`}
        </span>
        <div className="strip-nav">
          <button type="button" className="btn btn-ghost btn-icon" aria-label={`Previous ${label.toLowerCase()}`} onClick={() => select(worn >= 0 ? idx - 1 : 0)} disabled={n < 2 && worn >= 0}>
            <CaretLeft size={18} />
          </button>
          <button type="button" className="btn btn-ghost btn-icon" aria-label={`Next ${label.toLowerCase()}`} onClick={() => select(worn >= 0 ? idx + 1 : 0)} disabled={n < 2 && worn >= 0}>
            <CaretRight size={18} />
          </button>
        </div>
      </div>
      <div className="strip-scroll" ref={scroller} style={{ height: size.selH + 36 }}>
        <div className="strip-track" style={{ gap: GAP, paddingInline: `calc(50% - ${size.selW / 2}px)` }}>
          <Line sag={10} style={{ top: 4 }} />
          {list.map((it, i) => {
            const sel = i === worn
            return (
              <button
                key={it.id}
                type="button"
                aria-label={it.name}
                aria-pressed={sel}
                className={`hanging ${sel ? 'is-selected' : ''}`}
                onClick={() => select(i)}
                style={{ width: sel ? size.selW : size.w, height: sel ? size.selH : size.h }}
              >
                <span className="hanging-pin" />
                <Garment item={it} stroke={1.2} className="fill" />
                <span className={`hanging-dot match-dot--${it.match}`} />
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Fitting({ look }: { look: Look }) {
  const { rated, set, isSaved, toggleSaved, openItem, wornToday, toggleWorn } = useApp()
  const { t, b } = look
  const fit = toneFit(t, b)
  const saved = isSaved(t.id, b?.id ?? null)
  const worn = wornToday(t.id, b?.id ?? null)
  const dl = b ? Math.abs(t.L - b.L) : 0

  // Any other look you could put together, dresses included.
  const options = rankLooks(rated, PRESETS.today, 1, Infinity)
  const shuffle = () => {
    const others = options.filter((o) => o.t.id !== t.id || o.b?.id !== b?.id)
    const next = others[Math.floor(Math.random() * others.length)]
    if (next) set(next.b ? { topId: next.t.id, botId: next.b.id } : { topId: next.t.id })
  }

  return (
    <>
      <section className="fitting pad">
        <div className="fitting-figure">
          {b ? (
            <>
              <Garment item={t} className="fitting-top" />
              <Garment item={b} className="fitting-bot" align="center" />
            </>
          ) : (
            <Garment item={t} className="fitting-dress" align="center" />
          )}
        </div>
        <div className="fitting-info">
          {(b ? [t, b] : [t]).map((p) => {
            const m = itemMatch(p)
            return (
              <button key={p.id} type="button" className="piece" onClick={() => openItem(p.id)}>
                <span className="swatch" style={{ background: p.color }} />
                <span className="piece-text">
                  <span className="piece-name">{p.name}</span>
                  <span className="muted">{TONES[p.tone].name}</span>
                  <span style={{ color: m.color }}>{m.short}</span>
                </span>
              </button>
            )
          })}
          <div className="meters">
            {b && (
              <>
                <div className="meter-head">
                  <span>Contrast</span>
                  <span className="meter-val">{contrastLabel(t, b)}</span>
                </div>
                <div className="meter meter--contrast">
                  <span className="meter-mark" style={{ left: `${Math.min(96, Math.round((dl / 0.6) * 100))}%` }} />
                </div>
              </>
            )}
            <div className="meter-head" style={b ? { marginTop: 'var(--space-2)' } : undefined}>
              <span>Tone fit</span>
              <span className="meter-val">{fit}</span>
            </div>
            <div className="meter">
              <span className="meter-fill" style={{ width: `${fit}%` }} />
            </div>
          </div>
        </div>
      </section>

      <div className="actions-2 pad">
        <button type="button" className="btn btn-secondary btn-tall" onClick={shuffle} disabled={options.length < 2}>
          Shuffle
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-tall"
          aria-pressed={saved}
          style={{ color: saved ? 'var(--color-accent-300)' : undefined }}
          onClick={() => toggleSaved(t.id, b?.id ?? null, 'Today')}
        >
          {saved ? 'Saved ♥' : 'Save look'}
        </button>
      </div>
      <div className="pad top-3">
        <button
          type="button"
          className={`btn btn-block btn-tall ${worn ? 'btn-secondary worn' : 'btn-primary'}`}
          aria-pressed={worn}
          onClick={() => toggleWorn(t.id, b?.id ?? null)}
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
    </>
  )
}

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
    <section className="pad top-6">
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

export function Outfit() {
  const { go, hang, tops, bots, dresses, outfit, userTone, hasTone } = useApp()
  const weather = useWeather()
  const [date] = useState(() => {
    const now = new Date()
    return `${now.toLocaleDateString('en-GB', { weekday: 'short' })} ${now.getDate()}`
  })
  const ready = hasTone && !!outfit
  // Highlight what's being worn: a top and bottom, or a dress.
  const wornTop = outfit?.b ? outfit.t : null
  const wornDress = outfit && !outfit.b ? outfit.t : null

  return (
    <>
      <header className="outfit-head">
        <div className="col">
          <h1 className="display">{date}</h1>
          <span className="sub">
            {weather.current ? `${currentLine(weather.current)} · ` : ''}
            {hasTone ? TONES[userTone].name : 'Tone not set'}
          </span>
        </div>
        {outfit && (
          <button type="button" className="btn btn-primary btn-tall glow" onClick={() => go('occasion')}>
            <Sparkle size={16} />
            Match me
          </button>
        )}
      </header>

      {!ready && <Setup />}
      {tops.length > 0 && <Strip label="Tops" cat="top" list={tops} current={wornTop} onSelect={hang} />}
      {bots.length > 0 && <Strip label="Bottoms" cat="bottom" list={bots} current={outfit?.b ?? null} onSelect={hang} />}
      {dresses.length > 0 && <Strip label="Dresses" cat="dress" list={dresses} current={wornDress} onSelect={hang} />}
      {outfit && <Fitting look={outfit} />}
    </>
  )
}
