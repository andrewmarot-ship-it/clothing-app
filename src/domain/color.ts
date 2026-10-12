import { nearestTone } from './tones'

export interface Oklch {
  L: number
  C: number
  /** Hue in degrees, 0–360. */
  h: number
}

const lin = (c: number) => {
  c /= 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

export function oklch(hex: string): Oklch {
  const n = parseInt(hex.slice(1), 16)
  const r = lin((n >> 16) & 255)
  const g = lin((n >> 8) & 255)
  const b = lin(n & 255)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { L, C: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 }
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

/**
 * Fallback colour → tone classifier, used when no TCI database lookup is
 * available. Maps OKLCH onto the tone axes and picks the nearest tone.
 */
export function classifyHex(hex: string): number {
  const { L, C, h } = oklch(hex)
  const t = Math.cos(((h - 70) * Math.PI) / 180) * Math.min(1, C / 0.05)
  return nearestTone(t, clamp01((0.95 - L) / 0.7), Math.min(1, C / 0.15))
}

/** A rough everyday colour name for a detected colour. */
export function colourName(hex: string): string {
  const { L, C, h } = oklch(hex)
  if (C < 0.03) return L > 0.85 ? 'Ivory' : L > 0.6 ? 'Grey' : 'Charcoal'
  if (h < 45) return 'Coral'
  if (h < 75) return L < 0.55 ? 'Rust' : 'Peach'
  if (h < 110) return L < 0.6 ? 'Olive' : 'Camel'
  if (h < 170) return 'Sage'
  if (h < 230) return 'Teal'
  if (h < 290) return L < 0.5 ? 'Navy' : 'Blue'
  if (h < 340) return 'Plum'
  return 'Rose'
}
