import { handleApiRequest } from '../../server/service-api'
import type { ServiceEnv } from '../../server/service-config'

type PagesContext = {
  env: ServiceEnv
  request: Request
}

export const onRequest = async ({ env, request }: PagesContext) =>
  (await handleApiRequest(request, env)) ?? new Response('Not Found', { status: 404 })
