import { Kicker } from '../components/Chrome'
import { Garment } from '../components/Garment'
import { CATEGORY_LIST } from '../domain/categories'
import { galaxyLayout } from '../domain/galaxy'
import { TONES } from '../domain/tones'
import type { RatedItem } from '../domain/types'
import { useApp, type Filter } from '../state/context'
import { paletteConic } from '../state/theme'

function Row({ it, onOpen }: { it: RatedItem; onOpen: () => void }) {
  return (
    <button type="button" className="w-row" onClick={onOpen}>
      <span className="w-tile">
        <Garment item={it} stroke={2} shade={false} align="center" fit="tight" className="w-thumb" />
      </span>
      <span className="col gap-2px">
        <span className="w-name">{it.name}</span>
        <span className="meta">
          {it.colorName} · {it.fabric} · {TONES[it.tone].name}
        </span>
      </span>
      <span className={`dot7 match-dot--${it.match}`} aria-label={it.match === 'in' ? 'In your tone' : it.match === 'near' ? 'Near your tone' : 'Outside your tone'} />
    </button>
  )
}

/** Does a piece pass the current filter? */
const passes = (f: Filter, it: RatedItem) => f === 'all' || (f === 'tone' ? it.match !== 'out' : CATEGORY_LIST.find((c) => c.filter === f)?.id === it.cat)

/** The colour galaxy: each piece at its hue (angle) and saturation (distance out), you at the centre. */
function Galaxy() {
  const { state, rated, userTone, hasTone, openItem } = useApp()
  const nodes = galaxyLayout(rated.map((i) => i.color))
  const T = TONES[userTone]
  return (
    <div className="galaxy" aria-label="Your wardrobe by colour">
      <div className="galaxy-hues" aria-hidden="true" />
      <div className="galaxy-ring galaxy-ring--outer" aria-hidden="true" />
      <div className="galaxy-ring galaxy-ring--inner" aria-hidden="true" />
      <div className="galaxy-core" style={{ background: paletteConic(T.palette) }} aria-hidden="true" />
      <div className="galaxy-you" aria-hidden="true">
        <span>You</span>
        <span>{hasTone ? T.name : 'Tone not set'}</span>
      </div>
      {rated.map((it, i) => (
        <button
          key={it.id}
          type="button"
          className={`galaxy-node match-ring--${it.match}`}
          style={{ left: `${nodes[i].x}%`, top: `${nodes[i].y}%`, opacity: passes(state.filter, it) ? 1 : 0.15 }}
          aria-label={it.name}
          onClick={() => openItem(it.id)}
        >
          <Garment item={it} stroke={2} shade={false} align="center" fit="tight" className="galaxy-thumb" />
        </button>
      ))}
    </div>
  )
}

export function Spectrum() {
  const { state, set, go, rated, openItem } = useApp()
  const f = state.filter
  const byCat = CATEGORY_LIST.map((c) => ({ ...c, rows: rated.filter((i) => i.cat === c.id) }))

  let groups: { label: string; rows: RatedItem[] }[]
  let hidden = 0
  if (f === 'tone') {
    const inn = rated.filter((i) => i.match === 'in')
    const near = rated.filter((i) => i.match === 'near')
    hidden = rated.length - inn.length - near.length
    groups = [
      { label: 'In your tone', rows: inn },
      { label: 'Near your tone', rows: near },
    ].filter((g) => g.rows.length)
  } else {
    groups = byCat.filter((c) => f === 'all' || c.filter === f).map((c) => ({ label: c.plural, rows: c.rows }))
  }
  const filters: [Filter, string][] = [['all', 'All'], ['tone', 'In my tone'], ...byCat.filter((c) => c.rows.length || c.id !== 'dress').map((c): [Filter, string] => [c.filter, c.plural])]
  const counts = byCat.filter((c) => c.rows.length).map((c) => `${c.rows.length} ${(c.rows.length === 1 ? c.label : c.plural).toLowerCase()}`)

  return (
    <>
      <header className="pad top-8 col">
        <h1 className="display">Spectrum</h1>
        <span className="sub">{[`${rated.length} ${rated.length === 1 ? 'piece' : 'pieces'}`, ...counts].join(' · ')}</span>
      </header>
      {rated.length === 0 && (
        <div className="pad top-8 stack-4">
          <p className="muted body-13 pretty">Nothing on the line yet. Lay a piece flat on a plain surface, take a photo, and it lands here.</p>
          <button type="button" className="btn btn-primary btn-tall" onClick={() => go('add')}>
            Add your first piece
          </button>
        </div>
      )}
      {rated.length > 0 && (
        <>
          <Galaxy />
          <div className="pad galaxy-legend">
            <span>
              <i className="match-ring--in" /> In tone
            </span>
            <span>
              <i className="match-ring--near" /> Near
            </span>
            <span>
              <i className="match-ring--out" /> Outside
            </span>
            <span className="galaxy-key">Hue around · saturation outward</span>
          </div>
          <div className="pad top-6 chips">
            {filters.map(([v, label]) => (
              <button key={v} type="button" aria-pressed={f === v} className={`btn btn-sm ${f === v ? 'btn-primary' : 'btn-ghost'}`} onClick={() => set({ filter: v })}>
                {label}
              </button>
            ))}
          </div>
        </>
      )}
      {groups.filter((g) => g.rows.length).map((g) => (
        <section key={g.label} className="pad top-6 col">
          <div className="group-head kicker">
            <span>{g.label}</span>
            <span>{g.rows.length}</span>
          </div>
          {g.rows.map((it) => (
            <Row key={it.id} it={it} onOpen={() => openItem(it.id)} />
          ))}
        </section>
      ))}
      {hidden > 0 && (
        <div className="pad top-4 hidden-note">
          {hidden} outside your tone hidden
          <button type="button" className="btn btn-ghost btn-sm link" onClick={() => set({ filter: 'all' })}>
            Show
          </button>
        </div>
      )}
      {f === 'tone' && rated.length > 0 && groups.length === 0 && (
        <p className="pad top-4 muted">
          <Kicker>Nothing in or near your tone yet</Kicker>
        </p>
      )}
    </>
  )
}
