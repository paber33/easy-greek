"use client";

import { Card, Rating } from "@/lib/types";
import { RATING_LABELS, RATING_COLORS } from "@/lib/constants";
import { useState, useEffect } from "react";

interface TrainingSessionProps {
  queue: Card[];
  onRate: (card: Card, rating: Rating) => void;
  onEnd: () => void;
}

export default function TrainingSession({
  queue,
  onRate,
  onEnd,
}: TrainingSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    correct: 0,
    incorrect: 0,
    newCards: 0,
    reviewCards: 0,
    learningCards: 0,
  });
  const [reviewedCards, setReviewedCards] = useState<
    Array<{ card: Card; rating: Rating }>
  >([]);

  const currentCard = queue[currentIndex];
  const isLastCard = currentIndex >= queue.length - 1;

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
  }, [currentCard, showAnswer]);

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleRate = (rating: Rating) => {
    if (!currentCard) return;

    // Update stats
    const isCorrect = rating >= 2; // Good or Easy
    const newStats = {
      reviewed: sessionStats.reviewed + 1,
      correct: sessionStats.correct + (isCorrect ? 1 : 0),
      incorrect: sessionStats.incorrect + (isCorrect ? 0 : 1),
      newCards:
        sessionStats.newCards + (currentCard.status === "new" ? 1 : 0),
      reviewCards:
        sessionStats.reviewCards + (currentCard.status === "review" ? 1 : 0),
      learningCards:
        sessionStats.learningCards +
        (currentCard.status === "learning" ||
        currentCard.status === "relearning"
          ? 1
          : 0),
    };
    setSessionStats(newStats);

    // Track reviewed cards
    setReviewedCards([...reviewedCards, { card: currentCard, rating }]);

    // Rate the card
    onRate(currentCard, rating);

    // Move to next card
    if (isLastCard) {
      // Session complete
      return;
    }

    setCurrentIndex(currentIndex + 1);
    setShowAnswer(false);
  };

  if (!currentCard || isLastCard && sessionStats.reviewed > 0) {
    // Session end screen
    const accuracy =
      sessionStats.reviewed > 0
        ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
        : 0;

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-3xl font-bold mb-4">Session Complete! 🎉</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-300">
                {sessionStats.reviewed}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Reviewed
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
              <div className="text-3xl font-bold text-green-600 dark:text-green-300">
                {accuracy}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Accuracy
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-300">
                {sessionStats.newCards}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                New Cards
              </div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-300">
                {sessionStats.reviewCards}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Reviews
              </div>
            </div>
          </div>
          <button
            onClick={onEnd}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-lg font-semibold"
          >
            Back to Word List
          </button>
        </div>

        {/* Reviewed cards summary */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4">Reviewed Cards</h3>
          <div className="space-y-2">
            {reviewedCards.map(({ card, rating }, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded"
              >
                <div className="flex-1">
                  <span className="font-semibold">{card.greek}</span>
                  <span className="mx-2 text-gray-400">→</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {card.translation}
                  </span>
                </div>
                <span
                  className={`text-xs px-3 py-1 rounded text-white ${
                    RATING_COLORS[rating].split(" ")[0]
                  }`}
                >
                  {RATING_LABELS[rating]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / queue.length) * 100;
  const dueCount = queue.filter(
    (c, i) => i > currentIndex && c.due <= new Date().toISOString()
  ).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            Card {currentIndex + 1} / {queue.length}
          </span>
          <span>Due remaining: {dueCount}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-gray-800 p-12 rounded-lg shadow-lg min-h-[400px] flex flex-col justify-center items-center">
        {/* Status badge */}
        <div className="mb-6">
          <span className="text-xs px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded">
            {currentCard.status === "new"
              ? "New Card"
              : currentCard.status === "review"
              ? "Review"
              : "Learning"}
          </span>
        </div>

        {/* Front: Greek word */}
        <div className="text-center mb-8">
          <div className="text-5xl font-bold mb-4">{currentCard.greek}</div>
          {currentCard.tags && currentCard.tags.length > 0 && (
            <div className="flex gap-2 justify-center">
              {currentCard.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-sm px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Answer section */}
        {!showAnswer ? (
          <button
            onClick={handleShowAnswer}
            className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-lg font-semibold"
          >
            Show Answer <span className="text-sm ml-2">(Space)</span>
          </button>
        ) : (
          <div className="w-full space-y-6">
            {/* Translation */}
            <div className="text-center text-3xl mb-8 text-gray-700 dark:text-gray-300">
              {currentCard.translation}
            </div>

            {/* Rating buttons */}
            <div className="grid grid-cols-4 gap-3">
              {RATING_LABELS.map((label, rating) => (
                <button
                  key={rating}
                  onClick={() => handleRate(rating as Rating)}
                  className={`py-4 text-white rounded-lg transition font-semibold ${RATING_COLORS[rating]}`}
                >
                  <div className="text-lg">{label}</div>
                  <div className="text-xs opacity-75">({rating + 1})</div>
                </button>
              ))}
            </div>

            {/* Card stats (if reviewed before) */}
            {currentCard.reps > 0 && (
              <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                Reviewed {currentCard.reps} times • Difficulty:{" "}
                {currentCard.difficulty.toFixed(1)} • Stability:{" "}
                {currentCard.stability.toFixed(1)} days
                {currentCard.lapses > 0 && (
                  <span className="text-orange-600 ml-2">
                    • {currentCard.lapses} lapse(s)
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          Keyboard shortcuts: <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">Space</kbd> to show answer,{" "}
          <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">1-4</kbd> to rate
        </p>
      </div>
    </div>
  );
}

