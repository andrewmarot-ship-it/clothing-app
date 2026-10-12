import { describe, expect, it } from 'vitest'
import { RateLimiter, clientIp, rateLimited } from './rateLimit.ts'

const HOUR = 3600_000

function clock(start = 1_000_000) {
  let t = start
  return { now: () => t, advance: (ms: number) => (t += ms) }
}

describe('RateLimiter', () => {
  it('caps each client per rolling hour, independently', () => {
    const c = clock()
    const rl = new RateLimiter({ perHour: 3, perDay: 100, now: c.now })
    for (let i = 0; i < 3; i++) expect(rl.check('a').ok).toBe(true)
    const v = rl.check('a')
    expect(v).toMatchObject({ ok: false, scope: 'client', retryAfter: 3600 })
    expect(rl.check('b').ok).toBe(true)
  })

  it('frees a slot once the oldest hit leaves the window', () => {
    const c = clock()
    const rl = new RateLimiter({ perHour: 2, perDay: 100, now: c.now })
    rl.check('a')
    c.advance(10 * 60_000)
    rl.check('a')
    expect(rl.check('a').ok).toBe(false)
    c.advance(50 * 60_000 + 1)
    expect(rl.check('a').ok).toBe(true)
    expect(rl.check('a').ok).toBe(false)
  })

  it('caps everyone together per day', () => {
    const c = clock()
    const rl = new RateLimiter({ perHour: 100, perDay: 3, now: c.now })
    expect(['a', 'b', 'c'].map((ip) => rl.check(ip).ok)).toEqual([true, true, true])
    expect(rl.check('d')).toMatchObject({ ok: false, scope: 'global' })
    c.advance(24 * HOUR + 1)
    expect(rl.check('d').ok).toBe(true)
  })

  it("doesn't count rejected requests", () => {
    const c = clock()
    const rl = new RateLimiter({ perHour: 1, perDay: 2, now: c.now })
    rl.check('a')
    rl.check('a')
    rl.check('a')
    expect(rl.check('b').ok).toBe(true)
  })
})

describe('clientIp', () => {
  const h = (init: Record<string, string>) => new Headers(init)
  it('prefers X-Real-IP, then the last X-Forwarded-For entry', () => {
    expect(clientIp(h({ 'x-real-ip': '9.9.9.9', 'x-forwarded-for': '1.1.1.1' }))).toBe('9.9.9.9')
    expect(clientIp(h({ 'x-forwarded-for': '6.6.6.6, 2.2.2.2' }))).toBe('2.2.2.2')
    expect(clientIp(h({}))).toBe('unknown')
  })
})

describe('rateLimited', () => {
  it('answers 429 with Retry-After without calling the route', async () => {
    let calls = 0
    const route = rateLimited(async () => (calls++, new Response('ok')), new RateLimiter({ perHour: 1, perDay: 10 }))
    const req = () => new Request('http://x/api/process-photo', { method: 'POST', headers: { 'x-real-ip': '1.2.3.4' } })
    expect((await route(req())).status).toBe(200)
    const res = await route(req())
    expect(res.status).toBe(429)
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(await res.json()).toMatchObject({ error: 'rate_limited', scope: 'client' })
    expect(calls).toBe(1)
  })
})
