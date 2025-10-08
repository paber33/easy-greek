"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { getAutoSyncService } from "@/lib/auto-sync";
import { LocalCardsRepository } from "@/lib/localRepositories";
import { useProfile } from "@/app/providers/ProfileProvider";

interface DataSyncStatusProps {
  onDataReloaded?: () => void;
}

export function DataSyncStatus({ onDataReloaded }: DataSyncStatusProps) {
  const { currentProfileId } = useProfile();
  const [syncStatus, setSyncStatus] = useState({
    isOnline: true,
    lastSyncTime: 0,
    isAutoSyncActive: false,
    timeSinceLastSync: 0,
  });
  const [isReloading, setIsReloading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [lastReloadTime, setLastReloadTime] = useState<Date | null>(null);

  useEffect(() => {
    // Обновляем статус синхронизации каждые 5 секунд
    const statusInterval = setInterval(() => {
      const autoSyncService = getAutoSyncService();
      setSyncStatus(autoSyncService.getSyncStatus());
    }, 5000);

    return () => {
      clearInterval(statusInterval);
    };
  }, []);

  const handleForceReload = async () => {
    if (!currentProfileId || isReloading) return;

    setIsReloading(true);
    try {
      console.log("🔄 Force reloading data...");

      // Принудительная синхронизация
      const autoSyncService = getAutoSyncService();
      await autoSyncService.forceSync();

      // Перезагружаем карточки
      await LocalCardsRepository.list(currentProfileId);

      setLastReloadTime(new Date());
      onDataReloaded?.();

      console.log("✅ Data reloaded successfully");
    } catch (error) {
      console.error("❌ Failed to reload data:", error);
    } finally {
      setIsReloading(false);
    }
  };

  const handleForceInitialize = async () => {
    if (!currentProfileId || isInitializing) return;

    setIsInitializing(true);
    try {
      console.log("🔄 Force initializing user with seed words...");

      // Принудительная инициализация через syncService
      const { syncService } = await import("@/lib/sync");
      const userData = await syncService.loadUserData();

      if (userData && userData.cards.length > 0) {
        console.log(`✅ Initialized user with ${userData.cards.length} cards`);
        onDataReloaded?.();
      } else {
        console.log("⚠️ No cards were initialized");
      }
    } catch (error) {
      console.error("❌ Failed to initialize user:", error);
    } finally {
      setIsInitializing(false);
    }
  };

  const getStatusIcon = () => {
    if (!syncStatus.isOnline) return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (syncStatus.isAutoSyncActive)
      return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    if (syncStatus.timeSinceLastSync < 30000)
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusText = () => {
    if (!syncStatus.isOnline) return "Офлайн";
    if (syncStatus.isAutoSyncActive) return "Синхронизация...";
    if (syncStatus.timeSinceLastSync < 30000) return "Синхронизировано";
    return "Требует синхронизации";
  };

  const getStatusVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (!syncStatus.isOnline) return "destructive";
    if (syncStatus.isAutoSyncActive) return "secondary";
    if (syncStatus.timeSinceLastSync < 30000) return "default";
    return "outline";
  };

  const formatTimeSince = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}ч ${minutes % 60}м назад`;
    if (minutes > 0) return `${minutes}м ${seconds % 60}с назад`;
    return `${seconds}с назад`;
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          {getStatusIcon()}
          Статус данных
        </CardTitle>
        <CardDescription>Состояние синхронизации с облаком</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Статус:</span>
          <Badge variant={getStatusVariant()}>{getStatusText()}</Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Последняя синхронизация:</span>
          <span className="text-sm">
            {syncStatus.timeSinceLastSync > 0
              ? formatTimeSince(syncStatus.timeSinceLastSync)
              : "Никогда"}
          </span>
        </div>

        {lastReloadTime && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Последняя перезагрузка:</span>
            <span className="text-sm">
              {formatTimeSince(Date.now() - lastReloadTime.getTime())}
            </span>
          </div>
        )}

        <div className="space-y-2">
          <Button
            onClick={handleForceReload}
            disabled={isReloading || !currentProfileId}
            className="w-full"
            variant="outline"
          >
            {isReloading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Перезагрузка...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Перезагрузить данные
              </>
            )}
          </Button>

          <Button
            onClick={handleForceInitialize}
            disabled={isInitializing || !currentProfileId}
            className="w-full"
            variant="default"
          >
            {isInitializing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Инициализация...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Инициализировать слова
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
