// @ts-nocheck - временно отключаем проверку типов для Supabase
import { supabase } from "@/lib/supabase";
import { Card, CardStatus, Rating } from "@/types";
import { Database } from "@/types";
import { withDatabaseRetries, databaseCircuitBreaker } from "@/lib/core/retry";

type CardRow = Database["public"]["Tables"]["cards"]["Row"];
type CardInsert = Database["public"]["Tables"]["cards"]["Insert"];
type CardUpdate = Database["public"]["Tables"]["cards"]["Update"];

export interface PaginationOptions {
  limit?: number;
  cursor?: {
    due?: string;
    id?: string;
  };
}

export interface PaginatedResult<T> {
  data: T[];
  nextCursor?: {
    due: string;
    id: string;
  };
  hasMore: boolean;
}

export interface RateCardOptions {
  ratingTxId: string;
  timestamp?: string;
}

/**
 * Enhanced cards repository with atomic operations, retry logic, and pagination
 */
export class EnhancedCardsRepository {
  /**
   * Get all cards for a user with pagination
   */
  async list(userId: string, options: PaginationOptions = {}): Promise<PaginatedResult<Card>> {
    const limit = options.limit || 100;

    return withDatabaseRetries(async () => {
      const { data, error } = await supabase.rpc("get_cards_paginated", {
        user_uuid: userId,
        limit_count: limit,
        cursor_due: options.cursor?.due || null,
        cursor_id: options.cursor?.id || null,
      });

      if (error) {
        console.error("Failed to fetch cards:", error);
        throw new Error(`Failed to fetch cards: ${error.message}`);
      }

      const cards = (data || []).map(this.mapRowToCard);

      // Determine if there are more results
      const hasMore = cards.length === limit;
      const nextCursor =
        hasMore && cards.length > 0
          ? {
              due: cards[cards.length - 1].due,
              id: cards[cards.length - 1].id,
            }
          : undefined;

      return {
        data: cards,
        nextCursor,
        hasMore,
      };
    });
  }

  /**
   * Get a single card by ID
   */
  async get(userId: string, cardId: string): Promise<Card | null> {
    return withDatabaseRetries(async () => {
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
    });
  }

  /**
   * Create a new card
   */
  async create(userId: string, card: Omit<Card, "id">): Promise<Card> {
    return withDatabaseRetries(async () => {
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

      const { data, error } = await supabase.from("cards").insert(cardData).select().single();

      if (error) {
        console.error("Failed to create card:", error);
        throw new Error(`Failed to create card: ${error.message}`);
      }

      return this.mapRowToCard(data);
    });
  }

  /**
   * Update an existing card with optimistic concurrency control
   */
  async update(
    userId: string,
    cardId: string,
    updates: Partial<Card>,
    expectedUpdatedAt?: string
  ): Promise<Card> {
    return withDatabaseRetries(async () => {
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

      let query = supabase.from("cards").update(updateData).eq("user_id", userId).eq("id", cardId);

      // Add optimistic concurrency control if expectedUpdatedAt is provided
      if (expectedUpdatedAt) {
        query = query.eq("updated_at", expectedUpdatedAt);
      }

      const { data, error } = await query.select().single();

      if (error) {
        if (expectedUpdatedAt && error.code === "PGRST116") {
          throw new Error("Card was modified by another operation. Please refresh and try again.");
        }
        console.error("Failed to update card:", error);
        throw new Error(`Failed to update card: ${error.message}`);
      }

      return this.mapRowToCard(data);
    });
  }

  /**
   * Atomically rate a card with idempotency
   */
  async rateCard(
    userId: string,
    cardId: string,
    rating: Rating,
    options: RateCardOptions
  ): Promise<Card> {
    return withDatabaseRetries(async () => {
      console.log(`SRS_RATE_START: card=${cardId}, rating=${rating}, tx=${options.ratingTxId}`);

      const { data, error } = await supabase.rpc("rate_card_atomic", {
        card_uuid: cardId,
        rating_value: rating,
        rating_tx_uuid: options.ratingTxId,
        review_timestamp: options.timestamp || new Date().toISOString(),
      });

      if (error) {
        console.error("SRS_RATE_ERROR:", error);
        throw new Error(`Failed to rate card: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error("No card returned from rating operation");
      }

      const updatedCard = this.mapRowToCard(data[0]);
      console.log(
        `SRS_RATE_OK: card=${cardId}, new_status=${updatedCard.status}, new_due=${updatedCard.due}`
      );

      return updatedCard;
    });
  }

  /**
   * Delete a card
   */
  async remove(userId: string, cardId: string): Promise<void> {
    return withDatabaseRetries(async () => {
      const { error } = await supabase
        .from("cards")
        .delete()
        .eq("user_id", userId)
        .eq("id", cardId);

      if (error) {
        console.error("Failed to delete card:", error);
        throw new Error(`Failed to delete card: ${error.message}`);
      }
    });
  }

  /**
   * Bulk import cards with transaction-like behavior
   */
  async bulkImport(userId: string, cards: Omit<Card, "id">[]): Promise<Card[]> {
    return withDatabaseRetries(async () => {
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
    });
  }

  /**
   * Get cards due for review with pagination
   */
  async getDueCards(userId: string, limit: number = 100): Promise<Card[]> {
    return withDatabaseRetries(async () => {
      const { data, error } = await supabase.rpc("get_due_cards", {
        user_uuid: userId,
        limit_count: limit,
      });

      if (error) {
        console.error("Failed to get due cards:", error);
        throw new Error(`Failed to get due cards: ${error.message}`);
      }

      return (data || []).map(this.mapRowToCard);
    });
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string) {
    return withDatabaseRetries(async () => {
      const { data, error } = await supabase.rpc("get_user_stats", {
        user_uuid: userId,
      });

      if (error) {
        console.error("Failed to get user stats:", error);
        throw new Error(`Failed to get user stats: ${error.message}`);
      }

      return data?.[0] || null;
    });
  }

  /**
   * Export cards as CSV
   */
  async exportCSV(userId: string): Promise<string> {
    return withDatabaseRetries(async () => {
      const result = await this.list(userId, { limit: 10000 }); // Large limit for export
      const cards = result.data;

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
        .from("cards")
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

      // Test write operation (create and immediately delete a test card)
      const testCard = {
        user_id: "00000000-0000-0000-0000-000000000000", // Dummy UUID
        greek: "test",
        translation: "test",
        status: "new" as CardStatus,
        reps: 0,
        lapses: 0,
        ease: 2.5,
        interval_days: 0,
        due: new Date().toISOString(),
        correct: 0,
        incorrect: 0,
        is_leech: false,
      };

      const { data: writeData, error: writeError } = await supabase
        .from("cards")
        .insert(testCard)
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

      // Clean up test card
      await supabase.from("cards").delete().eq("id", writeData.id);

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

// Export singleton instance
export const enhancedCardsRepository = new EnhancedCardsRepository();
