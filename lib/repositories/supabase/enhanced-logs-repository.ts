// @ts-nocheck - временно отключаем проверку типов для Supabase
import { supabase } from "@/lib/supabase";
import { Database } from "@/types";
import { withDatabaseRetries } from "@/lib/core/retry";

type SessionLogRow = Database["public"]["Tables"]["session_logs"]["Row"];
type SessionLogInsert = Database["public"]["Tables"]["session_logs"]["Insert"];
type SessionLogUpdate = Database["public"]["Tables"]["session_logs"]["Update"];

type DailyLogRow = Database["public"]["Tables"]["daily_logs"]["Row"];
type DailyLogInsert = Database["public"]["Tables"]["daily_logs"]["Insert"];
type DailyLogUpdate = Database["public"]["Tables"]["daily_logs"]["Update"];

export interface SessionSummary {
  id: string;
  date: string;
  totalReviewed: number;
  correct: number;
  incorrect: number;
  newCards: number;
  reviewCards: number;
  learningCards: number;
  accuracy: number;
}

export interface DailyLog {
  id: string;
  day: string;
  reviewedCount: number;
  accuracy: number;
  streak: number;
}

export interface PaginationOptions {
  limit?: number;
  cursor?: {
    date?: string;
    id?: string;
  };
}

export interface PaginatedResult<T> {
  data: T[];
  nextCursor?: {
    date: string;
    id: string;
  };
  hasMore: boolean;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

/**
 * Enhanced logs repository with pagination and atomic operations
 */
export class EnhancedLogsRepository {
  /**
   * Get session logs with pagination
   */
  async getSessionLogs(
    userId: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<SessionSummary>> {
    const limit = options.limit || 100;

    return withDatabaseRetries(async () => {
      const { data, error } = await supabase.rpc("get_session_logs_paginated", {
        user_uuid: userId,
        limit_count: limit,
        cursor_date: options.cursor?.date || null,
        cursor_id: options.cursor?.id || null,
      });

      if (error) {
        console.error("Failed to fetch session logs:", error);
        throw new Error(`Failed to fetch session logs: ${error.message}`);
      }

      const logs = (data || []).map(this.mapRowToSessionSummary);

      // Determine if there are more results
      const hasMore = logs.length === limit;
      const nextCursor =
        hasMore && logs.length > 0
          ? {
              date: logs[logs.length - 1].date,
              id: logs[logs.length - 1].id,
            }
          : undefined;

      return {
        data: logs,
        nextCursor,
        hasMore,
      };
    });
  }

  /**
   * Get session logs for a specific date range
   */
  async getSessionLogsByDateRange(userId: string, dateRange: DateRange): Promise<SessionSummary[]> {
    return withDatabaseRetries(async () => {
      const { data, error } = await supabase
        .from("session_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("date", dateRange.startDate)
        .lte("date", dateRange.endDate)
        .order("date", { ascending: false });

      if (error) {
        console.error("Failed to fetch session logs by date range:", error);
        throw new Error(`Failed to fetch session logs by date range: ${error.message}`);
      }

      return (data || []).map(this.mapRowToSessionSummary);
    });
  }

  /**
   * Append a session log (upsert by date)
   */
  async appendSessionLog(userId: string, log: Omit<SessionSummary, "id">): Promise<SessionSummary> {
    return withDatabaseRetries(async () => {
      const logData: SessionLogInsert = {
        user_id: userId,
        date: log.date,
        total_reviewed: log.totalReviewed,
        correct: log.correct,
        incorrect: log.incorrect,
        new_cards: log.newCards,
        review_cards: log.reviewCards,
        learning_cards: log.learningCards,
        accuracy: log.accuracy,
      };

      const { data, error } = await supabase
        .from("session_logs")
        .upsert(logData, {
          onConflict: "user_id,date",
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to append session log:", error);
        throw new Error(`Failed to append session log: ${error.message}`);
      }

      return this.mapRowToSessionSummary(data);
    });
  }

  /**
   * Get daily logs with pagination
   */
  async getDailyLogs(
    userId: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<DailyLog>> {
    const limit = options.limit || 100;

    return withDatabaseRetries(async () => {
      let query = supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", userId)
        .order("day", { ascending: false })
        .limit(limit);

      // Apply cursor if provided
      if (options.cursor?.date) {
        query = query.lt("day", options.cursor.date);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Failed to fetch daily logs:", error);
        throw new Error(`Failed to fetch daily logs: ${error.message}`);
      }

      const logs = (data || []).map(this.mapRowToDailyLog);

      // Determine if there are more results
      const hasMore = logs.length === limit;
      const nextCursor =
        hasMore && logs.length > 0
          ? {
              date: logs[logs.length - 1].day,
              id: logs[logs.length - 1].id,
            }
          : undefined;

      return {
        data: logs,
        nextCursor,
        hasMore,
      };
    });
  }

  /**
   * Get daily logs for a specific date range
   */
  async getDailyLogsByDateRange(userId: string, dateRange: DateRange): Promise<DailyLog[]> {
    return withDatabaseRetries(async () => {
      const { data, error } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("day", dateRange.startDate)
        .lte("day", dateRange.endDate)
        .order("day", { ascending: false });

      if (error) {
        console.error("Failed to fetch daily logs by date range:", error);
        throw new Error(`Failed to fetch daily logs by date range: ${error.message}`);
      }

      return (data || []).map(this.mapRowToDailyLog);
    });
  }

  /**
   * Update daily log (upsert by date)
   */
  async updateDailyLog(userId: string, log: Omit<DailyLog, "id">): Promise<DailyLog> {
    return withDatabaseRetries(async () => {
      const logData: DailyLogInsert = {
        user_id: userId,
        day: log.day,
        reviewed_count: log.reviewedCount,
        accuracy: log.accuracy,
        streak: log.streak,
      };

      const { data, error } = await supabase
        .from("daily_logs")
        .upsert(logData, {
          onConflict: "user_id,day",
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to update daily log:", error);
        throw new Error(`Failed to update daily log: ${error.message}`);
      }

      return this.mapRowToDailyLog(data);
    });
  }

  /**
   * Get user statistics from logs
   */
  async getUserStats(
    userId: string,
    days: number = 30
  ): Promise<{
    totalReviewed: number;
    totalCorrect: number;
    totalIncorrect: number;
    averageAccuracy: number;
    currentStreak: number;
    longestStreak: number;
    totalSessions: number;
  }> {
    return withDatabaseRetries(async () => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      // Get session logs
      const { data: sessionData, error: sessionError } = await supabase
        .from("session_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("date", since);

      if (sessionError) {
        console.error("Failed to get session stats:", sessionError);
        throw new Error(`Failed to get session stats: ${sessionError.message}`);
      }

      // Get daily logs for streak calculation
      const { data: dailyData, error: dailyError } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("day", since)
        .order("day", { ascending: false });

      if (dailyError) {
        console.error("Failed to get daily stats:", dailyError);
        throw new Error(`Failed to get daily stats: ${dailyError.message}`);
      }

      const sessions = sessionData || [];
      const dailyLogs = dailyData || [];

      // Calculate totals
      const totalReviewed = sessions.reduce((sum, s) => sum + s.total_reviewed, 0);
      const totalCorrect = sessions.reduce((sum, s) => sum + s.correct, 0);
      const totalIncorrect = sessions.reduce((sum, s) => sum + s.incorrect, 0);
      const averageAccuracy = totalReviewed > 0 ? (totalCorrect / totalReviewed) * 100 : 0;
      const totalSessions = sessions.length;

      // Calculate streaks
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;

      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      // Check if user has activity today or yesterday
      const hasRecentActivity = dailyLogs.some(log => log.day === today || log.day === yesterday);

      if (hasRecentActivity) {
        // Calculate current streak
        for (let i = 0; i < dailyLogs.length; i++) {
          const logDate = new Date(dailyLogs[i].day);
          const expectedDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);

          if (logDate.toDateString() === expectedDate.toDateString()) {
            currentStreak++;
          } else {
            break;
          }
        }

        // Calculate longest streak
        tempStreak = 1;
        for (let i = 1; i < dailyLogs.length; i++) {
          const prevDate = new Date(dailyLogs[i].day);
          const currDate = new Date(dailyLogs[i - 1].day);
          const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

          if (diffDays === 1) {
            tempStreak++;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      }

      return {
        totalReviewed,
        totalCorrect,
        totalIncorrect,
        averageAccuracy,
        currentStreak,
        longestStreak,
        totalSessions,
      };
    });
  }

  /**
   * Export logs as CSV
   */
  async exportLogsCSV(userId: string, dateRange?: DateRange): Promise<string> {
    return withDatabaseRetries(async () => {
      let logs: SessionSummary[];

      if (dateRange) {
        logs = await this.getSessionLogsByDateRange(userId, dateRange);
      } else {
        const result = await this.getSessionLogs(userId, { limit: 10000 });
        logs = result.data;
      }

      const headers = [
        "Date",
        "Total Reviewed",
        "Correct",
        "Incorrect",
        "New Cards",
        "Review Cards",
        "Learning Cards",
        "Accuracy (%)",
      ];

      const rows = logs.map(log => [
        log.date,
        log.totalReviewed.toString(),
        log.correct.toString(),
        log.incorrect.toString(),
        log.newCards.toString(),
        log.reviewCards.toString(),
        log.learningCards.toString(),
        log.accuracy.toFixed(2),
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(","))
        .join("\n");

      return csvContent;
    });
  }

  /**
   * Health check for the repository
   */
  async healthCheck(): Promise<{
    isConnected: boolean;
    canRead: boolean;
    canWrite: boolean;
    error?: string;
  }> {
    try {
      // Test read operation
      const { data: readData, error: readError } = await supabase
        .from("session_logs")
        .select("id")
        .limit(1);

      if (readError) {
        return {
          isConnected: false,
          canRead: false,
          canWrite: false,
          error: `Read test failed: ${readError.message}`,
        };
      }

      // Test write operation (create and immediately delete a test log)
      const testLog = {
        user_id: "00000000-0000-0000-0000-000000000000", // Dummy UUID
        date: new Date().toISOString().split("T")[0],
        total_reviewed: 0,
        correct: 0,
        incorrect: 0,
        new_cards: 0,
        review_cards: 0,
        learning_cards: 0,
        accuracy: 0,
      };

      const { data: writeData, error: writeError } = await supabase
        .from("session_logs")
        .insert(testLog)
        .select()
        .single();

      if (writeError) {
        return {
          isConnected: true,
          canRead: true,
          canWrite: false,
          error: `Write test failed: ${writeError.message}`,
        };
      }

      // Clean up test log
      await supabase.from("session_logs").delete().eq("id", writeData.id);

      return {
        isConnected: true,
        canRead: true,
        canWrite: true,
      };
    } catch (error) {
      return {
        isConnected: false,
        canRead: false,
        canWrite: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Map database row to SessionSummary interface
   */
  private mapRowToSessionSummary(row: SessionLogRow): SessionSummary {
    return {
      id: row.id,
      date: row.date,
      totalReviewed: row.total_reviewed,
      correct: row.correct,
      incorrect: row.incorrect,
      newCards: row.new_cards,
      reviewCards: row.review_cards,
      learningCards: row.learning_cards,
      accuracy: row.accuracy,
    };
  }

  /**
   * Map database row to DailyLog interface
   */
  private mapRowToDailyLog(row: DailyLogRow): DailyLog {
    return {
      id: row.id,
      day: row.day,
      reviewedCount: row.reviewed_count,
      accuracy: row.accuracy,
      streak: row.streak,
    };
  }
}

// Export singleton instance
export const enhancedLogsRepository = new EnhancedLogsRepository();
