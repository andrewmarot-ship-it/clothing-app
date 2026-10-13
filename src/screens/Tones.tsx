import { BackRow, Kicker } from '../components/Chrome'
import { SEASONS, TONES } from '../domain/tones'
import { useApp } from '../state/context'

export function Tones() {
  const { go, userTone } = useApp()
  return (
    <>
      <BackRow label="Aura" onBack={() => go('profile')} />
      <div className="pad top-6 stack-2">
        <h1 className="title">All 12 tones</h1>
        <span className="sub">Neighbouring tones share colours, so “near” pieces still work.</span>
      </div>
      <div className="pad top-6 stack-6">
        {SEASONS.map((season) => (
          <section key={season} className="stack-2">
            <Kicker>{season}</Kicker>
            <div className="grid-3">
              {TONES.map((t, i) => ({ t, i }))
                .filter(({ t }) => t.season === season)
                .map(({ t, i }) => (
                  <button
                    key={t.name}
                    type="button"
                    aria-pressed={i === userTone}
                    className={`tone-tile ${i === userTone ? 'is-on' : ''}`}
                    onClick={() => go('profile', { tone: i })}
                  >
                    <span className="tone-sw">
                      {t.palette.slice(0, 4).map((c) => (
                        <span key={c} style={{ background: c }} />
                      ))}
                    </span>
                    <span>{t.name}</span>
                  </button>
                ))}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
