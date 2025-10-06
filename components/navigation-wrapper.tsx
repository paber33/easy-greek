'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ThemeToggle } from '@/components/theme-toggle'
import { ProfileSwitcher } from '@/components/profile-switcher'
import { Logo } from '@/components/logo'
import { Home, BookOpen, Play, BarChart3 } from 'lucide-react'

interface NavigationWrapperProps {
  children: React.ReactNode
}

export function NavigationWrapper({ children }: NavigationWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setIsAuthenticated(!!session)
      }
    )

    // Проверяем текущую сессию
    const checkCurrentSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
      setIsLoading(false)
    }

    checkCurrentSession()

    return () => subscription.unsubscribe()
  }, [])

  // Показываем загрузку пока проверяем аутентификацию
  if (isLoading) {
    return <div className="min-h-screen bg-background">{children}</div>
  }

  // Если пользователь не авторизован, показываем только контент без навигации
  if (!isAuthenticated) {
    return <div className="min-h-screen bg-background">{children}</div>
  }

  // Если авторизован, показываем полный интерфейс с навигацией
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex h-14 items-center">
            <Link href="/" className="mr-3 sm:mr-6 flex items-center">
              <span className="font-bold text-lg sm:text-xl bg-gradient-to-r from-slate-600 to-slate-800 dark:from-slate-300 dark:to-slate-100 bg-clip-text text-transparent">
                Greekly
              </span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 flex-1">
              <NavLink href="/" icon={<Home className="h-4 w-4" />}>
                Главная
              </NavLink>
              <NavLink href="/words" icon={<BookOpen className="h-4 w-4" />}>
                Слова
              </NavLink>
              <NavLink href="/session" icon={<Play className="h-4 w-4" />}>
                Тренировка
              </NavLink>
              <NavLink href="/logs" icon={<BarChart3 className="h-4 w-4" />}>
                Статистика
              </NavLink>
            </nav>
            
            {/* Mobile Navigation */}
            <nav className="flex md:hidden items-center gap-2 flex-1 justify-center">
              <MobileNavLink href="/" icon={<Home className="h-5 w-5" />} />
              <MobileNavLink href="/words" icon={<BookOpen className="h-5 w-5" />} />
              <MobileNavLink href="/session" icon={<Play className="h-5 w-5" />} />
              <MobileNavLink href="/logs" icon={<BarChart3 className="h-5 w-5" />} />
            </nav>
            
            <div className="flex items-center gap-2">
              <ProfileSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">{children}</main>

      {/* Footer */}
      <footer className="border-t py-6 md:py-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-center text-sm text-muted-foreground">
            Built with Next.js + TypeScript + TailwindCSS • FSRS-lite Algorithm
          </div>
        </div>
      </footer>
    </div>
  )
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {icon}
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  icon,
}: {
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-lg p-3 text-sm font-medium transition-all duration-200 hover:bg-accent hover:text-accent-foreground active:scale-95 touch-manipulation"
    >
      {icon}
    </Link>
  );
}
