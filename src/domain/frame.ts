/**
 * Framing cut-outs so pieces of a kind look alike: every cut-out is redrawn
 * onto a standard canvas for its category, pinned at the top and centred on
 * its waistband or shoulders.
 *
 * A phone photo says nothing about real size, so the scale comes from a part
 * that is about the same on every garment of a kind:
 * - bottoms by waistband width, so trousers, shorts and skirts keep their
 *   real proportions (shorts come out shorter than trousers);
 * - tops and dresses by length, collar to hem, since sleeves spread or fold.
 * Pure maths on RGBA buffers; the drawing happens in photo.ts.
 */
import { dilate, largestComponent, maskFromAlpha, type Pixels } from './pixels.ts'
import type { Category } from './types.ts'

/** Bump to re-frame every stored cut-out after changing the rules below. */
export const FRAME_VERSION = 1

/** Canvas size per category, px. Bottoms and dresses are tall. */
export const FRAMES: Record<Category, { w: number; h: number }> = {
  top: { w: 1024, h: 1024 },
  bottom: { w: 640, h: 1024 },
  dress: { w: 640, h: 1024 },
}

/** Where a framed garment sits on its canvas, as fractions (0–1). Stored on the item. */
export interface Frame {
  v: number
  cat: Category
  /** The garment's box: x0, y0, x1, y1. */
  box: [number, number, number, number]
  /** Width of the waistband or shoulders, as a fraction of canvas width. */
  band: number
}

export interface GarmentShape {
  x0: number
  y0: number
  /** Exclusive. */
  x1: number
  y1: number
  /** Width and centre of the top few rows: waistband, or shoulders and collar. */
  bandWidth: number
  bandCentre: number
}

const SOLID = 128

/**
 * Just the garment: specks and fragments apart from the main shape are
 * cleared, so they can't stretch its box or show up on the canvas. Soft
 * edges within a couple of pixels of the garment are kept.
 */
export function keepGarment(p: Pixels): Pixels {
  const { width: w, height: h } = p
  const keep = dilate(largestComponent(maskFromAlpha(p, SOLID), w, h), w, h, 2)
  const data = new Uint8ClampedArray(p.data)
  for (let i = 0; i < keep.length; i++) if (!keep[i]) data[i * 4 + 3] = 0
  return { width: w, height: h, data }
}

/** The garment's box and the width and centre of its top band. Null when the image is empty. Run on keepGarment's output. */
export function measureShape(p: Pixels): GarmentShape | null {
  const { width: w, height: h, data } = p
  let x0 = w
  let y0 = h
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] < SOLID) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  if (x1 < 0) return null
  const bh = y1 - y0 + 1
  // The band: rows 2–8% of the way down, past any stray top pixels.
  const from = y0 + Math.round(bh * 0.02)
  const to = Math.max(from + 1, y0 + Math.round(bh * 0.08))
  const widths: number[] = []
  const centres: number[] = []
  for (let y = from; y < to && y <= y1; y++) {
    let l = -1
    let r = -1
    for (let x = x0; x <= x1; x++) {
      if (data[(y * w + x) * 4 + 3] < SOLID) continue
      if (l < 0) l = x
      r = x
    }
    if (l < 0) continue
    widths.push(r - l + 1)
    centres.push((l + r + 1) / 2)
  }
  const median = (a: number[]) => [...a].sort((p, q) => p - q)[Math.floor(a.length / 2)]
  return {
    x0,
    y0,
    x1: x1 + 1,
    y1: y1 + 1,
    bandWidth: widths.length ? median(widths) : x1 - x0 + 1,
    bandCentre: centres.length ? median(centres) : (x0 + x1 + 1) / 2,
  }
}

/** Waistband as a share of canvas width: typical trousers come out about three-quarters of the canvas tall. */
const WAIST = 0.46
/** Collar to hem as a share of canvas height. */
const LENGTH: Record<Category, number> = { top: 0.8, bottom: 0.62, dress: 0.86 }
const TOP_MARGIN = 0.04
const SIDE_MARGIN = 0.03

export interface Placement {
  /** Canvas size, px. */
  width: number
  height: number
  /** Draw the source at (dx, dy), scaled by `scale`. */
  scale: number
  dx: number
  dy: number
  frame: Frame
}

/** How to draw a garment of this shape onto its category's canvas. */
export function placeGarment(cat: Category, s: GarmentShape): Placement {
  const { w: W, h: H } = FRAMES[cat]
  const bw = s.x1 - s.x0
  const bh = s.y1 - s.y0
  // Bottoms scale by the waistband, unless the band doesn't look like one (a fold, an odd shape).
  const bandOk = s.bandWidth >= bw * 0.3 && s.bandWidth <= bw * 1.05
  let scale = cat === 'bottom' && bandOk ? (WAIST * W) / s.bandWidth : (LENGTH[cat] * H) / bh
  // Never spill off the canvas: shrink to fit if needed.
  scale = Math.min(scale, (W * (1 - 2 * SIDE_MARGIN)) / bw, (H * (1 - TOP_MARGIN - 0.02)) / bh)

  const centre = bandOk ? s.bandCentre : (s.x0 + s.x1) / 2
  let dx = W / 2 - centre * scale
  // Centring on the band can push a lopsided garment over an edge; nudge it back.
  const left = dx + s.x0 * scale
  const right = dx + s.x1 * scale
  if (left < W * SIDE_MARGIN) dx += W * SIDE_MARGIN - left
  else if (right > W * (1 - SIDE_MARGIN)) dx -= right - W * (1 - SIDE_MARGIN)
  const dy = H * TOP_MARGIN - s.y0 * scale

  const r = (x: number) => Math.round(x * 1000) / 1000
  return {
    width: W,
    height: H,
    scale,
    dx,
    dy,
    frame: {
      v: FRAME_VERSION,
      cat,
      box: [r((dx + s.x0 * scale) / W), r((dy + s.y0 * scale) / H), r((dx + s.x1 * scale) / W), r((dy + s.y1 * scale) / H)],
      band: r(((bandOk ? s.bandWidth : bw) * scale) / W),
    },
  }
}

/**
 * Lay a framed image out so its garment fills a container, for thumbnails.
 * Sizes are in cqmin (the container's smaller side = 100) and offsets are
 * from the container's centre.
 */
export function tightLayout(f: Frame): { width: number; height: number; left: number; top: number } {
  const { w: W, h: H } = FRAMES[f.cat]
  const [x0, y0, x1, y1] = f.box
  const bw = (x1 - x0) * W
  const bh = (y1 - y0) * H
  // A little air around the garment: it fills 92% of the container's smaller side.
  const k = 92 / Math.max(bw, bh)
  const r = (x: number) => Math.round(x * 100) / 100
  return { width: r(W * k), height: r(H * k), left: r(-(x0 * W + bw / 2) * k), top: r(-(y0 * H + bh / 2) * k) }
}

/**
 * Where to put the two pegs on a framed garment shown with `contain` in a
 * box of the given aspect (height / width): the inset from each side, as a
 * percentage of the box width. Pegs sit just inside the waistband or shoulders.
 */
export function pegInset(f: Frame, boxAspect: number): number {
  const { w: W, h: H } = FRAMES[f.cat]
  // Drawn width of the canvas as a share of the box width.
  const drawn = Math.min(1, boxAspect / (H / W))
  const half = (f.band / 2) * 0.75
  return Math.round(((1 - drawn) / 2 + (0.5 - half) * drawn) * 1000) / 10
}

/** Peg inset (CSS percentage) for a piece shown in a box of this aspect: on the waistband or shoulders once framed. */
export const pegsFor = (item: { frame?: Frame; photo?: string }, boxAspect: number, fallback = '28%') =>
  item.photo && item.frame ? `${pegInset(item.frame, boxAspect)}%` : fallback
