import { occasionFromAi, type Occasion } from '../domain/occasions'
import { accessToken } from './cloud'

const cache = new Map<string, Occasion>()

/**
 * Claude's reading of a typed occasion, or null when it isn't available
 * (signed out, offline, limit hit, provider down). The caller then keeps
 * the keyword reading.
 */
export async function readOccasion(text: string, today: string, signal?: AbortSignal): Promise<Occasion | null> {
  const key = `${today}|${text.trim().toLowerCase()}`
  const hit = cache.get(key)
  if (hit) return hit
  const token = await accessToken()
  try {
    const res = await fetch('/api/occasion', {
      method: 'POST',
      signal,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ text: text.trim(), today }),
    })
    if (!res.ok) return null
    const body = (await res.json()) as { occasion?: unknown }
    const occasion = occasionFromAi(body.occasion, text, today)
    if (occasion) cache.set(key, occasion)
    return occasion
  } catch {
    return null
  }
}
