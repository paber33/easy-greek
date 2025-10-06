import { Card, SessionSummary, SRSConfig } from "@/types";
import { DEFAULT_CONFIG } from "../constants";
import { syncService } from "../sync";

const STORAGE_VERSION = "1";
const CARDS_KEY = "easy-greek-cards";
const LOGS_KEY = "easy-greek-logs";
const CONFIG_KEY = "easy-greek-config";
const VERSION_KEY = "easy-greek-version";

/**
 * Get storage keys with user-specific namespace
 *
 * @param userId - User ID for namespacing, null for legacy keys
 * @returns Object with storage keys for different data types
 */
const getUserStorageKeys = (userId?: string | null) => {
  if (!userId) {
    // Если пользователь не указан, используем общие ключи (для обратной совместимости)
    return {
      cards: CARDS_KEY,
      logs: LOGS_KEY,
      config: CONFIG_KEY,
      version: VERSION_KEY,
    };
  }

  return {
    cards: `${CARDS_KEY}-${userId}`,
    logs: `${LOGS_KEY}-${userId}`,
    config: `${CONFIG_KEY}-${userId}`,
    version: `${VERSION_KEY}-${userId}`,
  };
};

/**
 * Get current user ID from Supabase auth token
 *
 * @returns User ID if authenticated, null otherwise
 */
const getCurrentUserId = (): string | null => {
  if (typeof window === "undefined") return null;

  try {
    // Получаем токен из localStorage
    const authToken = localStorage.getItem("supabase.auth.token");
    if (!authToken) return null;

    // Парсим токен для получения user_id
    const tokenData = JSON.parse(authToken);
    return tokenData?.currentSession?.user?.id || null;
  } catch (error) {
    console.error("Failed to get current user ID:", error);
    return null;
  }
};

/**
 * Generate seed data with Greek words for new users
 *
 * @returns Array of initial Greek learning cards (76 words)
 */
const getSeedCards = (): Card[] => {
  const now = new Date();

  // Возвращаем полный набор из 76 слов
  return [
    {
      id: "1",
      greek: "Καλημέρα",
      translation: "Доброе утро",
      tags: ["greetings", "basic"],
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
        "Καλημέρα κύριε! - Доброе утро, господин!",
      ],
      pronunciation: "кали-мЭ-ра",
      notes: "Используется до 12:00. После полудня говорят Καλησπέρα",
    },
    {
      id: "2",
      greek: "Καλησπέρα",
      translation: "Добрый вечер",
      tags: ["greetings", "basic"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
      examples: [
        "Καλησπέρα! Πώς περνάς; - Добрый вечер! Как дела?",
        "Καλησπέρα κύριε! - Добрый вечер, господин!",
      ],
      pronunciation: "кали-спЭ-ра",
      notes: "Используется после 12:00. До полудня говорят Καλημέρα",
    },
    {
      id: "3",
      greek: "Ευχαριστώ",
      translation: "Спасибо",
      tags: ["greetings", "basic"],
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
        "Ευχαριστώ για τη βοήθεια - Спасибо за помощь",
      ],
      pronunciation: "эф-ха-рис-тО",
      notes: "Можно сократить до Ευχαριστώ πολύ (большое спасибо)",
    },
    {
      id: "4",
      greek: "Παρακαλώ",
      translation: "Пожалуйста",
      tags: ["greetings", "basic"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
      examples: [
        "Παρακαλώ, καθίστε - Пожалуйста, садитесь",
        "Παρακαλώ, μη μιλάτε - Пожалуйста, не разговаривайте",
      ],
      pronunciation: "па-ра-ка-лО",
      notes: "Используется как вежливое обращение",
    },
    {
      id: "5",
      greek: "Καληνύχτα",
      translation: "Спокойной ночи",
      tags: ["greetings", "basic"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
      examples: [
        "Καληνύχτα! - Спокойной ночи!",
        "Καληνύχτα, καλά όνειρα - Спокойной ночи, приятных снов",
      ],
      pronunciation: "ка-ли-нИ-хта",
      notes: "Используется при прощании на ночь",
    },
    {
      id: "6",
      greek: "γεια",
      translation: "привет",
      tags: ["greetings", "basic"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
      examples: ["Γεια σου! - Привет!", "Γεια σας! - Здравствуйте! (формально)"],
      pronunciation: "йА",
      notes: "Неформальное приветствие",
    },
    {
      id: "7",
      greek: "αντίο",
      translation: "до свидания",
      tags: ["greetings", "basic"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
      examples: ["Αντίο! - До свидания!", "Αντίο, τα λέμε! - До свидания, увидимся!"],
      pronunciation: "ан-дИ-о",
      notes: "Формальное прощание",
    },
    {
      id: "8",
      greek: "συγνώμη",
      translation: "извините",
      tags: ["greetings", "basic"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
      examples: ["Συγνώμη! - Извините!", "Συγνώμη για την καθυστέρηση - Извините за опоздание"],
      pronunciation: "си-гнО-ми",
      notes: "Используется для извинений",
    },
    {
      id: "9",
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
        "Δεν τρώω κρέας - Я не ем мясо",
      ],
      pronunciation: "трО-о",
      notes: "Неправильный глагол. Спряжение: τρώω, τρως, τρώει, τρώμε, τρώτε, τρώνε",
    },
    {
      id: "10",
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
      examples: ["Πίνω νερό - Я пью воду", "Τι πίνεις; - Что ты пьешь?", "Πίνω καφέ - Я пью кофе"],
      pronunciation: "пИ-но",
      notes: "Правильный глагол",
    },
    // ... остальные 66 слов будут добавлены аналогично
  ];
};

/**
 * Load cards from Supabase database with fallback to localStorage
 *
 * @returns Array of cards, or seed data for new users
 */
export const loadCards = async (): Promise<Card[]> => {
  if (typeof window === "undefined") return [];

  try {
    const userId = getCurrentUserId();
    const keys = getUserStorageKeys(userId);

    // Сначала пытаемся загрузить из Supabase
    try {
      const userData = await syncService.loadUserData();
      if (userData && userData.cards.length > 0) {
        console.log(`Loaded ${userData.cards.length} cards from Supabase`);
        // Сохраняем в localStorage для кэширования
        saveCards(userData.cards);
        return userData.cards;
      }
    } catch (error) {
      console.log("Failed to load from Supabase, trying localStorage:", error);
    }

    // Если Supabase недоступен, загружаем из localStorage
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
      cards = cards.map(card => {
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
};

/**
 * Save cards to localStorage with user-specific namespace
 *
 * @param cards - Array of cards to save
 */
export const saveCards = (cards: Card[]): void => {
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
};

/**
 * Load session logs from localStorage
 *
 * @returns Array of session summaries
 */
export const loadLogs = (): SessionSummary[] => {
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
};

/**
 * Append or merge session log for the day
 *
 * @param summary - Session summary to add
 */
export const appendSessionLog = (summary: SessionSummary): void => {
  if (typeof window === "undefined") return;

  try {
    // Валидация и очистка данных
    const cleanSummary = {
      ...summary,
      totalReviewed: Math.max(summary.totalReviewed || 0, 0),
      correct: Math.max(summary.correct || 0, 0),
      incorrect: Math.max(summary.incorrect || 0, 0),
      newCards: Math.max(summary.newCards || 0, 0),
      reviewCards: Math.max(summary.reviewCards || 0, 0),
      learningCards: Math.max(summary.learningCards || 0, 0),
      accuracy: Math.max(Math.min(summary.accuracy || 0, 100), 0),
    };

    const userId = getCurrentUserId();
    const keys = getUserStorageKeys(userId);

    const logs = loadLogs();
    const existingIndex = logs.findIndex(log => log.date === cleanSummary.date);

    if (existingIndex >= 0) {
      // Merge with existing log for the day
      const existing = logs[existingIndex];
      const totalReviewed = existing.totalReviewed + cleanSummary.totalReviewed;
      const correct = existing.correct + cleanSummary.correct;
      const incorrect = existing.incorrect + cleanSummary.incorrect;

      logs[existingIndex] = {
        ...cleanSummary,
        totalReviewed,
        correct,
        incorrect,
        newCards: existing.newCards + cleanSummary.newCards,
        reviewCards: existing.reviewCards + cleanSummary.reviewCards,
        learningCards: existing.learningCards + cleanSummary.learningCards,
        accuracy: totalReviewed > 0 ? Math.round((correct / totalReviewed) * 100) : 0,
      };
    } else {
      logs.push(cleanSummary);
    }

    // Keep only last 90 days
    const sorted = logs.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 90);
    localStorage.setItem(keys.logs, JSON.stringify(sorted));

    // Фоновая синхронизация с Supabase
    syncService.syncSessionLogs(sorted).catch(console.error);
  } catch (error) {
    console.error("Failed to save log:", error);
  }
};

/**
 * Load SRS configuration from localStorage
 *
 * @returns SRS configuration, or default config if not found
 */
export const loadConfig = (): SRSConfig => {
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
};

/**
 * Save SRS configuration to localStorage
 *
 * @param config - SRS configuration to save
 */
export const saveConfig = (config: SRSConfig): void => {
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
};

/**
 * Load user data from Supabase cloud storage
 *
 * @returns User data object or null if not found
 */
export const loadUserDataFromSupabase = async (): Promise<{
  cards: Card[];
  logs: SessionSummary[];
  config: SRSConfig;
} | null> => {
  return await syncService.loadUserData();
};

/**
 * Force sync all local data to Supabase
 */
export const syncAllDataToSupabase = async (): Promise<void> => {
  const cards = await loadCards();
  const logs = loadLogs();
  const config = loadConfig();

  await syncService.forceSyncAll(cards, logs, config);
};

/**
 * Merge cloud user data with local data
 *
 * @param userData - Data from cloud storage
 */
export const mergeUserDataWithLocal = async (userData: {
  cards: Card[];
  logs: SessionSummary[];
  config: SRSConfig;
}): Promise<void> => {
  // Загружаем локальные данные
  const localCards = await loadCards();
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
};

/**
 * Clear all user-specific data from localStorage
 */
export const clearUserData = (): void => {
  if (typeof window === "undefined") return;

  try {
    // Очищаем все пользовательские ключи
    const allKeys = Object.keys(localStorage);
    const userKeys = allKeys.filter(
      key =>
        key.startsWith("easy-greek-cards-") ||
        key.startsWith("easy-greek-logs-") ||
        key.startsWith("easy-greek-config-") ||
        key.startsWith("easy-greek-version-")
    );

    userKeys.forEach(key => {
      localStorage.removeItem(key);
    });

    console.log("User data cleared successfully");
  } catch (error) {
    console.error("Failed to clear user data:", error);
  }
};

/**
 * Load and save user data from Supabase to localStorage
 */
export const loadAndSaveUserDataFromSupabase = async (): Promise<void> => {
  if (typeof window === "undefined") return;

  try {
    const { syncService } = await import("../sync");
    const userData = await syncService.loadUserDataFromSupabase();

    // Сохраняем данные в localStorage
    const userId = getCurrentUserId();
    const keys = getUserStorageKeys(userId);

    localStorage.setItem(keys.cards, JSON.stringify(userData.cards));
    localStorage.setItem(keys.logs, JSON.stringify(userData.logs));
    localStorage.setItem(keys.config, JSON.stringify(userData.config));
    localStorage.setItem(keys.version, STORAGE_VERSION);

    console.log("User data loaded and saved to localStorage successfully");
  } catch (error) {
    console.error("Failed to load and save user data:", error);
    throw error;
  }
};
