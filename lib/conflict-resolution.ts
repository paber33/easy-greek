/**
 * Система разрешения конфликтов данных
 * Обеспечивает корректное объединение данных из разных источников
 */

import { Card, SessionSummary, SRSConfig } from './types';

export interface ConflictResolutionStrategy {
  cards: 'cloud' | 'local' | 'merge' | 'newest';
  logs: 'cloud' | 'local' | 'merge' | 'newest';
  config: 'cloud' | 'local' | 'newest';
}

export const DEFAULT_STRATEGY: ConflictResolutionStrategy = {
  cards: 'merge',    // Объединяем карточки (приоритет у облачных)
  logs: 'merge',     // Объединяем логи (приоритет у облачных)
  config: 'cloud'    // Используем настройки из облака
};

export class ConflictResolver {
  private strategy: ConflictResolutionStrategy;

  constructor(strategy: ConflictResolutionStrategy = DEFAULT_STRATEGY) {
    this.strategy = strategy;
  }

  /**
   * Разрешает конфликты между облачными и локальными карточками
   */
  resolveCards(cloudCards: Card[], localCards: Card[]): Card[] {
    switch (this.strategy.cards) {
      case 'cloud':
        return cloudCards;
      
      case 'local':
        return localCards;
      
      case 'newest':
        return this.getNewestCards(cloudCards, localCards);
      
      case 'merge':
      default:
        return this.mergeCards(cloudCards, localCards);
    }
  }

  /**
   * Разрешает конфликты между облачными и локальными логами
   */
  resolveLogs(cloudLogs: SessionSummary[], localLogs: SessionSummary[]): SessionSummary[] {
    switch (this.strategy.logs) {
      case 'cloud':
        return cloudLogs;
      
      case 'local':
        return localLogs;
      
      case 'newest':
        return this.getNewestLogs(cloudLogs, localLogs);
      
      case 'merge':
      default:
        return this.mergeLogs(cloudLogs, localLogs);
    }
  }

  /**
   * Разрешает конфликты между облачными и локальными настройками
   */
  resolveConfig(cloudConfig: SRSConfig | null, localConfig: SRSConfig | null): SRSConfig | null {
    switch (this.strategy.config) {
      case 'cloud':
        return cloudConfig || localConfig;
      
      case 'local':
        return localConfig || cloudConfig;
      
      case 'newest':
        return this.getNewestConfig(cloudConfig, localConfig);
      
      default:
        return cloudConfig || localConfig;
    }
  }

  /**
   * Объединяет карточки (приоритет у облачных)
   */
  private mergeCards(cloudCards: Card[], localCards: Card[]): Card[] {
    const merged = [...cloudCards];
    const cloudCardIds = new Set(cloudCards.map(c => c.id));
    
    // Добавляем локальные карточки, которых нет в облаке
    localCards.forEach(card => {
      if (!cloudCardIds.has(card.id)) {
        merged.push(card);
      } else {
        // Если карточка есть в обеих версиях, используем облачную (более свежую)
        const cloudIndex = merged.findIndex(c => c.id === card.id);
        if (cloudIndex >= 0) {
          // Сравниваем время последнего обновления
          const cloudCard = merged[cloudIndex];
          const localCard = card;
          
          // Если у локальной карточки больше повторений, возможно она новее
          if (localCard.reps > cloudCard.reps || 
              (localCard.reps === cloudCard.reps && localCard.correct > cloudCard.correct)) {
            merged[cloudIndex] = localCard;
          }
        }
      }
    });

    return merged;
  }

  /**
   * Объединяет логи (приоритет у облачных)
   */
  private mergeLogs(cloudLogs: SessionSummary[], localLogs: SessionSummary[]): SessionSummary[] {
    const merged = [...cloudLogs];
    const cloudLogDates = new Set(cloudLogs.map(l => l.date));
    
    // Добавляем локальные логи, которых нет в облаке
    localLogs.forEach(log => {
      if (!cloudLogDates.has(log.date)) {
        merged.push(log);
      } else {
        // Если лог есть в обеих версиях, объединяем данные
        const cloudIndex = merged.findIndex(l => l.date === log.date);
        if (cloudIndex >= 0) {
          const cloudLog = merged[cloudIndex];
          merged[cloudIndex] = {
            ...cloudLog,
            totalReviewed: cloudLog.totalReviewed + log.totalReviewed,
            correct: cloudLog.correct + log.correct,
            incorrect: cloudLog.incorrect + log.incorrect,
            newCards: cloudLog.newCards + log.newCards,
            reviewCards: cloudLog.reviewCards + log.reviewCards,
            learningCards: cloudLog.learningCards + log.learningCards,
            accuracy: Math.round(
              ((cloudLog.correct + log.correct) /
                (cloudLog.totalReviewed + log.totalReviewed)) * 100
            )
          };
        }
      }
    });

    return merged.sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Получает самые новые карточки
   */
  private getNewestCards(cloudCards: Card[], localCards: Card[]): Card[] {
    // Простая эвристика: если у локальных карточек больше повторений, они новее
    const localTotalReps = localCards.reduce((sum, card) => sum + card.reps, 0);
    const cloudTotalReps = cloudCards.reduce((sum, card) => sum + card.reps, 0);
    
    return localTotalReps > cloudTotalReps ? localCards : cloudCards;
  }

  /**
   * Получает самые новые логи
   */
  private getNewestLogs(cloudLogs: SessionSummary[], localLogs: SessionSummary[]): SessionSummary[] {
    // Если есть локальные логи с более поздними датами, используем их
    const latestLocalDate = localLogs.length > 0 ? localLogs[0].date : '';
    const latestCloudDate = cloudLogs.length > 0 ? cloudLogs[0].date : '';
    
    return latestLocalDate > latestCloudDate ? localLogs : cloudLogs;
  }

  /**
   * Получает самые новые настройки
   */
  private getNewestConfig(cloudConfig: SRSConfig | null, localConfig: SRSConfig | null): SRSConfig | null {
    // Простая эвристика: если есть облачные настройки, они приоритетнее
    return cloudConfig || localConfig;
  }

  /**
   * Обновляет стратегию разрешения конфликтов
   */
  updateStrategy(strategy: Partial<ConflictResolutionStrategy>) {
    this.strategy = { ...this.strategy, ...strategy };
  }

  /**
   * Получает текущую стратегию
   */
  getStrategy(): ConflictResolutionStrategy {
    return { ...this.strategy };
  }
}

// Создаем глобальный экземпляр
export const conflictResolver = new ConflictResolver();
