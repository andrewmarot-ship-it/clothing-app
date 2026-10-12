import { createClient } from '@supabase/supabase-js'

/** Resolves an access token to a user id, or null if it isn't valid. */
export type Verify = (token: string) => Promise<string | null>

type Route = (request: Request) => Promise<Response>

const users = new WeakMap<Request, string>()

/** The signed-in user a request was verified for, if any. */
export const userOf = (request: Request) => users.get(request)

/**
 * Verifies Supabase access tokens. The same public URL and publishable key
 * the client is built with are enough: getClaims checks the signature
 * against the project's published keys. Null when sign-in isn't set up,
 * in which case routes stay open (local development).
 */
export function supabaseVerifier(env: NodeJS.ProcessEnv = process.env): Verify | null {
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return null
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  return async (token) => {
    const { data, error } = await sb.auth.getClaims(token)
    const sub = data?.claims?.sub
    return error || typeof sub !== 'string' ? null : sub
  }
}

const unauthorized = () =>
  new Response(JSON.stringify({ error: 'sign_in_required' }), {
    status: 401,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'www-authenticate': 'Bearer' },
  })

/** Require a valid `Authorization: Bearer <token>` when sign-in is set up. */
export function withUser(route: Route, verify: Verify | null): Route {
  if (!verify) return route
  return async (request) => {
    const header = request.headers.get('authorization') ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
    const uid = token ? await verify(token).catch(() => null) : null
    if (!uid) return unauthorized()
    users.set(request, uid)
    return route(request)
  }
}
