"use client";

import { useEffect, useState } from "react";
import { getAutoSyncService } from "@/lib/auto-sync";
import { useProfile } from "@/lib/hooks/use-profile";

interface AutoSyncProviderProps {
  children: React.ReactNode;
}

export function AutoSyncProvider({ children }: AutoSyncProviderProps) {
  const { currentProfileId, isLoading } = useProfile();
  const [syncStatus, setSyncStatus] = useState({
    isOnline: true,
    lastSyncTime: 0,
    isAutoSyncActive: false,
    timeSinceLastSync: 0,
  });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Устанавливаем флаг клиента
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Инициализируем автоматическую синхронизацию
    if (!isLoading && currentProfileId) {
      console.log("🔄 Initializing auto-sync for profile:", currentProfileId);

      // Принудительная синхронизация при загрузке профиля
      const autoSyncService = getAutoSyncService();

      // Запускаем синхронизацию с небольшой задержкой, чтобы дать время аутентификации
      const syncWithDelay = async () => {
        await new Promise(resolve => setTimeout(resolve, 500)); // Ждем 500мс
        await autoSyncService.forceSync();
      };

      syncWithDelay().catch(error => {
        console.error("Failed to sync after delay:", error);
      });
    }
  }, [currentProfileId, isLoading]);

  // Отдельный useEffect для статуса синхронизации
  useEffect(() => {
    // Обновляем статус синхронизации каждые 5 секунд
    const statusInterval = setInterval(() => {
      const autoSyncService = getAutoSyncService();
      setSyncStatus(autoSyncService.getSyncStatus());
    }, 5000);

    // Очистка при размонтировании
    return () => {
      clearInterval(statusInterval);
    };
  }, []); // Пустой массив зависимостей - интервал создается только один раз

  // Показываем статус синхронизации в консоли для отладки
  useEffect(() => {
    if (syncStatus.timeSinceLastSync > 0) {
      const minutesAgo = Math.floor(syncStatus.timeSinceLastSync / 60000);
      if (minutesAgo > 0) {
        console.log(`🔄 Last sync: ${minutesAgo} minutes ago`);
      }
    }
  }, [syncStatus]);

  return (
    <>
      {children}
      {/* Можно добавить индикатор синхронизации в UI */}
      {process.env.NODE_ENV === "development" && isClient && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-2 rounded opacity-50">
          <div>Online: {syncStatus.isOnline ? "✅" : "❌"}</div>
          <div>Auto-sync: {syncStatus.isAutoSyncActive ? "🔄" : "⏹️"}</div>
          <div>Last sync: {Math.floor(syncStatus.timeSinceLastSync / 1000)}s ago</div>
        </div>
      )}
    </>
  );
}
