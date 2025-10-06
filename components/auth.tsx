'use client'

import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { loadAndSaveUserDataFromSupabase, mergeUserDataWithLocal, syncAllDataToSupabase } from '@/lib/core/storage'
import { testSupabaseConnection } from '@/lib/test-supabase'
import { getTestCards } from '@/lib/test-data'
import { USER_CONFIGS, getUserConfig, getCurrentUserFromEmail } from '@/lib/user-config'
import { clearAuthTokens, fixBrokenSession, safeSignIn, safeSignUp } from '@/lib/auth-utils'
import { toast } from 'sonner'
import { Logo } from '@/components/logo'

export function AuthComponent() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isAutoLogin, setIsAutoLogin] = useState(false)
  const [isLoadingTestData, setIsLoadingTestData] = useState(false)
  const [currentUser, setCurrentUser] = useState<'pavel' | 'aleksandra' | null>(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          setIsSignedIn(!!session)
          
          if (event === 'SIGNED_IN' && session) {
            const userType = getCurrentUserFromEmail(session.user.email || '')
            setCurrentUser(userType)
            
            const userConfig = userType ? getUserConfig(userType) : null
            const userName = userConfig?.name || 'Пользователь'
            
            toast.success(`Добро пожаловать, ${userName}! 👋`)
            // Загружаем данные пользователя из Supabase
            await handleLoadUserData()
          } else if (event === 'SIGNED_OUT') {
            setCurrentUser(null)
            toast.info('Вы вышли из системы')
          } else if (event === 'TOKEN_REFRESHED') {
            console.log('Token refreshed successfully')
          }
        } catch (error) {
          console.error('Auth state change error:', error)
          // Если произошла ошибка с токеном, выходим из системы
          if (error instanceof Error && error.message.includes('refresh token')) {
            await supabase.auth.signOut()
            toast.error('Сессия истекла. Пожалуйста, войдите заново.')
          }
        }
      }
    )

    // Автоматический вход в учетную запись Pavel при загрузке
    const autoLoginOnStartup = async () => {
      try {
        const result = await fixBrokenSession()
        
        if (!result.success) {
          if (result.needsReauth) {
            // Если нужна повторная аутентификация, автоматически входим в Pavel
            setTimeout(() => {
              handleUserLogin('pavel')
            }, 1000)
          }
          return
        }
        
        if (!result.session) {
          // Если пользователь не авторизован, автоматически входим в учетную запись Pavel
          setTimeout(() => {
            handleUserLogin('pavel')
          }, 1000) // Небольшая задержка для лучшего UX
        } else {
          // Определяем текущего пользователя
          const userType = getCurrentUserFromEmail(result.session.user.email || '')
          setCurrentUser(userType)
        }
      } catch (error) {
        console.error('Auto login error:', error)
        // В случае ошибки, очищаем сессию и пытаемся войти заново
        clearAuthTokens()
        setTimeout(() => {
          handleUserLogin('pavel')
        }, 1000)
      }
    }

    autoLoginOnStartup()

    return () => subscription.unsubscribe()
  }, [])

  const handleSignUp = async () => {
    setIsLoading(true)
    try {
      const result = await safeSignUp(email, password)
      if (result.success) {
        toast.success('Проверьте вашу почту для подтверждения регистрации!')
      } else {
        toast.error(result.error || 'Ошибка регистрации')
      }
    } catch (error: any) {
      toast.error(error.message || 'Ошибка регистрации')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignIn = async () => {
    setIsLoading(true)
    try {
      const result = await safeSignIn(email, password)
      if (!result.success) {
        toast.error(result.error || 'Ошибка входа')
      }
    } catch (error: any) {
      toast.error(error.message || 'Ошибка входа')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      // Очищаем localStorage от возможных поврежденных токенов
      localStorage.removeItem('sb-' + (process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'dummy') + '-auth-token')
    } catch (error) {
      console.error('Sign out error:', error)
      // Принудительно очищаем localStorage
      localStorage.clear()
      window.location.reload()
    }
  }

  const handleLoadUserData = async () => {
    setIsSyncing(true)
    try {
      await loadAndSaveUserDataFromSupabase()
      toast.success('Данные загружены из облака!')
    } catch (error) {
      console.error('Failed to load user data:', error)
      toast.error('Ошибка загрузки данных из облака')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSyncToCloud = async () => {
    setIsSyncing(true)
    try {
      await syncAllDataToSupabase()
      toast.success('Данные отправлены в облако!')
    } catch (error) {
      console.error('Failed to sync data:', error)
      toast.error('Ошибка синхронизации с облаком')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    try {
      const result = await testSupabaseConnection()
      if (result.success) {
        toast.success('✅ Подключение к базе данных работает!')
      } else {
        toast.error(`❌ Ошибка подключения: ${result.error}`)
      }
    } catch (error) {
      console.error('Test connection failed:', error)
      toast.error('Ошибка тестирования подключения')
    } finally {
      setIsTesting(false)
    }
  }

  const handleUserLogin = async (userId: 'pavel' | 'aleksandra') => {
    setIsAutoLogin(true)
    try {
      const userConfig = getUserConfig(userId)
      
      // Сначала пытаемся войти
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userConfig.email,
        password: userConfig.password,
      })
      
      if (signInError) {
        // Если пользователь не существует, создаем его
        console.log(`${userConfig.name} user not found, creating...`)
        const { error: signUpError } = await supabase.auth.signUp({
          email: userConfig.email,
          password: userConfig.password,
        })
        
        if (signUpError) {
          throw signUpError
        }
        
        toast.success(`✅ Учетная запись ${userConfig.name} создана!`)
      } else {
        toast.success(`✅ Вход в учетную запись ${userConfig.name} выполнен!`)
      }
    } catch (error: any) {
      console.error('User login failed:', error)
      toast.error(`Ошибка: ${error.message}`)
    } finally {
      setIsAutoLogin(false)
    }
  }

  const handleAutoLogin = async () => {
    // Для обратной совместимости - вход в Pavel
    await handleUserLogin('pavel')
  }

  const handleLoadTestData = async () => {
    setIsLoadingTestData(true)
    try {
      const testCards = getTestCards(currentUser || undefined)
      
      // Загружаем тестовые данные локально
      const { saveCards } = await import('@/lib/core/storage')
      saveCards(testCards)
      
      // Синхронизируем с Supabase
      await syncAllDataToSupabase()
      
      const userName = currentUser ? getUserConfig(currentUser).name : 'Пользователь'
      toast.success(`✅ Тестовые данные загружены для ${userName}!`)
    } catch (error) {
      console.error('Failed to load test data:', error)
      toast.error('Ошибка загрузки тестовых данных')
    } finally {
      setIsLoadingTestData(false)
    }
  }

  if (isSignedIn) {
    return (
      <Card className="border border-green-200/60 dark:border-green-700/60 shadow-lg hover:shadow-green-500/20 dark:hover:shadow-green-400/20 transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
            ✅ Вы вошли в систему
          </CardTitle>
          <CardDescription>
            {currentUser ? (
              <>
                {getUserConfig(currentUser).avatar} {getUserConfig(currentUser).name}<br/>
                {getUserConfig(currentUser).email}<br/>
                Ваши данные автоматически синхронизируются с облаком
              </>
            ) : (
              <>
                Пользователь<br/>
                Ваши данные автоматически синхронизируются с облаком
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={handleLoadUserData} 
              disabled={isSyncing}
              variant="outline"
              className="flex-1 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300"
            >
              {isSyncing ? 'Синхронизация...' : 'Загрузить из облака'}
            </Button>
            <Button 
              onClick={handleSyncToCloud} 
              disabled={isSyncing}
              variant="outline"
              className="flex-1 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300"
            >
              {isSyncing ? 'Отправка...' : 'Отправить в облако'}
            </Button>
          </div>
          {/* Переключатель пользователей */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Переключить пользователя:</div>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleUserLogin('pavel')} 
                disabled={isAutoLogin || currentUser === 'pavel'}
                variant={currentUser === 'pavel' ? 'default' : 'outline'}
                className={`flex-1 transition-all duration-300 ${
                  currentUser === 'pavel' 
                    ? 'bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0 shadow-md hover:shadow-lg' 
                    : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                👨‍💻 Pavel
              </Button>
              <Button 
                onClick={() => handleUserLogin('aleksandra')} 
                disabled={isAutoLogin || currentUser === 'aleksandra'}
                variant={currentUser === 'aleksandra' ? 'default' : 'outline'}
                className={`flex-1 transition-all duration-300 ${
                  currentUser === 'aleksandra' 
                    ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white border-0 shadow-md hover:shadow-lg' 
                    : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                👩‍💻 Aleksandra
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSignOut} variant="destructive" className="flex-1">
              Выйти
            </Button>
            <Button 
              onClick={() => {
                clearAuthTokens()
                toast.success('Токены очищены. Перезагрузите страницу.')
              }} 
              variant="outline" 
              className="flex-1"
              title="Очистить поврежденные токены аутентификации"
            >
              🔧
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isSupabaseConfigured) {
    return (
      <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ⚠️ Supabase не настроен
          </CardTitle>
          <CardDescription>
            Для использования синхронизации данных настройте переменные окружения в файле .env.local
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Приложение работает в локальном режиме. Данные сохраняются только в браузере.
          </p>
          {/* Быстрый вход для пользователей */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Быстрый вход:</div>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleUserLogin('pavel')} 
                disabled={isAutoLogin}
                variant="default"
                className="flex-1 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
              >
                {isAutoLogin ? 'Вход...' : '👨‍💻 Pavel'}
              </Button>
              <Button 
                onClick={() => handleUserLogin('aleksandra')} 
                disabled={isAutoLogin}
                variant="default"
                className="flex-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
              >
                {isAutoLogin ? 'Вход...' : '👩‍💻 Aleksandra'}
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleTestConnection} 
              disabled={isTesting}
              variant="secondary"
              className="flex-1 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 dark:from-slate-800 dark:to-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-600 text-slate-800 dark:text-slate-200 border-0 shadow-md hover:shadow-lg transition-all duration-300"
            >
              {isTesting ? 'Тестирование...' : '🔍 Тест БД'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-slate-200/60 dark:border-slate-700/60 shadow-lg hover:shadow-slate-500/20 dark:hover:shadow-slate-400/20 transition-all duration-300">
      <CardHeader>
        <CardTitle className="text-slate-800 dark:text-slate-200">🔐 Вход / Регистрация</CardTitle>
        <CardDescription className="text-slate-600 dark:text-slate-400">
          Войдите в систему для синхронизации данных между устройствами
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Вход</TabsTrigger>
            <TabsTrigger value="signup">Регистрация</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin" className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleSignIn} 
              disabled={isLoading || !email || !password}
              className="w-full bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </Button>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleUserLogin('pavel')} 
                disabled={isAutoLogin}
                variant="outline"
                className="flex-1 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300"
              >
                {isAutoLogin ? 'Вход...' : '👨‍💻 Pavel'}
              </Button>
              <Button 
                onClick={() => handleUserLogin('aleksandra')} 
                disabled={isAutoLogin}
                variant="outline"
                className="flex-1 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300"
              >
                {isAutoLogin ? 'Вход...' : '👩‍💻 Aleksandra'}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="signup" className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Пароль (минимум 6 символов)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleSignUp} 
              disabled={isLoading || !email || !password || password.length < 6}
              className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
            >
              {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
