import { describe, expect, it } from 'vitest'
import { oklch } from './color'
import {
  alphaBBox,
  applyGains,
  backgroundGains,
  centreColour,
  checkQuality,
  dominantColours,
  fillSmallHoles,
  largestComponent,
  maskStats,
  refineAlpha,
  straightenBy,
  type Mask,
  type Pixels,
} from './pixels'

const hexRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

/** Build an image from a per-pixel function returning [r,g,b] (alpha 255). */
function image(w: number, h: number, fn: (x: number, y: number) => number[]): Pixels {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b] = fn(x, y)
      data.set([r, g, b, 255], (y * w + x) * 4)
    }
  return { width: w, height: h, data }
}

function maskOf(w: number, h: number, fn: (x: number, y: number) => boolean): Mask {
  const m = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = fn(x, y) ? 1 : 0
  return m
}

/** Garment rectangle in the middle of the frame. */
const inRect = (x: number, y: number) => x >= 20 && x < 80 && y >= 15 && y < 85

const hueDistance = (a: string, b: string) => {
  const d = Math.abs(oklch(a).h - oklch(b).h) % 360
  return Math.min(d, 360 - d)
}

describe('quality', () => {
  it('flags dark, bright and flat images, and passes a sharp one', () => {
    expect(checkQuality(image(64, 64, () => [10, 10, 10]))).toBe('dark')
    expect(checkQuality(image(64, 64, () => [250, 250, 250]))).toBe('bright')
    expect(checkQuality(image(64, 64, () => [128, 128, 128]))).toBe('blurry')
    expect(checkQuality(image(64, 64, (x, y) => ((x >> 2) + (y >> 2)) % 2 ? [220, 220, 220] : [60, 60, 60]))).toBeNull()
  })
})

describe('masks', () => {
  it('keeps the largest piece and drops specks', () => {
    const m = maskOf(100, 100, (x, y) => inRect(x, y) || (x < 3 && y < 3))
    const clean = largestComponent(m, 100, 100)
    expect(clean[0]).toBe(0)
    expect(clean[50 * 100 + 50]).toBe(1)
  })

  it('fills small holes but not big gaps', () => {
    const m = maskOf(100, 100, (x, y) => inRect(x, y) && !(x >= 40 && x < 43 && y >= 40 && y < 43) && !(x >= 50 && x < 75 && y >= 50 && y < 80))
    const filled = fillSmallHoles(m, 100, 100, 50)
    expect(filled[41 * 100 + 41]).toBe(1)
    expect(filled[60 * 100 + 60]).toBe(0)
  })

  it('measures area, box, edge contact and tilt', () => {
    const s = maskStats(maskOf(100, 100, inRect), 100, 100)!
    expect(s.area).toBe(60 * 70)
    expect(s.bbox).toEqual({ x0: 20, y0: 15, x1: 79, y1: 84 })
    expect(s.touchesEdge).toBe(false)
    expect(Math.abs(Math.abs(s.angle) - 90)).toBeLessThan(1)
    expect(maskStats(maskOf(100, 100, (x) => x < 60), 100, 100)!.touchesEdge).toBe(true)
    expect(maskStats(new Uint8Array(100), 10, 10)).toBeNull()
  })

  it('keeps the soft edge next to the garment but drops specks', () => {
    const cut = image(100, 100, () => [100, 100, 100])
    for (let i = 0; i < 100 * 100; i++) cut.data[i * 4 + 3] = 0
    const setA = (x: number, y: number, a: number) => (cut.data[(y * 100 + x) * 4 + 3] = a)
    for (let y = 15; y < 85; y++) for (let x = 20; x < 80; x++) setA(x, y, 255)
    setA(19, 50, 90) // soft edge
    setA(3, 3, 90) // stray speck
    setA(50, 50, 40) // tiny hole inside
    const mask = fillSmallHoles(largestComponent(maskOf(100, 100, (x, y) => cut.data[(y * 100 + x) * 4 + 3] >= 128), 100, 100), 100, 100, 50)
    const out = refineAlpha(cut, mask)
    const a = (x: number, y: number) => out.data[(y * 100 + x) * 4 + 3]
    expect([a(19, 50), a(3, 3), a(50, 50)]).toEqual([90, 0, 255])
    expect(alphaBBox(out)).toEqual({ x0: 19, y0: 15, x1: 79, y1: 84 })
  })

  it('only straightens small tilts', () => {
    expect(straightenBy(90)).toBe(0)
    expect(straightenBy(1)).toBe(0)
    expect(straightenBy(80)).toBeCloseTo(10)
    expect(straightenBy(-8)).toBeCloseTo(8)
    expect(straightenBy(30)).toBe(0)
  })
})

describe('white balance', () => {
  // A rust garment on a white sheet, shot under slightly warm indoor light.
  const warm = (rgb: number[]) => [Math.min(255, Math.round(rgb[0] * 1.05)), rgb[1], Math.round(rgb[2] * 0.9)]
  const rust = hexRgb('#b4643c')
  const photo = image(100, 100, (x, y) => warm(inRect(x, y) ? rust : [225, 225, 225]))
  const mask = maskOf(100, 100, inRect)

  it('neutralises a tinted light surface', () => {
    const gains = backgroundGains(photo, mask)!
    expect(gains).not.toBeNull()
    const fixed = applyGains(photo, gains)
    const bg = Array.from(fixed.data.slice(0, 3))
    expect(Math.max(...bg) - Math.min(...bg)).toBeLessThanOrEqual(3)
  })

  it('recovers the garment colour closer than the raw photo', () => {
    const fixed = applyGains(photo, backgroundGains(photo, mask)!)
    const before = dominantColours(photo, mask)!.primary
    const after = dominantColours(fixed, mask)!.primary
    const err = (hex: string) => hexRgb(hex).reduce((s, v, i) => s + Math.abs(v - rust[i]), 0)
    expect(err(after)).toBeLessThan(err(before))
    expect(err(after)).toBeLessThan(25)
  })

  it('leaves coloured, strongly tinted or already-neutral surfaces alone', () => {
    expect(backgroundGains(image(100, 100, (x, y) => (inRect(x, y) ? rust : hexRgb('#c8b89a'))), mask)).toBeNull()
    expect(backgroundGains(image(100, 100, (x, y) => (inRect(x, y) ? rust : [40, 120, 60])), mask)).toBeNull()
    expect(backgroundGains(image(100, 100, (x, y) => (inRect(x, y) ? rust : [200, 200, 200])), mask)).toBeNull()
  })
})

describe('dominant colours', () => {
  const mask = maskOf(100, 100, inRect)

  it('finds a solid colour through shading', () => {
    const navy = hexRgb('#34446b')
    const shaded = image(100, 100, (x) => navy.map((v) => Math.round(v * (0.8 + x / 250))))
    const c = dominantColours(shaded, mask)!
    expect(hueDistance(c.primary, '#34446b')).toBeLessThan(10)
    expect(c.pattern).toBe(false)
  })

  it('spots a two-colour stripe', () => {
    const striped = image(100, 100, (_, y) => ((y >> 3) % 2 ? hexRgb('#e6dcc6') : hexRgb('#1f3a5f')))
    const c = dominantColours(striped, mask)!
    expect(c.secondary).not.toBeNull()
    expect(c.pattern).toBe(true)
  })

  it('returns null for an empty mask', () => {
    expect(dominantColours(image(10, 10, () => [0, 0, 0]), new Uint8Array(100))).toBeNull()
  })
})

describe('centre colour fallback', () => {
  it('skips white surface pixels', () => {
    const p = image(100, 100, (x, y) => (inRect(x, y) && x % 2 ? hexRgb('#9aab8c') : [250, 250, 250]))
    expect(centreColour(p)).toBe('#9aab8c')
  })

  it('skips a coloured surface showing through the centre', () => {
    const p = image(100, 100, (x, y) => (inRect(x, y) && x > 45 ? hexRgb('#b4643c') : [228, 214, 190]))
    expect(centreColour(p)).toBe('#b4643c')
  })
})
