"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProfileSwitcher } from "@/components/profile-switcher";
import { Home, BookOpen, Play, BarChart3 } from "lucide-react";

interface NavigationWrapperProps {
  children: React.ReactNode;
}

export function NavigationWrapper({ children }: NavigationWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    // Проверяем текущую сессию
    const checkCurrentSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setIsLoading(false);
    };

    checkCurrentSession();

    return () => subscription.unsubscribe();
  }, []);

  // Показываем загрузку пока проверяем аутентификацию
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" suppressHydrationWarning>
        {children}
      </div>
    );
  }

  // Если пользователь не авторизован, показываем только контент без навигации
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background" suppressHydrationWarning>
        {children}
      </div>
    );
  }

  // Если авторизован, показываем полный интерфейс с навигацией
  return (
    <div className="min-h-screen bg-background" suppressHydrationWarning>
      {/* Navigation */}
      <header
        className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/40 backdrop-blur-md supports-[backdrop-filter]:bg-white/30"
        suppressHydrationWarning
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8" suppressHydrationWarning>
          <div className="flex h-14 items-center" suppressHydrationWarning>
            <Link href="/" className="mr-3 sm:mr-6 flex items-center">
              <span className="font-light text-lg sm:text-xl bg-gradient-to-r from-[#8B5CF6] via-[#7C3AED] to-[#6D28D9] bg-clip-text text-transparent">
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
            <nav className="flex md:hidden items-center gap-1 flex-1 justify-center">
              <MobileNavLink
                href="/session"
                icon={<Play className="h-4 w-4" />}
                label="Тренировка"
              />
              <MobileNavLink href="/" icon={<Home className="h-4 w-4" />} label="Главная" />
              <MobileNavLink href="/words" icon={<BookOpen className="h-4 w-4" />} label="Слова" />
              <MobileNavLink
                href="/logs"
                icon={<BarChart3 className="h-4 w-4" />}
                label="Статистика"
              />
            </nav>

            <div className="flex items-center gap-1 md:gap-2">
              <div className="hidden sm:block">
                <ProfileSwitcher />
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8"
        suppressHydrationWarning
      >
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 md:py-0" suppressHydrationWarning>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" suppressHydrationWarning>
          <div
            className="flex h-14 items-center justify-center text-sm text-muted-foreground"
            suppressHydrationWarning
          >
            Built with Next.js + TypeScript + TailwindCSS • FSRS-lite Algorithm
          </div>
        </div>
      </footer>
    </div>
  );
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
      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300 ease-out hover:bg-white/20 hover:text-primary"
    >
      {icon}
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-xl p-3 text-sm font-medium transition-all duration-300 ease-out hover:bg-white/20 hover:text-primary active:scale-95 touch-manipulation"
    >
      {icon}
    </Link>
  );
}
