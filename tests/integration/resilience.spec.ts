/**
 * Integration tests for resilience and performance features
 * Tests the complete system under various failure scenarios
 */

// Jest globals are available without import
import { enhancedCardsRepository } from "@/lib/repositories/supabase/enhanced-cards-repository";
import { enhancedSessionsRepository } from "@/lib/repositories/supabase/enhanced-sessions-repository";
import { withDatabaseRetries, withNetworkRetries, databaseCircuitBreaker } from "@/lib/core/retry";
import { offlineManager } from "@/lib/core/offline-manager";
import { observability } from "@/lib/core/observability";
import { cloudMigrationManager } from "@/lib/migration/cloud-migration";
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
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
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

describe("Resilience and Performance Integration Tests", () => {
  const pavelId = "pavel-user-id";
  const testCardId = "test-card-id";

  beforeEach(() => {
    jest.clearAllMocks();
    observability.clear();
    offlineManager.clearPendingOperations();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Atomic SRS Operations", () => {
    it("should handle concurrent card ratings atomically", async () => {
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

      // Mock successful atomic rating
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

      // Simulate 10 concurrent ratings
      const ratingPromises = Array.from({ length: 10 }, (_, i) =>
        enhancedCardsRepository.rateCard(pavelId, testCardId, 2, {
          ratingTxId: `tx-${i}`,
          timestamp: new Date().toISOString(),
        })
      );

      const results = await Promise.all(ratingPromises);

      // All operations should succeed
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.id).toBe(testCardId);
        expect(result.reps).toBe(6);
      });

      // Verify atomic function was called 10 times
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(10);
    });

    it("should handle idempotent ratings correctly", async () => {
      const sameTxId = "same-tx-id";

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

      // Rate the same card twice with the same transaction ID
      const result1 = await enhancedCardsRepository.rateCard(pavelId, testCardId, 2, {
        ratingTxId: sameTxId,
      });

      const result2 = await enhancedCardsRepository.rateCard(pavelId, testCardId, 2, {
        ratingTxId: sameTxId,
      });

      // Results should be identical
      expect(result1.id).toBe(result2.id);
      expect(result1.reps).toBe(result2.reps);

      // Should only call the RPC function once due to idempotency
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
    });
  });

  describe("Retry Mechanism", () => {
    it("should retry failed operations with exponential backoff", async () => {
      // Mock network error on first two calls, success on third
      mockSupabase.rpc
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Connection timeout"))
        .mockResolvedValueOnce({
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

      const startTime = Date.now();
      const result = await enhancedCardsRepository.rateCard(pavelId, testCardId, 2, {
        ratingTxId: "tx-1",
      });
      const duration = Date.now() - startTime;

      expect(result.id).toBe(testCardId);
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(3);

      // Should have taken some time due to retries
      expect(duration).toBeGreaterThan(100);
    });

    it("should fail after maximum retries", async () => {
      // Mock persistent network error
      mockSupabase.rpc.mockRejectedValue(new Error("Network error"));

      await expect(
        enhancedCardsRepository.rateCard(pavelId, testCardId, 2, {
          ratingTxId: "tx-1",
        })
      ).rejects.toThrow("Network error");

      // Should have retried multiple times
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(5); // 1 initial + 4 retries
    });

    it("should handle circuit breaker pattern", async () => {
      // Mock persistent failures
      mockSupabase.rpc.mockRejectedValue(new Error("Database error"));

      // Trigger circuit breaker
      for (let i = 0; i < 6; i++) {
        try {
          await enhancedCardsRepository.rateCard(pavelId, testCardId, 2, {
            ratingTxId: `tx-${i}`,
          });
        } catch (error) {
          // Expected to fail
        }
      }

      // Circuit breaker should be open
      const state = databaseCircuitBreaker.getState();
      expect(state.state).toBe("open");
    });
  });

  describe("Offline Support", () => {
    it("should queue operations when offline", async () => {
      // Simulate offline state
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: false,
      });

      // Mock network error
      mockSupabase.rpc.mockRejectedValue(new Error("Network error"));

      try {
        await enhancedCardsRepository.rateCard(pavelId, testCardId, 2, {
          ratingTxId: "tx-1",
        });
      } catch (error) {
        // Expected to fail and queue operation
      }

      const offlineState = offlineManager.getState();
      expect(offlineState.pendingOperations.length).toBeGreaterThan(0);
      expect(offlineState.pendingOperations[0].type).toBe("rate_card");
    });

    it("should process queued operations when back online", async () => {
      // Simulate offline state
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: false,
      });

      // Queue an operation
      const operationId = offlineManager.queueOperation("rate_card", {
        userId: pavelId,
        cardId: testCardId,
        rating: 2,
        options: { ratingTxId: "tx-1" },
      });

      expect(offlineManager.getState().pendingOperations.length).toBe(1);

      // Simulate coming back online
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: true,
      });

      // Mock successful operation
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

      // Trigger online event
      window.dispatchEvent(new Event("online"));

      // Wait for operation to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      const offlineState = offlineManager.getState();
      expect(offlineState.pendingOperations.length).toBe(0);
    });
  });

  describe("Session Consistency", () => {
    it("should handle session start and finish atomically", async () => {
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
      expect(session.sessionId).toBe("session-id-1");

      await enhancedSessionsRepository.finishSession(pavelId, session.sessionId, {
        reviewedCount: 10,
        accuracy: 85.5,
      });

      expect(mockSupabase.rpc).toHaveBeenCalledTimes(2);
    });

    it("should clean up old unfinished sessions", async () => {
      // Mock successful session start
      mockSupabase.rpc.mockResolvedValueOnce({
        data: "session-id-1",
        error: null,
      });

      const session = await enhancedSessionsRepository.startSession(pavelId);
      expect(session.sessionId).toBe("session-id-1");

      // Mock cleanup of old sessions
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              is: jest.fn(() => ({
                lt: jest.fn(() => ({
                  select: jest.fn().mockResolvedValue({
                    data: [{ id: "old-session-1" }, { id: "old-session-2" }],
                    error: null,
                  }),
                })),
              })),
            })),
          })),
        })),
      });

      const cleanedCount = await enhancedSessionsRepository.cleanupOldSessions(pavelId);
      expect(cleanedCount).toBe(2);
    });
  });

  describe("Pagination Performance", () => {
    it("should handle large datasets with pagination", async () => {
      const mockCards = Array.from({ length: 1000 }, (_, i) => ({
        id: `card-${i}`,
        greek: `word-${i}`,
        translation: `translation-${i}`,
        status: "review",
        reps: 5,
        lapses: 1,
        ease: 2.5,
        interval_days: 7,
        due: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
        correct: 4,
        incorrect: 1,
        learning_step_index: null,
        is_leech: false,
        examples: null,
        notes: null,
        pronunciation: null,
        audio_url: null,
        image_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // Mock paginated results
      mockSupabase.rpc.mockResolvedValue({
        data: mockCards.slice(0, 100), // First page
        error: null,
      });

      const startTime = Date.now();
      const result = await enhancedCardsRepository.list(pavelId, { limit: 100 });
      const duration = Date.now() - startTime;

      expect(result.data).toHaveLength(100);
      expect(result.hasMore).toBe(true);
      expect(duration).toBeLessThan(1000); // Should be fast
    });
  });

  describe("Migration System", () => {
    it("should migrate localStorage data to cloud", async () => {
      // Mock localStorage data
      const mockCards = [
        {
          id: "local-card-1",
          greek: "γεια",
          translation: "hello",
          status: "new",
          reps: 0,
          lapses: 0,
          ease: 2.5,
          interval: 0,
          due: new Date().toISOString(),
          correct: 0,
          incorrect: 0,
          isLeech: false,
        },
      ];

      const mockLogs = [
        {
          id: "local-log-1",
          date: new Date().toISOString().split("T")[0],
          totalReviewed: 5,
          correct: 4,
          incorrect: 1,
          newCards: 2,
          reviewCards: 3,
          learningCards: 0,
          accuracy: 80,
        },
      ];

      // Mock localStorage
      const mockLocalStorage = {
        getItem: jest.fn((key: string) => {
          if (key.includes("cards-")) return JSON.stringify(mockCards[0]);
          if (key.includes("logs-")) return JSON.stringify(mockLogs[0]);
          if (key.includes("settings-")) return JSON.stringify({ dailyNew: 10 });
          return null;
        }),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        length: 3,
        key: jest.fn((index: number) => {
          const keys = ["cards-1", "logs-1", "settings-1"];
          return keys[index] || null;
        }),
      };

      Object.defineProperty(window, "localStorage", {
        value: mockLocalStorage,
        writable: true,
      });

      // Mock successful cloud operations
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn().mockResolvedValue({
            data: mockCards,
            error: null,
          }),
        })),
      });

      mockSupabase.from.mockReturnValue({
        upsert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockLogs[0],
              error: null,
            }),
          })),
        })),
      });

      const result = await cloudMigrationManager.migrateToCloud(pavelId);

      expect(result.success).toBe(true);
      expect(result.migrated.cards).toBe(1);
      expect(result.migrated.logs).toBe(1);
      expect(result.migrated.settings).toBe(true);
      expect(result.backupCreated).toBe(true);
    });
  });

  describe("Observability", () => {
    it("should log all operations with context", async () => {
      // Mock successful operation
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

      await enhancedCardsRepository.rateCard(pavelId, testCardId, 2, {
        ratingTxId: "tx-1",
      });

      const logs = observability.getLogs();
      const srsLogs = logs.filter(log => log.category === "SRS");

      expect(srsLogs.length).toBeGreaterThan(0);
      expect(srsLogs.some(log => log.message.includes("SRS_RATE_START"))).toBe(true);
      expect(srsLogs.some(log => log.message.includes("SRS_RATE_OK"))).toBe(true);
    });

    it("should record performance metrics", async () => {
      // Mock successful operation
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

      await enhancedCardsRepository.rateCard(pavelId, testCardId, 2, {
        ratingTxId: "tx-1",
      });

      const metrics = observability.getMetrics();
      const ratingMetrics = metrics.filter(metric => metric.operation.includes("rateCard"));

      expect(ratingMetrics.length).toBeGreaterThan(0);
      expect(ratingMetrics[0].success).toBe(true);
      expect(ratingMetrics[0].duration).toBeGreaterThan(0);
    });

    it("should track errors with full context", async () => {
      // Mock error
      const error = new Error("Database connection failed");
      mockSupabase.rpc.mockRejectedValue(error);

      try {
        await enhancedCardsRepository.rateCard(pavelId, testCardId, 2, {
          ratingTxId: "tx-1",
        });
      } catch (err) {
        // Expected to fail
      }

      const errors = observability.getErrors();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].error.message).toBe("Database connection failed");
      expect(errors[0].context.operationId).toBeDefined();
    });
  });

  describe("Data Isolation", () => {
    it("should prevent cross-user data access", async () => {
      const pavelId = "pavel-user-id";
      const aleksandraId = "aleksandra-user-id";

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
  });
});
