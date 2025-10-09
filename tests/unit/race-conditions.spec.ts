/**
 * Unit tests for race conditions and data isolation
 * Tests concurrent operations, optimistic concurrency control, and user isolation
 */

// Jest globals are available without import
import { enhancedCardsRepository } from "@/lib/repositories/supabase/enhanced-cards-repository";
import { enhancedSessionsRepository } from "@/lib/repositories/supabase/enhanced-sessions-repository";
import { Card, Rating } from "@/types";

// Mock Supabase client
const mockSupabase = {
  rpc: jest.fn(),
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        order: jest.fn(() => ({
          limit: jest.fn(),
        })),
      })),
      order: jest.fn(() => ({
        limit: jest.fn(),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(),
    })),
    upsert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
  })),
};

jest.mock("@/lib/supabase", () => ({
  supabase: mockSupabase,
}));

describe("Race Conditions and Data Isolation", () => {
  const pavelId = "pavel-user-id";
  const aleksandraId = "aleksandra-user-id";
  const testCardId = "test-card-id";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Concurrent Card Rating", () => {
    it("should handle concurrent ratings of the same card with different transaction IDs", async () => {
      const card: Card = {
        id: testCardId,
        greek: "γεια",
        translation: "hello",
        status: "review",
        reps: 5,
        lapses: 1,
        ease: 2.5,
        interval: 7,
        due: new Date().toISOString(),
        correct: 4,
        incorrect: 1,
        isLeech: false,
      };

      // Mock successful rating operations
      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            id: testCardId,
            greek: "γεια",
            translation: "hello",
            status: "review",
            reps: 6,
            lapses: 1,
            ease: 2.6,
            interval_days: 8,
            due: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
            correct: 5,
            incorrect: 1,
            learning_step_index: null,
            is_leech: false,
            examples: null,
            notes: null,
            pronunciation: null,
            audio_url: null,
            image_url: null,
            updated_at: new Date().toISOString(),
          },
        ],
        error: null,
      });

      // Simulate concurrent ratings
      const rating1Promise = enhancedCardsRepository.rateCard(pavelId, testCardId, 2, {
        ratingTxId: "tx-1",
        timestamp: new Date().toISOString(),
      });

      const rating2Promise = enhancedCardsRepository.rateCard(pavelId, testCardId, 1, {
        ratingTxId: "tx-2",
        timestamp: new Date().toISOString(),
      });

      const [result1, result2] = await Promise.all([rating1Promise, rating2Promise]);

      // Both operations should succeed
      expect(result1.id).toBe(testCardId);
      expect(result2.id).toBe(testCardId);

      // Verify that rate_card_atomic was called twice with different transaction IDs
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(2);
      expect(mockSupabase.rpc).toHaveBeenCalledWith("rate_card_atomic", {
        card_uuid: testCardId,
        rating_value: 2,
        rating_tx_uuid: "tx-1",
        review_timestamp: expect.any(String),
      });
      expect(mockSupabase.rpc).toHaveBeenCalledWith("rate_card_atomic", {
        card_uuid: testCardId,
        rating_value: 1,
        rating_tx_uuid: "tx-2",
        review_timestamp: expect.any(String),
      });
    });

    it("should handle idempotent rating with same transaction ID", async () => {
      const card: Card = {
        id: testCardId,
        greek: "γεια",
        translation: "hello",
        status: "review",
        reps: 5,
        lapses: 1,
        ease: 2.5,
        interval: 7,
        due: new Date().toISOString(),
        correct: 4,
        incorrect: 1,
        isLeech: false,
      };

      const sameTxId = "same-tx-id";

      // Mock successful rating operation
      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            id: testCardId,
            greek: "γεια",
            translation: "hello",
            status: "review",
            reps: 6,
            lapses: 1,
            ease: 2.6,
            interval_days: 8,
            due: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
            correct: 5,
            incorrect: 1,
            learning_step_index: null,
            is_leech: false,
            examples: null,
            notes: null,
            pronunciation: null,
            audio_url: null,
            image_url: null,
            updated_at: new Date().toISOString(),
          },
        ],
        error: null,
      });

      // First rating
      const result1 = await enhancedCardsRepository.rateCard(pavelId, testCardId, 2, {
        ratingTxId: sameTxId,
        timestamp: new Date().toISOString(),
      });

      // Second rating with same transaction ID (should be idempotent)
      const result2 = await enhancedCardsRepository.rateCard(pavelId, testCardId, 2, {
        ratingTxId: sameTxId,
        timestamp: new Date().toISOString(),
      });

      // Both should return the same result
      expect(result1.id).toBe(result2.id);
      expect(result1.reps).toBe(result2.reps);

      // Should only call the RPC function once due to idempotency
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
    });
  });

  describe("User Data Isolation", () => {
    it("should prevent Pavel from accessing Aleksandra's cards", async () => {
      // Mock error for unauthorized access
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: "PGRST116", message: "No rows returned" },
              }),
            })),
          })),
        })),
      });

      const result = await enhancedCardsRepository.get(pavelId, "aleksandra-card-id");

      expect(result).toBeNull();
    });

    it("should prevent cross-user card updates", async () => {
      // Mock error for unauthorized update
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: "PGRST116", message: "No rows returned" },
                }),
              })),
            })),
          })),
        })),
      });

      await expect(
        enhancedCardsRepository.update(pavelId, "aleksandra-card-id", { greek: "hacked" })
      ).rejects.toThrow("Failed to update card");
    });

    it("should isolate session data between users", async () => {
      // Mock successful session start for Pavel
      mockSupabase.rpc.mockResolvedValueOnce({
        data: "pavel-session-id",
        error: null,
      });

      // Mock successful session start for Aleksandra
      mockSupabase.rpc.mockResolvedValueOnce({
        data: "aleksandra-session-id",
        error: null,
      });

      const pavelSession = await enhancedSessionsRepository.startSession(pavelId);
      const aleksandraSession = await enhancedSessionsRepository.startSession(aleksandraId);

      expect(pavelSession.sessionId).toBe("pavel-session-id");
      expect(aleksandraSession.sessionId).toBe("aleksandra-session-id");
      expect(pavelSession.sessionId).not.toBe(aleksandraSession.sessionId);
    });
  });

  describe("Optimistic Concurrency Control", () => {
    it("should handle concurrent updates with version checking", async () => {
      const originalUpdatedAt = "2024-01-01T10:00:00Z";
      const newUpdatedAt = "2024-01-01T10:01:00Z";

      // Mock successful update with version check
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                select: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: testCardId,
                      greek: "updated",
                      translation: "hello",
                      status: "review",
                      reps: 5,
                      lapses: 1,
                      ease: 2.5,
                      interval_days: 7,
                      due: new Date().toISOString(),
                      correct: 4,
                      incorrect: 1,
                      learning_step_index: null,
                      is_leech: false,
                      examples: null,
                      notes: null,
                      pronunciation: null,
                      audio_url: null,
                      image_url: null,
                      updated_at: newUpdatedAt,
                    },
                    error: null,
                  }),
                })),
              })),
            })),
          })),
        })),
      });

      const result = await enhancedCardsRepository.update(
        pavelId,
        testCardId,
        { greek: "updated" },
        originalUpdatedAt
      );

      expect(result.greek).toBe("updated");
      expect(result.id).toBe(testCardId);
    });

    it("should fail update when version mismatch occurs", async () => {
      const staleUpdatedAt = "2024-01-01T09:00:00Z";

      // Mock error for version mismatch
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                select: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { code: "PGRST116", message: "No rows returned" },
                  }),
                })),
              })),
            })),
          })),
        })),
      });

      await expect(
        enhancedCardsRepository.update(pavelId, testCardId, { greek: "updated" }, staleUpdatedAt)
      ).rejects.toThrow("Card was modified by another operation");
    });
  });

  describe("Session Consistency", () => {
    it("should handle concurrent session operations", async () => {
      // Mock successful session start
      mockSupabase.rpc.mockResolvedValueOnce({
        data: "session-id-1",
        error: null,
      });

      // Mock successful session finish
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const session = await enhancedSessionsRepository.startSession(pavelId);
      await enhancedSessionsRepository.finishSession(pavelId, session.sessionId, {
        reviewedCount: 10,
        accuracy: 85.5,
      });

      expect(session.sessionId).toBe("session-id-1");
    });

    it("should prevent finishing another user's session", async () => {
      // Mock error for unauthorized session finish
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: "Session not found or access denied" },
      });

      await expect(
        enhancedSessionsRepository.finishSession(pavelId, "aleksandra-session-id", {
          reviewedCount: 10,
          accuracy: 85.5,
        })
      ).rejects.toThrow("Failed to finish session");
    });
  });

  describe("Pagination Consistency", () => {
    it("should maintain consistent pagination results", async () => {
      const mockCards = [
        {
          id: "card-1",
          greek: "γεια",
          translation: "hello",
          status: "review",
          reps: 5,
          lapses: 1,
          ease: 2.5,
          interval_days: 7,
          due: "2024-01-01T10:00:00Z",
          correct: 4,
          incorrect: 1,
          learning_step_index: null,
          is_leech: false,
          examples: null,
          notes: null,
          pronunciation: null,
          audio_url: null,
          image_url: null,
          created_at: "2024-01-01T09:00:00Z",
          updated_at: "2024-01-01T09:00:00Z",
        },
        {
          id: "card-2",
          greek: "καλησπέρα",
          translation: "good evening",
          status: "review",
          reps: 3,
          lapses: 0,
          ease: 2.8,
          interval_days: 5,
          due: "2024-01-02T10:00:00Z",
          correct: 3,
          incorrect: 0,
          learning_step_index: null,
          is_leech: false,
          examples: null,
          notes: null,
          pronunciation: null,
          audio_url: null,
          image_url: null,
          created_at: "2024-01-01T09:00:00Z",
          updated_at: "2024-01-01T09:00:00Z",
        },
      ];

      // Mock paginated results
      mockSupabase.rpc.mockResolvedValue({
        data: mockCards,
        error: null,
      });

      const result = await enhancedCardsRepository.list(pavelId, { limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe("card-1");
      expect(result.data[1].id).toBe("card-2");
      expect(result.hasMore).toBe(false);
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should handle database connection errors gracefully", async () => {
      // Mock database connection error
      mockSupabase.rpc.mockRejectedValue(new Error("Connection timeout"));

      await expect(
        enhancedCardsRepository.rateCard(pavelId, testCardId, 2, {
          ratingTxId: "tx-1",
        })
      ).rejects.toThrow("Connection timeout");
    });

    it("should handle network errors with retry logic", async () => {
      // Mock network error on first call, success on retry
      mockSupabase.rpc.mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce({
        data: [
          {
            id: testCardId,
            greek: "γεια",
            translation: "hello",
            status: "review",
            reps: 6,
            lapses: 1,
            ease: 2.6,
            interval_days: 8,
            due: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
            correct: 5,
            incorrect: 1,
            learning_step_index: null,
            is_leech: false,
            examples: null,
            notes: null,
            pronunciation: null,
            audio_url: null,
            image_url: null,
            updated_at: new Date().toISOString(),
          },
        ],
        error: null,
      });

      // This should succeed after retry
      const result = await enhancedCardsRepository.rateCard(pavelId, testCardId, 2, {
        ratingTxId: "tx-1",
      });

      expect(result.id).toBe(testCardId);
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(2);
    });
  });
});
