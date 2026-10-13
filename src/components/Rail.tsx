import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { useRef, type PointerEvent } from 'react'
import { HANGER_RATIO, railSlot } from '../domain/rail'
import type { RatedItem } from '../domain/types'
import { fx } from '../state/feedback'
import { glowFill, useGlowPref } from '../state/theme'
import { Garment } from './Garment'

/** A hook and a shoulder bar, drawn over the top of the garment. */
const HANGER = 'M50 2 q7 0 7 6 q0 5 -7 7 L50 13 M14 28 L50 13 L86 28 Z'
const SWIPE_PX = 36

interface Props {
  label: string
  list: RatedItem[]
  current: RatedItem
  onPick: (id: string) => void
  /** Garment height as a share of its width: dresses hang longer. */
  aspect?: number
}

/**
 * A closet rail: every piece hangs on it, the centre one biggest, the rest
 * smaller and fainter towards the ends. Tap a hanger, swipe, or use the
 * arrows; pieces slide and spring past each other.
 */
export function Rail({ label, list, current, onPick, aspect = 1 }: Props) {
  const [glow] = useGlowPref()
  const n = list.length
  const idx = Math.max(0, list.findIndex((i) => i.id === current.id))
  const startX = useRef<number | null>(null)
  // A swipe that ends on a hanger also clicks it; that click must not undo the swipe.
  const swiped = useRef(false)

  const select = (i: number) => {
    const id = list[(i + n) % n].id
    if (id === current.id) return
    fx('tick')
    onPick(id)
  }
  const onPointerDown = (e: PointerEvent) => {
    startX.current = e.clientX
    swiped.current = false
  }
  const onPointerUp = (e: PointerEvent) => {
    if (startX.current == null) return
    const dx = e.clientX - startX.current
    startX.current = null
    if (Math.abs(dx) <= SWIPE_PX) return
    swiped.current = true
    select(idx + (dx < 0 ? 1 : -1))
  }
  const centreHeight = Math.round(132 * HANGER_RATIO + 132 * aspect * 0.94)

  return (
    <section className="rail">
      <div className="rail-head">
        <span className="kicker">
          {label} · {idx + 1} of {n}
        </span>
        <div className="row">
          <button type="button" className="btn btn-ghost btn-icon" aria-label={`Previous ${label.toLowerCase()}`} onClick={() => select(idx - 1)} disabled={n < 2}>
            <CaretLeft size={16} />
          </button>
          <button type="button" className="btn btn-ghost btn-icon" aria-label={`Next ${label.toLowerCase()}`} onClick={() => select(idx + 1)} disabled={n < 2}>
            <CaretRight size={16} />
          </button>
        </div>
      </div>
      <div
        className="rail-area"
        style={{ height: Math.max(176, centreHeight + 8) }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (startX.current = null)}
      >
        <div className="rail-glow" style={{ background: glowFill(glow, current.color, 60), height: centreHeight }} />
        <div className="rail-bar" />
        {list.map((it, i) => {
          const s = railSlot(i, idx, n)
          const centre = s.offset === 0
          return (
            <button
              key={it.id}
              type="button"
              className={`rail-piece ${centre ? 'is-centre' : ''}`}
              aria-label={it.name}
              aria-current={centre || undefined}
              aria-hidden={s.hidden || undefined}
              tabIndex={s.hidden ? -1 : undefined}
              style={{
                left: `calc(50% + ${s.x}px)`,
                width: s.width,
                marginLeft: -s.width / 2,
                // The theme decides how strongly pieces fade towards the ends.
                opacity: s.hidden ? 0 : `calc(1 - ${1 - s.opacity} * var(--rail-fade, 1))`,
                zIndex: s.z,
                pointerEvents: s.hidden ? 'none' : undefined,
              }}
              onClick={() => {
                if (swiped.current) return void (swiped.current = false)
                select(i)
              }}
            >
              <svg viewBox="0 0 100 30" className="rail-hanger" style={{ height: Math.round(s.width * HANGER_RATIO) }} aria-hidden="true">
                <path d={HANGER} strokeWidth={centre ? 2 : 2.6} />
              </svg>
              <span className="rail-garment" style={{ height: Math.round(s.width * aspect) }}>
                <Garment item={it} className="fill" />
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
