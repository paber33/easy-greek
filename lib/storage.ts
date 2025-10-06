import { Card, SessionSummary, SRSConfig } from "@/types";
import { DEFAULT_CONFIG } from "./constants";
import { syncService } from "./sync";

const STORAGE_VERSION = "1";
const CARDS_KEY = "easy-greek-cards";
const LOGS_KEY = "easy-greek-logs";
const CONFIG_KEY = "easy-greek-config";
const VERSION_KEY = "easy-greek-version";

// Функция для получения ключей с привязкой к пользователю
function getUserStorageKeys(userId?: string) {
  if (!userId) {
    // Если пользователь не указан, используем общие ключи (для обратной совместимости)
    return {
      cards: CARDS_KEY,
      logs: LOGS_KEY,
      config: CONFIG_KEY,
      version: VERSION_KEY
    };
  }
  
  return {
    cards: `${CARDS_KEY}-${userId}`,
    logs: `${LOGS_KEY}-${userId}`,
    config: `${CONFIG_KEY}-${userId}`,
    version: `${VERSION_KEY}-${userId}`
  };
}

// Функция для получения текущего пользователя из Supabase
function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  
  try {
    // Получаем токен из localStorage
    const authToken = localStorage.getItem('supabase.auth.token');
    if (!authToken) return null;
    
    // Парсим токен для получения user_id
    const tokenData = JSON.parse(authToken);
    return tokenData?.currentSession?.user?.id || null;
  } catch (error) {
    console.error('Failed to get current user ID:', error);
    return null;
  }
}

/**
 * Seed data with Greek words
 */
function getSeedCards(): Card[] {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 1 * 864e5);
  const twoDaysAgo = new Date(now.getTime() - 2 * 864e5);
  const fourDaysAgo = new Date(now.getTime() - 4 * 864e5);

  return [
    // Greetings (new)
    {
      id: "1",
      greek: "Καλημέρα",
      translation: "Доброе утро",
      tags: ["greetings"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
      examples: [
        "Καλημέρα! Πώς είσαι; - Доброе утро! Как дела?",
        "Καλημέρα κύριε! - Доброе утро, господин!"
      ],
      pronunciation: "кали-мЭ-ра",
      notes: "Используется до 12:00. После полудня говорят Καλησπέρα"
    },
    {
      id: "2",
      greek: "Ευχαριστώ",
      translation: "Спасибо",
      tags: ["greetings"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
      examples: [
        "Ευχαριστώ πολύ! - Большое спасибо!",
        "Ευχαριστώ για τη βοήθεια - Спасибо за помощь"
      ],
      pronunciation: "эф-ха-рис-тО",
      notes: "Можно сократить до Ευχαριστώ πολύ (большое спасибо)"
    },
    {
      id: "3",
      greek: "Παρακαλώ",
      translation: "Пожалуйста",
      tags: ["greetings"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
    },
    {
      id: "4",
      greek: "Καληνύχτα",
      translation: "Спокойной ночи",
      tags: ["greetings"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
    },

    // Verbs
    {
      id: "5",
      greek: "τρώω",
      translation: "есть (кушать)",
      tags: ["verbs", "food"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
      examples: [
        "Τρώω ψωμί - Я ем хлеб",
        "Τι τρως; - Что ты ешь?",
        "Δεν τρώω κρέας - Я не ем мясо"
      ],
      pronunciation: "трО-о",
      notes: "Неправильный глагол. Спряжение: τρώω, τρως, τρώει, τρώμε, τρώτε, τρώνε"
    },
    {
      id: "6",
      greek: "πίνω",
      translation: "пить",
      tags: ["verbs", "food"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
    },
    {
      id: "7",
      greek: "είμαι",
      translation: "быть (я есть)",
      tags: ["verbs"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
    },
    {
      id: "8",
      greek: "έχω",
      translation: "иметь (я имею)",
      tags: ["verbs"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
    },

    // Food
    {
      id: "9",
      greek: "νερό",
      translation: "вода",
      tags: ["food"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
    },
    {
      id: "10",
      greek: "κρασί",
      translation: "вино",
      tags: ["food"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
    },
    {
      id: "11",
      greek: "καφές",
      translation: "кофе",
      tags: ["food"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
    },
    {
      id: "12",
      greek: "τυρί",
      translation: "сыр",
      tags: ["food"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
    },

    // Nouns
    {
      id: "13",
      greek: "σπίτι",
      translation: "дом",
      tags: ["nouns"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
    },
    {
      id: "14",
      greek: "οικογένεια",
      translation: "семья",
      tags: ["nouns"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
    },
    {
      id: "15",
      greek: "φίλος",
      translation: "друг",
      tags: ["nouns"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
    },
    {
      id: "16",
      greek: "βιβλίο",
      translation: "книга",
      tags: ["nouns"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
    },

    // Review examples (with different S/D)
    {
      id: "r1",
      greek: "γεια",
      translation: "привет",
      tags: ["greetings"],
      status: "review",
      reps: 12,
      lapses: 1,
      ease: 2.3,
      interval: 7,
      lastReview: fourDaysAgo.toISOString(),
      due: yesterday.toISOString(),
      correct: 10,
      incorrect: 2,
    },
    {
      id: "r2",
      greek: "ψωμί",
      translation: "хлеб",
      tags: ["food"],
      status: "review",
      reps: 7,
      lapses: 2,
      ease: 2.1,
      interval: 4,
      lastReview: twoDaysAgo.toISOString(),
      due: new Date(now.getTime() - 0.5 * 864e5).toISOString(),
      correct: 5,
      incorrect: 2,
    },
    {
      id: "r3",
      greek: "θέλω",
      translation: "хотеть (я хочу)",
      tags: ["verbs"],
      status: "review",
      reps: 15,
      lapses: 0,
      ease: 2.7,
      interval: 14,
      lastReview: fourDaysAgo.toISOString(),
      due: new Date(now.getTime() + 2 * 864e5).toISOString(),
      correct: 15,
      incorrect: 0,
    },
    {
      id: "r4",
      greek: "αγαπώ",
      translation: "любить",
      tags: ["verbs"],
      status: "review",
      reps: 9,
      lapses: 1,
      ease: 2.4,
      interval: 6,
      lastReview: twoDaysAgo.toISOString(),
      due: yesterday.toISOString(),
      correct: 8,
      incorrect: 1,
    },
  ];
}

export function loadCards(): Card[] {
  if (typeof window === "undefined") return [];

  try {
    const userId = getCurrentUserId();
    const keys = getUserStorageKeys(userId);
    
    const version = localStorage.getItem(keys.version);
    const data = localStorage.getItem(keys.cards);

    if (!data) {
      // First launch - return seed data
      const seedCards = getSeedCards();
      saveCards(seedCards);
      return seedCards;
    }

    let cards = JSON.parse(data) as Card[];

    // Migration logic: Convert FSRS fields to SM-2 fields
    if (version !== STORAGE_VERSION) {
      cards = cards.map((card) => {
        const migrated = { ...card };

        // Migrate from FSRS to SM-2
        if (migrated.difficulty !== undefined && migrated.ease === undefined) {
          // Initialize SM-2 fields from FSRS fields
          migrated.ease = 2.5; // Default ease factor
          migrated.interval = Math.max(1, Math.round(migrated.stability || 1));
          
          // Migrate learning step index
          if (migrated.currentStep !== undefined) {
            migrated.learningStepIndex = migrated.currentStep;
          }
        }

        // Ensure SM-2 fields exist
        if (migrated.ease === undefined) {
          migrated.ease = 2.5;
        }
        if (migrated.interval === undefined) {
          migrated.interval = 0;
        }

        return migrated;
      });

      // Save migrated cards
      saveCards(cards);
      localStorage.setItem(keys.version, STORAGE_VERSION);
    }

    return cards;
  } catch (error) {
    console.error("Failed to load cards:", error);
    return [];
  }
}

export function saveCards(cards: Card[]): void {
  if (typeof window === "undefined") return;

  try {
    const userId = getCurrentUserId();
    const keys = getUserStorageKeys(userId);
    
    localStorage.setItem(keys.cards, JSON.stringify(cards));
    localStorage.setItem(keys.version, STORAGE_VERSION);
    
    // Фоновая синхронизация с Supabase
    syncService.syncCards(cards).catch(console.error);
  } catch (error) {
    console.error("Failed to save cards:", error);
  }
}

export function loadLogs(): SessionSummary[] {
  if (typeof window === "undefined") return [];

  try {
    const userId = getCurrentUserId();
    const keys = getUserStorageKeys(userId);
    
    const data = localStorage.getItem(keys.logs);
    if (!data) return [];
    return JSON.parse(data) as SessionSummary[];
  } catch (error) {
    console.error("Failed to load logs:", error);
    return [];
  }
}

export function appendSessionLog(summary: SessionSummary): void {
  if (typeof window === "undefined") return;

  try {
    const userId = getCurrentUserId();
    const keys = getUserStorageKeys(userId);
    
    const logs = loadLogs();
    const existingIndex = logs.findIndex((log) => log.date === summary.date);

    if (existingIndex >= 0) {
      // Merge with existing log for the day
      const existing = logs[existingIndex];
      logs[existingIndex] = {
        ...summary,
        totalReviewed: existing.totalReviewed + summary.totalReviewed,
        correct: existing.correct + summary.correct,
        incorrect: existing.incorrect + summary.incorrect,
        newCards: existing.newCards + summary.newCards,
        reviewCards: existing.reviewCards + summary.reviewCards,
        learningCards: existing.learningCards + summary.learningCards,
        accuracy: Math.round(
          ((existing.correct + summary.correct) /
            (existing.totalReviewed + summary.totalReviewed)) *
            100
        ),
      };
    } else {
      logs.push(summary);
    }

    // Keep only last 90 days
    const sorted = logs.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 90);
    localStorage.setItem(keys.logs, JSON.stringify(sorted));
    
    // Фоновая синхронизация с Supabase
    syncService.syncSessionLogs(sorted).catch(console.error);
  } catch (error) {
    console.error("Failed to save log:", error);
  }
}

export function loadConfig(): SRSConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;

  try {
    const userId = getCurrentUserId();
    const keys = getUserStorageKeys(userId);
    
    const data = localStorage.getItem(keys.config);
    if (!data) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch (error) {
    console.error("Failed to load config:", error);
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: SRSConfig): void {
  if (typeof window === "undefined") return;

  try {
    const userId = getCurrentUserId();
    const keys = getUserStorageKeys(userId);
    
    localStorage.setItem(keys.config, JSON.stringify(config));
    
    // Фоновая синхронизация с Supabase
    syncService.syncConfig(config).catch(console.error);
  } catch (error) {
    console.error("Failed to save config:", error);
  }
}

// Функции для работы с аутентификацией и синхронизацией
export async function loadUserDataFromSupabase(): Promise<{ cards: Card[], logs: SessionSummary[], config: SRSConfig } | null> {
  return await syncService.loadUserData();
}

export async function syncAllDataToSupabase(): Promise<void> {
  const cards = loadCards();
  const logs = loadLogs();
  const config = loadConfig();
  
  await syncService.forceSyncAll(cards, logs, config);
}

export async function mergeUserDataWithLocal(userData: { cards: Card[], logs: SessionSummary[], config: SRSConfig }): Promise<void> {
  // Загружаем локальные данные
  const localCards = loadCards();
  const localLogs = loadLogs();
  const localConfig = loadConfig();
  
  // Объединяем карточки (приоритет у облачных данных)
  const mergedCards = [...userData.cards];
  const localCardIds = new Set(localCards.map(c => c.id));
  
  // Добавляем локальные карточки, которых нет в облаке
  localCards.forEach(card => {
    if (!localCardIds.has(card.id)) {
      mergedCards.push(card);
    }
  });
  
  // Объединяем логи (приоритет у облачных данных)
  const mergedLogs = [...userData.logs];
  const cloudLogDates = new Set(userData.logs.map(l => l.date));
  
  // Добавляем локальные логи, которых нет в облаке
  localLogs.forEach(log => {
    if (!cloudLogDates.has(log.date)) {
      mergedLogs.push(log);
    }
  });
  
  // Используем конфиг из облака, если есть, иначе локальный
  const mergedConfig = userData.config || localConfig;
  
  // Сохраняем объединенные данные локально
  saveCards(mergedCards);
  
  // Сохраняем логи с пользовательским ключом
  const userId = getCurrentUserId();
  const keys = getUserStorageKeys(userId);
  localStorage.setItem(keys.logs, JSON.stringify(mergedLogs));
  
  saveConfig(mergedConfig);
}

// Функция для очистки данных при смене пользователя
export function clearUserData(): void {
  if (typeof window === "undefined") return;
  
  try {
    // Очищаем все пользовательские ключи
    const allKeys = Object.keys(localStorage);
    const userKeys = allKeys.filter(key => 
      key.startsWith('easy-greek-cards-') ||
      key.startsWith('easy-greek-logs-') ||
      key.startsWith('easy-greek-config-') ||
      key.startsWith('easy-greek-version-')
    );
    
    userKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('User data cleared successfully');
  } catch (error) {
    console.error('Failed to clear user data:', error);
  }
}
