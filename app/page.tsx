"use client";

import { useState, useEffect } from "react";
import { Card, Rating, SessionSummary, SRSConfig } from "@/lib/types";
import { SRSScheduler } from "@/lib/srs";
import {
  loadCards,
  saveCards,
  loadLogs,
  appendSessionLog,
  loadConfig,
  saveConfig,
} from "@/lib/storage";
import { generateMockCards } from "@/lib/mockData";
import WordList from "@/components/WordList";
import TrainingSession from "@/components/TrainingSession";
import SessionLog from "@/components/SessionLog";
import Settings from "@/components/Settings";

type Screen = "wordlist" | "session" | "log" | "settings";

export default function Home() {
  const [cards, setCards] = useState<Card[]>([]);
  const [logs, setLogs] = useState<SessionSummary[]>([]);
  const [config, setConfig] = useState<SRSConfig | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>("wordlist");
  const [sessionQueue, setSessionQueue] = useState<Card[]>([]);
  const [scheduler, setScheduler] = useState<SRSScheduler | null>(null);
  const [mounted, setMounted] = useState(false);

  // Initialize data on mount
  useEffect(() => {
    setMounted(true);
    const loadedCards = loadCards();
    const loadedLogs = loadLogs();
    const loadedConfig = loadConfig();

    // If no cards exist, load mock data
    if (loadedCards.length === 0) {
      const mockCards = generateMockCards();
      setCards(mockCards);
      saveCards(mockCards);
    } else {
      setCards(loadedCards);
    }

    setLogs(loadedLogs);
    setConfig(loadedConfig);
    setScheduler(new SRSScheduler(loadedConfig));
  }, []);

  // Save cards whenever they change
  useEffect(() => {
    if (mounted && cards.length > 0) {
      saveCards(cards);
    }
  }, [cards, mounted]);

  const handleAddCard = (newCard: Omit<Card, "id">) => {
    const card: Card = {
      ...newCard,
      id: crypto.randomUUID(),
    };
    setCards([...cards, card]);
  };

  const handleEditCard = (id: string, updates: Partial<Card>) => {
    setCards(cards.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const handleResetCard = (id: string) => {
    setCards(
      cards.map((c) =>
        c.id === id
          ? {
              ...c,
              status: "new" as const,
              reps: 0,
              lapses: 0,
              difficulty: 6.0,
              stability: 0,
              due: new Date().toISOString(),
              correct: 0,
              incorrect: 0,
              lastReview: undefined,
              currentStep: undefined,
              isLeech: false,
            }
          : c
      )
    );
  };

  const handleStartSession = () => {
    if (!scheduler) return;

    const queue = scheduler.buildQueue(cards, new Date());
    if (queue.length === 0) {
      alert("No cards due for review!");
      return;
    }

    setSessionQueue(queue);
    setCurrentScreen("session");
  };

  const handleRate = (card: Card, rating: Rating) => {
    if (!scheduler) return;

    const now = new Date();
    const updatedCard = scheduler.rate(card, rating, now);

    setCards(cards.map((c) => (c.id === updatedCard.id ? updatedCard : c)));
  };

  const handleEndSession = () => {
    // Calculate session summary
    const today = new Date().toISOString().split("T")[0];
    const sessionCards = sessionQueue.map(
      (sq) => cards.find((c) => c.id === sq.id)!
    );

    const summary: SessionSummary = {
      date: today,
      totalReviewed: sessionQueue.length,
      correct: sessionCards.reduce((sum, c) => sum + c.correct, 0),
      incorrect: sessionCards.reduce((sum, c) => sum + c.incorrect, 0),
      newCards: sessionCards.filter((c) => c.status === "new").length,
      reviewCards: sessionCards.filter((c) => c.status === "review").length,
      learningCards: sessionCards.filter(
        (c) => c.status === "learning" || c.status === "relearning"
      ).length,
      accuracy:
        sessionQueue.length > 0
          ? Math.round(
              (sessionCards.reduce((sum, c) => sum + c.correct, 0) /
                sessionQueue.length) *
                100
            )
          : 0,
    };

    appendSessionLog(summary);
    setLogs(loadLogs());
    setSessionQueue([]);
    setCurrentScreen("wordlist");
  };

  const handleUpdateConfig = (newConfig: SRSConfig) => {
    setConfig(newConfig);
    saveConfig(newConfig);
    setScheduler(new SRSScheduler(newConfig));
    alert("Settings saved successfully!");
  };

  const handleImport = (importedCards: Card[]) => {
    setCards([...cards, ...importedCards]);
  };

  // Prevent hydration mismatch by rendering same content on server and client initially
  if (!mounted || !config) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                🇬🇷 Easy Greek
              </h1>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Spaced Repetition Learning
              </span>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-xl">Loading...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                🇬🇷 Easy Greek
              </h1>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Spaced Repetition Learning
              </span>
            </div>
            <nav className="flex gap-2">
              <button
                onClick={() => setCurrentScreen("wordlist")}
                className={`px-4 py-2 rounded-lg transition ${
                  currentScreen === "wordlist"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                Words
              </button>
              <button
                onClick={() => setCurrentScreen("log")}
                className={`px-4 py-2 rounded-lg transition ${
                  currentScreen === "log"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                Log
              </button>
              <button
                onClick={() => setCurrentScreen("settings")}
                className={`px-4 py-2 rounded-lg transition ${
                  currentScreen === "settings"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                Settings
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentScreen === "wordlist" && (
          <WordList
            cards={cards}
            onAddCard={handleAddCard}
            onEditCard={handleEditCard}
            onResetCard={handleResetCard}
            onStartSession={handleStartSession}
          />
        )}

        {currentScreen === "session" && (
          <TrainingSession
            queue={sessionQueue}
            onRate={handleRate}
            onEnd={handleEndSession}
          />
        )}

        {currentScreen === "log" && <SessionLog logs={logs} />}

        {currentScreen === "settings" && (
          <Settings
            config={config}
            cards={cards}
            onUpdateConfig={handleUpdateConfig}
            onImport={handleImport}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Built with Next.js + TypeScript + TailwindCSS • FSRS-lite Algorithm
        </div>
      </footer>
    </div>
  );
}
