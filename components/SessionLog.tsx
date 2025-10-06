"use client";

import { SessionSummary } from "@/lib/types";

interface SessionLogProps {
  logs: SessionSummary[];
}

export default function SessionLog({ logs }: SessionLogProps) {
  const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  const recentLogs = sortedLogs.slice(0, 30);

  // Calculate streak
  let currentStreak = 0;
  const today = new Date().toISOString().split("T")[0];
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

  // Calculate overall stats
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

    if (logDate.getTime() === today.getTime()) return "Today";
    if (logDate.getTime() === yesterday.getTime()) return "Yesterday";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Session Log</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Review your learning history and progress
        </p>
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {currentStreak}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Day Streak 🔥
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {totalReviewed}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total Reviews
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {overallAccuracy}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Overall Accuracy
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {logs.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total Sessions
          </div>
        </div>
      </div>

      {/* Simple chart (last 7 days) */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Last 7 Days</h2>
        <div className="flex items-end justify-between gap-2 h-40">
          {recentLogs.slice(0, 7).reverse().map((log, idx) => {
            const maxReviewed = Math.max(
              ...recentLogs.slice(0, 7).map((l) => l.totalReviewed),
              1
            );
            const height = (log.totalReviewed / maxReviewed) * 100;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded relative h-full flex items-end">
                  <div
                    className="w-full bg-blue-500 rounded transition-all"
                    style={{ height: `${height}%` }}
                    title={`${log.totalReviewed} reviews (${log.accuracy}% accuracy)`}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  {new Date(log.date).toLocaleDateString("en-US", {
                    weekday: "short",
                  })}
                  <div className="font-semibold text-gray-700 dark:text-gray-300">
                    {log.totalReviewed}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Session history table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold">Recent Sessions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Reviewed
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Correct
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Incorrect
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Accuracy
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  New
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Learning
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Review
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No sessions yet. Start your first session to begin tracking!
                  </td>
                </tr>
              ) : (
                recentLogs.map((log) => (
                  <tr
                    key={log.date}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <td className="px-4 py-3 font-medium">
                      {formatDate(log.date)}
                    </td>
                    <td className="px-4 py-3">{log.totalReviewed}</td>
                    <td className="px-4 py-3 text-green-600 dark:text-green-400">
                      {log.correct}
                    </td>
                    <td className="px-4 py-3 text-red-600 dark:text-red-400">
                      {log.incorrect}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 max-w-[100px]">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${log.accuracy}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold">
                          {log.accuracy}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{log.newCards}</td>
                    <td className="px-4 py-3 text-sm">{log.learningCards}</td>
                    <td className="px-4 py-3 text-sm">{log.reviewCards}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

