"use client";

import { useEffect, useState } from 'react';
import { autoSyncService } from '@/lib/auto-sync';
import { useProfile } from '@/lib/hooks/use-profile';

interface AutoSyncProviderProps {
  children: React.ReactNode;
}

export function AutoSyncProvider({ children }: AutoSyncProviderProps) {
  const { currentProfileId, isLoading } = useProfile();
  const [syncStatus, setSyncStatus] = useState({
    isOnline: true,
    lastSyncTime: 0,
    isAutoSyncActive: false,
    timeSinceLastSync: 0
  });

  useEffect(() => {
    // Инициализируем автоматическую синхронизацию
    if (!isLoading && currentProfileId) {
      console.log('🔄 Initializing auto-sync for profile:', currentProfileId);
      
      // Принудительная синхронизация при загрузке профиля
      autoSyncService.forceSync();
    }

    // Обновляем статус синхронизации каждые 5 секунд
    const statusInterval = setInterval(() => {
      setSyncStatus(autoSyncService.getSyncStatus());
    }, 5000);

    // Очистка при размонтировании
    return () => {
      clearInterval(statusInterval);
    };
  }, [currentProfileId, isLoading]);

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
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-2 rounded opacity-50">
          <div>Online: {syncStatus.isOnline ? '✅' : '❌'}</div>
          <div>Auto-sync: {syncStatus.isAutoSyncActive ? '🔄' : '⏹️'}</div>
          <div>Last sync: {Math.floor(syncStatus.timeSinceLastSync / 1000)}s ago</div>
        </div>
      )}
    </>
  );
}
