// @ts-nocheck - временно отключаем проверку типов для Supabase
import { supabase } from "@/lib/supabase";
import { Database } from "@/types";
import { withDatabaseRetries } from "@/lib/core/retry";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
type SessionInsert = Database["public"]["Tables"]["sessions"]["Insert"];
type SessionUpdate = Database["public"]["Tables"]["sessions"]["Update"];

export interface SessionSummary {
  id: string;
  startedAt: string;
  finishedAt?: string;
  reviewedCount: number;
  accuracy: number;
}

export interface StartSessionResult {
  sessionId: string;
  startedAt: string;
}

export interface FinishSessionOptions {
  reviewedCount: number;
  accuracy: number;
}

/**
 * Enhanced sessions repository with atomic operations and retry logic
 */
export class EnhancedSessionsRepository {
  /**
   * Start a new session atomically
   */
  async startSession(userId: string): Promise<StartSessionResult> {
    return withDatabaseRetries(async () => {
      console.log(`SESSION_START: user=${userId}`);

      const { data, error } = await supabase.rpc("start_session_atomic", {
        user_uuid: userId,
      });

      if (error) {
        console.error("SESSION_START_ERROR:", error);
        throw new Error(`Failed to start session: ${error.message}`);
      }

      const sessionId = data as string;
      const startedAt = new Date().toISOString();

      console.log(`SESSION_START_OK: session=${sessionId}, started=${startedAt}`);

      return {
        sessionId,
        startedAt,
      };
    });
  }

  /**
   * Finish a session atomically and update daily logs
   */
  async finishSession(
    userId: string,
    sessionId: string,
    options: FinishSessionOptions
  ): Promise<void> {
    return withDatabaseRetries(async () => {
      console.log(
        `SESSION_FINISH: session=${sessionId}, reviewed=${options.reviewedCount}, accuracy=${options.accuracy}`
      );

      const { error } = await supabase.rpc("finish_session_atomic", {
        session_uuid: sessionId,
        reviewed_count: options.reviewedCount,
        accuracy_value: options.accuracy,
      });

      if (error) {
        console.error("SESSION_FINISH_ERROR:", error);
        throw new Error(`Failed to finish session: ${error.message}`);
      }

      console.log(`SESSION_FINISH_OK: session=${sessionId}`);
    });
  }

  /**
   * Get active session for user
   */
  async getActiveSession(userId: string): Promise<SessionSummary | null> {
    return withDatabaseRetries(async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", userId)
        .is("finished_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // No active session
        }
        console.error("Failed to get active session:", error);
        throw new Error(`Failed to get active session: ${error.message}`);
      }

      return this.mapRowToSession(data);
    });
  }

  /**
   * Get session history with pagination
   */
  async getSessionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<SessionSummary[]> {
    return withDatabaseRetries(async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", userId)
        .not("finished_at", "is", null)
        .order("started_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Failed to get session history:", error);
        throw new Error(`Failed to get session history: ${error.message}`);
      }

      return (data || []).map(this.mapRowToSession);
    });
  }

  /**
   * Get session by ID
   */
  async getSession(userId: string, sessionId: string): Promise<SessionSummary | null> {
    return withDatabaseRetries(async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", userId)
        .eq("id", sessionId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Session not found
        }
        console.error("Failed to get session:", error);
        throw new Error(`Failed to get session: ${error.message}`);
      }

      return this.mapRowToSession(data);
    });
  }

  /**
   * Cancel/abandon a session
   */
  async cancelSession(userId: string, sessionId: string): Promise<void> {
    return withDatabaseRetries(async () => {
      const { error } = await supabase
        .from("sessions")
        .update({ finished_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("id", sessionId)
        .is("finished_at", null);

      if (error) {
        console.error("Failed to cancel session:", error);
        throw new Error(`Failed to cancel session: ${error.message}`);
      }
    });
  }

  /**
   * Clean up old unfinished sessions (older than 24 hours)
   */
  async cleanupOldSessions(userId: string): Promise<number> {
    return withDatabaseRetries(async () => {
      const { data, error } = await supabase
        .from("sessions")
        .update({ finished_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("finished_at", null)
        .lt("started_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .select("id");

      if (error) {
        console.error("Failed to cleanup old sessions:", error);
        throw new Error(`Failed to cleanup old sessions: ${error.message}`);
      }

      const cleanedCount = data?.length || 0;
      if (cleanedCount > 0) {
        console.log(`SESSION_CLEANUP: cleaned ${cleanedCount} old sessions for user ${userId}`);
      }

      return cleanedCount;
    });
  }

  /**
   * Get session statistics for a user
   */
  async getSessionStats(
    userId: string,
    days: number = 30
  ): Promise<{
    totalSessions: number;
    totalReviewed: number;
    averageAccuracy: number;
    averageSessionLength: number;
    longestStreak: number;
    currentStreak: number;
  }> {
    return withDatabaseRetries(async () => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", userId)
        .not("finished_at", "is", null)
        .gte("started_at", since)
        .order("started_at", { ascending: true });

      if (error) {
        console.error("Failed to get session stats:", error);
        throw new Error(`Failed to get session stats: ${error.message}`);
      }

      const sessions = data || [];

      if (sessions.length === 0) {
        return {
          totalSessions: 0,
          totalReviewed: 0,
          averageAccuracy: 0,
          averageSessionLength: 0,
          longestStreak: 0,
          currentStreak: 0,
        };
      }

      const totalSessions = sessions.length;
      const totalReviewed = sessions.reduce((sum, s) => sum + (s.reviewed_count || 0), 0);
      const totalAccuracy = sessions.reduce((sum, s) => sum + (s.accuracy || 0), 0);
      const averageAccuracy = totalAccuracy / totalSessions;

      // Calculate session lengths
      const sessionLengths = sessions.map(s => {
        const start = new Date(s.started_at);
        const end = new Date(s.finished_at!);
        return end.getTime() - start.getTime();
      });
      const averageSessionLength =
        sessionLengths.reduce((sum, len) => sum + len, 0) / sessionLengths.length;

      // Calculate streaks
      const sessionDates = sessions.map(s => new Date(s.started_at).toDateString());
      const uniqueDates = [...new Set(sessionDates)].sort();

      let longestStreak = 0;
      let currentStreak = 0;
      let tempStreak = 1;

      for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(uniqueDates[i - 1]);
        const currDate = new Date(uniqueDates[i]);
        const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);

      // Calculate current streak
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

      if (uniqueDates.includes(today) || uniqueDates.includes(yesterday)) {
        currentStreak = tempStreak;
      }

      return {
        totalSessions,
        totalReviewed,
        averageAccuracy,
        averageSessionLength,
        longestStreak,
        currentStreak,
      };
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
        .from("sessions")
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

      // Test write operation (create and immediately delete a test session)
      const testSession = {
        user_id: "00000000-0000-0000-0000-000000000000", // Dummy UUID
        started_at: new Date().toISOString(),
        reviewed_count: 0,
        accuracy: 0,
      };

      const { data: writeData, error: writeError } = await supabase
        .from("sessions")
        .insert(testSession)
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

      // Clean up test session
      await supabase.from("sessions").delete().eq("id", writeData.id);

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
  private mapRowToSession(row: SessionRow): SessionSummary {
    return {
      id: row.id,
      startedAt: row.started_at,
      finishedAt: row.finished_at || undefined,
      reviewedCount: row.reviewed_count || 0,
      accuracy: row.accuracy || 0,
    };
  }
}

// Export singleton instance
export const enhancedSessionsRepository = new EnhancedSessionsRepository();
