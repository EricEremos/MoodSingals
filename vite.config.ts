import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import {
  handleApiRequest,
  nodeRequestToWebRequest,
  sendWebResponse,
} from './server/service-api'
import type { ServiceEnv } from './server/service-config'

function moodSignalsApiPlugin(mode: string): Plugin {
  const loadedEnv = loadEnv(mode, process.cwd(), '')
  const env: ServiceEnv = {
    GENERATION_API_KEY: loadedEnv.GENERATION_API_KEY ?? process.env.GENERATION_API_KEY,
    GENERATION_API_URL: loadedEnv.GENERATION_API_URL ?? process.env.GENERATION_API_URL,
    GENERATION_MODEL: loadedEnv.GENERATION_MODEL ?? process.env.GENERATION_MODEL,
    GENERATION_PROVIDER_NAME:
      loadedEnv.GENERATION_PROVIDER_NAME ?? process.env.GENERATION_PROVIDER_NAME,
    SUPABASE_URL: loadedEnv.SUPABASE_URL ?? process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY:
      loadedEnv.SUPABASE_ANON_KEY ??
      loadedEnv.VITE_SUPABASE_ANON_KEY ??
      process.env.SUPABASE_ANON_KEY ??
      process.env.VITE_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY:
      loadedEnv.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
    VITE_SUPABASE_ANON_KEY:
      loadedEnv.VITE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY,
  }

  const attachMiddleware = (middlewares: {
    use: (
      handler: (
        req: import('node:http').IncomingMessage,
        res: import('node:http').ServerResponse,
        next: () => void,
      ) => void | Promise<void>,
    ) => void
  }) => {
    middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/api/')) {
        next()
        return
      }

      const request = await nodeRequestToWebRequest(req)
      const response = await handleApiRequest(request, env)

      if (!response) {
        next()
        return
      }

      await sendWebResponse(res, response)
    })
  }

  return {
    name: 'moodsignals-dev-api',
    configureServer(server) {
      attachMiddleware(server.middlewares)
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const loadedEnv = loadEnv(mode, process.cwd(), '')

  return {
    define: {
      __PUBLIC_SUPABASE_URL__: JSON.stringify(
        loadedEnv.VITE_SUPABASE_URL ??
          loadedEnv.SUPABASE_URL ??
          process.env.VITE_SUPABASE_URL ??
          process.env.SUPABASE_URL ??
          '',
      ),
    },
    plugins: [react(), moodSignalsApiPlugin(mode)],
  }
})
