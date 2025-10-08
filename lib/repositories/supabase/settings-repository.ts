// @ts-nocheck - временно отключаем проверку типов для Supabase
import { supabase } from "@/lib/supabase";
import { SRSConfig } from "@/types";
import { Database } from "@/types";

type UserConfigRow = Database["public"]["Tables"]["user_configs"]["Row"];
type UserConfigInsert = Database["public"]["Tables"]["user_configs"]["Insert"];
type UserConfigUpdate = Database["public"]["Tables"]["user_configs"]["Update"];

export class SupabaseSettingsRepository {
  /**
   * Get user settings
   */
  async get(userId: string): Promise<SRSConfig> {
    const { data, error } = await supabase
      .from("user_configs")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No config found, create default
        return await this.createDefault(userId);
      }
      console.error("Failed to fetch user config:", error);
      throw new Error(`Failed to fetch user config: ${error.message}`);
    }

    return this.mapRowToConfig(data);
  }

  /**
   * Save user settings
   */
  async save(userId: string, config: SRSConfig): Promise<void> {
    const configData: UserConfigInsert = {
      user_id: userId,
      daily_new: config.DAILY_NEW,
      daily_reviews: config.DAILY_REVIEWS,
      learning_steps_min: config.LEARNING_STEPS_MIN,
      r_target: config.R_TARGET,
    };

    const { error } = await supabase.from("user_configs").upsert(configData, {
      onConflict: "user_id",
      ignoreDuplicates: false,
    });

    if (error) {
      console.error("Failed to save user config:", error);
      throw new Error(`Failed to save user config: ${error.message}`);
    }
  }

  /**
   * Update specific settings
   */
  async update(userId: string, updates: Partial<SRSConfig>): Promise<void> {
    const updateData: UserConfigUpdate = {};

    if (updates.DAILY_NEW !== undefined) updateData.daily_new = updates.DAILY_NEW;
    if (updates.DAILY_REVIEWS !== undefined) updateData.daily_reviews = updates.DAILY_REVIEWS;
    if (updates.LEARNING_STEPS_MIN !== undefined)
      updateData.learning_steps_min = updates.LEARNING_STEPS_MIN;
    if (updates.R_TARGET !== undefined) updateData.r_target = updates.R_TARGET;

    const { error } = await supabase.from("user_configs").update(updateData).eq("user_id", userId);

    if (error) {
      console.error("Failed to update user config:", error);
      throw new Error(`Failed to update user config: ${error.message}`);
    }
  }

  /**
   * Reset to default settings
   */
  async resetToDefault(userId: string): Promise<void> {
    const defaultConfig: UserConfigInsert = {
      user_id: userId,
      daily_new: 10,
      daily_reviews: 120,
      learning_steps_min: [1, 10],
      r_target: {
        again: 0.95,
        hard: 0.9,
        good: 0.85,
        easy: 0.8,
      },
    };

    const { error } = await supabase.from("user_configs").upsert(defaultConfig, {
      onConflict: "user_id",
      ignoreDuplicates: false,
    });

    if (error) {
      console.error("Failed to reset user config:", error);
      throw new Error(`Failed to reset user config: ${error.message}`);
    }
  }

  /**
   * Delete user settings
   */
  async delete(userId: string): Promise<void> {
    const { error } = await supabase.from("user_configs").delete().eq("user_id", userId);

    if (error) {
      console.error("Failed to delete user config:", error);
      throw new Error(`Failed to delete user config: ${error.message}`);
    }
  }

  /**
   * Check if user has settings
   */
  async exists(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("user_configs")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return false; // No config found
      }
      console.error("Failed to check user config existence:", error);
      throw new Error(`Failed to check user config existence: ${error.message}`);
    }

    return !!data;
  }

  /**
   * Get all user settings (for admin purposes)
   */
  async getAll(): Promise<Array<{ userId: string; config: SRSConfig }>> {
    const { data, error } = await supabase
      .from("user_configs")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch all user configs:", error);
      throw new Error(`Failed to fetch all user configs: ${error.message}`);
    }

    return (data || []).map(row => ({
      userId: row.user_id,
      config: this.mapRowToConfig(row),
    }));
  }

  /**
   * Create default settings for a user
   */
  private async createDefault(userId: string): Promise<SRSConfig> {
    const defaultConfig: UserConfigInsert = {
      user_id: userId,
      daily_new: 10,
      daily_reviews: 120,
      learning_steps_min: [1, 10],
      r_target: {
        again: 0.95,
        hard: 0.9,
        good: 0.85,
        easy: 0.8,
      },
    };

    const { data, error } = await supabase
      .from("user_configs")
      .insert(defaultConfig)
      .select()
      .single();

    if (error) {
      console.error("Failed to create default user config:", error);
      throw new Error(`Failed to create default user config: ${error.message}`);
    }

    return this.mapRowToConfig(data);
  }

  /**
   * Map database row to SRSConfig interface
   */
  private mapRowToConfig(row: UserConfigRow): SRSConfig {
    return {
      DAILY_NEW: row.daily_new,
      DAILY_REVIEWS: row.daily_reviews,
      LEARNING_STEPS_MIN: row.learning_steps_min,
      R_TARGET: row.r_target,
    };
  }
}
