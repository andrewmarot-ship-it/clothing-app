/**
 * Spectrum's colour galaxy: each piece sits at its colour's hue (the angle)
 * and saturation (the distance from the centre), nudged apart so nodes
 * don't overlap. Positions are percentages of a square.
 */
import { oklch } from './color.ts'

export interface GalaxyNode {
  /** Centre, % of the square's width and height. */
  x: number
  y: number
}

/** Below this chroma a colour reads as grey: spread these round the wheel instead of piling them up. */
const ACHROMATIC = 0.025
const MIN_GAP = 13
const MAX_RADIUS = 44

export function galaxyLayout(colours: string[]): GalaxyNode[] {
  const placed: GalaxyNode[] = []
  for (const hex of colours) {
    const { C, h } = oklch(hex)
    let angle = C < ACHROMATIC ? (placed.length * 47) % 360 : h
    let r = 15 + Math.min(1, C / 0.16) * 30
    let x = 50
    let y = 50
    for (let k = 0; k < 16; k++) {
      x = 50 + r * Math.cos((angle * Math.PI) / 180)
      y = 50 + r * Math.sin((angle * Math.PI) / 180)
      if (!placed.some((p) => Math.hypot(p.x - x, p.y - y) < MIN_GAP)) break
      angle += 19
      if (k % 3 === 2) r = Math.min(MAX_RADIUS, r + 5)
    }
    placed.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 })
  }
  return placed
}
