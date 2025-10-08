// @ts-nocheck - временно отключаем проверку типов для Supabase
import { supabase } from "@/lib/supabase";
import { Card, CardStatus } from "@/types";
import { Database } from "@/types";

type CardRow = Database["public"]["Tables"]["cards"]["Row"];
type CardInsert = Database["public"]["Tables"]["cards"]["Insert"];
type CardUpdate = Database["public"]["Tables"]["cards"]["Update"];

export class SupabaseCardsRepository {
  /**
   * Get all cards for a user
   */
  async list(userId: string): Promise<Card[]> {
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch cards:", error);
      throw new Error(`Failed to fetch cards: ${error.message}`);
    }

    return (data || []).map(this.mapRowToCard);
  }

  /**
   * Get a single card by ID
   */
  async get(userId: string, cardId: string): Promise<Card | null> {
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("user_id", userId)
      .eq("id", cardId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // No rows returned
      }
      console.error("Failed to fetch card:", error);
      throw new Error(`Failed to fetch card: ${error.message}`);
    }

    return this.mapRowToCard(data);
  }

  /**
   * Create a new card
   */
  async create(userId: string, card: Omit<Card, "id">): Promise<Card> {
    const cardData: CardInsert = {
      user_id: userId,
      greek: card.greek,
      translation: card.translation,
      tags: card.tags || [],
      status: card.status,
      reps: card.reps,
      lapses: card.lapses,
      difficulty: card.difficulty || 6.0,
      stability: card.stability || 0,
      ease: card.ease,
      interval_days: card.interval,
      last_review: card.lastReview || null,
      due: card.due,
      correct: card.correct,
      incorrect: card.incorrect,
      current_step: card.currentStep || null,
      learning_step_index: card.learningStepIndex || null,
      is_leech: card.isLeech || false,
      examples: card.examples || null,
      notes: card.notes || null,
      pronunciation: card.pronunciation || null,
      audio_url: card.audioUrl || null,
      image_url: card.imageUrl || null,
    };

    // @ts-ignore - временно отключаем проверку типов для Supabase
    const { data, error } = await supabase.from("cards").insert(cardData).select().single();

    if (error) {
      console.error("Failed to create card:", error);
      throw new Error(`Failed to create card: ${error.message}`);
    }

    return this.mapRowToCard(data);
  }

  /**
   * Update an existing card
   */
  async update(userId: string, cardId: string, updates: Partial<Card>): Promise<Card> {
    const updateData: CardUpdate = {};

    // Map only the fields that are provided
    if (updates.greek !== undefined) updateData.greek = updates.greek;
    if (updates.translation !== undefined) updateData.translation = updates.translation;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.reps !== undefined) updateData.reps = updates.reps;
    if (updates.lapses !== undefined) updateData.lapses = updates.lapses;
    if (updates.difficulty !== undefined) updateData.difficulty = updates.difficulty;
    if (updates.stability !== undefined) updateData.stability = updates.stability;
    if (updates.ease !== undefined) updateData.ease = updates.ease;
    if (updates.interval !== undefined) updateData.interval_days = updates.interval;
    if (updates.lastReview !== undefined) updateData.last_review = updates.lastReview;
    if (updates.due !== undefined) updateData.due = updates.due;
    if (updates.correct !== undefined) updateData.correct = updates.correct;
    if (updates.incorrect !== undefined) updateData.incorrect = updates.incorrect;
    if (updates.currentStep !== undefined) updateData.current_step = updates.currentStep;
    if (updates.learningStepIndex !== undefined)
      updateData.learning_step_index = updates.learningStepIndex;
    if (updates.isLeech !== undefined) updateData.is_leech = updates.isLeech;
    if (updates.examples !== undefined) updateData.examples = updates.examples;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.pronunciation !== undefined) updateData.pronunciation = updates.pronunciation;
    if (updates.audioUrl !== undefined) updateData.audio_url = updates.audioUrl;
    if (updates.imageUrl !== undefined) updateData.image_url = updates.imageUrl;

    // @ts-ignore - временно отключаем проверку типов для Supabase
    const { data, error } = await supabase
      .from("cards")
      .update(updateData)
      .eq("user_id", userId)
      .eq("id", cardId)
      .select()
      .single();

    if (error) {
      console.error("Failed to update card:", error);
      throw new Error(`Failed to update card: ${error.message}`);
    }

    return this.mapRowToCard(data);
  }

  /**
   * Delete a card
   */
  async remove(userId: string, cardId: string): Promise<void> {
    const { error } = await supabase.from("cards").delete().eq("user_id", userId).eq("id", cardId);

    if (error) {
      console.error("Failed to delete card:", error);
      throw new Error(`Failed to delete card: ${error.message}`);
    }
  }

  /**
   * Bulk import cards
   */
  async bulkImport(userId: string, cards: Omit<Card, "id">[]): Promise<Card[]> {
    const cardsData: CardInsert[] = cards.map(card => ({
      user_id: userId,
      greek: card.greek,
      translation: card.translation,
      tags: card.tags || [],
      status: card.status,
      reps: card.reps,
      lapses: card.lapses,
      difficulty: card.difficulty || 6.0,
      stability: card.stability || 0,
      ease: card.ease,
      interval_days: card.interval,
      last_review: card.lastReview || null,
      due: card.due,
      correct: card.correct,
      incorrect: card.incorrect,
      current_step: card.currentStep || null,
      learning_step_index: card.learningStepIndex || null,
      is_leech: card.isLeech || false,
      examples: card.examples || null,
      notes: card.notes || null,
      pronunciation: card.pronunciation || null,
      audio_url: card.audioUrl || null,
      image_url: card.imageUrl || null,
    }));

    const { data, error } = await supabase.from("cards").insert(cardsData).select();

    if (error) {
      console.error("Failed to bulk import cards:", error);
      throw new Error(`Failed to bulk import cards: ${error.message}`);
    }

    return (data || []).map(this.mapRowToCard);
  }

  /**
   * Export cards as CSV
   */
  async exportCSV(userId: string): Promise<string> {
    const cards = await this.list(userId);

    const headers = [
      "Greek",
      "Translation",
      "Tags",
      "Status",
      "Reps",
      "Lapses",
      "Ease",
      "Interval",
      "Last Review",
      "Due",
      "Correct",
      "Incorrect",
      "Examples",
      "Notes",
      "Pronunciation",
    ];

    const rows = cards.map(card => [
      card.greek,
      card.translation,
      (card.tags || []).join(";"),
      card.status,
      card.reps.toString(),
      card.lapses.toString(),
      card.ease.toString(),
      card.interval.toString(),
      card.lastReview || "",
      card.due,
      card.correct.toString(),
      card.incorrect.toString(),
      (card.examples || []).join(";"),
      card.notes || "",
      card.pronunciation || "",
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(","))
      .join("\n");

    return csvContent;
  }

  /**
   * Get cards due for review
   */
  async getDueCards(userId: string, limit: number = 100): Promise<Card[]> {
    const { data, error } = await supabase.rpc("get_due_cards", {
      user_uuid: userId,
      limit_count: limit,
    });

    if (error) {
      console.error("Failed to get due cards:", error);
      throw new Error(`Failed to get due cards: ${error.message}`);
    }

    return (data || []).map(this.mapRowToCard);
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string) {
    const { data, error } = await supabase.rpc("get_user_stats", {
      user_uuid: userId,
    });

    if (error) {
      console.error("Failed to get user stats:", error);
      throw new Error(`Failed to get user stats: ${error.message}`);
    }

    return data?.[0] || null;
  }

  /**
   * Map database row to Card interface
   */
  private mapRowToCard(row: CardRow): Card {
    return {
      id: row.id,
      greek: row.greek,
      translation: row.translation,
      tags: row.tags || [],
      status: row.status as CardStatus,
      reps: row.reps,
      lapses: row.lapses,
      ease: row.ease,
      interval: row.interval_days,
      lastReview: row.last_review || undefined,
      due: row.due,
      correct: row.correct,
      incorrect: row.incorrect,
      learningStepIndex: row.learning_step_index || undefined,
      isLeech: row.is_leech,
      examples: row.examples || undefined,
      notes: row.notes || undefined,
      pronunciation: row.pronunciation || undefined,
      audioUrl: row.audio_url || undefined,
      imageUrl: row.image_url || undefined,
      // Legacy fields
      difficulty: row.difficulty || undefined,
      stability: row.stability || undefined,
      currentStep: row.current_step || undefined,
    };
  }
}
