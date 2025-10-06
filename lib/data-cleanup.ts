/**
 * Утилиты для очистки и валидации данных
 */

import { SessionSummary } from "@/types";

/**
 * Очищает и валидирует данные сессии
 */
export function cleanSessionSummary(summary: SessionSummary): SessionSummary {
  return {
    ...summary,
    totalReviewed: Math.max(summary.totalReviewed || 0, 0),
    correct: Math.max(summary.correct || 0, 0),
    incorrect: Math.max(summary.incorrect || 0, 0),
    newCards: Math.max(summary.newCards || 0, 0),
    reviewCards: Math.max(summary.reviewCards || 0, 0),
    learningCards: Math.max(summary.learningCards || 0, 0),
    accuracy: Math.max(Math.min(summary.accuracy || 0, 100), 0),
  };
}

/**
 * Очищает массив логов сессий
 */
export function cleanSessionLogs(logs: SessionSummary[]): SessionSummary[] {
  return logs
    .map(cleanSessionSummary)
    .filter(log => {
      // Удаляем логи с некорректными датами
      const date = new Date(log.date);
      return !isNaN(date.getTime()) && date.getTime() > 0;
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 90); // Оставляем только последние 90 дней
}

/**
 * Очищает данные карточки
 */
export function cleanCardData(card: any) {
  return {
    ...card,
    reps: Math.min(Math.max(card.reps || 0, 0), 1000),
    correct: Math.min(Math.max(card.correct || 0, 0), 1000),
    incorrect: Math.min(Math.max(card.incorrect || 0, 0), 1000),
    lapses: Math.min(Math.max(card.lapses || 0, 0), 100),
    difficulty: Math.min(Math.max(card.difficulty || 0.5, 0.1), 1.0),
    stability: Math.min(Math.max(card.stability || 1.0, 0.1), 365),
    status: ["new", "learning", "review", "relearning"].includes(card.status) ? card.status : "new",
    lastReview: card.lastReview && card.lastReview !== "Invalid Date" ? card.lastReview : null,
    due: card.due && card.due !== "Invalid Date" ? card.due : new Date().toISOString(),
    currentStep:
      typeof card.currentStep === "number" && card.currentStep >= 0 ? card.currentStep : 0,
    isLeech: Boolean(card.isLeech),
  };
}

/**
 * Очищает массив карточек
 */
export function cleanCardsData(cards: any[]) {
  return cards.map(cleanCardData);
}

/**
 * Проверяет наличие аномальных значений в данных
 */
export function hasAnomalousData(data: any): boolean {
  if (Array.isArray(data)) {
    return data.some(item => hasAnomalousData(item));
  }

  if (typeof data === "object" && data !== null) {
    return Object.values(data).some(value => hasAnomalousData(value));
  }

  if (typeof data === "number") {
    return data > 1000000 || data < -1000000 || !isFinite(data);
  }

  return false;
}

/**
 * Очищает localStorage от поврежденных данных
 */
export function cleanupLocalStorage(): void {
  if (typeof window === "undefined") return;

  try {
    const keys = Object.keys(localStorage);
    let cleanedCount = 0;

    keys.forEach(key => {
      if (key.includes("cards") || key.includes("logs")) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || "[]");

          if (hasAnomalousData(data)) {
            console.warn(`🧹 Очищаем поврежденные данные в ${key}`);

            if (Array.isArray(data)) {
              if (key.includes("logs")) {
                localStorage.setItem(key, JSON.stringify(cleanSessionLogs(data)));
              } else if (key.includes("cards")) {
                localStorage.setItem(key, JSON.stringify(cleanCardsData(data)));
              }
            }

            cleanedCount++;
          }
        } catch (error) {
          console.warn(`🗑️ Удаляем поврежденный ключ ${key}:`, error);
          localStorage.removeItem(key);
          cleanedCount++;
        }
      }
    });

    if (cleanedCount > 0) {
      console.log(`✅ Очищено ${cleanedCount} поврежденных записей в localStorage`);
    }
  } catch (error) {
    console.error("❌ Ошибка очистки localStorage:", error);
  }
}

/**
 * Очищает все логи сессий (удаляет все записи)
 */
export function clearAllSessionLogs(): void {
  if (typeof window === "undefined") return;

  try {
    const keys = Object.keys(localStorage);
    let clearedCount = 0;

    keys.forEach(key => {
      if (key.includes("logs")) {
        console.log(`🗑️ Очищаем логи в ${key}`);
        localStorage.removeItem(key);
        clearedCount++;
      }
    });

    if (clearedCount > 0) {
      console.log(`✅ Очищено ${clearedCount} ключей с логами`);
    }
  } catch (error) {
    console.error("❌ Ошибка очистки логов:", error);
  }
}
