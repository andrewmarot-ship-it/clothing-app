import { Kicker } from '../components/Chrome'
import { Garment } from '../components/Garment'
import { TONES } from '../domain/tones'
import type { RatedItem } from '../domain/types'
import { useApp, type Filter } from '../state/context'

const FILTERS: [Filter, string][] = [
  ['all', 'All'],
  ['tone', 'In my tone'],
  ['tops', 'Tops'],
  ['bottoms', 'Bottoms'],
]

function Row({ it, onOpen }: { it: RatedItem; onOpen: () => void }) {
  return (
    <button type="button" className="w-row" onClick={onOpen}>
      <span className="w-tile">
        <Garment item={it} stroke={2} shade={false} align="center" className="w-thumb" />
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

export function Wardrobe() {
  const { state, set, go, rated, tops, bots, openItem } = useApp()
  const f = state.filter

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
  } else if (f === 'all') {
    groups = [
      { label: 'Tops', rows: tops },
      { label: 'Bottoms', rows: bots },
    ]
  } else {
    groups = [f === 'tops' ? { label: 'Tops', rows: tops } : { label: 'Bottoms', rows: bots }]
  }

  return (
    <>
      <header className="pad top-8 col">
        <h1 className="display">Wardrobe</h1>
        <span className="sub">
          {rated.length} pieces · {tops.length} tops · {bots.length} bottoms
        </span>
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
        <div className="pad top-6 chips">
          {FILTERS.map(([v, label]) => (
            <button key={v} type="button" aria-pressed={f === v} className={`btn btn-sm ${f === v ? 'btn-primary' : 'btn-ghost'}`} onClick={() => set({ filter: v })}>
              {label}
            </button>
          ))}
        </div>
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
