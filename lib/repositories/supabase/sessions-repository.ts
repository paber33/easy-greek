// @ts-nocheck - временно отключаем проверку типов для Supabase
import { supabase } from "@/lib/supabase";
import { Database } from "@/types";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
type SessionInsert = Database["public"]["Tables"]["sessions"]["Insert"];
type SessionUpdate = Database["public"]["Tables"]["sessions"]["Update"];

export interface SessionState {
  id: string;
  userId: string;
  startedAt: string;
  finishedAt?: string;
  reviewedCount: number;
  accuracy: number;
}

export class SupabaseSessionsRepository {
  /**
   * Start a new session
   */
  async start(userId: string): Promise<SessionState> {
    const sessionData: SessionInsert = {
      user_id: userId,
      started_at: new Date().toISOString(),
      reviewed_count: 0,
      accuracy: 0,
    };

    const { data, error } = await supabase.from("sessions").insert(sessionData).select().single();

    if (error) {
      console.error("Failed to start session:", error);
      throw new Error(`Failed to start session: ${error.message}`);
    }

    return this.mapRowToSession(data);
  }

  /**
   * Finish a session
   */
  async finish(
    userId: string,
    sessionId: string,
    reviewedCount: number,
    accuracy: number
  ): Promise<SessionState> {
    const updateData: SessionUpdate = {
      finished_at: new Date().toISOString(),
      reviewed_count: reviewedCount,
      accuracy: accuracy,
    };

    const { data, error } = await supabase
      .from("sessions")
      .update(updateData)
      .eq("user_id", userId)
      .eq("id", sessionId)
      .select()
      .single();

    if (error) {
      console.error("Failed to finish session:", error);
      throw new Error(`Failed to finish session: ${error.message}`);
    }

    return this.mapRowToSession(data);
  }

  /**
   * Get current active session for user
   */
  async getCurrent(userId: string): Promise<SessionState | null> {
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
      console.error("Failed to get current session:", error);
      throw new Error(`Failed to get current session: ${error.message}`);
    }

    return this.mapRowToSession(data);
  }

  /**
   * Get session history for user
   */
  async getHistory(userId: string, limit: number = 50): Promise<SessionState[]> {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", userId)
      .not("finished_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Failed to get session history:", error);
      throw new Error(`Failed to get session history: ${error.message}`);
    }

    return (data || []).map(this.mapRowToSession);
  }

  /**
   * Update session progress
   */
  async updateProgress(
    userId: string,
    sessionId: string,
    reviewedCount: number,
    accuracy: number
  ): Promise<SessionState> {
    const updateData: SessionUpdate = {
      reviewed_count: reviewedCount,
      accuracy: accuracy,
    };

    const { data, error } = await supabase
      .from("sessions")
      .update(updateData)
      .eq("user_id", userId)
      .eq("id", sessionId)
      .select()
      .single();

    if (error) {
      console.error("Failed to update session progress:", error);
      throw new Error(`Failed to update session progress: ${error.message}`);
    }

    return this.mapRowToSession(data);
  }

  /**
   * Delete a session
   */
  async delete(userId: string, sessionId: string): Promise<void> {
    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("user_id", userId)
      .eq("id", sessionId);

    if (error) {
      console.error("Failed to delete session:", error);
      throw new Error(`Failed to delete session: ${error.message}`);
    }
  }

  /**
   * Get session statistics for user
   */
  async getStats(
    userId: string,
    days: number = 30
  ): Promise<{
    totalSessions: number;
    totalReviewed: number;
    averageAccuracy: number;
    averageSessionLength: number;
  }> {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", userId)
      .not("finished_at", "is", null)
      .gte("started_at", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order("started_at", { ascending: false });

    if (error) {
      console.error("Failed to get session stats:", error);
      throw new Error(`Failed to get session stats: ${error.message}`);
    }

    const sessions = data || [];
    const totalSessions = sessions.length;
    const totalReviewed = sessions.reduce((sum, session) => sum + session.reviewed_count, 0);
    const averageAccuracy =
      sessions.length > 0
        ? sessions.reduce((sum, session) => sum + session.accuracy, 0) / sessions.length
        : 0;

    const averageSessionLength =
      sessions.length > 0
        ? sessions.reduce((sum, session) => {
            const start = new Date(session.started_at);
            const end = new Date(session.finished_at!);
            return sum + (end.getTime() - start.getTime());
          }, 0) /
          sessions.length /
          1000 /
          60 // Convert to minutes
        : 0;

    return {
      totalSessions,
      totalReviewed,
      averageAccuracy,
      averageSessionLength,
    };
  }

  /**
   * Map database row to SessionState interface
   */
  private mapRowToSession(row: SessionRow): SessionState {
    return {
      id: row.id,
      userId: row.user_id,
      startedAt: row.started_at,
      finishedAt: row.finished_at || undefined,
      reviewedCount: row.reviewed_count,
      accuracy: row.accuracy,
    };
  }
}
