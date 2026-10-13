import type { CSSProperties } from 'react'
import { tightLayout } from '../domain/frame'
import { SILHOUETTES } from '../domain/silhouettes'
import type { Item } from '../domain/types'

interface Props {
  item: Pick<Item, 'kind' | 'color' | 'name' | 'photo' | 'cutout' | 'frame'>
  className?: string
  style?: CSSProperties
  /** Outline width in viewBox units. */
  stroke?: number
  /** Add the soft light-to-dark shading over the fill. */
  shade?: boolean
  /** Pin the drawing to the top of its box (hanging) or centre it. */
  align?: 'top' | 'center'
  /**
   * frame: show the whole standard canvas, so pieces of a kind match in size.
   * tight: fill the box with the garment itself, for thumbnails.
   */
  fit?: 'frame' | 'tight'
}

/**
 * A garment: the user's photo when there is one (normally a transparent
 * cut-out), otherwise a placeholder silhouette filled with the item colour.
 */
export function Garment({ item, className, style, stroke = 0.8, shade = true, align = 'top', fit = 'frame' }: Props) {
  if (item.photo && fit === 'tight' && item.frame) {
    const t = tightLayout(item.frame)
    return (
      <div className={`garment-tight ${item.cutout ? 'cutout' : ''} ${className ?? ''}`} style={style}>
        <div
          role="img"
          aria-label={item.name}
          className="garment-photo garment-photo--fill"
          style={{
            backgroundImage: `url("${item.photo}")`,
            width: `${t.width}cqmin`,
            height: `${t.height}cqmin`,
            left: `calc(50cqw + ${t.left}cqmin)`,
            top: `calc(50cqh + ${t.top}cqmin)`,
          }}
        />
      </div>
    )
  }
  if (item.photo) {
    // Raw photos blend in with .lighten so a dark backdrop falls away. A real
    // cut-out already has transparency, and lighten would make dark garments
    // (black, navy) vanish into the page, so it's drawn as is.
    return (
      <div className={`${item.cutout ? 'cutout' : 'lighten'} ${className ?? ''}`} style={style}>
        <div
          role="img"
          aria-label={item.name}
          className={`garment-photo garment-photo--${align}`}
          style={{ backgroundImage: `url("${item.photo}")` }}
        />
      </div>
    )
  }
  const d = SILHOUETTES[item.kind]
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio={align === 'top' ? 'xMidYMin meet' : 'xMidYMid meet'}
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d={d} fill={item.color} strokeWidth={stroke} strokeLinejoin="round" style={{ stroke: 'var(--color-neutral-700)' }} />
      {shade && <path d={d} fill="url(#shade)" opacity={0.35} />}
    </svg>
  )
}

/** Gradients shared by every garment and line. Render once. */
export function SvgDefs() {
  const stop = { stopColor: 'var(--color-neutral-400)' }
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <linearGradient id="shade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.25" />
          <stop offset="1" stopColor="#000" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="fade" x1="0" x2="1">
          <stop offset="0" style={stop} stopOpacity="0" />
          <stop offset="0.15" style={stop} stopOpacity="0.9" />
          <stop offset="0.85" style={stop} stopOpacity="0.9" />
          <stop offset="1" style={stop} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/** A clothesline that sags in the middle and fades out at both ends. */
export function Line({ sag = 18, width = 1, style }: { sag?: number; width?: number; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 390 30" preserveAspectRatio="none" className="line" style={style} aria-hidden="true">
      <path d={`M0 4 Q195 ${sag} 390 4`} fill="none" stroke="url(#fade)" strokeWidth={width} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** Two accent pegs on a hanging garment. */
export function Pins({ inset = '28%', top = '-4%', width = '4%', height = '10%' }) {
  const s = { top, width, height }
  return (
    <>
      <span className="pin" style={{ ...s, left: inset }} />
      <span className="pin" style={{ ...s, right: inset }} />
    </>
  )
}
