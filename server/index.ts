/**
 * Production server (Railway): serves the built app from dist/ and the API
 * routes. Plain node:http, run directly by Node's TypeScript support.
 */
import { createServer, type ServerResponse } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { BodyTooLarge, send, toRequest } from './node.ts'
import { routes } from './routes.ts'

const DIST = resolve(import.meta.dirname, '../dist')
const PORT = Number(process.env.PORT) || 3000

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
}

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
}

function plain(res: ServerResponse, status: number, text: string, headers: Record<string, string> = {}) {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', ...headers })
  res.end(text)
}

async function serveFile(res: ServerResponse, file: string, head: boolean) {
  const body = await readFile(file)
  // Vite fingerprints everything under assets/, so it can be cached forever; index.html must always revalidate.
  const immutable = file.startsWith(join(DIST, 'assets') + sep)
  res.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    'content-length': body.length,
  })
  res.end(head ? undefined : body)
}

async function serveStatic(res: ServerResponse, pathname: string, head: boolean) {
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return plain(res, 400, 'Bad request')
  }
  const file = normalize(join(DIST, decoded))
  if (file !== DIST && !file.startsWith(DIST + sep)) return plain(res, 404, 'Not found')
  const info = await stat(file).catch(() => null)
  if (info?.isFile()) return serveFile(res, file, head)
  // The app is a single page: anything that isn't a file gets index.html.
  if (!extname(decoded)) return serveFile(res, join(DIST, 'index.html'), head)
  return plain(res, 404, 'Not found')
}

const server = createServer(async (req, res) => {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v)
  const { pathname } = new URL(req.url ?? '/', 'http://localhost')
  const method = req.method ?? 'GET'
  try {
    if (pathname === '/healthz') return plain(res, 200, 'ok')

    const route = routes[pathname]
    if (route) {
      const handler = route[method]
      if (!handler) return plain(res, 405, 'Method not allowed', { allow: Object.keys(route).join(', ') })
      return await send(res, await handler(await toRequest(req)))
    }

    if (method !== 'GET' && method !== 'HEAD') return plain(res, 405, 'Method not allowed', { allow: 'GET, HEAD' })
    await serveStatic(res, pathname, method === 'HEAD')
  } catch (e) {
    if (e instanceof BodyTooLarge) return plain(res, 413, 'Payload too large')
    console.error(e)
    if (!res.headersSent) plain(res, 500, 'Internal error')
    else res.end()
  }
})

server.listen(PORT, '0.0.0.0', () => console.log(`Clothesline listening on :${PORT}`))

// Railway sends SIGTERM on redeploy: finish in-flight requests, then exit.
process.on('SIGTERM', () => server.close(() => process.exit(0)))
