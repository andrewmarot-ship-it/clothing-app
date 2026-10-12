import { CODES } from '../domain/occasions'
import { KINDS, KIND_LABELS, defaultKind } from '../domain/tags'
import type { Category, Kind } from '../domain/types'

/** The editable facts about a piece (colour and tone come from the photo). */
export interface Details {
  name: string
  cat: Category
  kind: Kind
  fabric: string
  f: number
  w: number
}

const WARMTH = ['Light', 'Mid', 'Warm']

export function DetailsForm({ value, onChange }: { value: Details; onChange: (d: Details) => void }) {
  const patch = (p: Partial<Details>) => onChange({ ...value, ...p })
  const setCat = (cat: Category) => patch({ cat, kind: KINDS[cat].includes(value.kind) ? value.kind : defaultKind(cat) })
  return (
    <>
      <div className="field stack-2">
        <label htmlFor="piece-name" className="kicker">
          Name
        </label>
        <input id="piece-name" className="input input-lg" value={value.name} onChange={(e) => patch({ name: e.target.value })} />
      </div>
      <div className="actions-2 gap-2" role="radiogroup" aria-label="Category">
        {(['top', 'bottom'] as Category[]).map((c) => (
          <button key={c} type="button" role="radio" aria-checked={value.cat === c} className={`btn ${value.cat === c ? 'btn-primary' : 'btn-ghost'}`} style={{ minHeight: 40 }} onClick={() => setCat(c)}>
            {c === 'top' ? 'Top' : 'Bottom'}
          </button>
        ))}
      </div>
      <div className="chips" role="radiogroup" aria-label="Type">
        {KINDS[value.cat].map((k) => (
          <button key={k} type="button" role="radio" aria-checked={value.kind === k} className={`chip ${value.kind === k ? 'is-active' : ''}`} onClick={() => patch({ kind: k })}>
            {KIND_LABELS[k]}
          </button>
        ))}
      </div>
      <div className="field stack-2">
        <label htmlFor="piece-fabric" className="kicker">
          Fabric
        </label>
        <input id="piece-fabric" className="input input-lg" value={value.fabric} onChange={(e) => patch({ fabric: e.target.value })} />
      </div>
      <div className="stack-2">
        <span className="kicker">Formality</span>
        <div className="seg-grid" role="radiogroup" aria-label="Formality">
          {CODES.map((label, i) => (
            <button key={label} type="button" role="radio" aria-checked={value.f === i + 1} className={`btn ${value.f === i + 1 ? 'btn-primary' : 'btn-ghost'}`} onClick={() => patch({ f: i + 1 })}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="stack-2">
        <span className="kicker">Warmth</span>
        <div className="seg-grid seg-grid--3" role="radiogroup" aria-label="Warmth">
          {WARMTH.map((label, i) => (
            <button key={label} type="button" role="radio" aria-checked={value.w === i + 1} className={`btn ${value.w === i + 1 ? 'btn-primary' : 'btn-ghost'}`} onClick={() => patch({ w: i + 1 })}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
