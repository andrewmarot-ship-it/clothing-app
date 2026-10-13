import { describe, expect, it } from 'vitest'
import { supabaseVerifier, userOf, withUser, type Verify } from './auth.ts'

const verify: Verify = async (token) => (token === 'good' ? 'user-1' : null)
const req = (auth?: string) => new Request('http://x/api/process-photo', { method: 'POST', headers: auth ? { authorization: auth } : {} })

describe('withUser', () => {
  it('rejects missing, malformed and invalid tokens with 401', async () => {
    let calls = 0
    const route = withUser(async () => (calls++, new Response('ok')), verify)
    for (const r of [req(), req('good'), req('Bearer bad'), req('Basic good')]) {
      const res = await route(r)
      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({ error: 'sign_in_required' })
    }
    expect(calls).toBe(0)
  })

  it('passes valid tokens through and records the user', async () => {
    let seen: string | undefined
    const route = withUser(async (r) => ((seen = userOf(r)), new Response('ok')), verify)
    expect((await route(req('Bearer good'))).status).toBe(200)
    expect(seen).toBe('user-1')
  })

  it('treats a verifier that throws as an invalid token', async () => {
    const route = withUser(async () => new Response('ok'), async () => Promise.reject(new Error('jwks down')))
    expect((await route(req('Bearer good'))).status).toBe(401)
  })

  it('stays open when sign-in is not set up', async () => {
    expect(supabaseVerifier({})).toBeNull()
    expect((await withUser(async () => new Response('ok'), null)(req())).status).toBe(200)
  })
})
