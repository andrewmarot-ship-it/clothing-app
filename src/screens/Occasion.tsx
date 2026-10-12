import { Sparkle } from '@phosphor-icons/react'
import { BackRow, Kicker } from '../components/Chrome'
import { CHIPS, CODES, PRESETS, occasionFor, parseOccasion } from '../domain/occasions'
import { TONES } from '../domain/tones'
import type { DressCode } from '../domain/types'
import { useApp } from '../state/context'

export function Occasion() {
  const { state, set, go, userTone, rated } = useApp()
  const occ = occasionFor(state.occKey, state.occText)
  const code = state.code ?? occ.code

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
        <Kicker className="kicker-pad">What we picked up · {occ.label}</Kicker>
        {[
          ['When', occ.when],
          ['Setting', occ.setting],
          ['Weather', occ.weather],
        ].map(([k, v]) => (
          <div key={k} className="kv-row" style={{ gridTemplateColumns: '84px minmax(0,1fr)' }}>
            <span className="kv-key">{k}</span>
            <span>{v}</span>
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
        <button type="button" className="btn btn-primary btn-block btn-tall glow" onClick={() => go('match', { lookI: 0 })}>
          <Sparkle size={16} />
          Find my outfit
        </button>
        <span className="hint">
          Uses your {TONES[userTone].name} profile and the {rated.length} pieces you own
        </span>
      </div>
    </>
  )
}
