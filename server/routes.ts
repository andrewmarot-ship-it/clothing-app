import { createHandler } from './handler.ts'
import { RateLimiter, rateLimited } from './rateLimit.ts'
import { removeBackground } from './removeBg.ts'
import { tagGarment } from './tagger.ts'

export type Route = (request: Request) => Promise<Response>

/** Every photo costs a remove.bg credit and a Claude call, so cap them until sign-in exists. */
const photoLimiter = new RateLimiter({
  perHour: Number(process.env.PHOTO_LIMIT_PER_HOUR) || 30,
  perDay: Number(process.env.PHOTO_LIMIT_PER_DAY) || 300,
})

/** API routes by path and method. Served by server/index.ts in production and by the Vite dev server locally. */
export const routes: Record<string, Partial<Record<string, Route>>> = {
  '/api/process-photo': {
    POST: rateLimited(createHandler({ removeBackground: (img) => removeBackground(img), tagGarment }), photoLimiter),
  },
}
