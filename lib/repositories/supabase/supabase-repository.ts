import { supabase } from "@/lib/supabase";
import { Card, SessionSummary, SRSConfig } from "@/types";
import { SupabaseCardsRepository } from "./cards-repository";
import { SupabaseLogsRepository } from "./logs-repository";
import { SupabaseSettingsRepository } from "./settings-repository";
import { SupabaseSessionsRepository, SessionState } from "./sessions-repository";

/**
 * Main Supabase repository that implements the Repository interface
 * This is the single source of truth for all data operations
 */
export class SupabaseRepository {
  public cards: SupabaseCardsRepository;
  public logs: SupabaseLogsRepository;
  public config: SupabaseSettingsRepository;
  public session: SupabaseSessionsRepository;

  constructor() {
    this.cards = new SupabaseCardsRepository();
    this.logs = new SupabaseLogsRepository();
    this.config = new SupabaseSettingsRepository();
    this.session = new SupabaseSessionsRepository();
  }

  /**
   * Get current authenticated user ID
   */
  private async getCurrentUserId(): Promise<string> {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw new Error("User not authenticated");
    }

    return user.id;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      return !error && !!user;
    } catch {
      return false;
    }
  }

  /**
   * Initialize user data (create default settings if needed)
   */
  async initializeUser(userId: string): Promise<void> {
    try {
      // Check if user has settings, create default if not
      const hasSettings = await this.config.exists(userId);
      if (!hasSettings) {
        await this.config.resetToDefault(userId);
        console.log("Created default settings for user:", userId);
      }
    } catch (error) {
      console.error("Failed to initialize user:", error);
      throw error;
    }
  }

  /**
   * Get all user data in one call
   */
  async getAllUserData(): Promise<{
    cards: Card[];
    logs: SessionSummary[];
    config: SRSConfig;
  }> {
    const userId = await this.getCurrentUserId();

    const [cards, logs, config] = await Promise.all([
      this.cards.list(userId),
      this.logs.list(userId),
      this.config.get(userId),
    ]);

    return { cards, logs, config };
  }

  /**
   * Clear all user data (for testing or account deletion)
   */
  async clearAllUserData(): Promise<void> {
    const userId = await this.getCurrentUserId();

    await Promise.all([
      this.cards
        .list(userId)
        .then(cards => Promise.all(cards.map(card => this.cards.remove(userId, card.id)))),
      this.logs.clear(userId),
      this.config.delete(userId),
    ]);
  }

  /**
   * Check if user has any data
   */
  async hasUserData(): Promise<boolean> {
    const userId = await this.getCurrentUserId();

    const [cards, logs] = await Promise.all([this.cards.list(userId), this.logs.list(userId)]);

    return cards.length > 0 || logs.length > 0;
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<{
    totalCards: number;
    totalLogs: number;
    hasSettings: boolean;
    lastActivity?: string;
  }> {
    const userId = await this.getCurrentUserId();

    const [cards, logs, hasSettings] = await Promise.all([
      this.cards.list(userId),
      this.logs.list(userId),
      this.config.exists(userId),
    ]);

    const lastActivity = logs.length > 0 ? logs[0].date : undefined;

    return {
      totalCards: cards.length,
      totalLogs: logs.length,
      hasSettings,
      lastActivity,
    };
  }

  /**
   * Export all user data
   */
  async exportUserData(): Promise<{
    cards: Card[];
    logs: SessionSummary[];
    config: SRSConfig;
    exportDate: string;
    userId: string;
  }> {
    const userId = await this.getCurrentUserId();
    const userData = await this.getAllUserData();

    return {
      ...userData,
      exportDate: new Date().toISOString(),
      userId,
    };
  }

  /**
   * Import user data (for migration or backup restoration)
   */
  async importUserData(data: {
    cards: Card[];
    logs: SessionSummary[];
    config: SRSConfig;
  }): Promise<void> {
    const userId = await this.getCurrentUserId();

    // Import cards
    if (data.cards.length > 0) {
      const cardsWithoutIds = data.cards.map(card => {
        const { id, ...cardWithoutId } = card;
        return cardWithoutId;
      });
      await this.cards.bulkImport(userId, cardsWithoutIds);
    }

    // Import logs
    if (data.logs.length > 0) {
      for (const log of data.logs) {
        await this.logs.append(userId, log);
      }
    }

    // Import config
    await this.config.save(userId, data.config);
  }

  /**
   * Health check - verify database connection and permissions
   */
  async healthCheck(): Promise<{
    isConnected: boolean;
    canRead: boolean;
    canWrite: boolean;
    error?: string;
  }> {
    try {
      const userId = await this.getCurrentUserId();

      // Test read access
      await this.cards.list(userId);
      const canRead = true;

      // Test write access (create and delete a test card)
      const testCard = await this.cards.create(userId, {
        greek: "test",
        translation: "тест",
        status: "new",
        reps: 0,
        lapses: 0,
        ease: 2.5,
        interval: 0,
        due: new Date().toISOString(),
        correct: 0,
        incorrect: 0,
      });

      await this.cards.remove(userId, testCard.id);
      const canWrite = true;

      return {
        isConnected: true,
        canRead,
        canWrite,
      };
    } catch (error) {
      return {
        isConnected: false,
        canRead: false,
        canWrite: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// Export singleton instance
export const supabaseRepository = new SupabaseRepository();
