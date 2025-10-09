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
      console.log("Offline, queuing sync operation");
      this.syncQueue.push(() => this.syncCards(cards));
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.log("User not authenticated, skipping sync");
        return;
      }

      console.log(`Syncing ${cards.length} cards to Supabase`);

      // Преобразуем карточки в формат Supabase
      const cardsToInsert = cards.map(card => ({
        user_id: user.id,
        greek: card.greek,
        translation: card.translation,
        tags: card.tags || [],
        status: card.status,
        reps: card.reps,
        lapses: card.lapses,
        difficulty: card.difficulty || 6.0,
        stability: card.stability || 0,
        ease: card.ease,
        interval_days: card.interval,
        last_review: card.lastReview || null,
        due: card.due,
        correct: card.correct,
        incorrect: card.incorrect,
        current_step: card.currentStep || null,
        learning_step_index: card.learningStepIndex || null,
        is_leech: card.isLeech || false,
        examples: card.examples || null,
        notes: card.notes || null,
        pronunciation: card.pronunciation || null,
        audio_url: card.audioUrl || null,
        image_url: card.imageUrl || null,
      }));

      // Удаляем старые карточки пользователя
      const { error: deleteError } = await supabase.from("cards").delete().eq("user_id", user.id);

      if (deleteError) {
        console.error("Error deleting old cards:", deleteError);
        throw deleteError;
      }

      // Вставляем новые карточки
      const { error: insertError } = await supabase.from("cards").insert(cardsToInsert as any);

      if (insertError) {
        console.error("Error inserting cards:", insertError);
        throw insertError;
      }

      console.log(`Successfully synced ${cards.length} cards to Supabase`);
    } catch (error) {
      console.error("Failed to sync cards:", error);
      throw error;
    }
  }

  async syncCardsForPartner(cards: Card[], partnerName: string): Promise<void> {
    if (!isSupabaseConfigured) {
      console.log("Supabase not configured, skipping partner sync");
      return;
    }

    if (!this.isOnline) {
      console.log("Offline, queuing partner sync operation");
      this.syncQueue.push(() => this.syncCardsForPartner(cards, partnerName));
      return;
    }

    try {
      const partnerUserId = await this.getPartnerUserId(partnerName);
      if (!partnerUserId) {
        console.log(`Partner ${partnerName} not found, skipping sync`);
        return;
      }

      console.log(`Syncing ${cards.length} cards to partner ${partnerName}`);

      // Преобразуем карточки в формат Supabase
      const cardsToInsert = cards.map(card => ({
        user_id: partnerUserId,
        greek: card.greek,
        translation: card.translation,
        tags: card.tags || [],
        status: card.status,
        reps: card.reps,
        lapses: card.lapses,
        difficulty: card.difficulty || 6.0,
        stability: card.stability || 0,
        ease: card.ease,
        interval_days: card.interval,
        last_review: card.lastReview || null,
        due: card.due,
        correct: card.correct,
        incorrect: card.incorrect,
        current_step: card.currentStep || null,
        learning_step_index: card.learningStepIndex || null,
        is_leech: card.isLeech || false,
        examples: card.examples || null,
        notes: card.notes || null,
        pronunciation: card.pronunciation || null,
        audio_url: card.audioUrl || null,
        image_url: card.imageUrl || null,
      }));

      // Удаляем старые карточки партнера
      const { error: deleteError } = await supabase
        .from("cards")
        .delete()
        .eq("user_id", partnerUserId);

      if (deleteError) {
        console.error("Error deleting partner cards:", deleteError);
        throw deleteError;
      }

      // Вставляем новые карточки
      const { error: insertError } = await supabase.from("cards").insert(cardsToInsert as any);

      if (insertError) {
        console.error("Error inserting partner cards:", insertError);
        throw insertError;
      }

      console.log(`Successfully synced ${cards.length} cards to partner ${partnerName}`);
    } catch (error) {
      console.error("Failed to sync cards to partner:", error);
      throw error;
    }
  }

  private async getPartnerUserId(partnerName: string): Promise<string | null> {
    try {
      // Здесь должна быть логика получения ID партнера
      // Пока возвращаем null
      console.log(`Looking for partner: ${partnerName}`);
      return null;
    } catch (error) {
      console.error("Error getting partner user ID:", error);
      return null;
    }
  }

  async syncSessionLogs(logs: SessionSummary[]): Promise<void> {
    if (!isSupabaseConfigured) {
      console.log("Supabase not configured, skipping logs sync");
      return;
    }

    if (!this.isOnline) {
      console.log("Offline, queuing logs sync operation");
      this.syncQueue.push(() => this.syncSessionLogs(logs));
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.log("User not authenticated, skipping logs sync");
        return;
      }

      console.log(`Syncing ${logs.length} session logs to Supabase`);

      // Преобразуем логи в формат Supabase
      const logsToInsert = logs.map(log => ({
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

      // Удаляем старые логи пользователя
      const { error: deleteError } = await supabase
        .from("session_logs")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) {
        console.error("Error deleting old logs:", deleteError);
        throw deleteError;
      }

      // Вставляем новые логи
      const { error: insertError } = await supabase
        .from("session_logs")
        .insert(logsToInsert as any);

      if (insertError) {
        console.error("Error inserting logs:", insertError);
        throw insertError;
      }

      console.log(`Successfully synced ${logs.length} session logs to Supabase`);
    } catch (error) {
      console.error("Failed to sync session logs:", error);
      throw error;
    }
  }

  async syncConfig(config: SRSConfig): Promise<void> {
    if (!isSupabaseConfigured) {
      console.log("Supabase not configured, skipping config sync");
      return;
    }

    if (!this.isOnline) {
      console.log("Offline, queuing config sync operation");
      this.syncQueue.push(() => this.syncConfig(config));
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.log("User not authenticated, skipping config sync");
        return;
      }

      console.log("Syncing user config to Supabase");

      const configToInsert = {
        user_id: user.id,
        daily_new: config.DAILY_NEW,
        daily_reviews: config.DAILY_REVIEWS,
        learning_steps_min: config.LEARNING_STEPS_MIN,
        r_target: config.R_TARGET,
      };

      // Удаляем старый конфиг пользователя
      const { error: deleteError } = await supabase
        .from("user_configs")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) {
        console.error("Error deleting old config:", deleteError);
        throw deleteError;
      }

      // Вставляем новый конфиг
      const { error: insertError } = await supabase
        .from("user_configs")
        .insert(configToInsert as any);

      if (insertError) {
        console.error("Error inserting config:", insertError);
        throw insertError;
      }

      console.log("Successfully synced user config to Supabase");
    } catch (error) {
      console.error("Failed to sync config:", error);
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
      const cards: Card[] = (cardsData || []).map((row: any) => ({
        id: row.id,
        greek: row.greek,
        translation: row.translation,
        tags: row.tags || [],
        status: row.status,
        reps: row.reps,
        lapses: row.lapses,
        ease: row.ease,
        interval: row.interval_days,
        lastReview: row.last_review,
        due: row.due,
        correct: row.correct,
        incorrect: row.incorrect,
        learningStepIndex: row.learning_step_index,
        isLeech: row.is_leech,
        examples: row.examples,
        notes: row.notes,
        pronunciation: row.pronunciation,
        audioUrl: row.audio_url,
        imageUrl: row.image_url,
        // Legacy fields
        difficulty: row.difficulty,
        stability: row.stability,
        currentStep: row.current_step,
      }));

      const logs: SessionSummary[] = (logsData || []).map((row: any) => ({
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

      console.log(`Loaded ${cards.length} cards, ${logs.length} logs for user ${user.email}`);

      return { cards, logs, config };
    } catch (error) {
      console.error("Error loading user data:", error);
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
        }
      }
    }

    this.isProcessingQueue = false;
  }
}

export const syncService = new SyncService();
