/**
 * Автоматическая синхронизация данных с Supabase
 * Обеспечивает максимальную синхронизацию всех важных данных
 */

import { syncService } from "./sync";
import {
  loadCards,
  saveCards,
  loadLogs,
  appendSessionLog,
  loadConfig,
  saveConfig,
} from "./core/storage";
import { Card, SessionSummary, SRSConfig } from "@/types";
import { conflictResolver } from "./conflict-resolution";

export class AutoSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isOnline = navigator.onLine;
  private lastSyncTime = 0;
  private readonly SYNC_INTERVAL = 30000; // 30 секунд
  private readonly MIN_SYNC_INTERVAL = 5000; // Минимум 5 секунд между синхронизациями

  constructor() {
    this.setupEventListeners();
    this.startAutoSync();
  }

  private setupEventListeners() {
    // Слушаем изменения онлайн статуса
    window.addEventListener("online", () => {
      this.isOnline = true;
      console.log("🌐 Online - starting sync");
      this.forceSync();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      console.log("📴 Offline - stopping sync");
      this.stopAutoSync();
    });

    // Слушаем изменения в localStorage (другие вкладки)
    window.addEventListener("storage", e => {
      if (e.key && e.key.includes("cards") && e.newValue) {
        console.log("🔄 Storage changed - triggering sync");
        this.scheduleSync();
      }
    });

    // Слушаем изменения видимости страницы
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && this.isOnline) {
        console.log("👁️ Page visible - checking for sync");
        this.scheduleSync();
      }
    });

    // Слушаем фокус окна
    window.addEventListener("focus", () => {
      if (this.isOnline) {
        console.log("🎯 Window focused - checking for sync");
        this.scheduleSync();
      }
    });
  }

  /**
   * Запускает автоматическую синхронизацию
   */
  public startAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.shouldSync()) {
        this.performSync();
      }
    }, this.SYNC_INTERVAL);

    console.log("🔄 Auto-sync started");
  }

  /**
   * Останавливает автоматическую синхронизацию
   */
  public stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log("⏹️ Auto-sync stopped");
  }

  /**
   * Планирует синхронизацию (с минимальным интервалом)
   */
  public scheduleSync() {
    const now = Date.now();
    if (now - this.lastSyncTime > this.MIN_SYNC_INTERVAL) {
      this.performSync();
    }
  }

  /**
   * Принудительная синхронизация
   */
  public async forceSync() {
    console.log("🚀 Force sync triggered");
    await this.performSync();
  }

  /**
   * Проверяет, нужно ли синхронизироваться
   */
  private shouldSync(): boolean {
    const now = Date.now();
    return now - this.lastSyncTime > this.MIN_SYNC_INTERVAL;
  }

  /**
   * Выполняет полную синхронизацию
   */
  private async performSync() {
    if (!this.isOnline) {
      console.log("📴 Skipping sync - offline");
      return;
    }

    try {
      this.lastSyncTime = Date.now();
      console.log("🔄 Starting full sync...");

      // 1. Загружаем данные из Supabase
      const cloudData = await this.loadFromCloud();

      // 2. Загружаем локальные данные
      const localData = this.loadFromLocal();

      // 3. Объединяем данные (приоритет у облачных)
      const mergedData = this.mergeData(cloudData, localData);

      // 4. Сохраняем объединенные данные локально
      this.saveToLocal(mergedData);

      // 5. Отправляем объединенные данные в облако
      await this.saveToCloud(mergedData);

      console.log("✅ Full sync completed successfully");
    } catch (error) {
      console.error("❌ Sync failed:", error);
    }
  }

  /**
   * Загружает данные из облака
   */
  private async loadFromCloud() {
    try {
      const userData = await syncService.loadUserData();
      return userData || { cards: [], logs: [], config: null };
    } catch (error) {
      console.log("Failed to load from cloud:", error);
      return { cards: [], logs: [], config: null };
    }
  }

  /**
   * Загружает локальные данные
   */
  private loadFromLocal() {
    try {
      const cards = loadCards();
      const logs = loadLogs();
      const config = loadConfig();
      return { cards, logs, config };
    } catch (error) {
      console.log("Failed to load from local:", error);
      return { cards: [], logs: [], config: null };
    }
  }

  /**
   * Объединяет данные с использованием системы разрешения конфликтов
   */
  private mergeData(cloudData: any, localData: any) {
    // Используем систему разрешения конфликтов
    const mergedCards = conflictResolver.resolveCards(cloudData.cards, localData.cards);
    const mergedLogs = conflictResolver.resolveLogs(cloudData.logs, localData.logs);
    const mergedConfig = conflictResolver.resolveConfig(cloudData.config, localData.config);

    return {
      cards: mergedCards,
      logs: mergedLogs,
      config: mergedConfig,
    };
  }

  /**
   * Сохраняет данные локально
   */
  private saveToLocal(data: any) {
    try {
      saveCards(data.cards);
      // Save logs individually using appendSessionLog
      data.logs.forEach((log: SessionSummary) => {
        appendSessionLog(log);
      });
      if (data.config) {
        saveConfig(data.config);
      }
    } catch (error) {
      console.error("Failed to save to local:", error);
    }
  }

  /**
   * Сохраняет данные в облако
   */
  private async saveToCloud(data: any) {
    try {
      if (data.cards.length > 0) {
        await syncService.syncCards(data.cards);
      }
      if (data.logs.length > 0) {
        await syncService.syncSessionLogs(data.logs);
      }
      if (data.config) {
        await syncService.syncConfig(data.config);
      }
    } catch (error) {
      console.error("Failed to save to cloud:", error);
    }
  }

  /**
   * Синхронизирует только карточки
   */
  public async syncCards() {
    try {
      const cards = loadCards();
      await syncService.syncCards(cards);
      console.log(`✅ Synced ${cards.length} cards`);
    } catch (error) {
      console.error("❌ Failed to sync cards:", error);
    }
  }

  /**
   * Синхронизирует только логи
   */
  public async syncLogs() {
    try {
      const logs = loadLogs();
      await syncService.syncSessionLogs(logs);
      console.log(`✅ Synced ${logs.length} logs`);
    } catch (error) {
      console.error("❌ Failed to sync logs:", error);
    }
  }

  /**
   * Синхронизирует только настройки
   */
  public async syncConfig() {
    try {
      const config = loadConfig();
      await syncService.syncConfig(config);
      console.log("✅ Synced config");
    } catch (error) {
      console.error("❌ Failed to sync config:", error);
    }
  }

  /**
   * Получает статус синхронизации
   */
  public getSyncStatus() {
    return {
      isOnline: this.isOnline,
      lastSyncTime: this.lastSyncTime,
      isAutoSyncActive: !!this.syncInterval,
      timeSinceLastSync: Date.now() - this.lastSyncTime,
    };
  }

  /**
   * Очищает ресурсы
   */
  public destroy() {
    this.stopAutoSync();
    console.log("🧹 Auto-sync service destroyed");
  }
}

// Создаем глобальный экземпляр только в браузере
let _autoSyncService: AutoSyncService | null = null;

export const getAutoSyncService = (): AutoSyncService => {
  if (typeof window === "undefined") {
    // Возвращаем заглушку для серверного рендеринга
    return {
      startAutoSync: () => {},
      stopAutoSync: () => {},
      scheduleSync: () => {},
      forceSync: async () => {},
      syncCards: async () => {},
      syncLogs: async () => {},
      syncConfig: async () => {},
      getSyncStatus: () => ({
        isOnline: false,
        lastSyncTime: 0,
        isAutoSyncActive: false,
        timeSinceLastSync: 0,
      }),
      destroy: () => {},
    } as AutoSyncService;
  }

  if (!_autoSyncService) {
    _autoSyncService = new AutoSyncService();
  }

  return _autoSyncService;
};

// Экспортируем для использования в других модулях
export const autoSyncService = getAutoSyncService();
export default autoSyncService;
