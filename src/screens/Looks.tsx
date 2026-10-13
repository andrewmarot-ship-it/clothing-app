import { X } from '@phosphor-icons/react'
import { Garment } from '../components/Garment'
import { lookTitle, toneFit } from '../domain/scoring'
import { useApp } from '../state/context'

export function Looks() {
  const { state, set, go, byId } = useApp()
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
      {!looks.length && <p className="pad top-8 muted body-13 pretty">Save a look from Outfit or Match me and it lands here.</p>}
      <div className="pad top-6 grid-2">
        {looks.map((l) => (
          <article key={l.id} className="card look-card pop">
            <div className="look-figure">
              {l.b ? (
                <>
                  <Garment item={l.t} stroke={1} className="look-top" />
                  <Garment item={l.b} stroke={1} className="look-bot" align="center" />
                </>
              ) : (
                <Garment item={l.t} stroke={1} className="look-dress" align="center" />
              )}
            </div>
            <div className="col gap-2px">
              <span className="w-name">{lookTitle(l.t, l.b)}</span>
              <span className="meta">
                {l.occ} · Fit {toneFit(l.t, l.b)}
              </span>
            </div>
            <div className="look-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => go('outfit', l.b ? { topId: l.t.id, botId: l.b.id } : { topId: l.t.id })}>
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
    </>
  )
}
