import { createHandler } from './handler.ts'
import { removeBackground } from './removeBg.ts'
import { tagGarment } from './tagger.ts'

export type Route = (request: Request) => Promise<Response>

/** API routes by path and method. Served by server/index.ts in production and by the Vite dev server locally. */
export const routes: Record<string, Partial<Record<string, Route>>> = {
  '/api/process-photo': { POST: createHandler({ removeBackground: (img) => removeBackground(img), tagGarment }) },
}
