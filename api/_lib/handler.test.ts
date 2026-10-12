import { describe, expect, it, vi } from 'vitest'
import { normaliseTags } from '../../src/domain/tags.js'
import { MAX_BYTES, ProviderError, createHandler, type ProcessPhotoResponse, type Providers } from './handler.js'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
const TAGS = { isGarment: true, category: 'top', kind: 'shirt', name: 'linen shirt', fabric: 'linen', colourName: 'cream', formality: 2, warmth: 1, pattern: false }

function request(file?: Blob) {
  const form = new FormData()
  if (file) form.append('image', file, 'photo.jpg')
  return new Request('http://x/api/process-photo', { method: 'POST', body: form })
}
const jpeg = (size = 10) => new Blob([new Uint8Array(size)], { type: 'image/jpeg' })

function providers(over: Partial<Providers> = {}): Providers {
  return { removeBackground: vi.fn(async () => PNG), tagGarment: vi.fn(async () => TAGS), ...over }
}

describe('process-photo handler', () => {
  it('returns the cut-out and normalised tags', async () => {
    const p = providers()
    const res = await createHandler(p)(request(jpeg()))
    expect(res.status).toBe(200)
    const body = (await res.json()) as ProcessPhotoResponse
    expect(body.cutout).toBe('data:image/png;base64,iVBORw==')
    expect(body.tags).toMatchObject({ category: 'top', kind: 'shirt', name: 'Linen shirt', fabric: 'Linen', formality: 2 })
    expect(body.errors).toEqual([])
    expect(p.removeBackground).toHaveBeenCalledWith(expect.objectContaining({ type: 'image/jpeg' }))
  })

  it('still returns tags when background removal fails, and vice versa', async () => {
    const noCut = await createHandler(providers({ removeBackground: async () => Promise.reject(new ProviderError('no_credits')) }))(request(jpeg()))
    const a = (await noCut.json()) as ProcessPhotoResponse
    expect(a.cutout).toBeNull()
    expect(a.tags).not.toBeNull()
    expect(a.errors).toEqual(['cutout:no_credits'])

    const noTags = await createHandler(providers({ tagGarment: async () => Promise.reject(new Error('boom')) }))(request(jpeg()))
    const b = (await noTags.json()) as ProcessPhotoResponse
    expect(b.cutout).not.toBeNull()
    expect(b.errors).toEqual(['tags:failed'])
  })

  it('rejects bad uploads before calling any provider', async () => {
    const p = providers()
    const h = createHandler(p)
    expect((await h(request())).status).toBe(400)
    expect((await h(request(new Blob(['x'], { type: 'text/plain' })))).status).toBe(415)
    expect((await h(request(jpeg(MAX_BYTES + 1)))).status).toBe(413)
    expect((await h(new Request('http://x', { method: 'POST', body: 'nope' }))).status).toBe(400)
    expect(p.removeBackground).not.toHaveBeenCalled()
    expect(p.tagGarment).not.toHaveBeenCalled()
  })
})

describe('normaliseTags', () => {
  it('maps unsupported kinds to the category default and clamps scales', () => {
    expect(normaliseTags({ ...TAGS, category: 'bottom', kind: 'other', formality: 9, warmth: 0 })).toMatchObject({ kind: 'jeans', formality: 4, warmth: 1 })
    expect(normaliseTags({ category: 'other' })).toMatchObject({ category: 'other', kind: 'tee', name: 'New piece', isGarment: true })
    expect(normaliseTags('junk')).toBeNull()
  })

  it('keeps a kind that belongs to its category only', () => {
    expect(normaliseTags({ ...TAGS, category: 'top', kind: 'skirt' })!.kind).toBe('tee')
  })
})
