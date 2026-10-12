/**
 * Stopgap spend guard for the paid photo APIs until sign-in exists: a cap
 * per client per rolling hour, and a cap across everyone per rolling day.
 * In-memory, so it resets on redeploy; fine for a single Railway replica.
 */
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export interface RateLimitOptions {
  perHour: number
  perDay: number
  now?: () => number
}

export type Verdict = { ok: true } | { ok: false; retryAfter: number; scope: 'client' | 'global' }

export class RateLimiter {
  private readonly perHour: number
  private readonly perDay: number
  private readonly now: () => number
  private readonly clients = new Map<string, number[]>()
  private day: number[] = []

  constructor({ perHour, perDay, now = Date.now }: RateLimitOptions) {
    this.perHour = perHour
    this.perDay = perDay
    this.now = now
  }

  /** Record a request from `client` if it's within limits. */
  check(client: string): Verdict {
    const t = this.now()
    this.day = this.day.filter((x) => x > t - DAY)
    const hits = (this.clients.get(client) ?? []).filter((x) => x > t - HOUR)
    if (this.clients.size > 10_000) this.sweep(t)

    if (hits.length >= this.perHour) {
      this.clients.set(client, hits)
      return { ok: false, retryAfter: Math.ceil((hits[0] + HOUR - t) / 1000), scope: 'client' }
    }
    if (this.day.length >= this.perDay) return { ok: false, retryAfter: Math.ceil((this.day[0] + DAY - t) / 1000), scope: 'global' }

    hits.push(t)
    this.clients.set(client, hits)
    this.day.push(t)
    return { ok: true }
  }

  /** Drop clients with no hits in the last hour, so the map can't grow without bound. */
  private sweep(t: number) {
    for (const [k, v] of this.clients) if (!v.some((x) => x > t - HOUR)) this.clients.delete(k)
  }
}

/**
 * The client's address as Railway's edge saw it. Prefer X-Real-IP; otherwise
 * take the last X-Forwarded-For entry, since earlier entries can be set by
 * the client itself.
 */
export function clientIp(headers: Headers): string {
  const real = headers.get('x-real-ip')?.trim()
  if (real) return real
  const fwd = headers.get('x-forwarded-for')
  const last = fwd?.split(',').map((s) => s.trim()).filter(Boolean).pop()
  return last || 'unknown'
}

type Route = (request: Request) => Promise<Response>

/** Wrap a route so requests over the limit get a 429 without reaching it. */
export function rateLimited(route: Route, limiter: RateLimiter): Route {
  return async (request) => {
    const v = limiter.check(clientIp(request.headers))
    if (v.ok) return route(request)
    return new Response(JSON.stringify({ error: 'rate_limited', scope: v.scope }), {
      status: 429,
      headers: { 'content-type': 'application/json', 'retry-after': String(v.retryAfter), 'cache-control': 'no-store' },
    })
  }
}
