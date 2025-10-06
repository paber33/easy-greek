"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, SessionSummary } from "@/types";
import { useProfile } from "@/lib/hooks/use-profile";
import { LocalCardsRepository, LocalLogsRepository } from "@/lib/localRepositories";
import { getTodayISO } from "@/lib/utils";
import {
  Card as UICard,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { AuthComponent } from "@/components/auth";
import { LoginScreen } from "@/components/login-screen";
import { ProgressCalendar } from "@/components/progress-calendar";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { supabase } from "@/lib/supabase";

// ============================================================================
// Constants
// ============================================================================

const MOTIVATIONAL_PHRASES = [
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

const LEARNING_TIPS = [
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

// ============================================================================
// Main Component
// ============================================================================

export default function DashboardPage() {
  const { currentProfileId, isLoading: profileLoading } = useProfile();
  const [cards, setCards] = useState<Card[]>([]);
  const [logs, setLogs] = useState<SessionSummary[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentPhrase, setCurrentPhrase] = useState<(typeof MOTIVATIONAL_PHRASES)[0] | null>(null);
  const [currentTip, setCurrentTip] = useState<string | null>(null);

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    setMounted(true);

    // Initialize phrase and tip deterministically
    const timeIndex = 0; // Always show first phrase
    const tipIndex = 0; // Always show first tip
    setCurrentPhrase(MOTIVATIONAL_PHRASES[timeIndex]);
    setCurrentTip(LEARNING_TIPS[tipIndex]);
  }, []);

  // Load cards for current profile
  useEffect(() => {
    if (mounted && currentProfileId && !profileLoading) {
      const loadCardsForProfile = async () => {
        try {
          const cards = await LocalCardsRepository.list(currentProfileId);
          setCards(cards);
        } catch (error) {
          console.error("Failed to load cards:", error);
          setCards([]);
        }
      };
      loadCardsForProfile();
    }
  }, [mounted, currentProfileId, profileLoading]);

  // Load logs for current profile
  useEffect(() => {
    if (mounted && currentProfileId && !profileLoading) {
      const loadLogsForProfile = async () => {
        try {
          const profileLogs = await LocalLogsRepository.list(currentProfileId);
          setLogs(profileLogs);
        } catch (error) {
          console.error("Failed to load logs:", error);
          setLogs([]);
        }
      };
      loadLogsForProfile();
    }
  }, [mounted, currentProfileId, profileLoading]);

  // Check authentication state
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

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ============================================================================
  // Computed Values
  // ============================================================================

  // Use stable date for SSR consistency
  const nowISO = mounted ? new Date().toISOString() : "2024-01-01T00:00:00.000Z";
  const stats = {
    total: cards.length,
    new: cards.filter(c => c.status === "new").length,
    learning: cards.filter(c => c.status === "learning").length,
    review: cards.filter(c => c.status === "review").length,
    due: cards.filter(c => c.due <= nowISO).length,
    leeches: cards.filter(c => c.isLeech).length,
  };

  const todayLog = logs.find(log => log.date === (mounted ? getTodayISO() : "2024-01-01"));
  const streak = calculateStreak(logs, mounted);

  // ============================================================================
  // Loading States
  // ============================================================================

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

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8" suppressHydrationWarning>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Добро пожаловать! 👋</h1>
          <p className="text-muted-foreground mt-1">Готовы изучать греческий язык?</p>
        </div>
        <AuthComponent />
      </div>

      {/* Motivational Section */}
      {currentPhrase && (
        <UICard className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="text-center space-y-3">
              <div className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-blue-100">
                {currentPhrase.greek}
              </div>
              <div className="text-lg text-blue-700 dark:text-blue-300">
                {currentPhrase.translation}
              </div>
            </div>
          </CardContent>
        </UICard>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/session">
          <UICard className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full group-hover:bg-green-200 dark:group-hover:bg-green-900/30 transition-colors">
                  <Play className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Начать тренировку</h3>
                  <p className="text-sm text-muted-foreground">
                    {stats.due > 0 ? `${stats.due} карточек готовы` : "Нет карточек для повторения"}
                  </p>
                </div>
              </div>
            </CardContent>
          </UICard>
        </Link>

        <Link href="/words">
          <UICard className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full group-hover:bg-blue-200 dark:group-hover:bg-blue-900/30 transition-colors">
                  <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Мои слова</h3>
                  <p className="text-sm text-muted-foreground">
                    {stats.total} карточек в коллекции
                  </p>
                </div>
              </div>
            </CardContent>
          </UICard>
        </Link>

        <Link href="/logs">
          <UICard className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full group-hover:bg-purple-200 dark:group-hover:bg-purple-900/30 transition-colors">
                  <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Статистика</h3>
                  <p className="text-sm text-muted-foreground">
                    {streak > 0 ? `${streak} дней подряд` : "Начните серию!"}
                  </p>
                </div>
              </div>
            </CardContent>
          </UICard>
        </Link>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={<BookOpen className="h-4 w-4" />}
          label="Всего"
          value={stats.total}
          color="blue"
        />
        <StatCard
          icon={<Sparkles className="h-4 w-4" />}
          label="Новые"
          value={stats.new}
          color="purple"
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Изучаю"
          value={stats.learning}
          color="orange"
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Повторяю"
          value={stats.review}
          color="green"
        />
        <StatCard
          icon={<AlertCircle className="h-4 w-4" />}
          label="Готовы"
          value={stats.due}
          color="red"
        />
        <StatCard
          icon={<Flame className="h-4 w-4" />}
          label="Личи"
          value={stats.leeches}
          color="yellow"
        />
      </div>

      {/* Today's Progress */}
      {todayLog && (
        <UICard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Прогресс сегодня
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{todayLog.totalReviewed}</div>
                <div className="text-sm text-muted-foreground">Просмотрено</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{todayLog.correct}</div>
                <div className="text-sm text-muted-foreground">Правильно</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{todayLog.incorrect}</div>
                <div className="text-sm text-muted-foreground">Ошибок</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(todayLog.accuracy)}%
                </div>
                <div className="text-sm text-muted-foreground">Точность</div>
              </div>
            </div>
          </CardContent>
        </UICard>
      )}

      {/* Learning Tip */}
      {currentTip && (
        <UICard className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <Sparkles className="h-5 w-5" />
              Совет дня
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-700 dark:text-green-300 leading-relaxed">{currentTip}</p>
          </CardContent>
        </UICard>
      )}

      {/* Progress Calendar */}
      <UICard>
        <CardHeader>
          <CardTitle>Календарь прогресса</CardTitle>
          <CardDescription>Ваша активность за последние 30 дней</CardDescription>
        </CardHeader>
        <CardContent>
          <ProgressCalendar />
        </CardContent>
      </UICard>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "blue" | "purple" | "orange" | "green" | "red" | "yellow";
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    blue: "text-blue-600 dark:text-blue-400",
    purple: "text-purple-600 dark:text-purple-400",
    orange: "text-orange-600 dark:text-orange-400",
    green: "text-green-600 dark:text-green-400",
    red: "text-red-600 dark:text-red-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
  };

  return (
    <UICard className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className={colorClasses[color]}>{icon}</div>
          <div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
          </div>
        </div>
      </CardContent>
    </UICard>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateStreak(logs: SessionSummary[], mounted: boolean): number {
  if (logs.length === 0) return 0;

  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  // Use stable date for SSR consistency
  let checkDate = mounted ? new Date() : new Date("2024-01-01");

  for (const log of sorted) {
    const logDate = new Date(log.date);
    const diffDays = Math.floor((checkDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === streak) {
      streak++;
      checkDate = logDate;
    } else {
      break;
    }
  }

  return streak;
}
