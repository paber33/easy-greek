import { supabase, isSupabaseConfigured } from "./supabase";
import { Card, SessionSummary, SRSConfig, CardStatus } from "@/types";
import { Database } from "@/types";

type CardRow = Database["public"]["Tables"]["cards"]["Row"];
type SessionLogRow = Database["public"]["Tables"]["session_logs"]["Row"];
type ConfigRow = Database["public"]["Tables"]["user_configs"]["Row"];

export class SyncService {
  private isOnline = false;
  private syncQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.isOnline = navigator.onLine;
      window.addEventListener("online", () => {
        this.isOnline = true;
        this.processQueue();
      });
      window.addEventListener("offline", () => {
        this.isOnline = false;
      });
    }
  }

  async syncCards(cards: Card[]): Promise<void> {
    if (!isSupabaseConfigured) {
      console.log("Supabase not configured, skipping sync");
      return;
    }

    if (!this.isOnline) {
      this.syncQueue.push(() => this.syncCards(cards));
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    console.log("syncCards called for user:", user.id, user.email);

    try {
      // Преобразуем локальные карточки в формат Supabase
      const cardsToSync = cards.map(card => ({
        user_id: user.id,
        greek: card.greek,
        translation: card.translation,
        tags: card.tags || [],
        status: card.status,
        reps: card.reps,
        lapses: card.lapses,
        ease: card.ease,
        interval_days: card.interval,
        last_review: card.lastReview || null,
        due: card.due,
        correct: card.correct,
        incorrect: card.incorrect,
        learning_step_index: card.learningStepIndex || null,
        is_leech: card.isLeech || false,
        // Новые поля для дополнительного контента
        examples: card.examples || null,
        notes: card.notes || null,
        pronunciation: card.pronunciation || null,
        audio_url: card.audioUrl || null,
        image_url: card.imageUrl || null,
        // Legacy поля для обратной совместимости
        difficulty: card.difficulty || null,
        stability: card.stability || null,
        current_step: card.currentStep || null,
      }));

      // Upsert карточки
      const { error } = await supabase.from("cards").upsert(cardsToSync as any, {
        onConflict: "user_id,greek,translation",
        ignoreDuplicates: false,
      });

      if (error) {
        console.error("Failed to sync cards:", error);
        throw error;
      }

      console.log(`Synced ${cards.length} cards to Supabase`);
    } catch (error) {
      console.error("Error syncing cards:", error);
      throw error;
    }
  }

  async syncCardsForPartner(cards: Card[], partnerName: string): Promise<void> {
    console.log("syncCardsForPartner called with:", { cardsCount: cards.length, partnerName });

    if (!isSupabaseConfigured) {
      console.log("Supabase not configured, skipping partner sync");
      return;
    }

    if (!this.isOnline) {
      this.syncQueue.push(() => this.syncCardsForPartner(cards, partnerName));
      return;
    }

    try {
      // Получаем ID партнера по имени
      const partnerUserId = await this.getPartnerUserId(partnerName);
      if (!partnerUserId) {
        throw new Error(`Пользователь ${partnerName} не найден`);
      }

      // Преобразуем карточки для партнера
      const cardsToSync = cards.map(card => ({
        user_id: partnerUserId,
        greek: card.greek,
        translation: card.translation,
        tags: card.tags || [],
        status: card.status,
        reps: card.reps,
        lapses: card.lapses,
        ease: card.ease,
        interval_days: card.interval,
        last_review: card.lastReview || null,
        due: card.due,
        correct: card.correct,
        incorrect: card.incorrect,
        learning_step_index: card.learningStepIndex || null,
        is_leech: card.isLeech || false,
        // Новые поля для дополнительного контента
        examples: card.examples || null,
        notes: card.notes || null,
        pronunciation: card.pronunciation || null,
        audio_url: card.audioUrl || null,
        image_url: card.imageUrl || null,
        // Legacy поля для обратной совместимости
        difficulty: card.difficulty || null,
        stability: card.stability || null,
        current_step: card.currentStep || null,
      }));

      // Upsert карточки для партнера
      const { error } = await supabase.from("cards").upsert(cardsToSync as any, {
        onConflict: "user_id,greek,translation",
        ignoreDuplicates: false,
      });

      if (error) {
        console.error("Failed to sync cards for partner:", error);
        throw error;
      }

      console.log(`Synced ${cards.length} cards to Supabase for ${partnerName}`);
    } catch (error) {
      console.error("Error syncing cards for partner:", error);
      throw error;
    }
  }

  private async getPartnerUserId(partnerName: string): Promise<string | null> {
    try {
      // Получаем пользователей из Supabase auth
      const {
        data: { users },
        error,
      } = await supabase.auth.admin.listUsers();

      if (error) {
        console.error("Error fetching users:", error);
        return null;
      }

      // Ищем пользователя по email или metadata
      const partner = users.find(user => {
        // Проверяем email
        if (user.email?.toLowerCase().includes(partnerName.toLowerCase())) {
          return true;
        }
        // Проверяем metadata
        if (user.user_metadata?.name === partnerName) {
          return true;
        }
        return false;
      });

      return partner?.id || null;
    } catch (error) {
      console.error("Error getting partner user ID:", error);
      return null;
    }
  }

  async syncSessionLogs(logs: SessionSummary[]): Promise<void> {
    if (!isSupabaseConfigured) {
      console.log("Supabase not configured, skipping sync");
      return;
    }

    if (!this.isOnline) {
      this.syncQueue.push(() => this.syncSessionLogs(logs));
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Filter out corrupted logs before syncing
      const validLogs = logs.filter(log => {
        // Check for reasonable values
        const isValid =
          log.totalReviewed >= 0 &&
          log.totalReviewed <= 1000 &&
          log.correct >= 0 &&
          log.correct <= log.totalReviewed &&
          log.incorrect >= 0 &&
          log.incorrect <= log.totalReviewed &&
          log.newCards >= 0 &&
          log.newCards <= 100 &&
          log.reviewCards >= 0 &&
          log.reviewCards <= 1000 &&
          log.learningCards >= 0 &&
          log.learningCards <= 100 &&
          log.accuracy >= 0 &&
          log.accuracy <= 100 &&
          log.date &&
          log.date.length > 0;

        if (!isValid) {
          console.warn("Skipping corrupted log entry:", log);
        }

        return isValid;
      });

      if (validLogs.length === 0) {
        console.log("No valid logs to sync");
        return;
      }

      const logsToSync = validLogs.map(log => ({
        user_id: user.id,
        date: log.date,
        total_reviewed: log.totalReviewed,
        correct: log.correct,
        incorrect: log.incorrect,
        new_cards: log.newCards,
        review_cards: log.reviewCards,
        learning_cards: log.learningCards,
        accuracy: log.accuracy,
      }));

      const { error } = await supabase.from("session_logs").upsert(logsToSync as any, {
        onConflict: "user_id,date",
        ignoreDuplicates: false,
      });

      if (error) {
        console.error("Failed to sync logs:", {
          error,
          errorMessage: error.message,
          errorCode: error.code,
          errorDetails: error.details,
          logsToSync: logsToSync.length,
          sampleLog: logsToSync[0],
        });
        throw error;
      }

      console.log(`Synced ${logs.length} session logs to Supabase`);
    } catch (error) {
      console.error("Error syncing logs:", {
        error,
        errorMessage: (error as any)?.message,
        errorCode: (error as any)?.code,
        errorDetails: (error as any)?.details,
        stack: (error as any)?.stack,
        logsCount: logs.length,
        isSupabaseConfigured,
      });
      throw error;
    }
  }

  async syncConfig(config: SRSConfig): Promise<void> {
    if (!isSupabaseConfigured) {
      console.log("Supabase not configured, skipping sync");
      return;
    }

    if (!this.isOnline) {
      this.syncQueue.push(() => this.syncConfig(config));
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase.from("user_configs").upsert(
        {
          user_id: user.id,
          daily_new: config.DAILY_NEW,
          daily_reviews: config.DAILY_REVIEWS,
          learning_steps_min: config.LEARNING_STEPS_MIN,
          r_target: config.R_TARGET,
        } as any,
        {
          onConflict: "user_id",
          ignoreDuplicates: false,
        }
      );

      if (error) {
        console.error("Failed to sync config:", error);
        throw error;
      }

      console.log("Synced config to Supabase");
    } catch (error) {
      console.error("Error syncing config:", error);
      throw error;
    }
  }

  async loadUserData(): Promise<{
    cards: Card[];
    logs: SessionSummary[];
    config: SRSConfig;
  } | null> {
    if (!isSupabaseConfigured) {
      console.log("Supabase not configured, cannot load user data");
      return null;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    try {
      // Загружаем карточки
      let { data: cardsData, error: cardsError } = await supabase
        .from("cards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at");

      if (cardsError) throw cardsError;

      // Если у пользователя нет карточек, инициализируем их
      if (!cardsData || cardsData.length === 0) {
        console.log("No cards found for user, initializing with 76 words...");
        await this.initializeUserWords(user.id);

        // Повторно загружаем карточки после инициализации
        const { data: newCardsData, error: newCardsError } = await supabase
          .from("cards")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at");

        if (newCardsError) throw newCardsError;
        cardsData = newCardsData;
      }

      // Загружаем логи
      const { data: logsData, error: logsError } = await supabase
        .from("session_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(90);

      if (logsError) throw logsError;

      // Загружаем конфиг
      const { data: configData, error: configError } = await supabase
        .from("user_configs")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (configError && configError.code !== "PGRST116") throw configError;

      // Преобразуем данные в локальный формат
      const cards: Card[] =
        cardsData?.map((row: any) => ({
          id: row.id,
          greek: row.greek,
          translation: row.translation,
          tags: row.tags,
          status: row.status as CardStatus,
          reps: row.reps,
          lapses: row.lapses,
          ease: row.ease || 2.5, // SM-2 ease factor
          interval: row.interval_days || 0, // SM-2 interval
          lastReview: row.last_review || undefined,
          due: row.due,
          correct: row.correct,
          incorrect: row.incorrect,
          learningStepIndex: row.learning_step_index || undefined,
          isLeech: row.is_leech,
          // Additional content fields
          examples: row.examples || undefined,
          notes: row.notes || undefined,
          pronunciation: row.pronunciation || undefined,
          audioUrl: row.audio_url || undefined,
          imageUrl: row.image_url || undefined,
          // Legacy fields for backward compatibility
          difficulty: row.difficulty,
          stability: row.stability,
          currentStep: row.current_step || undefined,
        })) || [];

      const logs: SessionSummary[] =
        logsData?.map((row: any) => ({
          date: row.date,
          totalReviewed: row.total_reviewed,
          correct: row.correct,
          incorrect: row.incorrect,
          newCards: row.new_cards,
          reviewCards: row.review_cards,
          learningCards: row.learning_cards,
          accuracy: row.accuracy,
        })) || [];

      const config: SRSConfig = configData
        ? {
            DAILY_NEW: (configData as any).daily_new,
            DAILY_REVIEWS: (configData as any).daily_reviews,
            LEARNING_STEPS_MIN: (configData as any).learning_steps_min,
            R_TARGET: (configData as any).r_target,
          }
        : {
            DAILY_NEW: 10,
            DAILY_REVIEWS: 120,
            LEARNING_STEPS_MIN: [1, 10],
            R_TARGET: { again: 0.95, hard: 0.9, good: 0.85, easy: 0.8 },
          };

      console.log(`Loaded ${cards.length} cards, ${logs.length} logs from Supabase`);
      return { cards, logs, config };
    } catch (error) {
      console.error("Failed to load user data:", error);
      return null;
    }
  }

  /**
   * Инициализирует 76 слов для нового пользователя
   */
  private async initializeUserWords(userId: string): Promise<void> {
    try {
      // Используем встроенные данные слов (76 слов)
      const wordsData = this.getInitialWords();

      // Преобразуем в формат Supabase
      const cardsToInsert = wordsData.map((word: any) => ({
        user_id: userId,
        greek: word.greek,
        translation: word.translation,
        tags: word.tags || [],
        status: "new",
        reps: 0,
        lapses: 0,
        ease: 2.5,
        interval_days: 0,
        due: new Date().toISOString(),
        correct: 0,
        incorrect: 0,
        examples: word.examples || null,
        pronunciation: word.pronunciation || null,
        notes: word.notes || null,
      }));

      // Вставляем карточки в базу данных
      const { error } = await supabase.from("cards").insert(cardsToInsert as any);

      if (error) {
        console.error("Failed to initialize user words:", error);
        throw error;
      }

      console.log(`Initialized ${cardsToInsert.length} words for user ${userId}`);
    } catch (error) {
      console.error("Error initializing user words:", error);
      throw error;
    }
  }

  /**
   * Возвращает начальный набор из 76 слов
   */
  private getInitialWords(): any[] {
    // Загружаем полный набор из 76 слов
    try {
      // В продакшене используем встроенные данные
      const wordsData = require("../greek-words-76.json");
      console.log(`Loaded ${wordsData.length} initial words`);
      return wordsData;
    } catch (error) {
      console.error("Failed to load initial words, using fallback:", error);
      
      // Fallback: базовые слова если файл не найден
      return [
        {
          greek: "Καλημέρα",
          translation: "Доброе утро",
          tags: ["greetings", "basic"],
          examples: [
            "Καλημέρα! Πώς είσαι; - Доброе утро! Как дела?",
            "Καλημέρα κύριε! - Доброе утро, господин!",
          ],
          pronunciation: "кали-мЭ-ра",
          notes: "Используется до 12:00. После полудня говорят Καλησπέρα",
        },
        {
          greek: "Καλησπέρα",
          translation: "Добрый вечер",
          tags: ["greetings", "basic"],
          examples: [
            "Καλησπέρα! Πώς περνάς; - Добрый вечер! Как дела?",
            "Καλησπέρα κύριε! - Добрый вечер, господин!",
          ],
          pronunciation: "кали-спЭ-ра",
          notes: "Используется после 12:00. До полудня говорят Καλημέρα",
        },
        {
          greek: "Ευχαριστώ",
          translation: "Спасибо",
          tags: ["greetings", "basic"],
          examples: [
            "Ευχαριστώ πολύ! - Большое спасибо!",
            "Ευχαριστώ για τη βοήθεια - Спасибо за помощь",
          ],
          pronunciation: "эф-ха-рис-тО",
          notes: "Можно сократить до Ευχαριστώ πολύ (большое спасибо)",
        },
        {
          greek: "Παρακαλώ",
          translation: "Пожалуйста",
          tags: ["greetings", "basic"],
          examples: [
            "Παρακαλώ, καθίστε - Пожалуйста, садитесь",
            "Παρακαλώ, μη μιλάτε - Пожалуйста, не разговаривайте",
          ],
          pronunciation: "па-ра-ка-лО",
          notes: "Используется как вежливое обращение",
        },
        {
          greek: "Καληνύχτα",
          translation: "Спокойной ночи",
          tags: ["greetings", "basic"],
          examples: [
            "Καληνύχτα! - Спокойной ночи!",
            "Καληνύχτα, καλά όνειρα - Спокойной ночи, приятных снов",
          ],
          pronunciation: "ка-ли-нИ-хта",
          notes: "Используется при прощании на ночь",
        },
        {
          greek: "γεια",
          translation: "привет",
          tags: ["greetings", "basic"],
          examples: ["Γεια σου! - Привет!", "Γεια σας! - Здравствуйте! (формально)"],
          pronunciation: "йА",
          notes: "Неформальное приветствие",
        },
        {
          greek: "αντίο",
          translation: "до свидания",
          tags: ["greetings", "basic"],
          examples: ["Αντίο! - До свидания!", "Αντίο, τα λέμε! - До свидания, увидимся!"],
          pronunciation: "ан-дИ-о",
          notes: "Формальное прощание",
        },
        {
          greek: "συγνώμη",
          translation: "извините",
          tags: ["greetings", "basic"],
          examples: ["Συγνώμη! - Извините!", "Συγνώμη για την καθυστέρηση - Извините за опоздание"],
          pronunciation: "си-гнО-ми",
          notes: "Используется для извинений",
        },
        {
          greek: "τρώω",
          translation: "есть (кушать)",
          tags: ["verbs", "food"],
          examples: [
            "Τρώω ψωμί - Я ем хлеб",
            "Τι τρως; - Что ты ешь?",
            "Δεν τρώω κρέας - Я не ем мясо",
          ],
          pronunciation: "трО-о",
          notes: "Неправильный глагол. Спряжение: τρώω, τρως, τρώει, τρώμε, τρώτε, τρώνε",
        },
        {
          greek: "πίνω",
        translation: "пить",
        tags: ["verbs", "food"],
        examples: [
          "Πίνω νερό - Я пью воду",
          "Τι πίνεις; - Что ты пьешь?",
          "Πίνω καφέ - Я пью кофе",
        ],
        pronunciation: "пИ-но",
        notes: "Правильный глагол",
      },
      // ... здесь должны быть остальные 66 слов
    ];
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || !this.isOnline) return;

    this.isProcessingQueue = true;

    while (this.syncQueue.length > 0 && this.isOnline) {
      const syncTask = this.syncQueue.shift();
      if (syncTask) {
        try {
          await syncTask();
        } catch (error) {
          console.error("Sync task failed:", error);
          // Можно добавить retry логику
        }
      }
    }

    this.isProcessingQueue = false;
  }

  // Метод для принудительной синхронизации всех данных
  async forceSyncAll(cards: Card[], logs: SessionSummary[], config: SRSConfig): Promise<void> {
    try {
      await Promise.all([
        this.syncCards(cards),
        this.syncSessionLogs(logs),
        this.syncConfig(config),
      ]);
      console.log("Force sync completed successfully");
    } catch (error) {
      console.error("Force sync failed:", error);
      throw error;
    }
  }

  // Загрузка данных пользователя из Supabase
  async loadUserDataFromSupabase(): Promise<{
    cards: Card[];
    logs: SessionSummary[];
    config: SRSConfig;
  }> {
    if (!isSupabaseConfigured) {
      console.log("Supabase not configured, returning empty data");
      return {
        cards: [],
        logs: [],
        config: {
          DAILY_NEW: 10,
          DAILY_REVIEWS: 120,
          LEARNING_STEPS_MIN: [1, 10],
          R_TARGET: { again: 0.95, hard: 0.9, good: 0.85, easy: 0.8 },
        },
      };
    }

    if (!this.isOnline) {
      throw new Error("Cannot load data while offline");
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    console.log("Loading user data from Supabase for user:", user.id, user.email);

    try {
      // Загружаем карточки
      const { data: cardsData, error: cardsError } = await supabase
        .from("cards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (cardsError) {
        console.error("Failed to load cards:", cardsError);
        throw cardsError;
      }

      // Загружаем логи сессий
      const { data: logsData, error: logsError } = await supabase
        .from("session_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (logsError) {
        console.error("Failed to load session logs:", logsError);
        throw logsError;
      }

      // Загружаем конфигурацию
      const { data: configData, error: configError } = await supabase
        .from("user_configs")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (configError && configError.code !== "PGRST116") {
        // PGRST116 = no rows returned
        console.error("Failed to load user config:", configError);
        throw configError;
      }

      // Преобразуем данные из Supabase в локальный формат
      const cards: Card[] = (cardsData || []).map((row: CardRow) => ({
        id: row.id,
        greek: row.greek,
        translation: row.translation,
        tags: row.tags || [],
        status: row.status as CardStatus,
        reps: row.reps,
        lapses: row.lapses,
        ease: row.ease,
        interval: row.interval_days,
        lastReview: row.last_review || undefined,
        due: row.due,
        correct: row.correct,
        incorrect: row.incorrect,
        learningStepIndex: row.learning_step_index || undefined,
        isLeech: row.is_leech || false,
        examples: row.examples || undefined,
        notes: row.notes || undefined,
        pronunciation: row.pronunciation || undefined,
        audioUrl: row.audio_url || undefined,
        imageUrl: row.image_url || undefined,
        difficulty: row.difficulty || undefined,
        stability: row.stability || undefined,
        currentStep: row.current_step || undefined,
      }));

      const logs: SessionSummary[] = (logsData || []).map((row: SessionLogRow) => ({
        date: row.date,
        totalReviewed: row.total_reviewed,
        correct: row.correct,
        incorrect: row.incorrect,
        newCards: row.new_cards,
        reviewCards: row.review_cards,
        learningCards: row.learning_cards,
        accuracy: row.accuracy,
      }));

      const config: SRSConfig = configData
        ? {
            DAILY_NEW: (configData as ConfigRow).daily_new,
            DAILY_REVIEWS: (configData as ConfigRow).daily_reviews,
            LEARNING_STEPS_MIN: (configData as ConfigRow).learning_steps_min,
            R_TARGET: (configData as ConfigRow).r_target,
          }
        : {
            DAILY_NEW: 10,
            DAILY_REVIEWS: 120,
            LEARNING_STEPS_MIN: [1, 10],
            R_TARGET: { again: 0.95, hard: 0.9, good: 0.85, easy: 0.8 },
          };

      console.log(`Loaded ${cards.length} cards, ${logs.length} logs from Supabase`);

      return { cards, logs, config };
    } catch (error) {
      console.error("Error loading user data from Supabase:", error);
      throw error;
    }
  }
}

export const syncService = new SyncService();
