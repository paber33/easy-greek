import { supabase } from './supabase'

/**
 * Очищает все токены аутентификации из localStorage
 */
export function clearAuthTokens() {
  try {
    // Получаем все ключи localStorage
    const keys = Object.keys(localStorage)
    
    // Удаляем все ключи, связанные с Supabase аутентификацией
    keys.forEach(key => {
      if (key.startsWith('sb-') && key.includes('auth-token')) {
        localStorage.removeItem(key)
      }
    })
    
    // Также очищаем sessionStorage
    const sessionKeys = Object.keys(sessionStorage)
    sessionKeys.forEach(key => {
      if (key.startsWith('sb-') && key.includes('auth-token')) {
        sessionStorage.removeItem(key)
      }
    })
    
    console.log('Auth tokens cleared')
  } catch (error) {
    console.error('Error clearing auth tokens:', error)
  }
}

/**
 * Проверяет и исправляет поврежденную сессию
 */
export async function fixBrokenSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Session error detected:', error)
      
      // Если ошибка связана с refresh token, очищаем все токены
      if (error.message.includes('refresh token') || error.message.includes('Invalid Refresh Token')) {
        clearAuthTokens()
        await supabase.auth.signOut()
        return { success: false, needsReauth: true }
      }
    }
    
    return { success: true, session }
  } catch (error) {
    console.error('Error fixing session:', error)
    clearAuthTokens()
    return { success: false, needsReauth: true }
  }
}

/**
 * Безопасный вход в систему с обработкой ошибок
 */
export async function safeSignIn(email: string, password: string) {
  try {
    // Сначала очищаем возможные поврежденные токены
    clearAuthTokens()
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      throw error
    }
    
    return { success: true, data }
  } catch (error: any) {
    console.error('Sign in error:', error)
    
    // Если ошибка связана с токенами, очищаем их
    if (error.message.includes('refresh token') || error.message.includes('Invalid Refresh Token')) {
      clearAuthTokens()
    }
    
    return { success: false, error: error.message }
  }
}

/**
 * Безопасная регистрация с обработкой ошибок
 */
export async function safeSignUp(email: string, password: string) {
  try {
    // Очищаем возможные поврежденные токены
    clearAuthTokens()
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    
    if (error) {
      throw error
    }
    
    return { success: true, data }
  } catch (error: any) {
    console.error('Sign up error:', error)
    return { success: false, error: error.message }
  }
}
