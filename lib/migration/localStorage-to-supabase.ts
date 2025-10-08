import { supabase } from "@/lib/supabase";
import { supabaseRepository } from "@/lib/repositories/supabase/supabase-repository";
import { Card, SessionSummary, SRSConfig } from "@/types";
import { DEFAULT_CONFIG } from "@/lib/constants";

/**
 * Migration service to move data from localStorage to Supabase
 * This is a one-time migration that should be run after user authentication
 */
export class LocalStorageToSupabaseMigration {
  private readonly STORAGE_KEYS = {
    CARDS: "easy-greek-cards",
    LOGS: "easy-greek-logs",
    CONFIG: "easy-greek-config",
    VERSION: "easy-greek-version",
  };

  /**
   * Check if user has localStorage data that needs migration
   */
  async hasLocalStorageData(): Promise<boolean> {
    if (typeof window === "undefined") return false;

    // Check for any localStorage keys that contain our data
    const keys = Object.values(this.STORAGE_KEYS);
    return keys.some(key => {
      // Check for both legacy and user-specific keys
      const legacyData = localStorage.getItem(key);
      const userSpecificKeys = Object.keys(localStorage).filter(k => k.startsWith(key + "-"));

      return legacyData !== null || userSpecificKeys.length > 0;
    });
  }

  /**
   * Get all localStorage data for migration
   */
  private getLocalStorageData(): {
    cards: Card[];
    logs: SessionSummary[];
    config: SRSConfig;
  } {
    if (typeof window === "undefined") {
      return { cards: [], logs: [], config: DEFAULT_CONFIG };
    }

    // Try to get data from various possible keys
    const possibleKeys = [
      this.STORAGE_KEYS.CARDS,
      this.STORAGE_KEYS.LOGS,
      this.STORAGE_KEYS.CONFIG,
    ];

    const data = {
      cards: [] as Card[],
      logs: [] as SessionSummary[],
      config: DEFAULT_CONFIG,
    };

    // Try to load cards
    for (const key of possibleKeys) {
      const cardsData = localStorage.getItem(key);
      if (cardsData) {
        try {
          const parsed = JSON.parse(cardsData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Check if this looks like cards data
            if (parsed[0] && typeof parsed[0] === "object" && "greek" in parsed[0]) {
              data.cards = parsed as Card[];
              break;
            }
          }
        } catch (error) {
          console.warn("Failed to parse cards data from key:", key, error);
        }
      }
    }

    // Try to load logs
    for (const key of possibleKeys) {
      const logsData = localStorage.getItem(key);
      if (logsData) {
        try {
          const parsed = JSON.parse(logsData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Check if this looks like logs data
            if (parsed[0] && typeof parsed[0] === "object" && "date" in parsed[0]) {
              data.logs = parsed as SessionSummary[];
              break;
            }
          }
        } catch (error) {
          console.warn("Failed to parse logs data from key:", key, error);
        }
      }
    }

    // Try to load config
    for (const key of possibleKeys) {
      const configData = localStorage.getItem(key);
      if (configData) {
        try {
          const parsed = JSON.parse(configData);
          if (parsed && typeof parsed === "object" && "DAILY_NEW" in parsed) {
            data.config = parsed as SRSConfig;
            break;
          }
        } catch (error) {
          console.warn("Failed to parse config data from key:", key, error);
        }
      }
    }

    return data;
  }

  /**
   * Migrate localStorage data to Supabase
   */
  async migrate(): Promise<{
    success: boolean;
    migrated: {
      cards: number;
      logs: number;
      hasConfig: boolean;
    };
    error?: string;
  }> {
    try {
      // Check if user is authenticated
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("User not authenticated");
      }

      // Get localStorage data
      const localData = this.getLocalStorageData();

      console.log("Starting migration with data:", {
        cards: localData.cards.length,
        logs: localData.logs.length,
        hasConfig: !!localData.config,
      });

      // Initialize user in Supabase
      await supabaseRepository.initializeUser(user.id);

      // Import data to Supabase
      await supabaseRepository.importUserData(localData);

      // Clear localStorage data after successful migration
      await this.clearLocalStorageData();

      console.log("Migration completed successfully");

      return {
        success: true,
        migrated: {
          cards: localData.cards.length,
          logs: localData.logs.length,
          hasConfig: !!localData.config,
        },
      };
    } catch (error) {
      console.error("Migration failed:", error);
      return {
        success: false,
        migrated: { cards: 0, logs: 0, hasConfig: false },
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Clear localStorage data after successful migration
   */
  private async clearLocalStorageData(): Promise<void> {
    if (typeof window === "undefined") return;

    const keysToRemove = [
      // Legacy keys
      this.STORAGE_KEYS.CARDS,
      this.STORAGE_KEYS.LOGS,
      this.STORAGE_KEYS.CONFIG,
      this.STORAGE_KEYS.VERSION,
    ];

    // Also remove any user-specific keys
    const allKeys = Object.keys(localStorage);
    const userSpecificKeys = allKeys.filter(
      key => key.startsWith("easy-greek-") && key.includes("-")
    );

    const keysToDelete = [...keysToRemove, ...userSpecificKeys];

    for (const key of keysToDelete) {
      try {
        localStorage.removeItem(key);
        console.log("Removed localStorage key:", key);
      } catch (error) {
        console.warn("Failed to remove localStorage key:", key, error);
      }
    }
  }

  /**
   * Create a backup of localStorage data before migration
   */
  async createBackup(): Promise<string> {
    if (typeof window === "undefined") {
      throw new Error("localStorage not available");
    }

    const backupData = {
      timestamp: new Date().toISOString(),
      data: this.getLocalStorageData(),
      localStorage: {} as Record<string, string>,
    };

    // Include all localStorage keys that might be relevant
    const relevantKeys = Object.keys(localStorage).filter(key => key.startsWith("easy-greek-"));

    for (const key of relevantKeys) {
      const value = localStorage.getItem(key);
      if (value) {
        backupData.localStorage[key] = value;
      }
    }

    const backupJson = JSON.stringify(backupData, null, 2);
    const blob = new Blob([backupJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // Create download link
    const a = document.createElement("a");
    a.href = url;
    a.download = `easy-greek-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return backupJson;
  }

  /**
   * Restore data from backup
   */
  async restoreFromBackup(backupJson: string): Promise<{
    success: boolean;
    restored: {
      cards: number;
      logs: number;
      hasConfig: boolean;
    };
    error?: string;
  }> {
    try {
      const backup = JSON.parse(backupJson);

      if (!backup.data) {
        throw new Error("Invalid backup format");
      }

      // Check if user is authenticated
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("User not authenticated");
      }

      // Import data to Supabase
      await supabaseRepository.importUserData(backup.data);

      console.log("Backup restored successfully");

      return {
        success: true,
        restored: {
          cards: backup.data.cards?.length || 0,
          logs: backup.data.logs?.length || 0,
          hasConfig: !!backup.data.config,
        },
      };
    } catch (error) {
      console.error("Backup restoration failed:", error);
      return {
        success: false,
        restored: { cards: 0, logs: 0, hasConfig: false },
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// Export singleton instance
export const localStorageMigration = new LocalStorageToSupabaseMigration();
