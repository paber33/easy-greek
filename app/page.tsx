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
    if (!currentProfileId) return;

    try {
      const cards = await LocalCardsRepository.list(currentProfileId);
      setCards(cards);
    } catch (error) {
      console.error("Failed to load cards:", error);
      setCards([]);
    }
  }, [currentProfileId]);

  // Memoized function to load logs
  const loadLogsForProfile = useCallback(async () => {
    if (!currentProfileId) return;

    try {
      const profileLogs = await LocalLogsRepository.list(currentProfileId);
      setLogs(profileLogs);
    } catch (error) {
      console.error("Failed to load logs:", error);
      setLogs([]);
    }
  }, [currentProfileId]);

  // Memoized stats calculation - use a stable date to prevent hydration mismatches
  const stats = useMemo(() => {
    // Use a fixed date for SSR consistency, will be updated on client
    const nowISO = mounted ? new Date().toISOString() : "2024-01-01T00:00:00.000Z";

    return {
      total: cards.length,
      new: cards.filter(c => c.status === "new").length,
      learning: cards.filter(c => c.status === "learning" || c.status === "relearning").length,
      review: cards.filter(c => c.status === "review").length,
      due: cards.filter(c => c.due <= nowISO).length,
      leeches: cards.filter(c => c.isLeech).length,
    };
  }, [cards, mounted]);

  // Memoized log calculations - use stable date for SSR
  const todayLog = useMemo(() => {
    const todayISO = mounted ? getTodayISO() : "2024-01-01";
    return logs.find(log => log.date === todayISO);
  }, [logs, mounted]);

  const streak = useMemo(() => calculateStreak(logs, mounted), [logs, mounted]);

  useEffect(() => {
    setMounted(true);

    // Инициализируем фразу и совет на основе времени (детерминированно)
    // Используем фиксированные индексы для предотвращения проблем с гидратацией
    const timeIndex = 0; // Всегда показываем первую фразу
    const tipIndex = 0; // Всегда показываем первый совет
    setCurrentPhrase(motivationalPhrases[timeIndex]);
    setCurrentTip(learningTips[tipIndex]);
  }, []);

  // Load cards for current profile
  useEffect(() => {
    if (mounted && currentProfileId && !profileLoading) {
      loadCardsForProfile();
    }
  }, [mounted, currentProfileId, profileLoading, loadCardsForProfile]);

  // Load logs for current profile
  useEffect(() => {
    if (mounted && currentProfileId && !profileLoading) {
      loadLogsForProfile();
    }
  }, [mounted, currentProfileId, profileLoading, loadLogsForProfile]);

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
    <div className="space-y-6 sm:space-y-8 lg:space-y-10" suppressHydrationWarning>
      {/* Header with motivational phrase */}
      <div className="text-center space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground transition-all duration-300">
            {currentPhrase.greek}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground transition-all duration-300">
            {currentPhrase.translation}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
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
      {todayLog && (
        <UICard className="border-2 border-primary/10 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <BarChart3 className="h-5 w-5 text-primary" />
              Сегодняшний прогресс
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{todayLog.totalReviewed}</div>
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
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/session" className="group">
          <UICard className="h-full transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border-2 border-primary/20 hover:border-primary/40 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                <Play className="h-8 w-8 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>
              <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                Начать тренировку
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {stats.due > 0 ? (
                  <>
                    <Badge variant="default" className="mr-2 bg-primary text-primary-foreground">
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
              <p className="text-sm text-muted-foreground group-hover:text-primary transition-colors duration-300 font-medium">
                Нажмите, чтобы начать →
              </p>
            </CardContent>
          </UICard>
        </Link>

        <Link href="/words" className="group">
          <UICard className="h-full transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border hover:border-primary/30">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 rounded-full bg-blue-100 dark:bg-blue-900/20 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/30 transition-colors duration-300">
                <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-xl font-bold text-foreground">Список слов</CardTitle>
              <CardDescription className="text-muted-foreground">
                Управляйте своей базой из {stats.total} слов
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                Добавить, редактировать →
              </p>
            </CardContent>
          </UICard>
        </Link>

        <Link href="/logs" className="group">
          <UICard className="h-full transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border hover:border-primary/30">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 rounded-full bg-purple-100 dark:bg-purple-900/20 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/30 transition-colors duration-300">
                <BarChart3 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-xl font-bold text-foreground">Статистика</CardTitle>
              <CardDescription className="text-muted-foreground">
                Просмотрите свой прогресс и аналитику
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                Открыть журнал →
              </p>
            </CardContent>
          </UICard>
        </Link>
      </div>

      {/* Progress Calendar */}
      <ProgressCalendar />

      {/* Tips */}
      <UICard className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800 shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="text-2xl">💡</span>
            Совет дня
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
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
    blue: "border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-950/30",
    purple:
      "border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700 bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100/50 dark:hover:bg-purple-950/30",
    yellow:
      "border-yellow-200 dark:border-yellow-800 hover:border-yellow-300 dark:hover:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-950/20 hover:bg-yellow-100/50 dark:hover:bg-yellow-950/30",
    green:
      "border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700 bg-green-50/50 dark:bg-green-950/20 hover:bg-green-100/50 dark:hover:bg-green-950/30",
    orange:
      "border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700 bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-100/50 dark:hover:bg-orange-950/30",
    red: "border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100/50 dark:hover:bg-red-950/30",
    training:
      "border-primary/30 hover:border-primary/50 bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 shadow-md hover:shadow-lg",
  };

  return (
    <Link href={href} className="block group">
      <UICard
        className={`transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer border-2 ${variants[variant]}`}
      >
        <CardContent className="p-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="p-2 rounded-full bg-background/50 group-hover:bg-background/80 transition-colors duration-300">
              {icon}
            </div>
            <div className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
              {value}
            </div>
            <div className="text-xs text-muted-foreground font-medium">{title}</div>
          </div>
        </CardContent>
      </UICard>
    </Link>
  );
});

StatCard.displayName = "StatCard";

function calculateStreak(logs: SessionSummary[], mounted: boolean): number {
  if (logs.length === 0) return 0;

  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  // Use stable date for SSR consistency
  const checkDate = mounted ? new Date() : new Date("2024-01-01");

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
