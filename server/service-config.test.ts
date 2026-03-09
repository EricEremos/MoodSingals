import { describe, expect, it } from 'vitest'
import { readServiceHealth, requireSupabaseConfig } from './service-config'

describe('readServiceHealth', () => {
  it('treats a Supabase anon key as sufficient server access for user-scoped routes', () => {
    const health = readServiceHealth({
      SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'public-anon-key',
    })

    expect(health.supabase.configured).toBe(true)
    expect(health.mode).toBe('partial')
    expect(health.warnings).toEqual([])
  })
})

describe('requireSupabaseConfig', () => {
  it('falls back to the public anon key when no service role key is present', () => {
    const config = requireSupabaseConfig({
      SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'public-anon-key',
    })

    expect(config.url).toBe('https://example.supabase.co')
    expect(config.projectKey).toBe('public-anon-key')
    expect(config.serviceRoleKey).toBeUndefined()
  })
})
