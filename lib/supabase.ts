import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Переменные окружения загружены успешно

// Создаем фиктивный клиент если переменные отсутствуют
const dummyUrl = 'https://dummy.supabase.co'
const dummyKey = 'dummy-key'

export const supabase = createClient<Database>(
  supabaseUrl || dummyUrl, 
  supabaseAnonKey || dummyKey, 
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    global: {
      headers: {
        'X-Client-Info': 'easy-greek-app'
      }
    }
  }
)

// Экспортируем флаг для проверки доступности Supabase
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)
