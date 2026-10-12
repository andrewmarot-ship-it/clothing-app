import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite'

/**
 * Serve the Vercel functions in `api/` from the Vite dev server, so
 * `npm run dev` works end to end without the Vercel CLI. Keys come from
 * `.env.local` (see `.env.example`).
 */
function devApi(): Plugin {
  const routes: Record<string, string> = { '/api/process-photo': '/api/process-photo.ts' }

  async function toRequest(req: IncomingMessage): Promise<Request> {
    const chunks: Buffer[] = []
    for await (const c of req) chunks.push(c as Buffer)
    const headers = new Headers()
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
    const body = chunks.length ? Buffer.concat(chunks) : undefined
    return new Request(`http://localhost${req.url}`, { method: req.method, headers, body })
  }

  async function send(res: ServerResponse, response: Response) {
    res.statusCode = response.status
    response.headers.forEach((v, k) => res.setHeader(k, v))
    res.end(Buffer.from(await response.arrayBuffer()))
  }

  return {
    name: 'clothesline-dev-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0] ?? ''
        const file = routes[path]
        if (!file) return next()
        try {
          const mod = (await server.ssrLoadModule(file)) as Record<string, (r: Request) => Promise<Response>>
          const handler = mod[req.method ?? 'GET']
          if (!handler) return send(res, new Response('Method not allowed', { status: 405 }))
          await send(res, await handler(await toRequest(req)))
        } catch (e) {
          server.config.logger.error(String(e))
          await send(res, new Response('Internal error', { status: 500 }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Expose server-side keys from .env.local to the dev API (never to the client bundle).
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return { plugins: [react(), devApi()] }
})
