/**
 * Pure image maths for the photo pipeline. Everything works on plain RGBA
 * buffers so it runs (and is tested) without a DOM.
 */
import { linearToOklab, linearToSrgb, oklabToHex, rgbHex, srgbToLinear, type Oklab } from './color.ts'

export interface Pixels {
  width: number
  height: number
  /** RGBA, 4 bytes per pixel. */
  data: Uint8ClampedArray
}

/** 1 where the garment is, 0 elsewhere. */
export type Mask = Uint8Array

const LIN = Float32Array.from({ length: 256 }, (_, i) => srgbToLinear(i))

// ── Photo quality ─────────────────────────────────────────────────────────

export type QualityIssue = 'blurry' | 'dark' | 'bright'

/**
 * Thresholds for a ~256px copy of the photo. Starting points: tune them
 * against the fixture photos before treating them as more than a hint.
 */
const BLUR_MIN = 10
const DARK_MAX = 45
const BRIGHT_MIN = 235

function luma(p: Pixels): Float32Array {
  const out = new Float32Array(p.width * p.height)
  for (let i = 0, j = 0; j < out.length; i += 4, j++) out[j] = 0.2126 * p.data[i] + 0.7152 * p.data[i + 1] + 0.0722 * p.data[i + 2]
  return out
}

/** Variance of the Laplacian: low means few sharp edges (blur). */
export function sharpness(p: Pixels): number {
  const { width: w, height: h } = p
  const y = luma(p)
  let sum = 0
  let sq = 0
  let n = 0
  for (let r = 1; r < h - 1; r++) {
    for (let c = 1; c < w - 1; c++) {
      const i = r * w + c
      const v = y[i - w] + y[i + w] + y[i - 1] + y[i + 1] - 4 * y[i]
      sum += v
      sq += v * v
      n++
    }
  }
  if (!n) return 0
  const mean = sum / n
  return sq / n - mean * mean
}

export function meanLuma(p: Pixels): number {
  const y = luma(p)
  let s = 0
  for (const v of y) s += v
  return y.length ? s / y.length : 0
}

/** The first problem worth a retake, if any. Advisory: the user can carry on. */
export function checkQuality(p: Pixels): QualityIssue | null {
  const m = meanLuma(p)
  if (m < DARK_MAX) return 'dark'
  if (m > BRIGHT_MIN) return 'bright'
  if (sharpness(p) < BLUR_MIN) return 'blurry'
  return null
}

// ── Masks ─────────────────────────────────────────────────────────────────

export function maskFromAlpha(p: Pixels, threshold = 128): Mask {
  const m = new Uint8Array(p.width * p.height)
  for (let i = 0; i < m.length; i++) m[i] = p.data[i * 4 + 3] >= threshold ? 1 : 0
  return m
}

/** Label 4-connected regions of `value` pixels; returns labels (0 = not value) and region sizes. */
function regions(mask: Mask, w: number, h: number, value: 0 | 1) {
  const labels = new Int32Array(mask.length)
  const sizes: number[] = [0]
  const stack: number[] = []
  for (let start = 0; start < mask.length; start++) {
    if (mask[start] !== value || labels[start]) continue
    const id = sizes.length
    let size = 0
    labels[start] = id
    stack.push(start)
    while (stack.length) {
      const i = stack.pop()!
      size++
      const x = i % w
      const nbrs = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i >= w ? i - w : -1, i < w * (h - 1) ? i + w : -1]
      for (const j of nbrs) {
        if (j >= 0 && mask[j] === value && !labels[j]) {
          labels[j] = id
          stack.push(j)
        }
      }
    }
    sizes.push(size)
  }
  return { labels, sizes }
}

/** Keep only the largest connected piece of the mask (drops specks and stray objects). */
export function largestComponent(mask: Mask, w: number, h: number): Mask {
  const { labels, sizes } = regions(mask, w, h, 1)
  let best = 0
  for (let id = 1; id < sizes.length; id++) if (sizes[id] > sizes[best]) best = id
  const out = new Uint8Array(mask.length)
  if (!best) return out
  for (let i = 0; i < out.length; i++) out[i] = labels[i] === best ? 1 : 0
  return out
}

/** Fill holes no bigger than `maxArea` pixels. Bigger gaps (between straps, say) stay open. */
export function fillSmallHoles(mask: Mask, w: number, h: number, maxArea: number): Mask {
  const { labels, sizes } = regions(mask, w, h, 0)
  const touchesBorder = new Set<number>()
  for (let x = 0; x < w; x++) touchesBorder.add(labels[x]).add(labels[(h - 1) * w + x])
  for (let y = 0; y < h; y++) touchesBorder.add(labels[y * w]).add(labels[y * w + w - 1])
  const out = mask.slice()
  for (let i = 0; i < out.length; i++) {
    const id = labels[i]
    if (id && !touchesBorder.has(id) && sizes[id] <= maxArea) out[i] = 1
  }
  return out
}

/** Grow the mask by `r` pixels (square neighbourhood). */
export function dilate(mask: Mask, w: number, h: number, r = 2): Mask {
  let cur = mask
  for (let pass = 0; pass < r; pass++) {
    const next = cur.slice()
    for (let i = 0; i < cur.length; i++) {
      if (cur[i]) continue
      const x = i % w
      const y = (i - x) / w
      for (let dy = -1; dy <= 1 && !next[i]; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx >= 0 && ny >= 0 && nx < w && ny < h && cur[ny * w + nx]) {
            next[i] = 1
            break
          }
        }
    }
    cur = next
  }
  return cur
}

/**
 * Final alpha for the cut-out: solid inside the cleaned mask (so filled
 * holes become opaque), the provider's soft edge kept just around it, and
 * everything else (specks, stray objects) transparent.
 */
export function refineAlpha(cut: Pixels, mask: Mask): Pixels {
  const near = dilate(mask, cut.width, cut.height, 2)
  const data = new Uint8ClampedArray(cut.data)
  for (let i = 0; i < mask.length; i++) {
    const a = data[i * 4 + 3]
    data[i * 4 + 3] = mask[i] ? (a >= 128 ? a : 255) : near[i] ? a : 0
  }
  return { width: cut.width, height: cut.height, data }
}

/** Bounding box of pixels with alpha above `min`, or null if none. */
export function alphaBBox(p: Pixels, min = 8): { x0: number; y0: number; x1: number; y1: number } | null {
  let x0 = p.width
  let y0 = p.height
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < p.height; y++)
    for (let x = 0; x < p.width; x++) {
      if (p.data[(y * p.width + x) * 4 + 3] <= min) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  return x1 < 0 ? null : { x0, y0, x1, y1 }
}

export interface MaskStats {
  area: number
  /** Share of the frame the garment covers. */
  fraction: number
  bbox: { x0: number; y0: number; x1: number; y1: number }
  /** Angle of the main axis in degrees, image coordinates (y down), −90…90. */
  angle: number
  /** True when a noticeable part of the frame edge is garment: it's probably cut off. */
  touchesEdge: boolean
}

export function maskStats(mask: Mask, w: number, h: number): MaskStats | null {
  let area = 0
  let sx = 0
  let sy = 0
  let x0 = w
  let y0 = h
  let x1 = -1
  let y1 = -1
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue
    const x = i % w
    const y = (i - x) / w
    area++
    sx += x
    sy += y
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
  if (!area) return null
  const cx = sx / area
  const cy = sy / area
  let m20 = 0
  let m02 = 0
  let m11 = 0
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue
    const dx = (i % w) - cx
    const dy = Math.floor(i / w) - cy
    m20 += dx * dx
    m02 += dy * dy
    m11 += dx * dy
  }
  const angle = (0.5 * Math.atan2(2 * m11, m20 - m02) * 180) / Math.PI

  let edge = 0
  for (let x = 0; x < w; x++) edge += mask[x] + mask[(h - 1) * w + x]
  for (let y = 1; y < h - 1; y++) edge += mask[y * w] + mask[y * w + w - 1]
  const perimeter = 2 * (w + h) - 4

  return { area, fraction: area / mask.length, bbox: { x0, y0, x1, y1 }, angle, touchesEdge: edge / perimeter > 0.02 }
}

/**
 * Small-tilt correction. A flat-lay is either upright or sideways, so we
 * only straighten the residual tilt from the nearest axis, and only when it
 * is between 2° and 20°. That way a wide tee is never flipped on its side.
 * Returns the rotation to apply, in degrees.
 */
export function straightenBy(angle: number): number {
  let r = angle % 90
  if (r > 45) r -= 90
  if (r <= -45) r += 90
  return Math.abs(r) < 2 || Math.abs(r) > 20 ? 0 : -r
}

// ── Colour ────────────────────────────────────────────────────────────────

export type Gains = [number, number, number]

/**
 * Use the surface the garment was laid on as a grey card. If the background
 * is near-neutral, return per-channel gains (linear light) that make it
 * neutral; otherwise null (a coloured surface tells us nothing).
 */
export function backgroundGains(p: Pixels, mask: Mask): Gains | null {
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) continue
    const k = i * 4
    r += LIN[p.data[k]]
    g += LIN[p.data[k + 1]]
    b += LIN[p.data[k + 2]]
    n++
  }
  if (n < mask.length * 0.1) return null
  r /= n
  g /= n
  b /= n
  const lab = linearToOklab(r, g, b)
  // A mild cast on white paper and a cream sheet look the same (OKLCH chroma
  // ~0.02–0.04), so both get neutralised: cheap if wrong. Past 0.04 a tint is
  // indistinguishable from a beige or wooden surface, so we leave colour alone.
  if (lab.L < 0.35 || Math.hypot(lab.a, lab.b) > 0.04) return null
  const grey = (r + g + b) / 3
  const clampGain = (x: number) => Math.max(0.7, Math.min(1.4, x))
  const gains: Gains = [clampGain(grey / r), clampGain(grey / g), clampGain(grey / b)]
  return gains.every((x) => Math.abs(x - 1) < 0.02) ? null : gains
}

/** Apply white-balance gains to every pixel; alpha is untouched. */
export function applyGains(p: Pixels, gains: Gains): Pixels {
  const data = new Uint8ClampedArray(p.data)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = linearToSrgb(LIN[data[i]] * gains[0])
    data[i + 1] = linearToSrgb(LIN[data[i + 1]] * gains[1])
    data[i + 2] = linearToSrgb(LIN[data[i + 2]] * gains[2])
  }
  return { width: p.width, height: p.height, data }
}

export interface Colours {
  /** The main colour, #rrggbb. */
  primary: string
  /** A clearly different second colour covering a real share of the garment. */
  secondary: string | null
  /** Two colours share the garment: stripes, checks, prints. */
  pattern: boolean
}

const dist = (a: Oklab, b: Oklab) => Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b)

/**
 * Dominant colours of the garment: k-means in OKLab over the masked pixels,
 * with the darkest and brightest 5% (shadows and highlights) left out, and
 * near-identical clusters (shading of one colour) merged.
 */
export function dominantColours(p: Pixels, mask: Mask, k = 4): Colours | null {
  const idx: number[] = []
  for (let i = 0; i < mask.length; i++) if (mask[i]) idx.push(i)
  if (!idx.length) return null
  const step = Math.max(1, Math.ceil(idx.length / 6000))
  let samples: Oklab[] = []
  for (let j = 0; j < idx.length; j += step) {
    const o = idx[j] * 4
    samples.push(linearToOklab(LIN[p.data[o]], LIN[p.data[o + 1]], LIN[p.data[o + 2]]))
  }
  const byL = samples.map((s) => s.L).sort((a, b) => a - b)
  const lo = byL[Math.floor(byL.length * 0.05)]
  const hi = byL[Math.min(byL.length - 1, Math.floor(byL.length * 0.95))]
  const trimmed = samples.filter((s) => s.L >= lo && s.L <= hi)
  if (trimmed.length) samples = trimmed

  // Deterministic start: centroids at evenly spaced lightness quantiles.
  const sortedByL = [...samples].sort((a, b) => a.L - b.L)
  const kk = Math.min(k, samples.length)
  let cents: Oklab[] = Array.from({ length: kk }, (_, c) => ({ ...sortedByL[Math.floor(((c + 0.5) / kk) * sortedByL.length)] }))
  let assign = new Int32Array(samples.length)
  for (let iter = 0; iter < 15; iter++) {
    let moved = false
    samples.forEach((s, i) => {
      let best = 0
      let bd = Infinity
      cents.forEach((c, ci) => {
        const d = dist(s, c)
        if (d < bd) {
          bd = d
          best = ci
        }
      })
      if (assign[i] !== best) moved = true
      assign[i] = best
    })
    const acc = cents.map(() => ({ L: 0, a: 0, b: 0, n: 0 }))
    samples.forEach((s, i) => {
      const t = acc[assign[i]]
      t.L += s.L
      t.a += s.a
      t.b += s.b
      t.n++
    })
    cents = acc.map((t, ci) => (t.n ? { L: t.L / t.n, a: t.a / t.n, b: t.b / t.n } : cents[ci]))
    if (!moved && iter > 0) break
  }

  let clusters = cents.map((c, ci) => ({ c, n: 0, ci })).map((cl) => ({ ...cl, n: assign.filter((a) => a === cl.ci).length })).filter((cl) => cl.n > 0)

  // Merge clusters that are really one colour under different light.
  for (;;) {
    let pair: [number, number] | null = null
    let bd = 0.06
    for (let i = 0; i < clusters.length; i++)
      for (let j = i + 1; j < clusters.length; j++) {
        const d = dist(clusters[i].c, clusters[j].c)
        if (d < bd) {
          bd = d
          pair = [i, j]
        }
      }
    if (!pair) break
    const [a, b] = [clusters[pair[0]], clusters[pair[1]]]
    const n = a.n + b.n
    const merged = { ci: a.ci, n, c: { L: (a.c.L * a.n + b.c.L * b.n) / n, a: (a.c.a * a.n + b.c.a * b.n) / n, b: (a.c.b * a.n + b.c.b * b.n) / n } }
    clusters = clusters.filter((_, i) => i !== pair[0] && i !== pair[1]).concat(merged)
  }

  clusters.sort((a, b) => b.n - a.n)
  const total = clusters.reduce((s, c) => s + c.n, 0)
  const [first, second] = clusters
  const hasSecond = !!second && second.n / total >= 0.15 && dist(first.c, second.c) > 0.1
  return {
    primary: oklabToHex(first.c),
    secondary: hasSecond ? oklabToHex(second.c) : null,
    pattern: hasSecond && second.n / total >= 0.3,
  }
}

/**
 * Fallback when there's no cut-out: average the centre of the frame,
 * skipping pixels that look like the surface (the colour around the edges)
 * and near-white or near-black pixels (glare and shadow).
 */
export function centreColour(p: Pixels): string | null {
  const { width: w, height: h } = p
  const px = (x: number, y: number) => {
    const o = (y * w + x) * 4
    return [p.data[o], p.data[o + 1], p.data[o + 2]]
  }
  // Surface estimate: per-channel median of a ring of edge pixels.
  const ring: number[][] = []
  const stepX = Math.max(1, Math.floor(w / 40))
  const stepY = Math.max(1, Math.floor(h / 40))
  for (let x = 0; x < w; x += stepX) ring.push(px(x, 0), px(x, h - 1))
  for (let y = 0; y < h; y += stepY) ring.push(px(0, y), px(w - 1, y))
  const median = (c: number) => ring.map((v) => v[c]).sort((a, b) => a - b)[ring.length >> 1]
  const surface = [median(0), median(1), median(2)]

  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let y = Math.floor(h * 0.3); y < Math.ceil(h * 0.7); y++)
    for (let x = Math.floor(w * 0.3); x < Math.ceil(w * 0.7); x++) {
      const [pr, pg, pb] = px(x, y)
      const mx = Math.max(pr, pg, pb)
      const mn = Math.min(pr, pg, pb)
      if ((mx > 245 && mn > 235) || mx < 14) continue
      if (Math.abs(pr - surface[0]) + Math.abs(pg - surface[1]) + Math.abs(pb - surface[2]) < 45) continue
      r += pr
      g += pg
      b += pb
      n++
    }
  return n ? rgbHex(Math.round(r / n), Math.round(g / n), Math.round(b / n)) : null
}
