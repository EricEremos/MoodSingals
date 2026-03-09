import { handleHealthRequest } from '../../server/service-api'
import type { ServiceEnv } from '../../server/service-config'

type PagesContext = {
  env: ServiceEnv
}

export const onRequestGet = ({ env }: PagesContext) => handleHealthRequest(env)
