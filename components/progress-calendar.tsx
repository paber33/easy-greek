"use client";

import { useState, useEffect } from "react";
import { SessionSummary } from "@/types";
import { LocalLogsRepository } from "@/lib/localRepositories";
import { useCurrentProfileId } from "@/lib/hooks/use-profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DayData {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4; // 0 = нет активности, 4 = максимум
}

interface ProgressCalendarProps {
  className?: string;
}

export function ProgressCalendar({ className }: ProgressCalendarProps) {
  const profileId = useCurrentProfileId();
  const [logs, setLogs] = useState<SessionSummary[]>([]);
  const [calendarData, setCalendarData] = useState<DayData[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load logs for current profile
  useEffect(() => {
    if (mounted && profileId) {
      const loadLogsForProfile = async () => {
        try {
          const loadedLogs = await LocalLogsRepository.list(profileId);
          setLogs(loadedLogs);
          setCalendarData(generateCalendarData(loadedLogs));
        } catch (error) {
          console.error("Failed to load logs:", error);
          setLogs([]);
          setCalendarData([]);
        }
      };
      loadLogsForProfile();
    }
  }, [mounted, profileId]);

  if (!mounted) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Календарь прогресса</CardTitle>
          <CardDescription>Загрузка...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted animate-pulse rounded"></div>
        </CardContent>
      </Card>
    );
  }

  const totalDays = calendarData.length;
  const activeDays = calendarData.filter(day => day.count > 0).length;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Календарь прогресса</CardTitle>
        <CardDescription>
          {activeDays} из {totalDays} дней с тренировками
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="space-y-3">
            {/* Календарь */}
            <div className="grid grid-cols-53 gap-1 text-xs">
              {calendarData.map((day, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <div
                      className={`h-3 w-3 rounded-sm cursor-pointer transition-colors ${
                        day.level === 0
                          ? "bg-muted"
                          : day.level === 1
                            ? "bg-green-200 dark:bg-green-900"
                            : day.level === 2
                              ? "bg-green-300 dark:bg-green-800"
                              : day.level === 3
                                ? "bg-green-400 dark:bg-green-700"
                                : "bg-green-500 dark:bg-green-600"
                      }`}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">
                      {new Date(day.date).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {day.count === 0
                        ? "Нет тренировок"
                        : `${day.count} ${day.count === 1 ? "тренировка" : "тренировки"}`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>

            {/* Легенда */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Меньше</span>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-sm bg-muted"></div>
                <div className="h-3 w-3 rounded-sm bg-green-200 dark:bg-green-900"></div>
                <div className="h-3 w-3 rounded-sm bg-green-300 dark:bg-green-800"></div>
                <div className="h-3 w-3 rounded-sm bg-green-400 dark:bg-green-700"></div>
                <div className="h-3 w-3 rounded-sm bg-green-500 dark:bg-green-600"></div>
              </div>
              <span>Больше</span>
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-3 gap-4 pt-2 border-t">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {activeDays}
                </div>
                <div className="text-xs text-muted-foreground">Дней</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {logs.reduce((sum, log) => {
                    // Фильтруем некорректные значения (больше 1000 повторений в день)
                    const validReviewed = log.totalReviewed > 1000 ? 0 : log.totalReviewed;
                    return sum + validReviewed;
                  }, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Повторений</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {logs.length > 0
                    ? Math.round(logs.reduce((sum, log) => sum + log.accuracy, 0) / logs.length)
                    : 0}
                  %
                </div>
                <div className="text-xs text-muted-foreground">Точность</div>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

function generateCalendarData(logs: SessionSummary[]): DayData[] {
  const data: DayData[] = [];
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 364); // Последние 365 дней

  // Создаем мапу логов по дате
  const logsMap = new Map<string, SessionSummary>();
  logs.forEach(log => {
    const date = log.date.split("T")[0];
    logsMap.set(date, log);
  });

  // Генерируем данные для каждого дня
  for (let i = 0; i < 365; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    const log = logsMap.get(dateStr);
    // Фильтруем некорректные значения (больше 1000 повторений в день)
    const count = log && log.totalReviewed <= 1000 ? log.totalReviewed : 0;

    // Определяем уровень интенсивности (0-4)
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count > 0) {
      if (count <= 5) level = 1;
      else if (count <= 15) level = 2;
      else if (count <= 30) level = 3;
      else level = 4;
    }

    data.push({
      date: dateStr,
      count,
      level,
    });
  }

  return data;
}
