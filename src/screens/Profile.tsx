import { CaretRight, X } from '@phosphor-icons/react'
import { useState } from 'react'
import { Kicker } from '../components/Chrome'
import { AccountCard } from '../components/SignIn'
import { Garment } from '../components/Garment'
import type { RatedItem } from '../domain/types'
import { TONES, chromaLabel, hueLabel, toneDesc, valueLabel, type Tone } from '../domain/tones'
import { useApp } from '../state/context'
import { useThemePref, type ThemePref } from '../state/theme'

const pos = (x: number) => `${Math.round(x * 84 + 8)}%`

export function Profile() {
  const { state, set, go, userTone, hasTone, rated } = useApp()
  const T = TONES[userTone]
  const [cutoff] = useState(() => new Date(Date.now() - 30 * 864e5).toLocaleDateString('en-CA'))

  // Wear: most worn, and pieces not worn in the last 30 days (never-worn first).
  const lastWorn = new Map<string, string>()
  for (const w of state.wearLog)
    for (const id of [w.topId, w.botId]) if ((lastWorn.get(id) ?? '') < w.date) lastWorn.set(id, w.date)
  const mostWorn = [...rated].filter((i) => i.wears > 0).sort((a, b) => b.wears - a.wears).slice(0, 3)
  const waiting = rated
    .filter((i) => (lastWorn.get(i.id) ?? '') < cutoff)
    .sort((a, b) => (lastWorn.get(a.id) ?? '').localeCompare(lastWorn.get(b.id) ?? '') || a.wears - b.wears)
    .slice(0, 3)
  const nIn = rated.filter((i) => i.match === 'in').length
  const nNear = rated.filter((i) => i.match === 'near').length
  const nOut = rated.length - nIn - nNear

  return (
    <>
      <header className="pad top-8 col">
        <Kicker>Colour profile · TCI 12 Tones</Kicker>
        <h1 className="tone-hero top-3">{hasTone ? T.name : 'Not set yet'}</h1>
        <span className="sub">{hasTone ? toneDesc(T) : 'Your tone decides which colours count as yours. It takes three questions.'}</span>
        {!hasTone && (
          <button type="button" className="btn btn-primary btn-tall glow top-4" onClick={() => go('quiz', { quizStep: 0, quiz: [null, null, null] })}>
            Find your tone
          </button>
        )}
      </header>
      <AccountCard />
      {hasTone && <ToneDetail tone={T} />}
      {hasTone && rated.length > 0 && <WardrobeFit nIn={nIn} nNear={nNear} nOut={nOut} />}
      {state.myColours.length > 0 && (
        <section className="pad top-6 stack-3">
          <div className="spread kicker">
            <span>Your colours</span>
            <span>{state.myColours.length}</span>
          </div>
          <span className="meta">Pieces close to these count as in your tone. Tap one to remove it.</span>
          <div className="my-colours">
            {state.myColours.map((c) => (
              <button key={c} type="button" className="my-colour" style={{ background: c }} aria-label={`Remove ${c} from your colours`} onClick={() => set((s) => ({ myColours: s.myColours.filter((x) => x !== c) }))}>
                <X size={12} weight="bold" />
              </button>
            ))}
          </div>
        </section>
      )}
      {mostWorn.length > 0 && <WearList title="Most worn" items={mostWorn} detail={(i) => `${i.wears}×`} onOpen={(id) => go('item', { itemId: id })} />}
      {waiting.length > 0 && state.wearLog.length > 0 && (
        <WearList
          title="Waiting to be worn"
          items={waiting}
          detail={(i) => (lastWorn.has(i.id) ? `last ${new Date(`${lastWorn.get(i.id)}T12:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'not yet')}
          onOpen={(id) => go('item', { itemId: id })}
        />
      )}
      <Appearance />
      <div className="pad top-6 col">
        <button type="button" className="link-row" onClick={() => go('quiz', { quizStep: 0, quiz: [null, null, null] })}>
          <span>Find your tone in 3 questions</span>
          <CaretRight size={14} className="muted" />
        </button>
        <button type="button" className="link-row" onClick={() => go('tones')}>
          <span>Choose from all 12 tones</span>
          <CaretRight size={14} className="muted" />
        </button>
      </div>
    </>
  )
}

const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Match device' },
]

/** Light (Linen) or dark (Nocturne). Kept on this device only. */
function Appearance() {
  const [theme, setTheme] = useThemePref()
  return (
    <section className="pad top-6 stack-3">
      <span className="kicker">Appearance</span>
      <div className="seg-grid seg-grid--3" role="radiogroup" aria-label="Appearance">
        {THEMES.map((t) => (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={theme === t.value}
            className={`btn ${theme === t.value ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTheme(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </section>
  )
}

function WearList({ title, items, detail, onOpen }: { title: string; items: RatedItem[]; detail: (i: RatedItem) => string; onOpen: (id: string) => void }) {
  return (
    <section className="pad top-6 col">
      <span className="kicker kicker-pad">{title}</span>
      {items.map((i) => (
        <button key={i.id} type="button" className="w-row" onClick={() => onOpen(i.id)}>
          <span className="w-tile">
            <Garment item={i} stroke={2} shade={false} align="center" className="w-thumb" />
          </span>
          <span className="w-name">{i.name}</span>
          <span className="meta">{detail(i)}</span>
        </button>
      ))}
    </section>
  )
}

function ToneDetail({ tone: T }: { tone: Tone }) {
  const dims = [
    { k: 'Hue', v: hueLabel(T.t), a: 'Cool', b: 'Warm', pos: pos((T.t + 1) / 2), track: 'linear-gradient(90deg, #6f86b8, var(--color-neutral-600), #c98a4b)' },
    { k: 'Value', v: valueLabel(T.v), a: 'Light', b: 'Dark', pos: pos(T.v), track: 'linear-gradient(90deg, #e4e7f5, #292b31)' },
    { k: 'Chroma', v: chromaLabel(T.c), a: 'Soft', b: 'Bright', pos: pos(T.c), track: 'linear-gradient(90deg, #9c8f84, #e2683a)' },
  ]
  return (
    <>
      <div className="pad top-6 palette" aria-label={`${T.name} palette`}>
        {T.palette.map((c) => (
          <span key={c} style={{ background: c }} />
        ))}
      </div>
      <div className="pad top-8 stack-4">
        {dims.map((d) => (
          <div key={d.k} className="stack-2">
            <div className="spread body-12">
              <span>{d.k}</span>
              <span className="muted-400">{d.v}</span>
            </div>
            <div className="dim-track" style={{ background: d.track }}>
              <span className="dim-marker" style={{ left: d.pos }} />
            </div>
            <div className="spread dim-ends">
              <span>{d.a}</span>
              <span>{d.b}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function WardrobeFit({ nIn, nNear, nOut }: { nIn: number; nNear: number; nOut: number }) {
  return (
    <div className="pad top-6 stack-3">
      <div className="spread kicker">
        <span>Wardrobe fit</span>
        <span>{nIn + nNear + nOut} pieces</span>
      </div>
      <div className="fit-bar" aria-hidden="true">
        <span style={{ flex: nIn, background: 'var(--color-accent)' }} />
        <span style={{ flex: nNear, background: 'var(--color-neutral-500)' }} />
        <span style={{ flex: nOut, background: 'var(--color-neutral-800)' }} />
      </div>
      <div className="fit-counts">
        <span>
          <b>{nIn}</b> in tone
        </span>
        <span>
          <b>{nNear}</b> near
        </span>
        <span>
          <b>{nOut}</b> outside
        </span>
      </div>
    </div>
  )
}
