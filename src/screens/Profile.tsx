import { CaretRight } from '@phosphor-icons/react'
import { Kicker } from '../components/Chrome'
import { TONES, chromaLabel, hueLabel, toneDesc, valueLabel } from '../domain/tones'
import { useApp } from '../state/context'

const pos = (x: number) => `${Math.round(x * 84 + 8)}%`

export function Profile() {
  const { go, userTone, rated } = useApp()
  const T = TONES[userTone]
  const nIn = rated.filter((i) => i.match === 'in').length
  const nNear = rated.filter((i) => i.match === 'near').length
  const nOut = rated.length - nIn - nNear

  const dims = [
    { k: 'Hue', v: hueLabel(T.t), a: 'Cool', b: 'Warm', pos: pos((T.t + 1) / 2), track: 'linear-gradient(90deg, #6f86b8, var(--color-neutral-600), #c98a4b)' },
    { k: 'Value', v: valueLabel(T.v), a: 'Light', b: 'Dark', pos: pos(T.v), track: 'linear-gradient(90deg, var(--color-neutral-200), var(--color-neutral-900))' },
    { k: 'Chroma', v: chromaLabel(T.c), a: 'Soft', b: 'Bright', pos: pos(T.c), track: 'linear-gradient(90deg, #9c8f84, #e2683a)' },
  ]

  return (
    <>
      <header className="pad top-8 col">
        <Kicker>Colour profile · TCI 12 Tones</Kicker>
        <h1 className="tone-hero top-3">{T.name}</h1>
        <span className="sub">{toneDesc(T)}</span>
      </header>
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
      <div className="pad top-6 stack-3">
        <div className="spread kicker">
          <span>Wardrobe fit</span>
          <span>{rated.length} pieces</span>
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
