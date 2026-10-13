import { X } from '@phosphor-icons/react'
import { Garment, Line, Pins } from '../components/Garment'
import { pegsFor } from '../domain/frame'
import { lookTitle, toneFit } from '../domain/scoring'
import { useApp } from '../state/context'
import { fx } from '../state/feedback'
import { glowFill, outfitColour, useGlowPref } from '../state/theme'

/** Saved looks as a swipeable row of cards, each glowing with its own colours. */
export function Looks() {
  const { state, set, go, byId, wear } = useApp()
  const [glow] = useGlowPref()
  const looks = state.saved.flatMap((l) => {
    const t = byId(l.topId)
    const b = l.botId ? byId(l.botId) : null
    // A dress look has no bottom; a missing bottom means the look is broken.
    return t && b !== undefined ? [{ ...l, t, b }] : []
  })

  return (
    <>
      <header className="pad top-8 col">
        <h1 className="display">Looks</h1>
        <span className="sub">{looks.length} saved</span>
      </header>
      {!looks.length && <p className="pad top-8 muted body-13 pretty">Save a look from the stage or a cast and it lands here.</p>}
      {looks.length > 0 && (
        <div className="look-carousel" aria-label="Saved looks">
          {looks.map((l) => (
            <article key={l.id} className="look-card pop">
              <div className="look-stage">
                <div className="look-glow" style={{ background: glowFill(glow, outfitColour(l.t.color, l.b?.color), 70) }} aria-hidden="true" />
                <Line sag={18} width={1.1} style={{ top: 6 }} />
                {l.b ? (
                  <>
                    <div className="look-top">
                      <Pins inset={pegsFor(l.t, 1)} />
                      <Garment item={l.t} className="fill" />
                    </div>
                    <Garment item={l.b} className="look-bot" align="top" />
                  </>
                ) : (
                  <div className="look-dress">
                    <Pins inset={pegsFor(l.t, 260 / 150)} height="6%" />
                    <Garment item={l.t} className="fill" />
                  </div>
                )}
              </div>
              <div className="col gap-2px">
                <span className="look-title">{lookTitle(l.t, l.b)}</span>
                <span className="meta">
                  {l.occ} · Fit {toneFit(l.t, l.b)}
                </span>
              </div>
              <div className="look-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    fx('peg')
                    wear(l.t.id, l.b?.id ?? null)
                    go('outfit')
                  }}
                >
                  Wear
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  aria-label={`Remove ${lookTitle(l.t, l.b)}`}
                  onClick={() => set((s) => ({ saved: s.saved.filter((x) => x.id !== l.id) }))}
                >
                  <X size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
