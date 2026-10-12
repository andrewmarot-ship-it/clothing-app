import { CaretLeft, CaretRight, Check, Sparkle } from '@phosphor-icons/react'
import { useState } from 'react'
import { Garment, Line } from '../components/Garment'
import { itemMatch } from '../components/match'
import { useSwipe } from '../components/useSwipe'
import { contrastLabel, toneFit } from '../domain/scoring'
import { TONES } from '../domain/tones'
import type { RatedItem } from '../domain/types'
import { useApp } from '../state/context'

function Strip({ label, list, current, onSelect }: { label: string; list: RatedItem[]; current: RatedItem; onSelect: (id: string) => void }) {
  const n = list.length
  const idx = Math.max(0, list.findIndex((i) => i.id === current.id))
  const step = n > 1 ? 86 / (n - 1) : 0
  const select = (i: number) => onSelect(list[(i + n) % n].id)
  const swipe = useSwipe((dir) => select(idx + dir))

  return (
    <section className="strip">
      <div className="strip-head">
        <span className="kicker">
          {label} · {idx + 1} / {n}
        </span>
        <div className="strip-nav">
          <button type="button" className="btn btn-ghost btn-icon" aria-label={`Previous ${label.toLowerCase()}`} onClick={() => select(idx - 1)}>
            <CaretLeft size={16} />
          </button>
          <button type="button" className="btn btn-ghost btn-icon" aria-label={`Next ${label.toLowerCase()}`} onClick={() => select(idx + 1)}>
            <CaretRight size={16} />
          </button>
        </div>
      </div>
      <div className="strip-line" {...swipe}>
        <Line style={{ top: 6 }} />
        {list.map((it, i) => {
          const sel = i === idx
          const w = sel ? 58 : 30
          const y = 12 + Math.sin(Math.PI * (n > 1 ? i / (n - 1) : 0.5)) * 5
          return (
            <button
              key={it.id}
              type="button"
              aria-label={it.name}
              aria-pressed={sel}
              className="hanging"
              onClick={() => select(i)}
              style={{ left: `${7 + i * step}%`, top: y, width: w, height: w, marginLeft: -w / 2, opacity: sel ? 1 : 0.55 }}
            >
              <span className="hanging-pin" style={{ background: sel ? 'var(--color-accent)' : 'var(--color-neutral-500)' }} />
              <Garment item={it} stroke={1.2} className="fill" />
              <span className={`hanging-dot match-dot--${it.match}`} />
            </button>
          )
        })}
      </div>
    </section>
  )
}

function Fitting({ top, bot }: { top: RatedItem; bot: RatedItem }) {
  const { set, tops, bots, isSaved, toggleSaved, openItem, wornToday, toggleWorn } = useApp()
  const dl = Math.abs(top.L - bot.L)
  const fit = toneFit(top, bot)
  const saved = isSaved(top.id, bot.id)
  const worn = wornToday(top.id, bot.id)

  const shuffle = () => {
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
    let t: RatedItem, b: RatedItem
    do {
      t = pick(tops)
      b = pick(bots)
    } while (t.id === top.id && b.id === bot.id && tops.length * bots.length > 1)
    set({ topId: t.id, botId: b.id })
  }

  return (
    <>
      <section className="fitting pad">
        <div className="fitting-figure">
          <Garment item={top} className="fitting-top" />
          <Garment item={bot} className="fitting-bot" align="center" />
        </div>
        <div className="fitting-info">
          {[top, bot].map((p) => {
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
            <div className="meter-head">
              <span>Contrast</span>
              <span className="meter-val">{contrastLabel(top, bot)}</span>
            </div>
            <div className="meter meter--contrast">
              <span className="meter-mark" style={{ left: `${Math.min(96, Math.round((dl / 0.6) * 100))}%` }} />
            </div>
            <div className="meter-head" style={{ marginTop: 'var(--space-2)' }}>
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
        <button type="button" className="btn btn-secondary btn-tall" onClick={shuffle}>
          Shuffle
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-tall"
          aria-pressed={saved}
          style={{ color: saved ? 'var(--color-accent-300)' : undefined }}
          onClick={() => toggleSaved(top.id, bot.id, 'Today')}
        >
          {saved ? 'Saved ♥' : 'Save look'}
        </button>
      </div>
      <div className="pad top-3">
        <button
          type="button"
          className={`btn btn-block btn-tall ${worn ? 'btn-secondary worn' : 'btn-primary'}`}
          aria-pressed={worn}
          onClick={() => toggleWorn(top.id, bot.id)}
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

/** First-run checklist: a tone, then at least one top and one bottom. */
function Setup() {
  const { go, hasTone, tops, bots } = useApp()
  const steps = [
    { done: hasTone, label: 'Find your colour tone', hint: 'Three quick questions', on: () => go('quiz', { quizStep: 0, quiz: [null, null, null] }) },
    { done: tops.length > 0, label: 'Add a top', hint: 'Lay it flat and take a photo', on: () => go('add') },
    { done: bots.length > 0, label: 'Add a bottom', hint: 'Jeans, trousers, a skirt…', on: () => go('add') },
  ]
  const fresh = !steps.some((st) => st.done)
  return (
    <section className="pad top-6">
      <div className="card setup">
        <span className="card-kicker">{fresh ? 'Welcome to Clothesline' : 'Almost there'}</span>
        <span className="setup-title">{fresh ? 'Set up your line in three steps' : 'Finish setting up to start matching'}</span>
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
  const { go, set, tops, bots, top, bot, userTone, hasTone } = useApp()
  const [date] = useState(() => {
    const now = new Date()
    return `${now.toLocaleDateString('en-GB', { weekday: 'short' })} ${now.getDate()}`
  })
  const ready = hasTone && !!top && !!bot

  return (
    <>
      <header className="outfit-head">
        <div className="col">
          <h1 className="display">{date}</h1>
          <span className="sub">17° overcast · {hasTone ? TONES[userTone].name : 'Tone not set'}</span>
        </div>
        {top && bot && (
          <button type="button" className="btn btn-primary btn-tall glow" onClick={() => go('occasion')}>
            <Sparkle size={16} />
            Match me
          </button>
        )}
      </header>

      {!ready && <Setup />}
      {top && <Strip label="Tops" list={tops} current={top} onSelect={(id) => set({ topId: id })} />}
      {bot && <Strip label="Bottoms" list={bots} current={bot} onSelect={(id) => set({ botId: id })} />}
      {top && bot && <Fitting top={top} bot={bot} />}
    </>
  )
}
