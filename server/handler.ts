import { normaliseTags, type GarmentTags } from '../src/domain/tags.ts'

export interface Image {
  bytes: Uint8Array
  /** e.g. image/jpeg */
  type: string
}

export interface Providers {
  /** Returns a PNG with an alpha channel, same dimensions as the input. */
  removeBackground: (img: Image) => Promise<Uint8Array>
  tagGarment: (img: Image) => Promise<unknown>
}

export interface ProcessPhotoResponse {
  /** data:image/png;base64,… or null if background removal failed. */
  cutout: string | null
  tags: GarmentTags | null
  /** Machine-readable reasons for whatever is missing. */
  errors: string[]
}

/** The client sends ≤1024px JPEGs (well under 1MB); anything near this is not from the app. */
export const MAX_BYTES = 4 * 1024 * 1024
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

/**
 * POST multipart/form-data with an `image` file. Runs background removal
 * and tagging in parallel; either can fail without failing the other.
 */
export function createHandler(providers: Providers) {
  return async function handle(request: Request): Promise<Response> {
    let form: FormData
    try {
      form = await request.formData()
    } catch {
      return json({ error: 'expected multipart/form-data' }, 400)
    }
    const file = form.get('image')
    if (!(file instanceof Blob)) return json({ error: 'missing image' }, 400)
    if (!TYPES.has(file.type)) return json({ error: 'unsupported image type' }, 415)
    if (file.size > MAX_BYTES) return json({ error: 'image too large' }, 413)

    const img: Image = { bytes: new Uint8Array(await file.arrayBuffer()), type: file.type }
    const [cut, tags] = await Promise.allSettled([providers.removeBackground(img), providers.tagGarment(img)])

    const errors: string[] = []
    let cutout: string | null = null
    if (cut.status === 'fulfilled') cutout = `data:image/png;base64,${Buffer.from(cut.value).toString('base64')}`
    else {
      errors.push(`cutout:${errorCode(cut.reason)}`)
      console.error('background removal failed', cut.reason)
    }
    let parsed: GarmentTags | null = null
    if (tags.status === 'fulfilled') parsed = normaliseTags(tags.value)
    else {
      errors.push(`tags:${errorCode(tags.reason)}`)
      console.error('tagging failed', tags.reason)
    }
    if (tags.status === 'fulfilled' && !parsed) errors.push('tags:invalid')

    const body: ProcessPhotoResponse = { cutout, tags: parsed, errors }
    return json(body)
  }
}

export class ProviderError extends Error {
  readonly code: string
  constructor(code: string, message?: string) {
    super(message ?? code)
    this.code = code
  }
}

const errorCode = (e: unknown) => (e instanceof ProviderError ? e.code : 'failed')
