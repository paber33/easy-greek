import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/types';
import { useCurrentProfileId } from './use-profile';
import { LocalCardsRepository, LocalSessionRepository } from '@/lib/localRepositories';
import { useSRS } from './use-srs';

/**
 * Custom hook for managing study queue
 * Handles queue building, session state, and progress tracking
 */
export const useQueue = () => {
  const profileId = useCurrentProfileId();
  const { buildQueue } = useSRS();
  
  const [queue, setQueue] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    totalReviewed: 0,
    correct: 0,
    incorrect: 0,
  });
  
  /**
   * Load and build queue for current session
   */
  const loadQueue = useCallback(async () => {
    if (!profileId) return;
    
    setIsLoading(true);
    try {
      const allCards = await LocalCardsRepository.list(profileId);
      const newQueue = await buildQueue(allCards);
      setQueue(newQueue);
      setCurrentIndex(0);
      
      // Load session state if exists
      const sessionState = await LocalSessionRepository.get(profileId);
      if (sessionState) {
        setCurrentIndex(sessionState.currentCardIndex);
        setSessionStats({
          totalReviewed: sessionState.totalReviewed,
          correct: sessionState.correct,
          incorrect: sessionState.incorrect,
        });
      }
    } catch (error) {
      console.error('Failed to load queue:', error);
    } finally {
      setIsLoading(false);
    }
  }, [profileId, buildQueue]);
  
  /**
   * Save current session state
   */
  const saveSessionState = useCallback(async () => {
    if (!profileId) return;
    
    try {
      await LocalSessionRepository.save(profileId, {
        currentCardIndex: currentIndex,
        queue,
        sessionStartTime: new Date().toISOString(),
        ...sessionStats,
      });
    } catch (error) {
      console.error('Failed to save session state:', error);
    }
  }, [profileId, currentIndex, queue, sessionStats]);
  
  /**
   * Clear session state
   */
  const clearSession = useCallback(async () => {
    if (!profileId) return;
    
    try {
      await LocalSessionRepository.clear(profileId);
      setCurrentIndex(0);
      setSessionStats({ totalReviewed: 0, correct: 0, incorrect: 0 });
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }, [profileId]);
  
  // Auto-save session state when it changes
  useEffect(() => {
    if (queue.length > 0) {
      saveSessionState();
    }
  }, [currentIndex, sessionStats, saveSessionState]);
  
  // Load queue on mount
  useEffect(() => {
    loadQueue();
  }, [loadQueue]);
  
  return {
    queue,
    currentIndex,
    isLoading,
    sessionStats,
    setCurrentIndex,
    setSessionStats,
    loadQueue,
    clearSession,
    currentCard: queue[currentIndex] || null,
    isComplete: currentIndex >= queue.length,
    progress: queue.length > 0 ? (currentIndex / queue.length) * 100 : 0,
  };
};
