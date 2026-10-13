/**
 * The flat-lay photo pipeline (browser side). Pixel maths lives in
 * pixels.ts; this file handles canvases, the network call and ordering.
 */
import { RateLimitedError, SignInRequiredError, requestProcessing } from '../state/processPhoto'
import {
  alphaBBox,
  applyGains,
  backgroundGains,
  centreColour,
  checkQuality,
  dominantColours,
  fillSmallHoles,
  largestComponent,
  maskFromAlpha,
  maskStats,
  refineAlpha,
  straightenBy,
  type Pixels,
  type QualityIssue,
} from './pixels.ts'
import { keepGarment, measureShape, placeGarment, type Frame } from './frame.ts'
import type { GarmentTags } from './tags.ts'
import type { Category } from './types.ts'

/** Upload and working size. Big enough for the item screen at 2×, small enough to send quickly. */
const WORK_SIDE = 1024
const QUALITY_SIDE = 256
const FALLBACK_COLOUR = '#b8946a'

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D is not available')
  return { c, ctx }
}

function draw(src: CanvasImageSource, sw: number, sh: number, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(sw, sh))
  const out = canvas(Math.max(1, Math.round(sw * scale)), Math.max(1, Math.round(sh * scale)))
  out.ctx.drawImage(src, 0, 0, out.c.width, out.c.height)
  return out
}

const pixelsOf = ({ c, ctx }: ReturnType<typeof canvas>): Pixels => {
  const d = ctx.getImageData(0, 0, c.width, c.height)
  return { width: d.width, height: d.height, data: d.data }
}

function toBlob(c: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), type, quality))
}

export interface PreparedPhoto {
  /** ≤1024px JPEG to send to the server; also kept as the original. */
  upload: Blob
  /** The same image as pixels, for white balance and the fallback colour. */
  pixels: Pixels
  /** Advisory: the user may retake or carry on. */
  issue: QualityIssue | null
}

/** Decode (honouring camera rotation), downscale and check the photo. */
export async function preparePhoto(file: Blob): Promise<PreparedPhoto> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const work = draw(img, img.naturalWidth, img.naturalHeight, WORK_SIDE)
    const small = draw(work.c, work.c.width, work.c.height, QUALITY_SIDE)
    return { upload: await toBlob(work.c, 'image/jpeg', 0.88), pixels: pixelsOf(work), issue: checkQuality(pixelsOf(small)) }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export type Warning =
  /** The garment runs off the edge of the frame. */
  | 'cut_off'
  /** Background removal was unavailable: no cut-out, colour from the centre of the photo. */
  | 'no_cutout'
  /** Tagging was unavailable: the user fills in the details. */
  | 'no_tags'
  /** A dress, coat, shoes…: the app only has tops and bottoms for now. */
  | 'not_supported'

export class PhotoError extends Error {
  readonly code: 'no_garment'
  constructor(code: 'no_garment') {
    super(code)
    this.code = code
  }
}

export interface AnalysedPhoto {
  /** Normalised transparent cut-out, or null when background removal failed. */
  photo: Blob | null
  original: Blob
  color: string
  color2: string | null
  pattern: boolean
  tags: GarmentTags | null
  warnings: Warning[]
}

/** Pipeline stages, matching the four steps on the Add screen. */
export type Stage = 0 | 1 | 2 | 3

async function blobPixels(blob: Blob, w: number, h: number): Promise<Pixels> {
  const bmp = await createImageBitmap(blob)
  try {
    // Stretch to the original's size so the mask lines up pixel for pixel.
    const out = canvas(w, h)
    out.ctx.drawImage(bmp, 0, 0, w, h)
    return pixelsOf(out)
  } finally {
    bmp.close()
  }
}

/** Straighten, crop to the garment with a little padding, and encode with transparency. */
async function normaliseCutout(px: Pixels, angle: number): Promise<Blob> {
  const src = canvas(px.width, px.height)
  src.ctx.putImageData(new ImageData(new Uint8ClampedArray(px.data), px.width, px.height), 0, 0)

  const rad = (straightenBy(angle) * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  const rot = canvas(Math.ceil(px.width * cos + px.height * sin), Math.ceil(px.width * sin + px.height * cos))
  rot.ctx.translate(rot.c.width / 2, rot.c.height / 2)
  rot.ctx.rotate(rad)
  rot.ctx.drawImage(src.c, -px.width / 2, -px.height / 2)

  const box = alphaBBox(pixelsOf(rot)) ?? { x0: 0, y0: 0, x1: rot.c.width - 1, y1: rot.c.height - 1 }
  const bw = box.x1 - box.x0 + 1
  const bh = box.y1 - box.y0 + 1
  const pad = Math.round(Math.max(bw, bh) * 0.06)
  const sx = Math.max(0, box.x0 - pad)
  const sy = Math.max(0, box.y0 - pad)
  const sw = Math.min(rot.c.width - sx, bw + 2 * pad)
  const sh = Math.min(rot.c.height - sy, bh + 2 * pad)

  const scale = Math.min(1, WORK_SIDE / Math.max(sw, sh))
  const out = canvas(Math.round(sw * scale), Math.round(sh * scale))
  out.ctx.drawImage(rot.c, sx, sy, sw, sh, 0, 0, out.c.width, out.c.height)

  return encodeCutout(out.c)
}

async function encodeCutout(c: HTMLCanvasElement): Promise<Blob> {
  const webp = await toBlob(c, 'image/webp', 0.9).catch(() => null)
  // Older Safari can't encode WebP and silently hands back a PNG instead.
  return webp && webp.type === 'image/webp' ? webp : toBlob(c, 'image/png')
}

/**
 * Redraw a cut-out on its category's standard canvas (see frame.ts), so
 * pieces of a kind come out the same size. Works on any stored cut-out,
 * framed before or not. Null if the image has no garment in it.
 */
export async function frameCutout(cutout: Blob, cat: Category): Promise<{ photo: Blob; frame: Frame } | null> {
  const bmp = await createImageBitmap(cutout)
  try {
    const src = canvas(bmp.width, bmp.height)
    src.ctx.drawImage(bmp, 0, 0)
    const garment = keepGarment(pixelsOf(src))
    const shape = measureShape(garment)
    if (!shape) return null
    src.ctx.putImageData(new ImageData(new Uint8ClampedArray(garment.data), garment.width, garment.height), 0, 0)
    const p = placeGarment(cat, shape)
    const out = canvas(p.width, p.height)
    out.ctx.imageSmoothingQuality = 'high'
    out.ctx.drawImage(src.c, p.dx, p.dy, bmp.width * p.scale, bmp.height * p.scale)
    return { photo: await encodeCutout(out.c), frame: p.frame }
  } finally {
    bmp.close()
  }
}

export async function analysePhoto(prepared: PreparedPhoto, onStage: (s: Stage) => void, signal?: AbortSignal): Promise<AnalysedPhoto> {
  const { pixels, upload } = prepared
  const warnings: Warning[] = []
  onStage(1)

  let server: Awaited<ReturnType<typeof requestProcessing>> | null = null
  try {
    server = await requestProcessing(upload, signal)
  } catch (e) {
    // A limit is worth telling the user about; any other failure falls back to a drawn piece.
    if (signal?.aborted || e instanceof RateLimitedError || e instanceof SignInRequiredError) throw e
  }
  const tags = server?.tags ?? null
  if (tags && !tags.isGarment) throw new PhotoError('no_garment')
  if (!tags) warnings.push('no_tags')
  if (tags?.category === 'other') warnings.push('not_supported')

  if (!server?.cutout) {
    onStage(2)
    const color = centreColour(pixels) ?? FALLBACK_COLOUR
    onStage(3)
    return { photo: null, original: upload, color, color2: null, pattern: false, tags, warnings: [...warnings, 'no_cutout'] }
  }

  onStage(2)
  const { width: w, height: h } = pixels
  const cut = await blobPixels(server.cutout, w, h)
  const mask = fillSmallHoles(largestComponent(maskFromAlpha(cut), w, h), w, h, Math.round(w * h * 0.005))
  const stats = maskStats(mask, w, h)
  if (!stats || stats.fraction < 0.02) throw new PhotoError('no_garment')
  if (stats.touchesEdge) warnings.push('cut_off')

  // The surface is a free grey card: correct the light before reading colour.
  const gains = backgroundGains(pixels, mask)
  const balanced = gains ? applyGains(cut, gains) : cut
  const colours = dominantColours(balanced, mask)

  onStage(3)
  const photo = await normaliseCutout(refineAlpha(balanced, mask), stats.angle)
  return {
    photo,
    original: upload,
    color: colours?.primary ?? FALLBACK_COLOUR,
    color2: colours?.secondary ?? null,
    pattern: colours?.pattern ?? tags?.pattern ?? false,
    tags,
    warnings,
  }
}
