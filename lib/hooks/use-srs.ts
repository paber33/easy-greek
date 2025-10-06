import { useMemo } from 'react';
import { Card, Rating } from '@/types';
import { SRSScheduler } from '@/lib/core/srs';
import { useCurrentProfileId } from './use-profile';
import { LocalCardsRepository } from '@/lib/localRepositories';

/**
 * Custom hook for SRS (Spaced Repetition System) functionality
 * 
 * Provides SRS scheduler instance and rating functionality with automatic persistence.
 * All operations are scoped to the current user profile.
 * 
 * @example
 * ```typescript
 * const { rateCard, buildQueue, scheduler } = useSRS();
 * const queue = await buildQueue(cards);
 * const updatedCard = await rateCard(card, 2);
 * ```
 * 
 * @returns Object with SRS methods and scheduler instance
 */
export const useSRS = () => {
  const profileId = useCurrentProfileId();
  
  const scheduler = useMemo(() => {
    return new SRSScheduler();
  }, []);
  
  /**
   * Rate a card and persist the updated version
   * 
   * @param card - Card to rate
   * @param rating - User rating (0-3)
   * @returns Updated card with new SRS state
   */
  const rateCard = async (card: Card, rating: Rating): Promise<Card> => {
    const now = new Date();
    const updatedCard = scheduler.rate(card, rating, now);
    
    // Save updated card to storage
    await LocalCardsRepository.upsert(profileId, updatedCard);
    
    return updatedCard;
  };
  
  /**
   * Build session queue based on current time and card states
   * 
   * @param allCards - All available cards
   * @returns Prioritized queue of cards for the session
   */
  const buildQueue = async (allCards: Card[]): Promise<Card[]> => {
    const now = new Date();
    return scheduler.buildQueue(allCards, now);
  };
  
  return {
    rateCard,
    buildQueue,
    scheduler,
  };
};
