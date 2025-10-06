"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card as CardType, Rating } from "@/types";
import { LocalCardsRepository, LocalLogsRepository } from "@/lib/localRepositories";
import { SRSScheduler } from "@/lib/core/srs";
import { useCurrentProfileId } from "@/lib/hooks/use-profile";
import { DEFAULT_CONFIG } from "@/lib/constants";
import { getTodayISO } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Home, BarChart3, Play } from "lucide-react";
import confetti from "canvas-confetti";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { StatusBadge } from "@/components/ui/status-badge";

export default function SessionPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const profileId = useCurrentProfileId();
  const [cards, setCards] = useState<CardType[]>([]);
  const [queue, setQueue] = useState<CardType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [scheduler, setScheduler] = useState<SRSScheduler | null>(null);
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    correct: 0,
    incorrect: 0,
    newCards: 0,
    reviewCards: 0,
    learningCards: 0,
  });
  const [reviewedCards, setReviewedCards] = useState<Array<{ card: CardType; rating: Rating }>>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load cards for current profile
  useEffect(() => {
    if (mounted && profileId) {
      const loadCardsForProfile = async () => {
        try {
          const loaded = await LocalCardsRepository.list(profileId);
          const srs = new SRSScheduler(DEFAULT_CONFIG);
          const sessionQueue = srs.buildQueue(loaded, new Date());

          setCards(loaded);
          setScheduler(srs);

          if (sessionQueue.length === 0) {
            setQueue([]);
          } else {
            setQueue(sessionQueue);
          }
        } catch (error) {
          console.error("Failed to load cards:", error);
          setCards([]);
          setQueue([]);
        }
      };
      loadCardsForProfile();
    }
  }, [mounted, profileId]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!currentCard) return;

      if (e.code === "Space" && !showAnswer) {
        e.preventDefault();
        setShowAnswer(true);
      } else if (showAnswer && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        const rating = (parseInt(e.key) - 1) as Rating;
        handleRate(rating);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentIndex, showAnswer, queue]);

  // Функция для запуска конфетти
  const triggerConfetti = () => {
    // Запускаем конфетти
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#feca57", "#ff9ff3", "#54a0ff"],
    });

    // Дополнительный взрыв конфетти через 500мс
    setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 100,
        origin: { y: 0.6 },
        colors: ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#feca57", "#ff9ff3", "#54a0ff"],
      });
    }, 500);
  };

  const currentCard = queue[currentIndex];
  const isSessionComplete = currentIndex >= queue.length;

  const handleRate = async (rating: Rating) => {
    if (!currentCard || !scheduler) return;

    const now = new Date();
    const updatedCard = scheduler.rate(currentCard, rating, now);

    const newCards = cards.map(c => (c.id === updatedCard.id ? updatedCard : c));
    setCards(newCards);

    // Save updated cards to repository
    try {
      if (profileId) {
        await LocalCardsRepository.bulkSave(profileId, newCards);
      }
    } catch (error) {
      console.error("Failed to save cards:", error);
    }

    const isCorrect = rating >= 2;
    const newStats = {
      reviewed: sessionStats.reviewed + 1,
      correct: sessionStats.correct + (isCorrect ? 1 : 0),
      incorrect: sessionStats.incorrect + (isCorrect ? 0 : 1),
      newCards: sessionStats.newCards + (currentCard.status === "new" ? 1 : 0),
      reviewCards: sessionStats.reviewCards + (currentCard.status === "review" ? 1 : 0),
      learningCards:
        sessionStats.learningCards +
        (currentCard.status === "learning" || currentCard.status === "relearning" ? 1 : 0),
    };
    setSessionStats(newStats);

    setReviewedCards([...reviewedCards, { card: currentCard, rating }]);

    if (currentIndex < queue.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    } else {
      const summary = {
        date: getTodayISO(),
        totalReviewed: newStats.reviewed,
        correct: newStats.correct,
        incorrect: newStats.incorrect,
        newCards: newStats.newCards,
        reviewCards: newStats.reviewCards,
        learningCards: newStats.learningCards,
        accuracy:
          newStats.reviewed > 0 ? Math.round((newStats.correct / newStats.reviewed) * 100) : 0,
      };
      // Save session log to repository
      try {
        if (profileId) {
          await LocalLogsRepository.append(profileId, summary);
        }
      } catch (error) {
        console.error("Failed to save session log:", error);
      }
      toast.success("Тренировка завершена!", {
        description: `Повторено ${newStats.reviewed} карточек с точностью ${summary.accuracy}%`,
      });
      // Запускаем конфетти при завершении тренировки
      triggerConfetti();
      setCurrentIndex(currentIndex + 1);
    }
  };

  if (!mounted || !profileId) {
    return <LoadingScreen message="Загружаем сессию..." variant="default" />;
  }

  if (queue.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-4 sm:space-y-6 p-4">
        <div className="text-4xl sm:text-6xl mb-4">🎉</div>
        <h1 className="text-2xl sm:text-3xl font-bold">Все карточки повторены!</h1>
        <p className="text-muted-foreground text-base sm:text-lg">
          Возвращайтесь позже, когда появятся новые карточки для повторения.
        </p>
        <Button onClick={() => router.push("/")} size="lg" className="w-full sm:w-auto">
          <Home className="mr-2 h-4 w-4" />
          На главную
        </Button>
      </div>
    );
  }

  if (isSessionComplete) {
    const accuracy =
      sessionStats.reviewed > 0
        ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
        : 0;

    return (
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 p-4">
        <Card>
          <CardHeader className="text-center pb-4">
            <div className="text-3xl sm:text-4xl mb-4">🎉</div>
            <h2 className="text-2xl sm:text-3xl font-bold">Тренировка завершена!</h2>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {sessionStats.reviewed}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Повторено</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/30">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {accuracy}%
                </div>
                <div className="text-sm text-muted-foreground mt-1">Точность</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {sessionStats.newCards}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Новых</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {sessionStats.reviewCards}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Повторений</div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button
                onClick={() => {
                  // Перезагружаем страницу для новой тренировки
                  window.location.reload();
                }}
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600"
              >
                <Play className="mr-2 h-4 w-4" />
                Продолжить тренировку
              </Button>
              <Button onClick={() => router.push("/")} size="lg" className="w-full sm:w-auto">
                <Home className="mr-2 h-4 w-4" />
                На главную
              </Button>
              <Button
                onClick={() => router.push("/logs")}
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Статистика
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold">Повторенные карточки</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {reviewedCards.map(({ card, rating }, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex-1">
                    <span className="font-semibold">{card.greek}</span>
                    <span className="mx-2 text-muted-foreground">→</span>
                    <span className="text-muted-foreground">{card.translation}</span>
                  </div>
                  <RatingBadge rating={rating} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / queue.length) * 100;
  const dueCount = queue.filter(
    (c, i) => i > currentIndex && c.due <= new Date().toISOString()
  ).length;

  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 p-4">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            Карточка {currentIndex + 1} / {queue.length}
          </span>
          <span className="hidden sm:inline">Осталось срочных: {dueCount}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Card */}
      <Card className="min-h-[400px] sm:min-h-[500px] flex flex-col justify-center">
        <CardContent className="p-6 sm:p-12 text-center space-y-6 sm:space-y-8">
          {/* Status badge */}
          <div>
            <StatusBadge status={currentCard.status} />
          </div>

          {/* Greek word */}
          <div className="space-y-3 sm:space-y-4">
            <p className="text-4xl sm:text-6xl font-bold">{currentCard.greek}</p>
            {currentCard.tags && currentCard.tags.length > 0 && (
              <div className="flex gap-2 justify-center flex-wrap">
                {currentCard.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Answer section */}
          {!showAnswer ? (
            <Button
              onClick={() => setShowAnswer(true)}
              size="lg"
              className="text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto"
            >
              Показать ответ <kbd className="ml-2 text-xs hidden sm:inline">Space</kbd>
            </Button>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              <p className="text-2xl sm:text-4xl font-medium text-muted-foreground">
                {currentCard.translation}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleRate(0)}
                  className="flex-col h-auto py-3 sm:py-4 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                >
                  <span className="text-sm sm:text-lg font-semibold">Забыл</span>
                  <kbd className="text-xs opacity-75 mt-1">1</kbd>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleRate(1)}
                  className="flex-col h-auto py-3 sm:py-4 border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950"
                >
                  <span className="text-sm sm:text-lg font-semibold">Трудно</span>
                  <kbd className="text-xs opacity-75 mt-1">2</kbd>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleRate(2)}
                  className="flex-col h-auto py-3 sm:py-4 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"
                >
                  <span className="text-sm sm:text-lg font-semibold">Хорошо</span>
                  <kbd className="text-xs opacity-75 mt-1">3</kbd>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleRate(3)}
                  className="flex-col h-auto py-3 sm:py-4 border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
                >
                  <span className="text-sm sm:text-lg font-semibold">Легко</span>
                  <kbd className="text-xs opacity-75 mt-1">4</kbd>
                </Button>
              </div>

              {currentCard.reps > 0 && (
                <p className="text-sm text-muted-foreground">
                  Повторено {currentCard.reps} раз
                  {currentCard.difficulty !== undefined && currentCard.difficulty !== null && (
                    <> • Сложность: {currentCard.difficulty.toFixed(1)}</>
                  )}
                  {currentCard.stability !== undefined && currentCard.stability !== null && (
                    <> • Стабильность: {currentCard.stability.toFixed(1)} дней</>
                  )}
                  {currentCard.lapses > 0 && (
                    <span className="text-orange-600 ml-2">• Ошибок: {currentCard.lapses}</span>
                  )}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Keyboard shortcuts hint - hidden on mobile */}
      <div className="hidden md:block text-center text-sm text-muted-foreground">
        <p>
          Горячие клавиши: <kbd className="px-2 py-1 rounded bg-muted mx-1">Space</kbd> — показать
          ответ, <kbd className="px-2 py-1 rounded bg-muted mx-1">1-4</kbd> — оценить
        </p>
      </div>
    </div>
  );
}

function RatingBadge({ rating }: { rating: Rating }) {
  const configs = [
    { label: "Again", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" },
    {
      label: "Hard",
      className: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
    },
    { label: "Good", className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200" },
    {
      label: "Easy",
      className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
    },
  ];

  const config = configs[rating];
  return <Badge className={config.className}>{config.label}</Badge>;
}
