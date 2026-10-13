import { useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { CATEGORIES } from '../domain/categories'
import { pegsFor } from '../domain/frame'
import { isFront, nextSpin, ringOpacity } from '../domain/ring'
import type { Category, RatedItem } from '../domain/types'
import { Garment } from './Garment'
import { itemMatch } from './match'

const RADIUS = 210
const SWIPE_PX = 30

/** A request to spin past the target with whole extra turns (Cast, shuffle). A new `key` starts a new spin. */
export interface SpinBoost {
  key: number
  turns: number
}

interface Props {
  cat: Category
  list: RatedItem[]
  current: RatedItem
  onPick: (id: string) => void
  boost: SpinBoost
  /** A Cast or shuffle spin is running: the long, settling ease, and pieces dimmed. */
  spinning: boolean
  /** Dim the pieces while casting. */
  dim?: boolean
  className?: string
}

/**
 * A clothesline as a ring seen from slightly above. Pieces hang around it
 * and the ring turns to bring the chosen one to the front, always the
 * shorter way round. Tap a piece or swipe to turn it.
 */
export function Ring({ cat, list, current, onPick, boost, spinning, dim, className }: Props) {
  const info = CATEGORIES[cat]
  const [w, h] = info.ring.box
  const n = list.length
  const idx = Math.max(0, list.findIndex((i) => i.id === current.id))
  const step = 360 / Math.max(1, n)

  // An unbounded spin value, so the ring never unwinds the long way. Adjusted
  // during render when the target or the boost changes (React's pattern for
  // state derived from props).
  const [st, setSt] = useState({ spin: idx, idx, key: boost.key })
  if (st.idx !== idx || st.key !== boost.key) setSt({ spin: nextSpin(st.spin, idx, n, st.key !== boost.key ? boost.turns : 0), idx, key: boost.key })
  const spin = st.spin

  const startX = useRef<number | null>(null)
  const swiped = useRef(false)
  const select = (i: number) => {
    const id = list[((i % n) + n) % n].id
    if (id !== current.id) onPick(id)
  }
  const onPointerDown = (e: PointerEvent) => {
    startX.current = e.clientX
    swiped.current = false
  }
  const onPointerUp = (e: PointerEvent) => {
    if (startX.current == null) return
    const dx = e.clientX - startX.current
    startX.current = null
    if (Math.abs(dx) <= SWIPE_PX || n < 2) return
    swiped.current = true
    select(idx + (dx < 0 ? 1 : -1))
  }

  const m = itemMatch(current)
  const pivot: CSSProperties = {
    transform: `translateZ(-${RADIUS}px) rotateY(${(-spin * step).toFixed(2)}deg)`,
    transition: spinning ? `transform ${info.ring.spinSeconds}s cubic-bezier(.12,.75,.18,1)` : undefined,
  }

  return (
    <div
      className={`ring ${className ?? ''}`}
      style={{ top: info.ring.top, height: info.ring.height }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (startX.current = null)}
    >
      <div className="ring-pivot" style={pivot}>
        <div className="ring-line" style={{ left: -RADIUS, top: -RADIUS, width: RADIUS * 2, height: RADIUS * 2 }} />
        {list.map((it, i) => {
          const front = isFront(i, spin, n)
          return (
            <button
              key={it.id}
              type="button"
              className={`ring-item ${front ? 'is-front' : ''}`}
              aria-label={it.name}
              aria-current={front || undefined}
              tabIndex={front ? undefined : -1}
              style={{
                left: -w / 2,
                width: w,
                height: h,
                transform: `rotateY(${(i * step).toFixed(2)}deg) translateZ(${RADIUS}px)`,
                opacity: dim ? 0.55 : ringOpacity(i, spin, n),
              }}
              onClick={() => {
                if (swiped.current) return void (swiped.current = false)
                select(i)
              }}
            >
              <span className="ring-peg" style={{ left: pegsFor(it, h / w, '27%') }} />
              <span className="ring-peg" style={{ right: pegsFor(it, h / w, '27%') }} />
              <Garment item={it} className="fill" stroke={0.6} />
            </button>
          )
        })}
      </div>
      <div className="ring-label">
        <span className="ring-kicker">
          {info.label} · {idx + 1}/{n}
        </span>
        <span className="ring-name">{current.name}</span>
        <span className="ring-match" style={{ color: m.color }}>
          {m.short}
        </span>
      </div>
    </div>
  )
}
