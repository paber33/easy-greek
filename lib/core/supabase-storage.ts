import { Card, SessionSummary, SRSConfig } from "@/types";
import { supabaseRepository } from "@/lib/repositories/supabase/supabase-repository";
import { localStorageMigration } from "@/lib/migration/localStorage-to-supabase";
import { DEFAULT_CONFIG } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

/**
 * Supabase-only storage service
 * This replaces the old localStorage-based storage and ensures all data is stored in Supabase
 */
export class SupabaseStorageService {
  private migrationCompleted = false;

  /**
   * Initialize the storage service
   * This should be called after user authentication
   */
  async initialize(): Promise<void> {
    try {
      // Check if user has localStorage data that needs migration
      const hasLocalData = await localStorageMigration.hasLocalStorageData();

      if (hasLocalData && !this.migrationCompleted) {
        console.log("Found localStorage data, starting migration...");
        const result = await localStorageMigration.migrate();

        if (result.success) {
          console.log("Migration completed:", result.migrated);
          this.migrationCompleted = true;
        } else {
          console.error("Migration failed:", result.error);
          throw new Error(`Migration failed: ${result.error}`);
        }
      }

      // Initialize user in Supabase
      const userId = await supabaseRepository["getCurrentUserId"]();
      if (userId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabaseRepository.initializeUser(user.id);
        }
      }
    } catch (error) {
      console.error("Failed to initialize Supabase storage:", error);
      throw error;
    }
  }

  /**
   * Load cards from Supabase
   */
  async loadCards(): Promise<Card[]> {
    try {
      // Check if user is authenticated first
      const isAuth = await supabaseRepository.isAuthenticated();
      if (!isAuth) {
        console.log("User not authenticated, returning empty cards array");
        return [];
      }

      const userId = await this.getCurrentUserId();
      const cards = await supabaseRepository.cards.list(userId);

      // Если карточки пустые, возможно пользователь еще не инициализирован
      if (cards.length === 0) {
        console.log("No cards found, attempting to initialize user...");

        // Проверяем, есть ли пользователь в базе данных
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          // Пытаемся инициализировать пользователя
          try {
            const { syncService } = await import("../sync");
            const userData = await syncService.loadUserData();
            if (userData && userData.cards.length > 0) {
              console.log(`✅ Initialized user with ${userData.cards.length} cards`);
              return userData.cards;
            } else {
              console.log(
                "⚠️ User data loaded but no cards found, user may need manual initialization"
              );
            }
          } catch (initError) {
            console.error("❌ Failed to initialize user:", initError);
          }
        } else {
          console.log("⚠️ No authenticated user found");
        }
      }

      return cards;
    } catch (error) {
      console.error("Failed to load cards:", error);
      // Return empty array instead of throwing to prevent app crashes
      return [];
    }
  }

  /**
   * Save cards to Supabase
   */
  async saveCards(cards: Card[]): Promise<void> {
    try {
      // Check if user is authenticated first
      const isAuth = await supabaseRepository.isAuthenticated();
      if (!isAuth) {
        console.log("User not authenticated, skipping save cards");
        return;
      }

      const userId = await this.getCurrentUserId();

      // Get existing cards to determine which ones to update vs create
      const existingCards = await supabaseRepository.cards.list(userId);
      const existingCardMap = new Map(existingCards.map(card => [card.id, card]));

      for (const card of cards) {
        if (existingCardMap.has(card.id)) {
          // Update existing card
          await supabaseRepository.cards.update(userId, card.id, card);
        } else {
          // Create new card
          const { id, ...cardWithoutId } = card;
          await supabaseRepository.cards.create(userId, cardWithoutId);
        }
      }
    } catch (error) {
      console.error("Failed to save cards:", error);
      // Don't throw error to prevent app crashes
    }
  }

  /**
   * Load session logs from Supabase
   */
  async loadLogs(): Promise<SessionSummary[]> {
    try {
      // Check if user is authenticated first
      const isAuth = await supabaseRepository.isAuthenticated();
      if (!isAuth) {
        console.log("User not authenticated, returning empty logs array");
        return [];
      }

      const userId = await this.getCurrentUserId();
      return await supabaseRepository.logs.list(userId);
    } catch (error) {
      console.error("Failed to load logs:", error);
      // Return empty array instead of throwing to prevent app crashes
      return [];
    }
  }

  /**
   * Append a session log to Supabase
   */
  async appendSessionLog(log: SessionSummary): Promise<void> {
    try {
      // Check if user is authenticated first
      const isAuth = await supabaseRepository.isAuthenticated();
      if (!isAuth) {
        console.log("User not authenticated, skipping append session log");
        return;
      }

      const userId = await this.getCurrentUserId();
      await supabaseRepository.logs.append(userId, log);
    } catch (error) {
      console.error("Failed to append session log:", error);
      // Don't throw error to prevent app crashes
    }
  }

  /**
   * Load user configuration from Supabase
   */
  async loadConfig(): Promise<SRSConfig> {
    try {
      // Check if user is authenticated first
      const isAuth = await supabaseRepository.isAuthenticated();
      if (!isAuth) {
        console.log("User not authenticated, returning default config");
        return DEFAULT_CONFIG;
      }

      const userId = await this.getCurrentUserId();
      return await supabaseRepository.config.get(userId);
    } catch (error) {
      console.error("Failed to load config:", error);
      // Return default config if loading fails
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Save user configuration to Supabase
   */
  async saveConfig(config: SRSConfig): Promise<void> {
    try {
      // Check if user is authenticated first
      const isAuth = await supabaseRepository.isAuthenticated();
      if (!isAuth) {
        console.log("User not authenticated, skipping save config");
        return;
      }

      const userId = await this.getCurrentUserId();
      await supabaseRepository.config.save(userId, config);
    } catch (error) {
      console.error("Failed to save config:", error);
      // Don't throw error to prevent app crashes
    }
  }

  /**
   * Get current user ID
   */
  private async getCurrentUserId(): Promise<string> {
    return await supabaseRepository["getCurrentUserId"]();
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
    try {
      return await supabaseRepository.getUserStats();
    } catch (error) {
      console.error("Failed to get user stats:", error);
      throw error;
    }
  }

  /**
   * Export user data
   */
  async exportUserData(): Promise<{
    cards: Card[];
    logs: SessionSummary[];
    config: SRSConfig;
    exportDate: string;
    userId: string;
  }> {
    try {
      return await supabaseRepository.exportUserData();
    } catch (error) {
      console.error("Failed to export user data:", error);
      throw error;
    }
  }

  /**
   * Import user data
   */
  async importUserData(data: {
    cards: Card[];
    logs: SessionSummary[];
    config: SRSConfig;
  }): Promise<void> {
    try {
      await supabaseRepository.importUserData(data);
    } catch (error) {
      console.error("Failed to import user data:", error);
      throw error;
    }
  }

  /**
   * Clear all user data
   */
  async clearUserData(): Promise<void> {
    try {
      await supabaseRepository.clearAllUserData();
    } catch (error) {
      console.error("Failed to clear user data:", error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    isConnected: boolean;
    canRead: boolean;
    canWrite: boolean;
    error?: string;
  }> {
    try {
      return await supabaseRepository.healthCheck();
    } catch (error) {
      return {
        isConnected: false,
        canRead: false,
        canWrite: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create backup of user data
   */
  async createBackup(): Promise<string> {
    try {
      const userData = await this.exportUserData();
      const backupJson = JSON.stringify(userData, null, 2);

      // Create download
      const blob = new Blob([backupJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `easy-greek-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return backupJson;
    } catch (error) {
      console.error("Failed to create backup:", error);
      throw error;
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupJson: string): Promise<void> {
    try {
      const backup = JSON.parse(backupJson);
      await this.importUserData(backup);
    } catch (error) {
      console.error("Failed to restore from backup:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const supabaseStorage = new SupabaseStorageService();
