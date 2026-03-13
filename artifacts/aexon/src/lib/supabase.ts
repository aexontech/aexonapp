import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

let supabase: SupabaseClient

if (isValidUrl(supabaseUrl) && supabaseAnonKey.length > 0) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
} else {
  if (supabaseUrl || supabaseAnonKey) {
    console.warn('Supabase: URL atau key tidak valid. Periksa format VITE_SUPABASE_URL (harus https://xxx.supabase.co) dan VITE_SUPABASE_ANON_KEY.')
  }
  const handler: ProxyHandler<any> = {
    get: (_target, prop) => {
      if (prop === 'auth') {
        return new Proxy({}, {
          get: () => async () => ({ data: null, error: new Error('Supabase belum dikonfigurasi.') })
        })
      }
      if (prop === 'from') {
        return () => new Proxy({}, {
          get: () => (..._args: any[]) => ({ data: null, error: new Error('Supabase belum dikonfigurasi.') })
        })
      }
      return () => ({ data: null, error: new Error('Supabase belum dikonfigurasi.') })
    }
  }
  supabase = new Proxy({} as SupabaseClient, handler)
}

export { supabase }
