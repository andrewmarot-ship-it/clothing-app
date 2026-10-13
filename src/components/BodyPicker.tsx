import type { Shape } from '../domain/categories'
import type { RatedItem } from '../domain/types'
import { useApp } from '../state/context'
import { fx } from '../state/feedback'
import { shapesAvailable } from '../state/outfit'
import { Garment } from './Garment'
import { SwitchRow } from './Switch'

/** "What's in the outfit?": separates or a dress, and whether Cast may choose for each occasion. */
export function BodyPicker() {
  const { state, set, rated } = useApp()
  const can = shapesAvailable(rated)
  const first = (cat: RatedItem['cat'], id: string | null) => rated.find((i) => i.id === id && i.cat === cat) ?? rated.find((i) => i.cat === cat)
  const top = first('top', state.topId)
  const bot = first('bottom', state.botId)
  const dress = first('dress', state.dressId)
  const auto = state.bodyPref === 'auto'

  const choose = (shape: Shape) => {
    if (!can[shape]) return
    if (shape !== state.shape) fx('peg')
    set({ shape, bodyPref: auto ? 'auto' : shape })
  }

  return (
    <div className="stack-4">
      <h2 className="sheet-title">What’s in the outfit?</h2>
      <div className="body-cards" role="radiogroup" aria-label="Outfit shape">
        <button type="button" role="radio" aria-checked={state.shape === 'separates'} className="body-card" disabled={!can.separates} onClick={() => choose('separates')}>
          <span className="body-mini">
            {top && <Garment item={top} className="body-mini-top" shade={false} stroke={1} />}
            {bot && <Garment item={bot} className="body-mini-bot" shade={false} stroke={1} align="center" />}
          </span>
          <span className="body-card-label">Separates</span>
          <span className="meta">{can.separates ? 'A top and a bottom' : 'Add a top and a bottom'}</span>
        </button>
        <button type="button" role="radio" aria-checked={state.shape === 'dress'} className="body-card" disabled={!can.dress} onClick={() => choose('dress')}>
          <span className="body-mini">{dress && <Garment item={dress} className="body-mini-dress" shade={false} stroke={1} align="center" />}</span>
          <span className="body-card-label">Dress</span>
          <span className="meta">{can.dress ? 'One piece' : 'Add a dress to use this'}</span>
        </button>
      </div>
      <SwitchRow
        label="Let Cast choose the shape"
        hint="Weighs a dress against separates for each occasion"
        checked={auto}
        onChange={(on) => set({ bodyPref: on ? 'auto' : state.shape })}
      />
    </div>
  )
}
