import { Card, SessionSummary, SRSConfig } from '@/types';
import { ProfileId } from '@/types/profile';
import { 
  CardsRepository, 
  LogsRepository, 
  ConfigRepository, 
  SessionRepository,
  Repository 
} from './repositories';
import { ns } from './ns';
import { DEFAULT_CONFIG } from './constants';

/**
 * Утилиты для работы с localStorage
 */
const load = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.error(`Failed to load ${key}:`, error);
    return fallback;
  }
};

const save = (key: string, value: unknown): void => {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
  }
};

/**
 * Репозиторий карточек для localStorage
 */
export const LocalCardsRepository: CardsRepository = {
  async list(profileId: ProfileId): Promise<Card[]> {
    return load(ns(profileId, "cards"), [] as Card[]);
  },

  async upsert(profileId: ProfileId, card: Card): Promise<void> {
    const cards = await this.list(profileId);
    const index = cards.findIndex(c => c.id === card.id);
    
    if (index >= 0) {
      cards[index] = card;
    } else {
      cards.push(card);
    }
    
    save(ns(profileId, "cards"), cards);
  },

  async bulkSave(profileId: ProfileId, cards: Card[]): Promise<void> {
    save(ns(profileId, "cards"), cards);
  },

  async remove(profileId: ProfileId, id: string): Promise<void> {
    const cards = await this.list(profileId);
    const filtered = cards.filter(c => c.id !== id);
    save(ns(profileId, "cards"), filtered);
  },

  async clear(profileId: ProfileId): Promise<void> {
    save(ns(profileId, "cards"), []);
  }
};

/**
 * Репозиторий логов для localStorage
 */
export const LocalLogsRepository: LogsRepository = {
  async list(profileId: ProfileId): Promise<SessionSummary[]> {
    return load(ns(profileId, "logs"), [] as SessionSummary[]);
  },

  async append(profileId: ProfileId, log: SessionSummary): Promise<void> {
    const logs = await this.list(profileId);
    const existingIndex = logs.findIndex(l => l.date === log.date);

    if (existingIndex >= 0) {
      // Merge with existing log for the day
      const existing = logs[existingIndex];
      logs[existingIndex] = {
        ...log,
        totalReviewed: existing.totalReviewed + log.totalReviewed,
        correct: existing.correct + log.correct,
        incorrect: existing.incorrect + log.incorrect,
        newCards: existing.newCards + log.newCards,
        reviewCards: existing.reviewCards + log.reviewCards,
        learningCards: existing.learningCards + log.learningCards,
        accuracy: Math.round(
          ((existing.correct + log.correct) /
            (existing.totalReviewed + log.totalReviewed)) *
            100
        ),
      };
    } else {
      logs.push(log);
    }

    // Keep only last 90 days
    const sorted = logs.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 90);
    save(ns(profileId, "logs"), sorted);
  },

  async clear(profileId: ProfileId): Promise<void> {
    save(ns(profileId, "logs"), []);
  }
};

/**
 * Репозиторий настроек для localStorage
 */
export const LocalConfigRepository: ConfigRepository = {
  async get(profileId: ProfileId): Promise<SRSConfig> {
    return load(ns(profileId, "config"), DEFAULT_CONFIG);
  },

  async save(profileId: ProfileId, config: SRSConfig): Promise<void> {
    save(ns(profileId, "config"), config);
  }
};

/**
 * Репозиторий сессий для localStorage
 */
export const LocalSessionRepository: SessionRepository = {
  async get(profileId: ProfileId): Promise<any> {
    return load(ns(profileId, "session"), null);
  },

  async save(profileId: ProfileId, session: any): Promise<void> {
    save(ns(profileId, "session"), session);
  },

  async clear(profileId: ProfileId): Promise<void> {
    save(ns(profileId, "session"), null);
  }
};

/**
 * Главный локальный репозиторий
 */
export const localRepository: Repository = {
  cards: LocalCardsRepository,
  logs: LocalLogsRepository,
  config: LocalConfigRepository,
  session: LocalSessionRepository,
};
