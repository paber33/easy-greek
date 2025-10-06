'use client'

import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { USER_CONFIGS, getUserConfig, getCurrentUserFromEmail } from '@/lib/user-config'
import { testSupabaseConnection } from '@/lib/test-supabase'
import { getTestCards } from '@/lib/test-data'
import { loadUserDataFromSupabase, mergeUserDataWithLocal, syncAllDataToSupabase } from '@/lib/storage'
import { toast } from 'sonner'
import { Logo } from '@/components/logo'

interface LoginScreenProps {
  onLogin: () => void
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
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
        setIsSignedIn(!!session)
        
        if (event === 'SIGNED_IN' && session) {
          const userType = getCurrentUserFromEmail(session.user.email || '')
          setCurrentUser(userType)
          
          const userConfig = userType ? getUserConfig(userType) : null
          const userName = userConfig?.name || 'Пользователь'
          
          toast.success(`Добро пожаловать, ${userName}! 👋`)
          // Загружаем данные пользователя из Supabase
          await handleLoadUserData()
          onLogin() // Переходим к основному приложению
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null)
          toast.info('Вы вышли из системы')
        }
      }
    )

    // Проверяем существующую сессию при загрузке
    const autoLoginOnStartup = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // Если пользователь уже авторизован, определяем его тип
        const userType = getCurrentUserFromEmail(session.user.email || '')
        setCurrentUser(userType)
        setIsSignedIn(true)
        onLogin() // Переходим к основному приложению
      }
      // Не пытаемся автоматически входить в Pavel - показываем стартовый экран
    }

    autoLoginOnStartup()

    return () => subscription.unsubscribe()
  }, [onLogin])

  const handleSignUp = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) throw error
      toast.success('Проверьте вашу почту для подтверждения регистрации!')
    } catch (error: any) {
      toast.error(error.message || 'Ошибка регистрации')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignIn = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    } catch (error: any) {
      toast.error(error.message || 'Ошибка входа')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUserLogin = async (userId: 'pavel' | 'aleksandra') => {
    setIsAutoLogin(true)
    try {
      const userConfig = getUserConfig(userId)
      
      // Только пытаемся войти, не создаем пользователя
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userConfig.email,
        password: userConfig.password,
      })
      
      if (signInError) {
        // Показываем сообщение о том, что нужно создать пользователя вручную
        toast.error(`Пользователь ${userConfig.name} не найден. Создайте его в Supabase Dashboard.`)
        console.log(`Пользователь ${userConfig.name} не найден. Нужно создать вручную в Supabase.`)
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

  const handleLoadUserData = async () => {
    setIsSyncing(true)
    try {
      const userData = await loadUserDataFromSupabase()
      if (userData) {
        await mergeUserDataWithLocal(userData)
        toast.success('Данные синхронизированы с облаком!')
      }
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

  const handleLoadTestData = async () => {
    setIsLoadingTestData(true)
    try {
      const testCards = getTestCards(currentUser || undefined)
      
      // Загружаем тестовые данные локально
      const { saveCards } = await import('@/lib/storage')
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

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Card className="w-full max-w-md border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20 shadow-lg">
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
            <Button 
              onClick={handleTestConnection} 
              disabled={isTesting}
              variant="secondary"
              className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-0"
            >
              {isTesting ? 'Тестирование...' : '🔍 Тест подключения к БД'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md space-y-4 sm:space-y-6">
        {/* Заголовок */}
        <div className="text-center space-y-3 sm:space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-600 to-slate-800 dark:from-slate-300 dark:to-slate-100 bg-clip-text text-transparent">
            Greekly
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg font-medium">
            Умное изучение греческого языка
          </p>
        </div>

        {/* Быстрый вход */}
        <Card className="border border-slate-200/50 dark:border-slate-700/50 shadow-sm bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50">
          <CardHeader>
            <CardTitle className="text-center text-slate-800 dark:text-slate-200">🚀 Быстрый вход</CardTitle>
            <CardDescription className="text-center text-slate-600 dark:text-slate-400">
              Выберите пользователя для входа в систему
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button 
                onClick={() => handleUserLogin('pavel')} 
                disabled={isAutoLogin}
                variant="default"
                size="lg"
                className="h-16 flex flex-col gap-1 bg-gradient-to-br from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 dark:from-slate-800 dark:to-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-600 text-slate-800 dark:text-slate-200 border-0 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <span className="text-2xl">👨‍💻</span>
                <span className="font-medium">Pavel</span>
              </Button>
              <Button 
                onClick={() => handleUserLogin('aleksandra')} 
                disabled={isAutoLogin}
                variant="default"
                size="lg"
                className="h-16 flex flex-col gap-1 bg-gradient-to-br from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 dark:from-slate-800 dark:to-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-600 text-slate-800 dark:text-slate-200 border-0 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <span className="text-2xl">👩‍💻</span>
                <span className="font-medium">Aleksandra</span>
              </Button>
            </div>
            
            {isAutoLogin && (
              <div className="text-center text-sm text-muted-foreground">
                Вход в систему...
              </div>
            )}
          </CardContent>
        </Card>


        {/* Ручной вход */}
        <Card className="border border-slate-200/50 dark:border-slate-700/50 shadow-sm bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50">
          <CardHeader>
            <CardTitle className="text-center text-lg text-slate-800 dark:text-slate-200">🔐 Ручной вход</CardTitle>
            <CardDescription className="text-center text-slate-600 dark:text-slate-400">
              Или войдите с помощью email и пароля
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Вход</TabsTrigger>
                <TabsTrigger value="signup">Регистрация</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 sm:h-10"
                  />
                  <Input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 sm:h-10"
                  />
                </div>
                <Button 
                  onClick={handleSignIn} 
                  disabled={isLoading || !email || !password}
                  className="w-full h-11 sm:h-10 bg-slate-800 hover:bg-slate-700 text-white border-0"
                >
                  {isLoading ? 'Вход...' : 'Войти'}
                </Button>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 sm:h-10"
                  />
                  <Input
                    type="password"
                    placeholder="Пароль (минимум 6 символов)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 sm:h-10"
                  />
                </div>
                <Button 
                  onClick={handleSignUp} 
                  disabled={isLoading || !email || !password || password.length < 6}
                  className="w-full h-11 sm:h-10 bg-slate-800 hover:bg-slate-700 text-white border-0"
                >
                  {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
