import { useMemo, useCallback, useState } from "react";
import { Card, Rating } from "@/types";
import { SRSScheduler } from "@/lib/core/srs";
import { useCurrentProfileId } from "./use-profile";
import { enhancedCardsRepository } from "@/lib/repositories/supabase/enhanced-cards-repository";
import { enhancedSessionsRepository } from "@/lib/repositories/supabase/enhanced-sessions-repository";
import { withDatabaseRetries } from "@/lib/core/retry";
import { offlineManager, executeWithOfflineSupport } from "@/lib/core/offline-manager";

export interface SRSState {
  isLoading: boolean;
  isRating: boolean;
  error: string | null;
  currentSession: {
    id: string | null;
    startedAt: string | null;
  } | null;
}

export interface RateCardResult {
  success: boolean;
  updatedCard?: Card;
  error?: string;
  operationId?: string;
}

/**
 * Enhanced SRS hook with atomic operations, retry logic, and offline support
 */
export const useEnhancedSRS = () => {
  const profileId = useCurrentProfileId();
  const [state, setState] = useState<SRSState>({
    isLoading: false,
    isRating: false,
    error: null,
    currentSession: null,
  });

  const scheduler = useMemo(() => {
    return new SRSScheduler();
  }, []);

  /**
   * Start a new study session
   */
  const startSession = useCallback(async (): Promise<{ sessionId: string; startedAt: string }> => {
    if (!profileId) {
      throw new Error("No active profile");
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await withDatabaseRetries(async () => {
        return await enhancedSessionsRepository.startSession(profileId);
      });

      setState(prev => ({
        ...prev,
        isLoading: false,
        currentSession: {
          id: result.sessionId,
          startedAt: result.startedAt,
        },
      }));

      console.log(`SESSION_STARTED: ${result.sessionId}`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to start session";
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, [profileId]);

  /**
   * Finish the current study session
   */
  const finishSession = useCallback(
    async (reviewedCount: number, accuracy: number): Promise<void> => {
      if (!profileId || !state.currentSession?.id) {
        throw new Error("No active session to finish");
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        await withDatabaseRetries(async () => {
          await enhancedSessionsRepository.finishSession(profileId, state.currentSession!.id!, {
            reviewedCount,
            accuracy,
          });
        });

        setState(prev => ({
          ...prev,
          isLoading: false,
          currentSession: null,
        }));

        console.log(
          `SESSION_FINISHED: ${state.currentSession.id}, reviewed: ${reviewedCount}, accuracy: ${accuracy}%`
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to finish session";
        setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        throw error;
      }
    },
    [profileId, state.currentSession]
  );

  /**
   * Rate a card with atomic operation and offline support
   */
  const rateCard = useCallback(
    async (card: Card, rating: Rating): Promise<RateCardResult> => {
      if (!profileId) {
        return { success: false, error: "No active profile" };
      }

      setState(prev => ({ ...prev, isRating: true, error: null }));

      try {
        // Generate unique transaction ID for idempotency
        const ratingTxId = `rating_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const updatedCard = await executeWithOfflineSupport(
          () =>
            withDatabaseRetries(async () => {
              return await enhancedCardsRepository.rateCard(profileId, card.id, rating, {
                ratingTxId,
                timestamp: new Date().toISOString(),
              });
            }),
          "rate_card",
          {
            userId: profileId,
            cardId: card.id,
            rating,
            options: { ratingTxId, timestamp: new Date().toISOString() },
          }
        );

        setState(prev => ({ ...prev, isRating: false }));

        console.log(`CARD_RATED: ${card.id}, rating: ${rating}, new_status: ${updatedCard.status}`);

        return {
          success: true,
          updatedCard,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to rate card";
        setState(prev => ({ ...prev, isRating: false, error: errorMessage }));

        // Check if operation was queued for offline execution
        const operationIdMatch = errorMessage.match(/Operation queued for later execution: (\w+)/);
        const retryIdMatch = errorMessage.match(/Operation failed and queued for retry: (\w+)/);

        if (operationIdMatch || retryIdMatch) {
          const operationId = operationIdMatch?.[1] || retryIdMatch?.[1];
          return {
            success: false,
            error: errorMessage,
            operationId,
          };
        }

        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [profileId]
  );

  /**
   * Build session queue based on current time and card states
   */
  const buildQueue = useCallback(
    async (allCards: Card[]): Promise<Card[]> => {
      const now = new Date();
      return scheduler.buildQueue(allCards, now);
    },
    [scheduler]
  );

  /**
   * Get cards due for review with pagination
   */
  const getDueCards = useCallback(
    async (limit: number = 100): Promise<Card[]> => {
      if (!profileId) {
        throw new Error("No active profile");
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const cards = await withDatabaseRetries(async () => {
          return await enhancedCardsRepository.getDueCards(profileId, limit);
        });

        setState(prev => ({ ...prev, isLoading: false }));
        return cards;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to get due cards";
        setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        throw error;
      }
    },
    [profileId]
  );

  /**
   * Get cards with pagination
   */
  const getCards = useCallback(
    async (
      limit: number = 100,
      cursor?: { due: string; id: string }
    ): Promise<{
      data: Card[];
      nextCursor?: { due: string; id: string };
      hasMore: boolean;
    }> => {
      if (!profileId) {
        throw new Error("No active profile");
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const result = await withDatabaseRetries(async () => {
          return await enhancedCardsRepository.list(profileId, { limit, cursor });
        });

        setState(prev => ({ ...prev, isLoading: false }));
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to get cards";
        setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        throw error;
      }
    },
    [profileId]
  );

  /**
   * Create a new card
   */
  const createCard = useCallback(
    async (card: Omit<Card, "id">): Promise<Card> => {
      if (!profileId) {
        throw new Error("No active profile");
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const newCard = await executeWithOfflineSupport(
          () =>
            withDatabaseRetries(async () => {
              return await enhancedCardsRepository.create(profileId, card);
            }),
          "create_card",
          { userId: profileId, card }
        );

        setState(prev => ({ ...prev, isLoading: false }));
        return newCard;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to create card";
        setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        throw error;
      }
    },
    [profileId]
  );

  /**
   * Update an existing card
   */
  const updateCard = useCallback(
    async (cardId: string, updates: Partial<Card>, expectedUpdatedAt?: string): Promise<Card> => {
      if (!profileId) {
        throw new Error("No active profile");
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const updatedCard = await executeWithOfflineSupport(
          () =>
            withDatabaseRetries(async () => {
              return await enhancedCardsRepository.update(
                profileId,
                cardId,
                updates,
                expectedUpdatedAt
              );
            }),
          "update_card",
          { userId: profileId, cardId, updates, expectedUpdatedAt }
        );

        setState(prev => ({ ...prev, isLoading: false }));
        return updatedCard;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to update card";
        setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        throw error;
      }
    },
    [profileId]
  );

  /**
   * Delete a card
   */
  const deleteCard = useCallback(
    async (cardId: string): Promise<void> => {
      if (!profileId) {
        throw new Error("No active profile");
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        await executeWithOfflineSupport(
          () =>
            withDatabaseRetries(async () => {
              await enhancedCardsRepository.remove(profileId, cardId);
            }),
          "delete_card",
          { userId: profileId, cardId }
        );

        setState(prev => ({ ...prev, isLoading: false }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to delete card";
        setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        throw error;
      }
    },
    [profileId]
  );

  /**
   * Get user statistics
   */
  const getUserStats = useCallback(async () => {
    if (!profileId) {
      throw new Error("No active profile");
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const stats = await withDatabaseRetries(async () => {
        return await enhancedCardsRepository.getUserStats(profileId);
      });

      setState(prev => ({ ...prev, isLoading: false }));
      return stats;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to get user stats";
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, [profileId]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Get offline state
   */
  const getOfflineState = useCallback(() => {
    return offlineManager.getState();
  }, []);

  return {
    // State
    state,

    // Session management
    startSession,
    finishSession,

    // Card operations
    rateCard,
    buildQueue,
    getDueCards,
    getCards,
    createCard,
    updateCard,
    deleteCard,

    // Statistics
    getUserStats,

    // Utilities
    clearError,
    getOfflineState,

    // Scheduler instance
    scheduler,
  };
};
