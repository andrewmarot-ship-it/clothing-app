import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { BodyTooLarge, send, toRequest } from './server/node.ts'

/**
 * Serve the API routes from the Vite dev server, so `npm run dev` works end
 * to end. Keys come from `.env.local` (see `.env.example`).
 */
type RouteTable = Record<string, Partial<Record<string, (request: Request) => Promise<Response>>>>

function devApi(): Plugin {
  return {
    name: 'clothesline-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0] ?? ''
        if (!path.startsWith('/api/')) return next()
        try {
          const { routes } = (await server.ssrLoadModule('/server/routes.ts')) as { routes: RouteTable }
          const handler = routes[path]?.[req.method ?? 'GET']
          if (!handler) return send(res, new Response('Not found', { status: 404 }))
          await send(res, await handler(await toRequest(req)))
        } catch (e) {
          if (e instanceof BodyTooLarge) return send(res, new Response('Payload too large', { status: 413 }))
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
