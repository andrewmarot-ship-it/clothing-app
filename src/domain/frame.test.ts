import { describe, expect, it } from 'vitest'
import { FRAMES, keepGarment, measureShape, pegInset, placeGarment, tightLayout } from './frame'
import type { Pixels } from './pixels'

/** A transparent image with solid rectangles [x, y, w, h], scaled by `k` (as if shot from closer). */
function shape(rects: [number, number, number, number][], k = 1, w = 200, h = 200): Pixels {
  const data = new Uint8ClampedArray(w * k * h * k * 4)
  for (const [rx, ry, rw, rh] of rects)
    for (let y = ry * k; y < (ry + rh) * k; y++) for (let x = rx * k; x < (rx + rw) * k; x++) data[(y * w * k + x) * 4 + 3] = 255
  return { width: w * k, height: h * k, data }
}

const trousers = [[30, 10, 40, 10], [30, 20, 18, 100], [52, 20, 18, 100]] as [number, number, number, number][]
const shorts = [[30, 10, 40, 10], [28, 20, 20, 35], [52, 20, 20, 35]] as [number, number, number, number][]
const spread = [[60, 10, 40, 10], [40, 20, 22, 100], [98, 20, 22, 100]] as [number, number, number, number][]

const place = (cat: 'top' | 'bottom' | 'dress', p: Pixels) => placeGarment(cat, measureShape(p)!)
const tall = (p: ReturnType<typeof place>) => p.frame.box[3] - p.frame.box[1]

describe('measuring a cut-out', () => {
  it('finds the box and the waistband', () => {
    expect(measureShape(shape(trousers))).toEqual({ x0: 30, y0: 10, x1: 70, y1: 120, bandWidth: 40, bandCentre: 50 })
    expect(measureShape(shape([]))).toBeNull()
  })

  it('ignores specks apart from the garment', () => {
    const specked = keepGarment(shape([...trousers, [2, 2, 6, 6]]))
    expect(measureShape(specked)).toEqual(measureShape(shape(trousers)))
    expect(specked.data[(4 * 200 + 4) * 4 + 3]).toBe(0)
  })
})

describe('framing bottoms by the waistband', () => {
  it('draws every waistband the same width, centred, pinned near the top', () => {
    const p = place('bottom', shape(trousers))
    expect(p.frame.box[1]).toBeCloseTo(0.04, 2)
    expect(p.frame.band).toBeCloseTo(0.46, 2)
    expect((p.frame.box[0] + p.frame.box[2]) / 2).toBeCloseTo(0.5, 2)
  })

  it('keeps real proportions: shorts come out shorter than trousers', () => {
    expect(tall(place('bottom', shape(trousers))) / tall(place('bottom', shape(shorts)))).toBeCloseTo(110 / 45, 1)
  })

  it('ignores how close the camera was', () => {
    expect(place('bottom', shape(trousers, 3)).frame.box).toEqual(place('bottom', shape(trousers)).frame.box)
  })

  it('gives spread legs the same length as legs together', () => {
    expect(tall(place('bottom', shape(spread)))).toBeCloseTo(tall(place('bottom', shape(trousers))), 2)
  })

  it('falls back to length when the top band does not look like a waistband', () => {
    const odd = place('bottom', shape([[48, 10, 4, 10], [20, 20, 60, 100]]))
    expect(tall(odd)).toBeCloseTo(0.62, 2)
  })
})

describe('framing tops and dresses by length', () => {
  it('draws tops the same length', () => {
    expect(tall(place('top', shape([[40, 10, 40, 60]])))).toBeCloseTo(0.8, 2)
    expect(tall(place('dress', shape([[40, 10, 30, 150]])))).toBeCloseTo(0.86, 2)
  })

  it('shrinks a top with outstretched sleeves to fit the canvas', () => {
    const p = place('top', shape([[70, 10, 60, 50], [0, 12, 200, 14]]))
    expect(p.frame.box[0]).toBeGreaterThanOrEqual(0.029)
    expect(p.frame.box[2]).toBeLessThanOrEqual(0.971)
  })

  it('nudges a lopsided garment back onto the canvas', () => {
    const p = place('top', shape([[0, 10, 10, 60], [0, 10, 180, 20]]))
    expect(p.frame.box[0]).toBeGreaterThanOrEqual(0.029)
    expect(p.frame.box[2]).toBeLessThanOrEqual(0.971)
  })
})

describe('showing framed cut-outs', () => {
  it('lays out a thumbnail so the garment fills it, centred', () => {
    const f = { v: 1, cat: 'bottom' as const, box: [0.3, 0.04, 0.7, 0.7] as [number, number, number, number], band: 0.4 }
    const t = tightLayout(f)
    const { w: W, h: H } = FRAMES.bottom
    // The garment is taller than wide, so its height becomes 92 cqmin.
    expect(((f.box[3] - f.box[1]) * H * t.height) / H).toBeCloseTo(92, 0)
    expect(t.left + (0.5 * W * t.width) / W).toBeCloseTo(0, 0)
  })

  it('puts the pegs just inside the waistband', () => {
    const f = { v: 1, cat: 'bottom' as const, box: [0.3, 0.04, 0.7, 0.7] as [number, number, number, number], band: 0.4 }
    expect(pegInset(f, 1)).toBeCloseTo(40.6, 1)
    expect(pegInset({ ...f, cat: 'top', band: 0.6 }, 1)).toBeCloseTo(27.5, 1)
  })
})
