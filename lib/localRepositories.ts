import { Card, SessionSummary, SRSConfig } from "@/types";
import { ProfileId } from "@/types/profile";
import {
  CardsRepository,
  LogsRepository,
  ConfigRepository,
  SessionRepository,
  Repository,
  SessionState,
} from "./repositories";
import { ns } from "./ns";
import { DEFAULT_CONFIG } from "./constants";

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
 * Репозиторий карточек для localStorage с автоматической синхронизацией Supabase
 */
export const LocalCardsRepository: CardsRepository = {
  async list(profileId: ProfileId): Promise<Card[]> {
    // Используем новую функцию loadCards с повторными попытками
    try {
      const { loadCards } = await import("./core/storage");

      // Попробуем загрузить карточки с повторными попытками
      let cards = await loadCards();

      // Если карточки пустые, подождем немного и попробуем еще раз
      if (cards.length === 0) {
        console.log("No cards loaded, waiting for sync and retrying...");
        await new Promise(resolve => setTimeout(resolve, 1000)); // Ждем 1 секунду

        // Проверяем, есть ли данные в localStorage как fallback
        const localCards = load(ns(profileId, "cards"), [] as Card[]);
        if (localCards.length > 0) {
          console.log(`Using ${localCards.length} cards from localStorage as fallback`);
          return localCards;
        }

        // Пробуем загрузить еще раз
        cards = await loadCards();
      }

      console.log(`Loaded ${cards.length} cards for profile ${profileId}`);
      return cards;
    } catch (error) {
      console.log("Failed to load cards:", error);

      // Fallback к localStorage
      const localCards = load(ns(profileId, "cards"), [] as Card[]);
      console.log(`Using ${localCards.length} cards from localStorage as fallback`);
      return localCards;
    }
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

    // Автоматически синхронизируем с Supabase
    try {
      const { syncService } = await import("./sync");
      await syncService.syncCards(cards);
    } catch (error) {
      console.log("Failed to sync cards to Supabase:", error);
    }
  },

  async bulkSave(profileId: ProfileId, cards: Card[]): Promise<void> {
    save(ns(profileId, "cards"), cards);

    // Автоматически синхронизируем с Supabase
    try {
      const { syncService } = await import("./sync");
      await syncService.syncCards(cards);
      console.log(`Synced ${cards.length} cards to Supabase for profile ${profileId}`);
    } catch (error) {
      console.log("Failed to sync cards to Supabase:", error);
    }
  },

  async remove(profileId: ProfileId, id: string): Promise<void> {
    const cards = await this.list(profileId);
    const filtered = cards.filter(c => c.id !== id);
    save(ns(profileId, "cards"), filtered);
  },

  async clear(profileId: ProfileId): Promise<void> {
    save(ns(profileId, "cards"), []);
  },
};

/**
 * Репозиторий логов для localStorage с автоматической синхронизацией Supabase
 */
export const LocalLogsRepository: LogsRepository = {
  async list(profileId: ProfileId): Promise<SessionSummary[]> {
    // Сначала пытаемся загрузить из localStorage
    const localLogs = load(ns(profileId, "logs"), [] as SessionSummary[]);

    // Если есть локальные логи, возвращаем их
    if (localLogs.length > 0) {
      return localLogs;
    }

    // Если локальных логов нет, пытаемся загрузить из Supabase
    try {
      const { syncService } = await import("./sync");
      const userData = await syncService.loadUserData();

      if (userData && userData.logs.length > 0) {
        // Сохраняем логи из Supabase в localStorage
        save(ns(profileId, "logs"), userData.logs);
        console.log(`Loaded ${userData.logs.length} logs from Supabase for profile ${profileId}`);
        return userData.logs;
      }
    } catch (error) {
      console.log("Failed to load logs from Supabase, using local data:", error);
    }

    // Если ничего не найдено, возвращаем пустой массив
    return [];
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
        accuracy:
          existing.totalReviewed + log.totalReviewed > 0
            ? Math.round(
                ((existing.correct + log.correct) / (existing.totalReviewed + log.totalReviewed)) *
                  100
              )
            : 0,
      };
    } else {
      logs.push(log);
    }

    // Keep only last 90 days
    const sorted = logs.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 90);
    save(ns(profileId, "logs"), sorted);

    // Автоматически синхронизируем с Supabase
    try {
      const { syncService } = await import("./sync");
      await syncService.syncSessionLogs(sorted);
      console.log(`Synced ${sorted.length} logs to Supabase for profile ${profileId}`);
    } catch (error) {
      console.log("Failed to sync logs to Supabase:", error);
    }
  },

  async clear(profileId: ProfileId): Promise<void> {
    save(ns(profileId, "logs"), []);
  },
};

/**
 * Репозиторий настроек для localStorage с автоматической синхронизацией Supabase
 */
export const LocalConfigRepository: ConfigRepository = {
  async get(profileId: ProfileId): Promise<SRSConfig> {
    // Сначала пытаемся загрузить из localStorage
    const localConfig = load(ns(profileId, "config"), null);

    // Если есть локальные настройки, возвращаем их
    if (localConfig) {
      return localConfig;
    }

    // Если локальных настроек нет, пытаемся загрузить из Supabase
    try {
      const { syncService } = await import("./sync");
      const userData = await syncService.loadUserData();

      if (userData && userData.config) {
        // Сохраняем настройки из Supabase в localStorage
        save(ns(profileId, "config"), userData.config);
        console.log(`Loaded config from Supabase for profile ${profileId}`);
        return userData.config;
      }
    } catch (error) {
      console.log("Failed to load config from Supabase, using default:", error);
    }

    // Если ничего не найдено, возвращаем настройки по умолчанию
    return DEFAULT_CONFIG;
  },

  async save(profileId: ProfileId, config: SRSConfig): Promise<void> {
    save(ns(profileId, "config"), config);

    // Автоматически синхронизируем с Supabase
    try {
      const { syncService } = await import("./sync");
      await syncService.syncConfig(config);
      console.log(`Synced config to Supabase for profile ${profileId}`);
    } catch (error) {
      console.log("Failed to sync config to Supabase:", error);
    }
  },
};

/**
 * Репозиторий сессий для localStorage
 */
export const LocalSessionRepository: SessionRepository = {
  async get(profileId: ProfileId): Promise<SessionState | null> {
    return load(ns(profileId, "session"), null);
  },

  async save(profileId: ProfileId, session: SessionState): Promise<void> {
    save(ns(profileId, "session"), session);
  },

  async clear(profileId: ProfileId): Promise<void> {
    save(ns(profileId, "session"), null);
  },
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
