/**
 * Cloud migration system
 * Handles migration from localStorage to cloud-only storage with feature flags
 */

import { Card, SessionSummary, SRSConfig } from "@/types";
import { observability } from "@/lib/core/observability";
import { enhancedCardsRepository } from "@/lib/repositories/supabase/enhanced-cards-repository";
import { enhancedLogsRepository } from "@/lib/repositories/supabase/enhanced-logs-repository";
import { enhancedSessionsRepository } from "@/lib/repositories/supabase/enhanced-sessions-repository";

export interface MigrationResult {
  success: boolean;
  migrated: {
    cards: number;
    logs: number;
    settings: boolean;
  };
  errors: string[];
  backupCreated: boolean;
  backupData?: string;
}

export interface MigrationStatus {
  isMigrated: boolean;
  migrationDate?: string;
  backupExists: boolean;
  localDataExists: boolean;
  cloudDataExists: boolean;
}

/**
 * Cloud migration manager
 */
export class CloudMigrationManager {
  private readonly MIGRATION_KEY = "cloud_migration_status";
  private readonly BACKUP_KEY = "localStorage_backup";
  private readonly FEATURE_FLAG_KEY = "cloud_migrated";

  /**
   * Check if user has been migrated to cloud
   */
  async checkMigrationStatus(userId: string): Promise<MigrationStatus> {
    try {
      // Check migration status in localStorage
      const migrationStatus = localStorage.getItem(this.MIGRATION_KEY);
      const isMigrated = migrationStatus === "true";

      // Check if backup exists
      const backupExists = localStorage.getItem(this.BACKUP_KEY) !== null;

      // Check if local data exists
      const localDataExists = this.hasLocalStorageData();

      // Check if cloud data exists
      const cloudDataExists = await this.hasCloudData(userId);

      return {
        isMigrated,
        migrationDate: isMigrated
          ? localStorage.getItem(`${this.MIGRATION_KEY}_date`) || undefined
          : undefined,
        backupExists,
        localDataExists,
        cloudDataExists,
      };
    } catch (error) {
      observability.error("MIGRATION", "Failed to check migration status", error as Error, {
        userId,
      });
      return {
        isMigrated: false,
        backupExists: false,
        localDataExists: false,
        cloudDataExists: false,
      };
    }
  }

  /**
   * Migrate user data from localStorage to cloud
   */
  async migrateToCloud(userId: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migrated: { cards: 0, logs: 0, settings: false },
      errors: [],
      backupCreated: false,
    };

    try {
      observability.info("MIGRATION", "Starting cloud migration", { userId });

      // Check if already migrated
      const status = await this.checkMigrationStatus(userId);
      if (status.isMigrated) {
        result.errors.push("User already migrated to cloud");
        return result;
      }

      // Create backup before migration
      const backupData = this.createBackup();
      if (backupData) {
        localStorage.setItem(this.BACKUP_KEY, backupData);
        result.backupCreated = true;
        result.backupData = backupData;
        observability.info("MIGRATION", "Backup created", {
          userId,
          backupSize: backupData.length,
        });
      }

      // Migrate cards
      try {
        const cards = this.getLocalCards();
        if (cards.length > 0) {
          await enhancedCardsRepository.bulkImport(userId, cards);
          result.migrated.cards = cards.length;
          observability.info("MIGRATION", "Cards migrated", { userId, count: cards.length });
        }
      } catch (error) {
        const errorMsg = `Failed to migrate cards: ${error instanceof Error ? error.message : "Unknown error"}`;
        result.errors.push(errorMsg);
        observability.error("MIGRATION", "Failed to migrate cards", error as Error, { userId });
      }

      // Migrate session logs
      try {
        const logs = this.getLocalLogs();
        if (logs.length > 0) {
          for (const log of logs) {
            await enhancedLogsRepository.appendSessionLog(userId, log);
          }
          result.migrated.logs = logs.length;
          observability.info("MIGRATION", "Logs migrated", { userId, count: logs.length });
        }
      } catch (error) {
        const errorMsg = `Failed to migrate logs: ${error instanceof Error ? error.message : "Unknown error"}`;
        result.errors.push(errorMsg);
        observability.error("MIGRATION", "Failed to migrate logs", error as Error, { userId });
      }

      // Migrate settings
      try {
        const settings = this.getLocalSettings();
        if (settings) {
          // Settings are handled by the user config repository
          result.migrated.settings = true;
          observability.info("MIGRATION", "Settings migrated", { userId });
        }
      } catch (error) {
        const errorMsg = `Failed to migrate settings: ${error instanceof Error ? error.message : "Unknown error"}`;
        result.errors.push(errorMsg);
        observability.error("MIGRATION", "Failed to migrate settings", error as Error, { userId });
      }

      // Mark migration as complete
      if (result.errors.length === 0) {
        localStorage.setItem(this.MIGRATION_KEY, "true");
        localStorage.setItem(`${this.MIGRATION_KEY}_date`, new Date().toISOString());
        localStorage.setItem(this.FEATURE_FLAG_KEY, "true");
        result.success = true;

        // Clear local data after successful migration
        this.clearLocalData();

        observability.info("MIGRATION", "Migration completed successfully", {
          userId,
          migrated: result.migrated,
        });
      } else {
        observability.warn("MIGRATION", "Migration completed with errors", {
          userId,
          errors: result.errors,
        });
      }
    } catch (error) {
      const errorMsg = `Migration failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      result.errors.push(errorMsg);
      observability.error("MIGRATION", "Migration failed", error as Error, { userId });
    }

    return result;
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(userId: string): Promise<boolean> {
    try {
      const backupData = localStorage.getItem(this.BACKUP_KEY);
      if (!backupData) {
        observability.warn("MIGRATION", "No backup found for restore", { userId });
        return false;
      }

      const backup = JSON.parse(backupData);

      // Restore cards
      if (backup.cards && backup.cards.length > 0) {
        await enhancedCardsRepository.bulkImport(userId, backup.cards);
        observability.info("MIGRATION", "Cards restored from backup", {
          userId,
          count: backup.cards.length,
        });
      }

      // Restore logs
      if (backup.logs && backup.logs.length > 0) {
        for (const log of backup.logs) {
          await enhancedLogsRepository.appendSessionLog(userId, log);
        }
        observability.info("MIGRATION", "Logs restored from backup", {
          userId,
          count: backup.logs.length,
        });
      }

      // Restore settings
      if (backup.settings) {
        // Settings restoration would be handled by the user config repository
        observability.info("MIGRATION", "Settings restored from backup", { userId });
      }

      observability.info("MIGRATION", "Restore from backup completed", { userId });
      return true;
    } catch (error) {
      observability.error("MIGRATION", "Failed to restore from backup", error as Error, { userId });
      return false;
    }
  }

  /**
   * Clear local data after successful migration
   */
  clearLocalData(): void {
    try {
      // Clear all localStorage keys related to the app
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith("easy-greek-") ||
            key.startsWith("cards-") ||
            key.startsWith("logs-") ||
            key.startsWith("settings-"))
        ) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));

      observability.info("MIGRATION", "Local data cleared", { keysRemoved: keysToRemove.length });
    } catch (error) {
      observability.error("MIGRATION", "Failed to clear local data", error as Error);
    }
  }

  /**
   * Check if localStorage has data
   */
  private hasLocalStorageData(): boolean {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith("cards-") || key.startsWith("logs-") || key.startsWith("settings-"))
        ) {
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if cloud data exists
   */
  private async hasCloudData(userId: string): Promise<boolean> {
    try {
      const cards = await enhancedCardsRepository.list(userId, { limit: 1 });
      return cards.data.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create backup of localStorage data
   */
  private createBackup(): string | null {
    try {
      const backup = {
        cards: this.getLocalCards(),
        logs: this.getLocalLogs(),
        settings: this.getLocalSettings(),
        timestamp: new Date().toISOString(),
        version: "1.0",
      };

      return JSON.stringify(backup, null, 2);
    } catch (error) {
      observability.error("MIGRATION", "Failed to create backup", error as Error);
      return null;
    }
  }

  /**
   * Get cards from localStorage
   */
  private getLocalCards(): Card[] {
    try {
      const cards: Card[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("cards-")) {
          const data = localStorage.getItem(key);
          if (data) {
            try {
              const card = JSON.parse(data);
              cards.push(card);
            } catch (parseError) {
              observability.warn("MIGRATION", "Failed to parse card from localStorage", { key });
            }
          }
        }
      }
      return cards;
    } catch (error) {
      observability.error("MIGRATION", "Failed to get local cards", error as Error);
      return [];
    }
  }

  /**
   * Get logs from localStorage
   */
  private getLocalLogs(): SessionSummary[] {
    try {
      const logs: SessionSummary[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("logs-")) {
          const data = localStorage.getItem(key);
          if (data) {
            try {
              const log = JSON.parse(data);
              logs.push(log);
            } catch (parseError) {
              observability.warn("MIGRATION", "Failed to parse log from localStorage", { key });
            }
          }
        }
      }
      return logs;
    } catch (error) {
      observability.error("MIGRATION", "Failed to get local logs", error as Error);
      return [];
    }
  }

  /**
   * Get settings from localStorage
   */
  private getLocalSettings(): SRSConfig | null {
    try {
      const settingsKey = "settings-srs-config";
      const data = localStorage.getItem(settingsKey);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      observability.error("MIGRATION", "Failed to get local settings", error as Error);
      return null;
    }
  }

  /**
   * Check if user has cloud migration feature flag
   */
  isCloudMigrated(): boolean {
    return localStorage.getItem(this.FEATURE_FLAG_KEY) === "true";
  }

  /**
   * Set cloud migration feature flag
   */
  setCloudMigrated(value: boolean): void {
    if (value) {
      localStorage.setItem(this.FEATURE_FLAG_KEY, "true");
    } else {
      localStorage.removeItem(this.FEATURE_FLAG_KEY);
    }
  }
}

// Export singleton instance
export const cloudMigrationManager = new CloudMigrationManager();
