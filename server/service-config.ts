export type ServiceEnv = {
  GENERATION_API_KEY?: string
  GENERATION_API_URL?: string
  GENERATION_MODEL?: string
  GENERATION_PROVIDER_NAME?: string
  SUPABASE_URL?: string
  SUPABASE_ANON_KEY?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  VITE_SUPABASE_ANON_KEY?: string
}

export type ServiceHealth = {
  mode: 'local-only' | 'partial' | 'connected'
  warnings: string[]
  generation: {
    configured: boolean
    providerName: string
    model: string | null
    endpointHost: string | null
  }
  supabase: {
    configured: boolean
    projectHost: string | null
  }
}

function clean(value?: string) {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

function hostFromUrl(value?: string) {
  if (!value) return null

  try {
    return new URL(value).host
  } catch {
    return null
  }
}

function resolveSupabaseProjectKey(env: ServiceEnv) {
  return (
    clean(env.SUPABASE_ANON_KEY) ??
    clean(env.VITE_SUPABASE_ANON_KEY) ??
    clean(env.SUPABASE_SERVICE_ROLE_KEY)
  )
}

export function readServiceHealth(env: ServiceEnv): ServiceHealth {
  const generationApiKey = clean(env.GENERATION_API_KEY)
  const generationApiUrl = clean(env.GENERATION_API_URL)
  const generationModel = clean(env.GENERATION_MODEL)
  const generationProviderName = clean(env.GENERATION_PROVIDER_NAME) ?? 'Configured provider'
  const supabaseUrl = clean(env.SUPABASE_URL)
  const supabaseProjectKey = resolveSupabaseProjectKey(env)

  const warnings: string[] = []

  const generationFields = [generationApiKey, generationApiUrl, generationModel]
  const generationReady = generationFields.every(Boolean)
  const generationPartial = generationFields.some(Boolean) && !generationReady

  if (generationPartial) {
    warnings.push('Generation service is partially configured. Set key, URL, and model together.')
  }

  if (generationApiUrl && !hostFromUrl(generationApiUrl)) {
    warnings.push('Generation API URL is not a valid absolute URL.')
  }

  const supabaseFields = [supabaseUrl, supabaseProjectKey]
  const supabaseReady = supabaseFields.every(Boolean)
  const supabasePartial = supabaseFields.some(Boolean) && !supabaseReady

  if (supabasePartial) {
    warnings.push(
      'Supabase is partially configured. Set the project URL and either an anon key or service role key.',
    )
  }

  if (supabaseUrl && !hostFromUrl(supabaseUrl)) {
    warnings.push('Supabase URL is not a valid absolute URL.')
  }

  const mode =
    generationReady && supabaseReady
      ? 'connected'
      : generationReady || supabaseReady
        ? 'partial'
        : 'local-only'

  return {
    mode,
    warnings,
    generation: {
      configured: generationReady,
      providerName: generationProviderName,
      model: generationModel ?? null,
      endpointHost: hostFromUrl(generationApiUrl),
    },
    supabase: {
      configured: supabaseReady,
      projectHost: hostFromUrl(supabaseUrl),
    },
  }
}

export function requireGenerationConfig(env: ServiceEnv) {
  if (!env.GENERATION_API_KEY || !env.GENERATION_API_URL || !env.GENERATION_MODEL) {
    throw new Error('Generation service is not configured on the server.')
  }

  return {
    apiKey: env.GENERATION_API_KEY,
    apiUrl: env.GENERATION_API_URL,
    model: env.GENERATION_MODEL,
    providerName: env.GENERATION_PROVIDER_NAME?.trim() || 'Configured provider',
  }
}

export function requireSupabaseConfig(env: ServiceEnv) {
  const url = clean(env.SUPABASE_URL)
  const projectKey = resolveSupabaseProjectKey(env)
  const serviceRoleKey = clean(env.SUPABASE_SERVICE_ROLE_KEY)

  if (!url || !projectKey) {
    throw new Error('Supabase server access is not configured on the server.')
  }

  return {
    url,
    projectKey,
    serviceRoleKey,
  }
}
