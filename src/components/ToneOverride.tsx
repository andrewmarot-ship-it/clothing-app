import { CaretDown, Check } from '@phosphor-icons/react'
import { useState } from 'react'
import { colourDistance } from '../domain/color'
import { PALETTE_MATCH_DISTANCE, rate } from '../domain/scoring'
import { TONES } from '../domain/tones'
import type { Match, RatedItem } from '../domain/types'
import { useApp } from '../state/context'
import { itemMatch, matchInfo } from './match'

const CHOICES: { value: Match; label: string }[] = [
  { value: 'in', label: 'In tone' },
  { value: 'near', label: 'Near' },
  { value: 'out', label: 'Outside' },
]

/**
 * The piece's tone rating, which the user can overrule: they can see how a
 * colour looks on them better than the classifier can. Optionally adds the
 * colour to their own palette so similar pieces count too.
 */
export function ToneOverride({ item }: { item: RatedItem }) {
  const { state, set, userTone, updateItem } = useApp()
  const [open, setOpen] = useState(false)
  const m = itemMatch(item)

  // What the app would say without the user's call on this piece.
  const auto = rate([{ ...item, matchOverride: undefined }], userTone, state.myColours)[0]
  const autoInfo = matchInfo(auto.match, TONES[item.tone].name)
  const inPalette = state.myColours.some((c) => colourDistance(c, item.color) < PALETTE_MATCH_DISTANCE)
  const ownColour = state.myColours.includes(item.color)

  const choose = (value: Match | undefined) => updateItem(item.id, { matchOverride: value })
  const toggleColour = () =>
    set((s) => ({ myColours: ownColour ? s.myColours.filter((c) => c !== item.color) : [...s.myColours, item.color] }))

  return (
    <div className="tone-override">
      <button type="button" className="match-row match-toggle" style={{ color: m.color }} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className={`dot7 match-dot--${item.match}`} />
        {m.label}
        <span className="match-change">
          Change <CaretDown size={12} style={{ transform: open ? 'rotate(180deg)' : undefined }} />
        </span>
      </button>
      {open && (
        <div className="override-panel pop">
          <span className="meta">You can see how it looks on you better than we can.</span>
          <div className="seg-grid" role="radiogroup" aria-label="How does this colour suit you?">
            {CHOICES.map((c) => (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={item.matchOverride === c.value}
                className={`btn ${item.matchOverride === c.value ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => choose(c.value)}
              >
                {c.label}
              </button>
            ))}
            <button
              type="button"
              role="radio"
              aria-checked={!item.matchOverride}
              className={`btn ${!item.matchOverride ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => choose(undefined)}
            >
              Auto
            </button>
          </div>
          <span className="meta">
            Auto says: {autoInfo.short.toLowerCase()}
            {auto.matchSource === 'palette' ? ' (close to one of your colours)' : ` (${TONES[item.tone].name})`}
          </span>
          {(item.match === 'in' || ownColour) && (
            <button type="button" className={`palette-toggle ${ownColour ? 'is-on' : ''}`} aria-pressed={ownColour} onClick={toggleColour}>
              <span className="palette-check">{ownColour && <Check size={11} weight="bold" />}</span>
              <span className="swatch-sm" style={{ background: item.color }} />
              {ownColour ? `${item.colorName} is in your colours` : `Add ${item.colorName.toLowerCase()} to my colours`}
              {!ownColour && inPalette && <span className="meta"> · similar already added</span>}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
