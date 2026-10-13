import { Heart, MapPin, Sparkle } from '@phosphor-icons/react'
import { CHIPS, CHIP_LABELS, CODES, PRESETS, parseOccasion } from '../domain/occasions'
import { describe, lookTitle, toneFit, type Look } from '../domain/scoring'
import type { DressCode } from '../domain/types'
import { useApp } from '../state/context'
import { fx } from '../state/feedback'
import { useOccasion } from '../state/useOccasion'
import { askForLocation } from '../state/weather'
import { useOccasionReading } from '../state/useOccasionReading'

/** Cast, step 1: what's it for? Typed text (read by Claude when signed in), quick chips and the dress code. */
export function CastAsk({ onCast }: { onCast: () => void }) {
  const { state, set, rated } = useApp()
  const { occ, source, weather } = useOccasion()
  const reading = useOccasionReading()
  const code = state.code ?? occ.code
  const summary = [occ.when, occ.setting, occ.weather].filter(Boolean).join(' · ')
  return (
    <div className="stack-4">
      <h2 className="sheet-title">Dress me for…</h2>
      <textarea
        className="input occ-input"
        aria-label="Describe the occasion"
        rows={2}
        placeholder="Work holiday party, Friday evening"
        value={state.occText}
        onChange={(e) => set({ occText: e.target.value, occKey: parseOccasion(e.target.value), code: null })}
      />
      <div className="chips">
        {CHIPS.map((k) => (
          <button
            key={k}
            type="button"
            className={`chip ${state.occKey === k ? 'is-active' : ''}`}
            aria-pressed={state.occKey === k}
            onClick={() => set({ occText: PRESETS[k].label, occKey: k, code: null })}
          >
            {CHIP_LABELS[k]}
          </button>
        ))}
      </div>
      <span className={`cast-summary ${reading ? 'is-reading' : ''}`}>
        {reading ? 'Reading your occasion…' : summary}
        {!reading && source === 'claude' && <Sparkle size={11} className="kicker-spark" aria-label="Read by Claude" />}
      </span>
      {weather.status === 'off' && (
        <button type="button" className="btn btn-ghost btn-sm weather-ask" onClick={askForLocation}>
          <MapPin size={14} />
          Add your location for weather
        </button>
      )}
      {weather.status === 'denied' && <span className="meta">Location is off. Allow it in your browser for weather</span>}
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
      <button type="button" className="btn btn-primary btn-block btn-tall glow" disabled={!rated.length} onClick={onCast}>
        <Sparkle size={16} />
        Cast my look
      </button>
    </div>
  )
}

/** Cast, step 2: the look the rings landed on, and why. Hidden while the rings are still spinning. */
export function CastResult({ looks, casting, onSpinAgain, onWear }: { looks: Look[]; casting: boolean; onSpinAgain: () => void; onWear: () => void }) {
  const { state, rated, userTone, isSaved, toggleSaved } = useApp()
  const { occ } = useOccasion()
  const code = state.code ?? occ.code
  const n = looks.length
  const i = n ? state.lookI % n : 0
  const look = looks[i]
  if (!look) return <p className="muted body-13">Add a top and a bottom, or a dress, to cast a look.</p>
  const { t, b } = look
  const saved = isSaved(t.id, b?.id ?? null)
  const cap = (x = '') => x.charAt(0).toUpperCase() + x.slice(1)
  const tags = [CODES[code - 1], cap(occ.when.split(' · ').pop()), occ.setting.split(',')[0]]

  return (
    <div className="stack-4">
      {casting && <span className="cast-casting">Casting from your {rated.length} pieces…</span>}
      <div className={`cast-result ${casting ? 'is-hidden' : ''}`}>
        <span className="meta-12">
          For {occ.label} · look {i + 1} of {n}
        </span>
        <div className="title-row">
          <h2 className="cast-title">{lookTitle(t, b)}</h2>
          <div className="score">
            <span className="cast-fit">{toneFit(t, b)}</span>
            <span className="score-cap">Tone fit</span>
          </div>
        </div>
        <div className="tags">
          {!b && <span className="tag tag-accent">Dress</span>}
          {tags.map((tag) => (
            <span key={tag} className="tag tag-neutral">
              {tag}
            </span>
          ))}
        </div>
        <div className="stack-3 top-4">
          {describe(t, b, occ, code, userTone).map((r) => (
            <div key={r.k} className="reason">
              <span className="reason-key">{r.k}</span>
              <span className="reason-val">{r.v}</span>
            </div>
          ))}
        </div>
        <div className="stack-2 top-4">
          <span className="kicker">Finish it with</span>
          <div className="chips">
            {occ.finish.map(([name, color]) => (
              <span key={name} className="pill">
                <span className="pill-dot" style={{ background: color }} />
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="cast-actions">
        <button type="button" className="btn btn-secondary btn-tall" disabled={casting || n < 2} onClick={onSpinAgain}>
          Spin again
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-icon btn-tall"
          aria-label={saved ? 'Unsave look' : 'Save look'}
          aria-pressed={saved}
          disabled={casting}
          style={{ color: saved ? 'var(--color-accent-300)' : undefined }}
          onClick={() => {
            fx('peg')
            toggleSaved(t.id, b?.id ?? null, occ.label)
          }}
        >
          <Heart size={18} weight={saved ? 'fill' : 'regular'} />
        </button>
        <button type="button" className="btn btn-primary btn-tall" disabled={casting} onClick={onWear}>
          Wear it
        </button>
      </div>
    </div>
  )
}
