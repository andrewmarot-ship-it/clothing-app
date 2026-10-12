import type { IncomingMessage, ServerResponse } from 'node:http'

/** Hard cap on request bodies, checked while reading so a huge upload can't fill memory. */
export const MAX_BODY = 6 * 1024 * 1024

export class BodyTooLarge extends Error {}

/** Node request → web Request, for the fetch-style route handlers. */
export async function toRequest(req: IncomingMessage, maxBody = MAX_BODY): Promise<Request> {
  if (Number(req.headers['content-length'] ?? 0) > maxBody) throw new BodyTooLarge()
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > maxBody) throw new BodyTooLarge()
    chunks.push(chunk as Buffer)
  }
  const headers = new Headers()
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
  const body = chunks.length ? Buffer.concat(chunks) : undefined
  return new Request(`http://localhost${req.url ?? '/'}`, { method: req.method, headers, body })
}

/** Web Response → Node response. */
export async function send(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status
  response.headers.forEach((v, k) => res.setHeader(k, v))
  res.end(Buffer.from(await response.arrayBuffer()))
}
