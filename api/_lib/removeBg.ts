import { ProviderError, type Image } from './handler.js'

const ENDPOINT = 'https://api.remove.bg/v1.0/removebg'

/**
 * Background removal via remove.bg. Returns a full-frame PNG (crop=false) so
 * the client can line the mask up with the original photo for white balance.
 * Swap this module to change provider; the handler only needs the PNG.
 */
export async function removeBackground(img: Image, apiKey = process.env.BG_REMOVAL_API_KEY): Promise<Uint8Array> {
  if (!apiKey) throw new ProviderError('not_configured', 'BG_REMOVAL_API_KEY is not set')
  const form = new FormData()
  form.append('image_file', new Blob([img.bytes], { type: img.type }), 'photo')
  form.append('size', 'auto')
  form.append('type', 'product')
  form.append('format', 'png')
  form.append('crop', 'false')

  const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'X-Api-Key': apiKey }, body: form })
  if (!res.ok) {
    const code = res.status === 402 ? 'no_credits' : res.status === 403 ? 'bad_key' : res.status === 429 ? 'rate_limited' : res.status === 400 ? 'unreadable' : 'failed'
    throw new ProviderError(code, `remove.bg ${res.status}: ${await res.text().catch(() => '')}`)
  }
  return new Uint8Array(await res.arrayBuffer())
}
