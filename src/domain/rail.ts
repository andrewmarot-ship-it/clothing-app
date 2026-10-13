/**
 * Closet-rail layout: pieces hang along a rail, biggest in the centre and
 * smaller and fainter towards the edges. The list wraps around, so the
 * piece before the first is the last.
 */
export interface RailSlot {
  /** Signed steps from the centre, wrapped to the shorter way round. */
  offset: number
  /** Horizontal distance of the piece's centre from the rail's centre, px. */
  x: number
  /** Width of the piece (and its hanger), px. */
  width: number
  opacity: number
  z: number
  /** Off the ends of the rail: hidden and not tappable. */
  hidden: boolean
}

const WIDTH = [132, 84, 58]
const X = [0, 102, 162]
const OPACITY = [1, 0.6, 0.3]
/** Where pieces wait, out of sight, so they slide in from the side. */
const OFF_RAIL = 240

/** Hanger height as a share of the piece's width. */
export const HANGER_RATIO = 0.3

export function railSlot(i: number, centre: number, n: number): RailSlot {
  let o = (((i - centre) % n) + n) % n
  if (o > n / 2) o -= n
  const a = Math.abs(o)
  if (a > 2) return { offset: o, x: Math.sign(o) * OFF_RAIL, width: WIDTH[2], opacity: 0, z: 1, hidden: true }
  return { offset: o, x: Math.sign(o) * X[a], width: WIDTH[a], opacity: OPACITY[a], z: 4 - a, hidden: false }
}
