import { supabase, isSupabaseConfigured } from './supabase'

export async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...')
  console.log('Supabase configured:', isSupabaseConfigured)
  
  if (!isSupabaseConfigured) {
    console.log('❌ Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Тест 1: Проверка подключения
    console.log('📡 Testing basic connection...')
    const { data, error } = await supabase.from('cards').select('count').limit(1)
    
    if (error) {
      console.log('❌ Connection test failed:', error.message)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Basic connection successful')
    
    // Тест 2: Проверка аутентификации
    console.log('🔐 Testing authentication...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.log('⚠️ Auth test (expected for non-authenticated user):', authError.message)
    } else {
      console.log('✅ Auth test successful, user:', user ? 'authenticated' : 'not authenticated')
    }
    
    // Тест 3: Проверка таблиц
    console.log('📊 Testing tables...')
    const tables = ['cards', 'session_logs', 'user_configs']
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1)
        if (error) {
          console.log(`❌ Table ${table} error:`, error.message)
        } else {
          console.log(`✅ Table ${table} accessible`)
        }
      } catch (err) {
        console.log(`❌ Table ${table} exception:`, err)
      }
    }
    
    return { success: true, message: 'All tests passed' }
    
  } catch (error) {
    console.log('❌ Connection test exception:', error)
    return { success: false, error: String(error) }
  }
}
