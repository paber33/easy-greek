'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getUserConfig, getCurrentUserFromEmail } from '@/lib/user-config'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { ChevronDown, User, LogOut } from 'lucide-react'

export function UserSwitcher() {
  const [currentUser, setCurrentUser] = useState<'pavel' | 'aleksandra' | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          const userType = getCurrentUserFromEmail(session.user.email || '')
          setCurrentUser(userType)
        } else {
          setCurrentUser(null)
        }
      }
    )

    // Проверяем текущую сессию
    const checkCurrentSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const userType = getCurrentUserFromEmail(session.user.email || '')
        setCurrentUser(userType)
      }
    }

    checkCurrentSession()

    return () => subscription.unsubscribe()
  }, [])

  const handleUserSwitch = async (userId: 'pavel' | 'aleksandra') => {
    if (currentUser === userId) return

    setIsLoading(true)
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
        toast.success(`✅ Переключение на ${userConfig.name}`)
      }
    } catch (error: any) {
      console.error('User switch failed:', error)
      toast.error(`Ошибка: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (!currentUser) {
    return null // Не показываем переключатель если пользователь не авторизован
  }

  const userConfig = getUserConfig(currentUser)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={isLoading}
          className="flex items-center gap-2 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 dark:from-slate-800 dark:to-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-600 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 transition-all duration-200 hover:shadow-sm"
        >
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">{userConfig.name}</span>
          <span className="sm:hidden">{userConfig.avatar}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
          Переключить пользователя
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => handleUserSwitch('pavel')}
          disabled={isLoading || currentUser === 'pavel'}
          className="flex items-center gap-3 cursor-pointer"
        >
          <span className="text-lg">👨‍💻</span>
          <div className="flex-1">
            <div className="font-medium">Pavel</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">pavel@example.com</div>
          </div>
          {currentUser === 'pavel' && (
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleUserSwitch('aleksandra')}
          disabled={isLoading || currentUser === 'aleksandra'}
          className="flex items-center gap-3 cursor-pointer"
        >
          <span className="text-lg">👩‍💻</span>
          <div className="flex-1">
            <div className="font-medium">Aleksandra</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">aleksandra@example.com</div>
          </div>
          {currentUser === 'aleksandra' && (
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="flex items-center gap-3 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Выйти</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
