import { supabaseVerifier, userOf, withUser } from './auth.ts'
import { createHandler } from './handler.ts'
import { createOccasionHandler, readOccasion } from './occasion.ts'
import { RateLimiter, clientIp, rateLimited } from './rateLimit.ts'
import { removeBackground } from './removeBg.ts'
import { tagGarment } from './tagger.ts'

export type Route = (request: Request) => Promise<Response>

/** Every photo costs a remove.bg credit and a Claude call, so cap them even for signed-in users. */
const photoLimiter = new RateLimiter({
  perHour: Number(process.env.PHOTO_LIMIT_PER_HOUR) || 30,
  perDay: Number(process.env.PHOTO_LIMIT_PER_DAY) || 300,
})

/** Reading an occasion is a small Claude call; generous, but still bounded. */
const occasionLimiter = new RateLimiter({ perHour: 60, perDay: 2000 })

const byAccount = (r: Request) => {
  const uid = userOf(r)
  return uid ? `user:${uid}` : clientIp(r.headers)
}

const processPhoto = createHandler({ removeBackground: (img) => removeBackground(img), tagGarment })

const verifier = supabaseVerifier()

/** API routes by path and method. Served by server/index.ts in production and by the Vite dev server locally. */
export const routes: Record<string, Partial<Record<string, Route>>> = {
  '/api/process-photo': {
    // Signed-in users only (when sign-in is set up), limited per account, else per IP.
    POST: withUser(rateLimited(processPhoto, photoLimiter, byAccount), verifier),
  },
  '/api/occasion': {
    POST: withUser(rateLimited(createOccasionHandler(readOccasion), occasionLimiter, byAccount), verifier),
  },
}
