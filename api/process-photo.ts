import { createHandler } from './_lib/handler.js'
import { removeBackground } from './_lib/removeBg.js'
import { tagGarment } from './_lib/tagger.js'

/** Vercel function: POST /api/process-photo (multipart, field `image`). */
const handle = createHandler({ removeBackground: (img) => removeBackground(img), tagGarment })

export function POST(request: Request): Promise<Response> {
  return handle(request)
}
