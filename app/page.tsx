"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/types";
import { loadCards, loadLogs } from "@/lib/storage";
import { getTodayISO } from "@/lib/utils";
import { Card as UICard, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Play, BarChart3, Flame, Target, Sparkles, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { AuthComponent } from "@/components/auth";
import { UserSwitcher } from "@/components/user-switcher";
import { LoginScreen } from "@/components/login-screen";
import { ProgressCalendar } from "@/components/progress-calendar";
import { supabase } from "@/lib/supabase";

// Мотивирующие фразы на греческом языке
const motivationalPhrases = [
  { greek: "Κάθε μέρα είναι μια νέα αρχή!", translation: "Каждый день — это новое начало!" },
  { greek: "Η γνώση είναι δύναμη!", translation: "Знание — это сила!" },
  { greek: "Μικρά βήματα, μεγάλα αποτελέσματα!", translation: "Маленькие шаги, большие результаты!" },
  { greek: "Η επιμονή πληρώνει!", translation: "Упорство окупается!" },
  { greek: "Μάθε κάτι νέο κάθε μέρα!", translation: "Учись чему-то новому каждый день!" },
  { greek: "Η γλώσσα ανοίγει πόρτες!", translation: "Язык открывает двери!" },
  { greek: "Κανένας δεν γεννήθηκε έξυπνος!", translation: "Никто не рождается умным!" },
  { greek: "Η πρακτική κάνει τέλειο!", translation: "Практика делает совершенным!" },
  { greek: "Μην τα παρατάς ποτέ!", translation: "Никогда не сдавайся!" },
  { greek: "Κάθε λέξη είναι ένα βήμα προς το στόχο!", translation: "Каждое слово — шаг к цели!" },
  { greek: "Η επιτυχία είναι το άθροισμα μικρών προσπαθειών!", translation: "Успех — это сумма маленьких усилий!" },
  { greek: "Μάθε με χαρά και πάθος!", translation: "Учись с радостью и страстью!" },
  { greek: "Η γνώση δεν έχει όρια!", translation: "Знание не имеет границ!" },
  { greek: "Κάθε δυσκολία είναι μια ευκαιρία!", translation: "Каждая трудность — это возможность!" },
  { greek: "Το μέλλον ανήκει σε εσένα!", translation: "Будущее принадлежит тебе!" }
];

// Советы для изучения греческого языка
const learningTips = [
  "Старайтесь заниматься каждый день хотя бы 10-15 минут. Регулярные повторения — ключ к эффективному запоминанию!",
  "Используйте мнемотехники для запоминания сложных слов. Создавайте ассоциации с русскими словами.",
  "Слушайте греческую музыку и смотрите фильмы с субтитрами. Это поможет развить восприятие на слух.",
  "Практикуйте произношение вслух. Греческий язык имеет уникальные звуки, которые важно освоить.",
  "Изучайте не только слова, но и грамматику. Понимание структуры языка ускорит обучение.",
  "Используйте карточки для повторения. Система интервальных повторений поможет закрепить материал.",
  "Читайте простые тексты на греческом. Начните с детских книг или адаптированной литературы.",
  "Общайтесь с носителями языка. Практика разговорной речи — важная часть изучения.",
  "Ведите дневник на греческом языке. Записывайте новые слова и фразы, которые выучили.",
  "Изучайте греческую культуру и историю. Это поможет лучше понять контекст языка.",
  "Используйте приложения для изучения языков как дополнение к основным занятиям.",
  "Повторяйте материал в разное время дня. Утренние и вечерние занятия по-разному влияют на память.",
  "Создавайте собственные примеры с новыми словами. Это поможет лучше их запомнить.",
  "Не бойтесь делать ошибки. Они — естественная часть процесса обучения.",
  "Ставьте конкретные цели. Например, выучить 50 новых слов за неделю или прочитать первую главу книги."
];

export default function Dashboard() {
  const [cards, setCards] = useState<Card[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentPhrase, setCurrentPhrase] = useState(motivationalPhrases[0]);
  const [currentTip, setCurrentTip] = useState(learningTips[0]);

  useEffect(() => {
    setMounted(true);
    setCards(loadCards());
    
    // Инициализируем случайную фразу и совет только на клиенте
    setCurrentPhrase(motivationalPhrases[Math.floor(Math.random() * motivationalPhrases.length)]);
    setCurrentTip(learningTips[Math.floor(Math.random() * learningTips.length)]);
  }, []);

  // Проверяем состояние аутентификации при загрузке
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsLoggedIn(!!session);
      } catch (error) {
        console.error('Error checking auth state:', error);
        setIsLoggedIn(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthState();

    // Слушаем изменения состояния аутентификации
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Смена мотивирующей фразы каждые 30 секунд
  useEffect(() => {
    if (!mounted) return;
    
    const interval = setInterval(() => {
      setCurrentPhrase(motivationalPhrases[Math.floor(Math.random() * motivationalPhrases.length)]);
    }, 30000);

    return () => clearInterval(interval);
  }, [mounted]);

  // Смена совета каждый час (3600000 мс)
  useEffect(() => {
    if (!mounted) return;
    
    const interval = setInterval(() => {
      setCurrentTip(learningTips[Math.floor(Math.random() * learningTips.length)]);
    }, 3600000);

    return () => clearInterval(interval);
  }, [mounted]);

  if (!mounted || isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-xl">Загрузка...</div>
      </div>
    );
  }

  // Показываем стартовый экран с логином
  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  const now = new Date();
  const nowISO = now.toISOString();

  const stats = {
    total: cards.length,
    new: cards.filter((c) => c.status === "new").length,
    learning: cards.filter(
      (c) => c.status === "learning" || c.status === "relearning"
    ).length,
    review: cards.filter((c) => c.status === "review").length,
    due: cards.filter((c) => c.due <= nowISO).length,
    leeches: cards.filter((c) => c.isLeech).length,
  };

  const logs = loadLogs();
  const todayLog = logs.find((log) => log.date === getTodayISO());
  const streak = calculateStreak(logs);

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header with user switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1 sm:space-y-2">
          <div className="space-y-1">
            <p className="text-xl sm:text-2xl lg:text-3xl font-medium text-slate-700 dark:text-slate-300 transition-all duration-500">
              {currentPhrase.greek}
            </p>
            <p className="text-muted-foreground text-base sm:text-lg transition-all duration-500">
              {currentPhrase.translation}
            </p>
          </div>
        </div>
        <div className="flex justify-center sm:justify-end">
          <UserSwitcher />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-2 grid-cols-3 sm:grid-cols-6">
        <StatCard 
          title="Всего слов" 
          value={stats.total} 
          icon={<BookOpen />} 
          variant="blue" 
          href="/words"
        />
        <StatCard 
          title="Новые" 
          value={stats.new} 
          icon={<Sparkles />} 
          variant="purple" 
          href="/words?status=new"
        />
        <StatCard 
          title="Изучаются" 
          value={stats.learning} 
          icon={<Target />} 
          variant="yellow" 
          href="/words?status=learning"
        />
        <StatCard 
          title="На повторении" 
          value={stats.review} 
          icon={<CheckCircle2 />} 
          variant="green" 
          href="/words?status=review"
        />
        <StatCard 
          title="К повторению" 
          value={stats.due} 
          icon={<Clock />} 
          variant="training" 
          href="/session"
        />
        <StatCard 
          title="Трудные" 
          value={stats.leeches} 
          icon={<AlertCircle />} 
          variant="red" 
          href="/words?leech=true"
        />
      </div>

      {/* Today's Progress */}
      {todayLog && (
        <UICard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Сегодняшний прогресс
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {todayLog.totalReviewed}
                </div>
                <div className="text-sm text-muted-foreground">Повторено</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {todayLog.accuracy}%
                </div>
                <div className="text-sm text-muted-foreground">Точность</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {todayLog.newCards}
                </div>
                <div className="text-sm text-muted-foreground">Новых</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1">
                  {streak} <Flame className="h-6 w-6" />
                </div>
                <div className="text-sm text-muted-foreground">Дней подряд</div>
              </div>
            </div>
          </CardContent>
        </UICard>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/session" className="group col-span-1 sm:col-span-2 lg:col-span-1">
          <UICard className="h-full transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] bg-gradient-to-br from-slate-50 via-purple-50 to-violet-50 dark:from-slate-800/50 dark:via-purple-900/30 dark:to-violet-900/30 border border-slate-200/60 dark:border-slate-700/60 shadow-lg hover:shadow-purple-500/20 dark:hover:shadow-purple-400/20">
            <CardHeader>
              <div className="text-4xl mb-2">
                <Play className="h-12 w-12 text-slate-600 dark:text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-all duration-300 group-hover:scale-110" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors duration-300">Начать тренировку</CardTitle>
              <CardDescription className="text-base text-slate-600 dark:text-slate-400">
                {stats.due > 0 ? (
                  <>
                    <Badge variant="default" className="mr-2 bg-gradient-to-r from-purple-500 to-violet-500 text-white border-0 shadow-md">
                      {stats.due}
                    </Badge>
                    карточек готовы к повторению
                  </>
                ) : (
                  "Нет карточек к повторению"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-all duration-300 font-medium group-hover:translate-x-1">
                Нажмите, чтобы начать →
              </p>
            </CardContent>
          </UICard>
        </Link>

        <Link href="/words" className="group">
          <UICard className="h-full transition-all duration-300 hover:shadow-lg hover:scale-[1.02] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-200/50 dark:border-slate-700/50">
            <CardHeader className="pb-3">
              <div className="text-3xl mb-2">
                <BookOpen className="h-8 w-8 text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors duration-300" />
              </div>
              <CardTitle className="text-xl text-slate-800 dark:text-slate-200">Список слов</CardTitle>
              <CardDescription className="text-sm text-slate-600 dark:text-slate-400">
                Управляйте своей базой из {stats.total} слов
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-all duration-300 group-hover:translate-x-1">
                Добавить, редактировать →
              </p>
            </CardContent>
          </UICard>
        </Link>

        <Link href="/logs" className="group">
          <UICard className="h-full transition-all duration-300 hover:shadow-lg hover:scale-[1.02] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-200/50 dark:border-slate-700/50">
            <CardHeader className="pb-3">
              <div className="text-3xl mb-2">
                <BarChart3 className="h-8 w-8 text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors duration-300" />
              </div>
              <CardTitle className="text-xl text-slate-800 dark:text-slate-200">Статистика</CardTitle>
              <CardDescription className="text-sm text-slate-600 dark:text-slate-400">
                Просмотрите свой прогресс и аналитику
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-all duration-300 group-hover:translate-x-1">
                Открыть журнал →
              </p>
            </CardContent>
          </UICard>
        </Link>
      </div>

      {/* Progress Calendar */}
      <ProgressCalendar />

      {/* Tips */}
      <UICard className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            💡 Совет
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-foreground transition-all duration-500">
            {currentTip}
          </p>
        </CardContent>
      </UICard>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  variant: "blue" | "purple" | "yellow" | "green" | "orange" | "red" | "training";
  href: string;
}

function StatCard({ title, value, icon, variant, href }: StatCardProps) {
  const variants = {
    blue: "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 hover:from-slate-100 hover:to-slate-200 dark:hover:from-slate-700/50 dark:hover:to-slate-800/50 transition-all duration-300",
    purple: "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 hover:from-slate-100 hover:to-slate-200 dark:hover:from-slate-700/50 dark:hover:to-slate-800/50 transition-all duration-300",
    yellow: "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 hover:from-slate-100 hover:to-slate-200 dark:hover:from-slate-700/50 dark:hover:to-slate-800/50 transition-all duration-300",
    green: "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 hover:from-slate-100 hover:to-slate-200 dark:hover:from-slate-700/50 dark:hover:to-slate-800/50 transition-all duration-300",
    orange: "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 hover:from-slate-100 hover:to-slate-200 dark:hover:from-slate-700/50 dark:hover:to-slate-800/50 transition-all duration-300",
    red: "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 hover:from-slate-100 hover:to-slate-200 dark:hover:from-slate-700/50 dark:hover:to-slate-800/50 transition-all duration-300",
    training: "bg-gradient-to-br from-purple-50 via-violet-50 to-fuchsia-50 dark:from-purple-900/30 dark:via-violet-900/30 dark:to-fuchsia-900/30 text-slate-800 dark:text-slate-200 border border-purple-200/60 dark:border-purple-700/60 hover:from-purple-100 hover:via-violet-100 hover:to-fuchsia-100 dark:hover:from-purple-800/40 dark:hover:via-violet-800/40 dark:hover:to-fuchsia-800/40 shadow-lg hover:shadow-purple-500/20 dark:hover:shadow-purple-400/20 transition-all duration-500",
  };

  return (
    <Link href={href} className="block">
      <UICard className={`transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer ${variants[variant]}`}>
        <CardContent className="px-4 py-1">
          <div className="flex items-baseline gap-4 mb-1">
            <div className="h-4 w-4 transition-transform duration-300 hover:scale-110">{icon}</div>
            <div className="text-lg font-bold transition-colors duration-300">{value}</div>
          </div>
          <div className="text-xs opacity-75">{title}</div>
        </CardContent>
      </UICard>
    </Link>
  );
}

function calculateStreak(logs: typeof loadLogs extends () => infer R ? R : never): number {
  if (logs.length === 0) return 0;

  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  let checkDate = new Date();

  for (let i = 0; i < sorted.length; i++) {
    const logDate = sorted[i].date.split("T")[0];
    const expectedDate = checkDate.toISOString().split("T")[0];

    if (logDate === expectedDate) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
