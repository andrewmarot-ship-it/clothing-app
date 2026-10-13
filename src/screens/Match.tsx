import { Heart } from '@phosphor-icons/react'
import { BackRow, Kicker } from '../components/Chrome'
import { Garment, Line, Pins } from '../components/Garment'
import { itemMatch } from '../components/match'
import { useSwipe } from '../components/useSwipe'
import { CODES } from '../domain/occasions'
import { useOccasion } from '../state/useOccasion'
import { describe, lookTitle, rankLooks, toneFit } from '../domain/scoring'
import { useApp } from '../state/context'
import { fx } from '../state/feedback'
import { glowFill, outfitColour, useGlowPref } from '../state/theme'

export function Match() {
  const { state, set, go, rated, userTone, isSaved, toggleSaved } = useApp()
  const { occ } = useOccasion()
  const [glow] = useGlowPref()
  const code = state.code ?? occ.code
  const looks = rankLooks(rated, occ, code)
  const n = looks.length
  const i = n ? state.lookI % n : 0
  const look = looks[i]
  const swipe = useSwipe((dir) => {
    fx('tick')
    set({ lookI: (i + dir + n) % n })
  }, 40)

  const back = <BackRow label="Occasion" onBack={() => go('occasion')} right={n ? `Look ${i + 1} of ${n}` : undefined} />
  if (!look) {
    return (
      <>
        {back}
        <p className="pad top-8 muted">Add a top and a bottom, or a dress, to get a match.</p>
      </>
    )
  }

  const { t, b } = look
  const tm = itemMatch(t)
  const bm = b && itemMatch(b)
  const saved = isSaved(t.id, b?.id ?? null)
  const cap = (x = '') => x.charAt(0).toUpperCase() + x.slice(1)
  const tags = [CODES[code - 1], cap(occ.when.split(' · ').pop()), occ.setting.split(',')[0]]

  return (
    <>
      {back}
      <div className="pad top-4 stack-2">
        <div className="pips" aria-hidden="true">
          {looks.map((_, j) => (
            <span key={j} className={j === i ? 'is-active' : ''} />
          ))}
        </div>
        <Kicker className="top-3">For · {occ.label}</Kicker>
        <div className="title-row">
          <h1 className="title">{lookTitle(t, b)}</h1>
          <div className="score">
            <span className="score-num">{toneFit(t, b)}</span>
            <span className="score-cap">Tone fit</span>
          </div>
        </div>
        <div className="tags">
          {tags.map((tag) => (
            <span key={tag} className="tag tag-neutral">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="stage stage--match" {...swipe}>
        <div className="glow-bg" style={{ background: glowFill(glow, outfitColour(t.color, b?.color), 70), opacity: 0.85 }} />
        <Line sag={22} width={1.2} style={{ top: 0 }} />
        <div className={b ? 'match-top' : 'match-dress'}>
          <Pins inset={b ? '28%' : '34%'} />
          <Garment item={t} className="fill" />
        </div>
        {b && <Garment item={b} className="match-bot" align="center" />}
        <div className={`callout callout--right ${b ? '' : 'callout--dress'}`}>
          <span className="callout-rule" />
          <span className="callout-text">
            <span className="strong">{t.name}</span>
            <span style={{ color: tm.color }}>{tm.short}</span>
          </span>
        </div>
        {b && bm && (
          <div className="callout callout--left">
            <span className="callout-rule" />
            <span className="callout-text">
              <span className="strong">{b.name}</span>
              <span style={{ color: bm.color }}>{bm.short}</span>
            </span>
          </div>
        )}
      </div>

      <div className="pad top-4 stack-3">
        {describe(t, b, occ, code, userTone).map((r) => (
          <div key={r.k} className="reason">
            <span className="reason-key">{r.k}</span>
            <span className="reason-val">{r.v}</span>
          </div>
        ))}
      </div>

      <div className="pad top-6 stack-2">
        <Kicker>Finish it with</Kicker>
        <div className="chips">
          {occ.finish.map(([name, color]) => (
            <span key={name} className="pill">
              <span className="pill-dot" style={{ background: color }} />
              {name}
            </span>
          ))}
        </div>
      </div>

      <div className="pad top-8 match-actions">
        <button
          type="button"
          className="btn btn-secondary btn-icon btn-tall"
          aria-label={saved ? 'Unsave look' : 'Save look'}
          aria-pressed={saved}
          style={{ color: saved ? 'var(--color-accent-300)' : undefined }}
          onClick={() => {
            fx('peg')
            toggleSaved(t.id, b?.id ?? null, occ.label)
          }}
        >
          <Heart size={18} weight={saved ? 'fill' : 'regular'} />
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-tall"
          onClick={() => {
            fx('tick')
            set({ lookI: (i + 1) % n })
          }}
        >
          Another look
        </button>
        <button type="button" className="btn btn-primary btn-tall" onClick={() => {
            fx('match')
            go('outfit', b ? { topId: t.id, botId: b.id } : { topId: t.id })
          }}>
          Hang this look
        </button>
      </div>
    </>
  )
}
