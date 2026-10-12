import { normaliseTags, type GarmentTags } from '../domain/tags'

/** The server's photo limit was hit; carries the wait in seconds. */
export class RateLimitedError extends Error {
  readonly retryAfter: number
  constructor(retryAfter: number) {
    super('rate_limited')
    this.retryAfter = retryAfter
  }
}

export interface ServerResult {
  cutout: Blob | null
  tags: GarmentTags | null
  errors: string[]
}

/** Send a photo to /api/process-photo for background removal and tagging. */
export async function requestProcessing(image: Blob, signal?: AbortSignal): Promise<ServerResult> {
  const form = new FormData()
  form.append('image', image, 'photo.jpg')
  const res = await fetch('/api/process-photo', { method: 'POST', body: form, signal })
  if (res.status === 429) throw new RateLimitedError(Number(res.headers.get('retry-after')) || 3600)
  if (!res.ok) throw new Error(`process-photo ${res.status}`)
  const body = (await res.json()) as { cutout?: unknown; tags?: unknown; errors?: unknown }
  const cutout = typeof body.cutout === 'string' && body.cutout.startsWith('data:image/') ? await (await fetch(body.cutout)).blob() : null
  return {
    cutout,
    tags: normaliseTags(body.tags),
    errors: Array.isArray(body.errors) ? body.errors.filter((e): e is string => typeof e === 'string') : [],
  }
}
