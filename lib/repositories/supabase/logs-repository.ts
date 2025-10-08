// @ts-nocheck - временно отключаем проверку типов для Supabase
import { supabase } from "@/lib/supabase";
import { SessionSummary } from "@/types";
import { Database } from "@/types";

type SessionLogRow = Database["public"]["Tables"]["session_logs"]["Row"];
type SessionLogInsert = Database["public"]["Tables"]["session_logs"]["Insert"];
type SessionLogUpdate = Database["public"]["Tables"]["session_logs"]["Update"];

type DailyLogRow = Database["public"]["Tables"]["daily_logs"]["Row"];
type DailyLogInsert = Database["public"]["Tables"]["daily_logs"]["Insert"];
type DailyLogUpdate = Database["public"]["Tables"]["daily_logs"]["Update"];

export class SupabaseLogsRepository {
  /**
   * Get all session logs for a user
   */
  async list(userId: string): Promise<SessionSummary[]> {
    const { data, error } = await supabase
      .from("session_logs")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (error) {
      console.error("Failed to fetch session logs:", error);
      throw new Error(`Failed to fetch session logs: ${error.message}`);
    }

    return (data || []).map(this.mapRowToSessionSummary);
  }

  /**
   * Get session logs for a date range
   */
  async listRange(userId: string, startDate: string, endDate: string): Promise<SessionSummary[]> {
    const { data, error } = await supabase
      .from("session_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    if (error) {
      console.error("Failed to fetch session logs range:", error);
      throw new Error(`Failed to fetch session logs range: ${error.message}`);
    }

    return (data || []).map(this.mapRowToSessionSummary);
  }

  /**
   * Append a new session log
   */
  async append(userId: string, log: SessionSummary): Promise<void> {
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

    const { error } = await supabase.from("session_logs").upsert(logData, {
      onConflict: "user_id,date",
      ignoreDuplicates: false,
    });

    if (error) {
      console.error("Failed to append session log:", error);
      throw new Error(`Failed to append session log: ${error.message}`);
    }
  }

  /**
   * Update an existing session log
   */
  async update(userId: string, date: string, updates: Partial<SessionSummary>): Promise<void> {
    const updateData: SessionLogUpdate = {};

    if (updates.totalReviewed !== undefined) updateData.total_reviewed = updates.totalReviewed;
    if (updates.correct !== undefined) updateData.correct = updates.correct;
    if (updates.incorrect !== undefined) updateData.incorrect = updates.incorrect;
    if (updates.newCards !== undefined) updateData.new_cards = updates.newCards;
    if (updates.reviewCards !== undefined) updateData.review_cards = updates.reviewCards;
    if (updates.learningCards !== undefined) updateData.learning_cards = updates.learningCards;
    if (updates.accuracy !== undefined) updateData.accuracy = updates.accuracy;

    const { error } = await supabase
      .from("session_logs")
      .update(updateData)
      .eq("user_id", userId)
      .eq("date", date);

    if (error) {
      console.error("Failed to update session log:", error);
      throw new Error(`Failed to update session log: ${error.message}`);
    }
  }

  /**
   * Delete a session log
   */
  async remove(userId: string, date: string): Promise<void> {
    const { error } = await supabase
      .from("session_logs")
      .delete()
      .eq("user_id", userId)
      .eq("date", date);

    if (error) {
      console.error("Failed to delete session log:", error);
      throw new Error(`Failed to delete session log: ${error.message}`);
    }
  }

  /**
   * Clear all session logs for a user
   */
  async clear(userId: string): Promise<void> {
    const { error } = await supabase.from("session_logs").delete().eq("user_id", userId);

    if (error) {
      console.error("Failed to clear session logs:", error);
      throw new Error(`Failed to clear session logs: ${error.message}`);
    }
  }

  /**
   * Get daily log for a specific date
   */
  async getDailyLog(
    userId: string,
    date: string
  ): Promise<{
    day: string;
    reviewedCount: number;
    accuracy: number;
    streak: number;
  } | null> {
    const { data, error } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("day", date)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // No log for this date
      }
      console.error("Failed to get daily log:", error);
      throw new Error(`Failed to get daily log: ${error.message}`);
    }

    return {
      day: data.day,
      reviewedCount: data.reviewed_count,
      accuracy: data.accuracy,
      streak: data.streak,
    };
  }

  /**
   * Upsert daily log
   */
  async upsertDailyLog(
    userId: string,
    day: string,
    reviewedCount: number,
    accuracy: number,
    streak: number
  ): Promise<void> {
    const logData: DailyLogInsert = {
      user_id: userId,
      day: day,
      reviewed_count: reviewedCount,
      accuracy: accuracy,
      streak: streak,
    };

    const { error } = await supabase.from("daily_logs").upsert(logData, {
      onConflict: "user_id,day",
      ignoreDuplicates: false,
    });

    if (error) {
      console.error("Failed to upsert daily log:", error);
      throw new Error(`Failed to upsert daily log: ${error.message}`);
    }
  }

  /**
   * Get daily logs for a date range
   */
  async getDailyLogsRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<
    {
      day: string;
      reviewedCount: number;
      accuracy: number;
      streak: number;
    }[]
  > {
    const { data, error } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("day", startDate)
      .lte("day", endDate)
      .order("day", { ascending: true });

    if (error) {
      console.error("Failed to get daily logs range:", error);
      throw new Error(`Failed to get daily logs range: ${error.message}`);
    }

    return (data || []).map(row => ({
      day: row.day,
      reviewedCount: row.reviewed_count,
      accuracy: row.accuracy,
      streak: row.streak,
    }));
  }

  /**
   * Get user statistics
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
  }> {
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("session_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate);

    if (error) {
      console.error("Failed to get user stats:", error);
      throw new Error(`Failed to get user stats: ${error.message}`);
    }

    const logs = data || [];
    const totalReviewed = logs.reduce((sum, log) => sum + log.total_reviewed, 0);
    const totalCorrect = logs.reduce((sum, log) => sum + log.correct, 0);
    const totalIncorrect = logs.reduce((sum, log) => sum + log.incorrect, 0);
    const averageAccuracy =
      logs.length > 0 ? logs.reduce((sum, log) => sum + log.accuracy, 0) / logs.length : 0;

    // Get current streak from daily logs
    const { data: dailyData, error: dailyError } = await supabase
      .from("daily_logs")
      .select("streak")
      .eq("user_id", userId)
      .eq("day", endDate)
      .single();

    const currentStreak = dailyError || !dailyData ? 0 : dailyData.streak;

    // Get longest streak
    const { data: maxStreakData, error: maxStreakError } = await supabase
      .from("daily_logs")
      .select("streak")
      .eq("user_id", userId)
      .order("streak", { ascending: false })
      .limit(1)
      .single();

    const longestStreak = maxStreakError || !maxStreakData ? 0 : maxStreakData.streak;

    return {
      totalReviewed,
      totalCorrect,
      totalIncorrect,
      averageAccuracy,
      currentStreak,
      longestStreak,
    };
  }

  /**
   * Map database row to SessionSummary interface
   */
  private mapRowToSessionSummary(row: SessionLogRow): SessionSummary {
    return {
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
}
