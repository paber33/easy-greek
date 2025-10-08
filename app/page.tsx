"use client";

import { useEffect, useState, useMemo, useCallback, memo } from "react";
import Link from "next/link";
import { Card, SessionSummary } from "@/types";
import { useProfile } from "@/app/providers/ProfileProvider";
import { LocalCardsRepository, LocalLogsRepository } from "@/lib/localRepositories";
import { getTodayISO } from "@/lib/utils";
import {
  Card as UICard,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Play,
  BarChart3,
  Flame,
  Target,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { LoginScreen } from "@/components/login-screen";
import { ProgressCalendar } from "@/components/progress-calendar";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { supabase } from "@/lib/supabase";
import { cleanupLocalStorage } from "@/lib/data-cleanup";

// Мотивирующие фразы на греческом языке
const motivationalPhrases = [
  { greek: "Κάθε μέρα είναι μια νέα αρχή!", translation: "Каждый день — это новое начало!" },
  { greek: "Η γνώση είναι δύναμη!", translation: "Знание — это сила!" },
  {
    greek: "Μικρά βήματα, μεγάλα αποτελέσματα!",
    translation: "Маленькие шаги, большие результаты!",
  },
  { greek: "Η επιμονή πληρώνει!", translation: "Упорство окупается!" },
  { greek: "Μάθε κάτι νέο κάθε μέρα!", translation: "Учись чему-то новому каждый день!" },
  { greek: "Η γλώσσα ανοίγει πόρτες!", translation: "Язык открывает двери!" },
  { greek: "Κανένας δεν γεννήθηκε έξυπνος!", translation: "Никто не рождается умным!" },
  { greek: "Η πρακτική κάνει τέλειο!", translation: "Практика делает совершенным!" },
  { greek: "Μην τα παρατάς ποτέ!", translation: "Никогда не сдавайся!" },
  { greek: "Κάθε λέξη είναι ένα βήμα προς το στόχο!", translation: "Каждое слово — шаг к цели!" },
  {
    greek: "Η επιτυχία είναι το άθροισμα μικρών προσπαθειών!",
    translation: "Успех — это сумма маленьких усилий!",
  },
  { greek: "Μάθε με χαρά και πάθος!", translation: "Учись с радостью и страстью!" },
  { greek: "Η γνώση δεν έχει όρια!", translation: "Знание не имеет границ!" },
  {
    greek: "Κάθε δυσκολία είναι μια ευκαιρία!",
    translation: "Каждая трудность — это возможность!",
  },
  { greek: "Το μέλλον ανήκει σε εσένα!", translation: "Будущее принадлежит тебе!" },
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
  "Ставьте конкретные цели. Например, выучить 50 новых слов за неделю или прочитать первую главу книги.",
];

export default function Dashboard() {
  const { currentProfileId, isLoading: profileLoading } = useProfile();
  const [cards, setCards] = useState<Card[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentPhrase, setCurrentPhrase] = useState<(typeof motivationalPhrases)[0] | null>(null);
  const [currentTip, setCurrentTip] = useState<string | null>(null);
  const [logs, setLogs] = useState<SessionSummary[]>([]);

  // Memoized function to load cards
  const loadCardsForProfile = useCallback(async () => {
    if (!currentProfileId || !isLoggedIn) return;

    try {
      const cards = await LocalCardsRepository.list(currentProfileId);
      setCards(cards);
    } catch (error) {
      console.error("Failed to load cards:", error);
      setCards([]);
    }
  }, [currentProfileId, isLoggedIn]);

  // Memoized function to load logs
  const loadLogsForProfile = useCallback(async () => {
    if (!currentProfileId || !isLoggedIn) return;

    try {
      const profileLogs = await LocalLogsRepository.list(currentProfileId);

      // Фильтруем поврежденные логи перед отображением
      const validLogs = profileLogs.filter(log => {
        return !(
          log.totalReviewed > 10000 ||
          log.newCards > 1000 ||
          log.reviewCards > 10000 ||
          log.learningCards > 1000 ||
          (log.accuracy === 0 && log.totalReviewed > 100)
        );
      });

      if (validLogs.length !== profileLogs.length) {
        console.log(
          `🧹 Отфильтровано ${profileLogs.length - validLogs.length} поврежденных записей`
        );
      }

      setLogs(validLogs);
    } catch (error) {
      console.error("Failed to load logs:", error);
      setLogs([]);
    }
  }, [currentProfileId, isLoggedIn]);

  // Memoized stats calculation - use a stable date to prevent hydration mismatches
  const stats = useMemo(() => {
    // Use a fixed date for SSR consistency, will be updated on client
    const nowISO = mounted ? new Date().toISOString() : "2024-01-01T00:00:00.000Z";

    return {
      total: cards.length,
      new: cards.filter(c => c.status === "new").length,
      learning: cards.filter(c => c.status === "learning" || c.status === "relearning").length,
      review: cards.filter(c => c.status === "review").length,
      due: mounted ? cards.filter(c => c.due <= nowISO).length : 0, // Only calculate when mounted
      leeches: cards.filter(c => c.isLeech).length,
    };
  }, [cards, mounted]);

  // Memoized log calculations - use stable date for SSR
  const todayLog = useMemo(() => {
    if (!mounted) return null; // Don't show today's log until mounted
    const todayISO = getTodayISO();
    return logs.find(log => log.date === todayISO);
  }, [logs, mounted]);

  const streak = useMemo(() => calculateStreak(logs, mounted), [logs, mounted]);

  useEffect(() => {
    setMounted(true);

    // Очищаем поврежденные данные в localStorage
    cleanupLocalStorage();

    // Дополнительно очищаем логи с нереалистичными значениями
    if (typeof window !== "undefined") {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.includes("logs")) {
            try {
              const data = JSON.parse(localStorage.getItem(key) || "[]");
              if (Array.isArray(data)) {
                const cleanedData = data.filter(log => {
                  // Проверяем на нереалистичные значения
                  return !(
                    log.totalReviewed > 10000 ||
                    log.newCards > 1000 ||
                    log.reviewCards > 10000 ||
                    log.learningCards > 1000 ||
                    (log.accuracy === 0 && log.totalReviewed > 100)
                  );
                });

                if (cleanedData.length !== data.length) {
                  console.log(
                    `🧹 Очищено ${data.length - cleanedData.length} поврежденных записей из ${key}`
                  );
                  localStorage.setItem(key, JSON.stringify(cleanedData));
                }
              }
            } catch (error) {
              console.warn(`🗑️ Удаляем поврежденный ключ ${key}:`, error);
              localStorage.removeItem(key);
            }
          }
        });
      } catch (error) {
        console.error("Ошибка очистки логов:", error);
      }
    }

    // Инициализируем фразу и совет детерминированно для предотвращения проблем с гидратацией
    // Используем фиксированные индексы, которые будут одинаковыми на сервере и клиенте
    const timeIndex = 0; // Всегда показываем первую фразу
    const tipIndex = 0; // Всегда показываем первый совет
    setCurrentPhrase(motivationalPhrases[timeIndex]);
    setCurrentTip(learningTips[tipIndex]);
  }, []);

  // Load cards for current profile
  useEffect(() => {
    if (mounted && currentProfileId && !profileLoading && isLoggedIn) {
      loadCardsForProfile();
    }
  }, [mounted, currentProfileId, profileLoading, isLoggedIn, loadCardsForProfile]);

  // Load logs for current profile
  useEffect(() => {
    if (mounted && currentProfileId && !profileLoading && isLoggedIn) {
      loadLogsForProfile();
    }
  }, [mounted, currentProfileId, profileLoading, isLoggedIn, loadLogsForProfile]);

  // Проверяем состояние аутентификации при загрузке
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setIsLoggedIn(!!session);
      } catch (error) {
        console.error("Error checking auth state:", error);
        setIsLoggedIn(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthState();

    // Слушаем изменения состояния аутентификации
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Смена мотивирующей фразы каждые 30 секунд (только на клиенте)
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    let phraseIndex = 0;
    const interval = setInterval(() => {
      phraseIndex = (phraseIndex + 1) % motivationalPhrases.length;
      setCurrentPhrase(motivationalPhrases[phraseIndex]);
    }, 30000);

    return () => clearInterval(interval);
  }, [mounted]);

  // Смена совета каждый час (только на клиенте)
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    let tipIndex = 0;
    const interval = setInterval(() => {
      tipIndex = (tipIndex + 1) % learningTips.length;
      setCurrentTip(learningTips[tipIndex]);
    }, 3600000);

    return () => clearInterval(interval);
  }, [mounted]);

  if (
    !mounted ||
    isCheckingAuth ||
    profileLoading ||
    !currentProfileId ||
    !currentPhrase ||
    !currentTip
  ) {
    return <LoadingScreen message="Загружаем ваши данные..." variant="greek" />;
  }

  // Показываем стартовый экран с логином
  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="space-y-12 sm:space-y-16 lg:space-y-20" suppressHydrationWarning>
      {/* Header with motivational phrase */}
      <div className="text-center space-y-8" suppressHydrationWarning>
        <div className="space-y-6" suppressHydrationWarning>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-light bg-gradient-to-r from-[#8B5CF6] via-[#7C3AED] to-[#6D28D9] bg-clip-text text-transparent transition-all duration-500 leading-tight"
            suppressHydrationWarning
          >
            {currentPhrase.greek}
          </h1>
          <p
            className="text-xl sm:text-2xl text-muted-foreground transition-all duration-500 max-w-3xl mx-auto leading-relaxed font-light"
            suppressHydrationWarning
          >
            {currentPhrase.translation}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 sm:gap-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/session" className="group">
          <UICard className="h-full transition-all duration-500 ease-out hover:shadow-strong hover:scale-[1.02] glass-effect">
            <CardHeader className="text-center">
              <div className="mx-auto mb-6 p-6 rounded-3xl gradient-purple-medium group-hover:gradient-purple-strong transition-all duration-500 ease-out">
                <Play className="h-8 w-8 text-white/80 group-hover:scale-110 transition-transform duration-500 ease-out" />
              </div>
              <CardTitle className="text-2xl font-light text-foreground group-hover:text-purple-600 transition-colors duration-500 ease-out">
                Начать тренировку
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {stats.due > 0 ? (
                  <>
                    <Badge variant="default" className="mr-2 bg-primary text-white/80">
                      {stats.due}
                    </Badge>
                    карточек готовы к повторению
                  </>
                ) : (
                  "Нет карточек к повторению"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground group-hover:text-purple-600 transition-colors duration-500 ease-out font-medium">
                Нажмите, чтобы начать →
              </p>
            </CardContent>
          </UICard>
        </Link>

        <Link href="/words" className="group">
          <UICard className="h-full transition-all duration-500 ease-out hover:shadow-strong hover:scale-[1.02] glass-effect">
            <CardHeader className="text-center">
              <div className="mx-auto mb-6 p-6 rounded-3xl gradient-purple-soft group-hover:gradient-purple-medium transition-all duration-500 ease-out">
                <BookOpen className="h-8 w-8 text-purple-600 group-hover:scale-110 transition-transform duration-500 ease-out" />
              </div>
              <CardTitle className="text-2xl font-light text-foreground group-hover:text-purple-600 transition-colors duration-500 ease-out">
                Список слов
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Управляйте своей базой из {stats.total} слов
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-500 ease-out">
                Добавить, редактировать →
              </p>
            </CardContent>
          </UICard>
        </Link>

        <Link href="/logs" className="group">
          <UICard className="h-full transition-all duration-500 ease-out hover:shadow-strong hover:scale-[1.02] glass-effect">
            <CardHeader className="text-center">
              <div className="mx-auto mb-6 p-6 rounded-3xl gradient-purple-soft group-hover:gradient-purple-medium transition-all duration-500 ease-out">
                <BarChart3 className="h-8 w-8 text-purple-600 group-hover:scale-110 transition-transform duration-500 ease-out" />
              </div>
              <CardTitle className="text-2xl font-light text-foreground group-hover:text-purple-600 transition-colors duration-500 ease-out">
                Статистика
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Просмотрите свой прогресс и аналитику
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-500 ease-out">
                Открыть журнал →
              </p>
            </CardContent>
          </UICard>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Всего слов"
          value={stats.total}
          icon={<BookOpen className="h-4 w-4" />}
          variant="blue"
          href="/words"
        />
        <StatCard
          title="Новые"
          value={stats.new}
          icon={<Sparkles className="h-4 w-4" />}
          variant="purple"
          href="/words?status=new"
        />
        <StatCard
          title="Изучаются"
          value={stats.learning}
          icon={<Target className="h-4 w-4" />}
          variant="yellow"
          href="/words?status=learning"
        />
        <StatCard
          title="На повторении"
          value={stats.review}
          icon={<CheckCircle2 className="h-4 w-4" />}
          variant="green"
          href="/words?status=review"
        />
        <StatCard
          title="К повторению"
          value={stats.due}
          icon={<Clock className="h-4 w-4" />}
          variant="training"
          href="/session"
        />
        <StatCard
          title="Трудные"
          value={stats.leeches}
          icon={<AlertCircle className="h-4 w-4" />}
          variant="red"
          href="/words?leech=true"
        />
      </div>

      {/* Today's Progress */}
      {mounted ? (
        todayLog ? (
          <UICard className="glass-effect shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold">Сегодняшний прогресс</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{todayLog.totalReviewed}</div>
                  <div className="text-sm text-muted-foreground mt-1">Повторено</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {todayLog.accuracy}%
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Точность</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {todayLog.newCards}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Новых</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 flex items-center justify-center gap-1">
                    {streak} <Flame className="h-6 w-6" />
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Дней подряд</div>
                </div>
              </div>
            </CardContent>
          </UICard>
        ) : (
          <UICard className="glass-effect shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold">Сегодняшний прогресс</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                <p>Сегодня еще нет активности</p>
                <p className="text-sm mt-2">Начните изучение, чтобы увидеть статистику</p>
              </div>
            </CardContent>
          </UICard>
        )
      ) : (
        <UICard className="glass-effect shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold">Сегодняшний прогресс</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32 bg-muted animate-pulse rounded"></div>
          </CardContent>
        </UICard>
      )}

      {/* Progress Calendar */}
      <ProgressCalendar />

      {/* Tips */}
      <UICard className="glass-effect shadow-lg">
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-3 text-xl font-semibold">
            <div className="p-2 rounded-xl gradient-purple-soft">
              <span className="text-2xl">💡</span>
            </div>
            Совет дня
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <p className="text-base text-foreground leading-relaxed">{currentTip}</p>
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

const StatCard = memo(({ title, value, icon, variant, href }: StatCardProps) => {
  const variants = {
    blue: "glass-effect hover:shadow-medium",
    purple: "glass-effect hover:shadow-medium",
    yellow: "glass-effect hover:shadow-medium",
    green: "glass-effect hover:shadow-medium",
    orange: "glass-effect hover:shadow-medium",
    red: "glass-effect hover:shadow-medium",
    training: "gradient-purple-soft hover:gradient-purple-glow shadow-medium hover:shadow-strong",
  };

  return (
    <Link href={href} className="block group">
      <UICard
        className={`transition-all duration-500 ease-out hover:scale-[1.02] cursor-pointer ${variants[variant]}`}
      >
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 rounded-3xl gradient-purple-soft group-hover:gradient-purple-glow transition-all duration-500 ease-out">
              {icon}
            </div>
            <div className="text-3xl font-light text-foreground group-hover:text-purple-700 transition-colors duration-500 ease-out">
              {value}
            </div>
            <div className="text-sm text-muted-foreground font-medium">{title}</div>
          </div>
        </CardContent>
      </UICard>
    </Link>
  );
});

StatCard.displayName = "StatCard";

function calculateStreak(logs: SessionSummary[], mounted: boolean): number {
  if (!mounted || logs.length === 0) return 0;

  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;

  // Use current date only when mounted
  const checkDate = new Date();

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
