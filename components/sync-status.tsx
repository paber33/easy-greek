"use client";

import { useState, useEffect } from 'react';
import { autoSyncService } from '@/lib/auto-sync';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Wifi, WifiOff, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface SyncStatusProps {
  className?: string;
}

export function SyncStatus({ className }: SyncStatusProps) {
  const [syncStatus, setSyncStatus] = useState({
    isOnline: true,
    lastSyncTime: 0,
    isAutoSyncActive: false,
    timeSinceLastSync: 0
  });
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    // Обновляем статус каждые 5 секунд
    const interval = setInterval(() => {
      setSyncStatus(autoSyncService.getSyncStatus());
    }, 5000);

    // Получаем начальный статус
    setSyncStatus(autoSyncService.getSyncStatus());

    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      await autoSyncService.forceSync();
      toast.success('Синхронизация завершена успешно!');
    } catch (error) {
      toast.error('Ошибка синхронизации');
      console.error('Manual sync failed:', error);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const formatTimeAgo = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}ч назад`;
    } else if (minutes > 0) {
      return `${minutes}м назад`;
    } else if (seconds > 0) {
      return `${seconds}с назад`;
    } else {
      return 'только что';
    }
  };

  const getStatusIcon = () => {
    if (!syncStatus.isOnline) {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }
    
    if (syncStatus.isAutoSyncActive) {
      return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    }
    
    if (syncStatus.timeSinceLastSync < 60000) { // Менее минуты
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusText = () => {
    if (!syncStatus.isOnline) {
      return 'Офлайн';
    }
    
    if (syncStatus.isAutoSyncActive) {
      return 'Синхронизация...';
    }
    
    if (syncStatus.timeSinceLastSync < 60000) {
      return 'Синхронизировано';
    }
    
    return 'Требуется синхронизация';
  };

  const getStatusColor = () => {
    if (!syncStatus.isOnline) {
      return 'destructive';
    }
    
    if (syncStatus.timeSinceLastSync < 60000) {
      return 'default';
    }
    
    return 'secondary';
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Wifi className="h-4 w-4" />
          Статус синхронизации
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm">{getStatusText()}</span>
          </div>
          <Badge variant={getStatusColor() as any}>
            {syncStatus.isOnline ? 'Онлайн' : 'Офлайн'}
          </Badge>
        </div>

        {syncStatus.isOnline && (
          <div className="text-xs text-muted-foreground">
            Последняя синхронизация: {formatTimeAgo(syncStatus.timeSinceLastSync)}
          </div>
        )}

        <Button
          onClick={handleManualSync}
          disabled={!syncStatus.isOnline || isManualSyncing}
          size="sm"
          className="w-full"
          variant="outline"
        >
          {isManualSyncing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Синхронизация...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Синхронизировать сейчас
            </>
          )}
        </Button>

        {!syncStatus.isOnline && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Данные сохраняются локально. Синхронизация произойдет при подключении к интернету.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
