import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

declare const __PUBLIC_SUPABASE_URL__: string

let browserClient: SupabaseClient | null = null

export const publicSupabaseUrl = __PUBLIC_SUPABASE_URL__ || ''
export const publicSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || ''
export const supabaseAuthEnabled = Boolean(publicSupabaseUrl && publicSupabaseAnonKey)

export function getSupabaseBrowserClient() {
  if (!supabaseAuthEnabled) {
    return null
  }

  if (!browserClient) {
    browserClient = createClient(publicSupabaseUrl, publicSupabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }

  return browserClient
}

export async function getCurrentSession(): Promise<Session | null> {
  const client = getSupabaseBrowserClient()

  if (!client) {
    return null
  }

  const { data } = await client.auth.getSession()
  return data.session ?? null
}
