import { nearestTone } from './tones'

export interface Oklch {
  L: number
  C: number
  /** Hue in degrees, 0–360. */
  h: number
}

/** sRGB channel (0–255) → linear light (0–1). */
export const srgbToLinear = (c: number) => {
  c /= 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** Linear light (0–1) → sRGB channel (0–255), clamped. */
export const linearToSrgb = (x: number) => {
  const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055
  return Math.round(Math.max(0, Math.min(1, v)) * 255)
}

export interface Oklab {
  L: number
  a: number
  b: number
}

/** Linear-light RGB (0–1) → OKLab. */
export function linearToOklab(r: number, g: number, b: number): Oklab {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  }
}

const hex2 = (n: number) => n.toString(16).padStart(2, '0')
export const rgbHex = (r: number, g: number, b: number) => `#${hex2(r)}${hex2(g)}${hex2(b)}`

/** OKLab → #rrggbb, clamped into sRGB. */
export function oklabToHex({ L, a, b }: Oklab): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return rgbHex(
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  )
}

export function oklch(hex: string): Oklch {
  const n = parseInt(hex.slice(1), 16)
  const { L, a, b } = linearToOklab(srgbToLinear((n >> 16) & 255), srgbToLinear((n >> 8) & 255), srgbToLinear(n & 255))
  return { L, C: Math.hypot(a, b), h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 }
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
