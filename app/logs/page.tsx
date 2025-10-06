"use client";

import { useEffect, useState, useRef } from "react";
import { SessionSummary } from "@/types";
import { loadLogs } from "@/lib/storage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Flame, TrendingUp, Target, Calendar } from "lucide-react";
import { ProgressCalendar } from "@/components/progress-calendar";
import { CalendarSkeleton } from "@/components/ui/shimmer";
import { LoadingScreen } from "@/components/ui/loading-screen";

export default function LogsPage() {
  const [logs, setLogs] = useState<SessionSummary[]>([]);
  const [mounted, setMounted] = useState(false);
  const [viewDays, setViewDays] = useState<7 | 30>(7);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setMounted(true);
    setLogs(loadLogs());
  }, []);

  useEffect(() => {
    if (mounted && canvasRef.current) {
      drawChart();
    }
  }, [logs, viewDays, mounted]);

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    const sortedLogs = [...logs]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-viewDays);

    if (sortedLogs.length === 0) return;

    const maxValue = Math.max(...sortedLogs.map((l) => l.totalReviewed), 1);
    const padding = 40;
    const chartHeight = height - padding * 2;
    const barWidth = (width - padding * 2) / sortedLogs.length;

    sortedLogs.forEach((log, idx) => {
      const x = padding + idx * barWidth;
      const barHeight = (log.totalReviewed / maxValue) * chartHeight;
      const y = height - padding - barHeight;

      const correctHeight = (log.correct / log.totalReviewed) * barHeight;
      ctx.fillStyle = "#10b981";
      ctx.fillRect(
        x + barWidth * 0.1,
        y + (barHeight - correctHeight),
        barWidth * 0.8,
        correctHeight
      );

      const incorrectHeight = (log.incorrect / log.totalReviewed) * barHeight;
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(x + barWidth * 0.1, y, barWidth * 0.8, incorrectHeight);

      ctx.fillStyle = "#6b7280";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      const date = new Date(log.date);
      const label = date.toLocaleDateString("ru", {
        day: "numeric",
        month: "short",
      });
      ctx.fillText(label, x + barWidth / 2, height - padding + 15);

      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--foreground') || "#111827";
      ctx.font = "12px sans-serif";
      ctx.fillText(String(log.totalReviewed), x + barWidth / 2, y - 5);
    });

    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
  };

  if (!mounted) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  const recentLogs = sortedLogs.slice(0, 30);

  let currentStreak = 0;
  let checkDate = new Date();

  for (let i = 0; i < sortedLogs.length; i++) {
    const logDate = sortedLogs[i].date.split("T")[0];
    const expectedDate = checkDate.toISOString().split("T")[0];

    if (logDate === expectedDate) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  const totalReviewed = logs.reduce((sum, log) => sum + log.totalReviewed, 0);
  const totalCorrect = logs.reduce((sum, log) => sum + log.correct, 0);
  const overallAccuracy =
    totalReviewed > 0 ? Math.round((totalCorrect / totalReviewed) * 100) : 0;

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const logDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    if (logDate.getTime() === today.getTime()) return "Сегодня";
    if (logDate.getTime() === yesterday.getTime()) return "Вчера";

    return date.toLocaleDateString("ru", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-600 to-slate-800 dark:from-slate-300 dark:to-slate-100 bg-clip-text text-transparent">
          Статистика 📊
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm sm:text-base">
          Отслеживайте свой прогресс в изучении греческого
        </p>
      </div>

      {/* Overall stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="border border-slate-200/50 dark:border-slate-700/50 shadow-sm bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">Дней подряд</CardTitle>
            <Flame className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">
              {currentStreak}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Продолжайте!
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/50 dark:border-slate-700/50 shadow-sm bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">Повторений</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
              {totalReviewed}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              За все время
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/50 dark:border-slate-700/50 shadow-sm bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">Точность</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
              {overallAccuracy}%
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Правильных
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/50 dark:border-slate-700/50 shadow-sm bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">Сессий</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
              {logs.length}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Учебных
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Calendar */}
      <ProgressCalendar />

      {/* Chart */}
      <Card className="border border-slate-200/50 dark:border-slate-700/50 shadow-sm bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="text-slate-800 dark:text-slate-200">График активности</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400 mt-1">
                Ваша активность за последние дни
              </CardDescription>
            </div>
            <Tabs value={viewDays.toString()} onValueChange={(v) => setViewDays(Number(v) as 7 | 30)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="7" className="text-xs sm:text-sm">7 дней</TabsTrigger>
                <TabsTrigger value="30" className="text-xs sm:text-sm">30 дней</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="w-full h-48 sm:h-64 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
              style={{ width: "100%", height: "192px" }}
            />
            {logs.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-slate-500 dark:text-slate-400 text-sm">
                  Нет данных для отображения
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-slate-600 dark:text-slate-400">Правильно</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-slate-600 dark:text-slate-400">Неправильно</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History table */}
      <Card>
        <CardHeader>
          <CardTitle>История сессий</CardTitle>
          <CardDescription>Подробная статистика за последние 30 дней</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Повторено</TableHead>
                <TableHead>Правильно</TableHead>
                <TableHead>Неправильно</TableHead>
                <TableHead>Точность</TableHead>
                <TableHead>Новых</TableHead>
                <TableHead>Изучаются</TableHead>
                <TableHead>Повторений</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Нет сессий. Начните первую сессию для отслеживания прогресса!
                  </TableCell>
                </TableRow>
              ) : (
                recentLogs.map((log) => (
                  <TableRow key={log.date}>
                    <TableCell className="font-medium">
                      {formatDate(log.date)}
                    </TableCell>
                    <TableCell>{log.totalReviewed}</TableCell>
                    <TableCell className="text-green-600 dark:text-green-400">
                      {log.correct}
                    </TableCell>
                    <TableCell className="text-red-600 dark:text-red-400">
                      {log.incorrect}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={log.accuracy} className="h-2 w-20" />
                        <span className="text-sm font-semibold min-w-[45px]">
                          {log.accuracy}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{log.newCards}</TableCell>
                    <TableCell className="text-sm">{log.learningCards}</TableCell>
                    <TableCell className="text-sm">{log.reviewCards}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
