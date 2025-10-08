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

  // Сохраняем ссылки на event listeners для правильной очистки
  private onlineHandler = () => {
    this.isOnline = true;
    console.log("🌐 Online - starting sync");
    this.forceSync();
  };

  private offlineHandler = () => {
    this.isOnline = false;
    console.log("📴 Offline - stopping sync");
    this.stopAutoSync();
  };

  private storageHandler = (e: StorageEvent) => {
    if (e.key && e.key.includes("cards") && e.newValue) {
      console.log("🔄 Storage changed - triggering sync");
      this.scheduleSync();
    }
  };

  private visibilityHandler = () => {
    if (!document.hidden && this.isOnline) {
      console.log("👁️ Page visible - checking for sync");
      this.scheduleSync();
    }
  };

  private focusHandler = () => {
    if (this.isOnline) {
      console.log("🎯 Window focused - checking for sync");
      this.scheduleSync();
    }
  };

  constructor() {
    // Дополнительная проверка на случай, если конструктор вызван на сервере
    if (typeof window === "undefined") {
      console.warn("AutoSyncService: Constructor called on server - skipping initialization");
      return;
    }

    this.setupEventListeners();
    this.startAutoSync();
  }

  private setupEventListeners() {
    // Слушаем изменения онлайн статуса
    window.addEventListener("online", this.onlineHandler);
    window.addEventListener("offline", this.offlineHandler);

    // Слушаем изменения в localStorage (другие вкладки)
    window.addEventListener("storage", this.storageHandler);

    // Слушаем изменения видимости страницы
    document.addEventListener("visibilitychange", this.visibilityHandler);

    // Слушаем фокус окна
    window.addEventListener("focus", this.focusHandler);
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
    try {
      await this.performSync();
    } catch (error) {
      console.error("❌ Force sync failed:", error);
      // Не выбрасываем ошибку, чтобы не сломать приложение
    }
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
      // Check if user is authenticated before syncing
      const { supabaseRepository } = await import("./repositories/supabase/supabase-repository");
      const isAuth = await supabaseRepository.isAuthenticated();
      if (!isAuth) {
        console.log("🔐 Skipping sync - user not authenticated");
        return;
      }

      console.log("🔄 Starting full sync...");

      // 1. Загружаем данные из Supabase
      const cloudData = await this.loadFromCloud();

      // 2. Загружаем локальные данные
      const localData = await this.loadFromLocal();

      // 3. Объединяем данные (приоритет у облачных)
      const mergedData = this.mergeData(cloudData, localData);

      // 4. Сохраняем объединенные данные локально
      this.saveToLocal(mergedData);

      // 5. Отправляем объединенные данные в облако
      await this.saveToCloud(mergedData);

      // Обновляем время последней синхронизации только после успешного завершения
      this.lastSyncTime = Date.now();
      console.log("✅ Full sync completed successfully");
    } catch (error) {
      console.error("❌ Sync failed:", error);
      // Не обновляем lastSyncTime при ошибке, чтобы можно было повторить попытку
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
  private async loadFromLocal() {
    try {
      const cards = await loadCards();
      const logs = loadLogs();
      const config = await loadConfig();
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
      const cards = await loadCards();
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
      const config = await loadConfig();
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

    // Удаляем все event listeners
    window.removeEventListener("online", this.onlineHandler);
    window.removeEventListener("offline", this.offlineHandler);
    window.removeEventListener("storage", this.storageHandler);
    document.removeEventListener("visibilitychange", this.visibilityHandler);
    window.removeEventListener("focus", this.focusHandler);

    console.log("🧹 Auto-sync service destroyed");
  }
}

// Создаем глобальный экземпляр только в браузере
let _autoSyncService: AutoSyncService | null = null;

export const getAutoSyncService = (): AutoSyncService => {
  if (typeof window === "undefined") {
    // Возвращаем заглушку для серверного рендеринга
    return {
      startAutoSync: () => {
        console.log("AutoSync: startAutoSync called on server - no-op");
      },
      stopAutoSync: () => {
        console.log("AutoSync: stopAutoSync called on server - no-op");
      },
      scheduleSync: () => {
        console.log("AutoSync: scheduleSync called on server - no-op");
      },
      forceSync: async () => {
        console.log("AutoSync: forceSync called on server - no-op");
      },
      syncCards: async () => {
        console.log("AutoSync: syncCards called on server - no-op");
      },
      syncLogs: async () => {
        console.log("AutoSync: syncLogs called on server - no-op");
      },
      syncConfig: async () => {
        console.log("AutoSync: syncConfig called on server - no-op");
      },
      getSyncStatus: () => ({
        isOnline: false,
        lastSyncTime: 0,
        isAutoSyncActive: false,
        timeSinceLastSync: 0,
      }),
      destroy: () => {
        console.log("AutoSync: destroy called on server - no-op");
      },
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
