import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalCardsRepository, LocalLogsRepository, LocalConfigRepository } from '../localRepositories';
import { Card, SessionSummary, SRSConfig } from '../../types';
import { ProfileId } from '../../types/profile';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Local Repositories', () => {
  const profileId: ProfileId = 'pavel';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LocalCardsRepository', () => {
    it('should save and load cards with profile namespace', async () => {
      const cards: Card[] = [
        {
          id: '1',
          greek: 'test',
          translation: 'test',
          status: 'new',
          due: '2024-01-01T10:00:00Z',
          reps: 0,
          lapses: 0,
          ease: 2.5,
          interval: 0,
          correct: 0,
          incorrect: 0
        }
      ];

      await LocalCardsRepository.bulkSave(profileId, cards);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'greek-mvp:pavel:cards',
        JSON.stringify(cards)
      );
    });

    it('should return empty array when no cards exist', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const cards = await LocalCardsRepository.list(profileId);
      expect(cards).toEqual([]);
    });

    it('should upsert cards correctly', async () => {
      const existingCards: Card[] = [
        {
          id: '1',
          greek: 'test1',
          translation: 'test1',
          status: 'new',
          due: '2024-01-01T10:00:00Z',
          reps: 0,
          lapses: 0,
          ease: 2.5,
          interval: 0,
          correct: 0,
          incorrect: 0
        }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingCards));

      const updatedCard: Card = {
        id: '1',
        greek: 'test1',
        translation: 'updated',
        status: 'review',
        due: '2024-01-02T10:00:00Z',
        reps: 1,
        lapses: 0,
        ease: 2.5,
        interval: 1,
        correct: 1,
        incorrect: 0
      };

      await LocalCardsRepository.upsert(profileId, updatedCard);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'greek-mvp:pavel:cards',
        JSON.stringify([updatedCard])
      );
    });

    it('should remove cards correctly', async () => {
      const existingCards: Card[] = [
        {
          id: '1',
          greek: 'test1',
          translation: 'test1',
          status: 'new',
          due: '2024-01-01T10:00:00Z',
          reps: 0,
          lapses: 0,
          ease: 2.5,
          interval: 0,
          correct: 0,
          incorrect: 0
        },
        {
          id: '2',
          greek: 'test2',
          translation: 'test2',
          status: 'new',
          due: '2024-01-01T10:00:00Z',
          reps: 0,
          lapses: 0,
          ease: 2.5,
          interval: 0,
          correct: 0,
          incorrect: 0
        }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingCards));

      await LocalCardsRepository.remove(profileId, '1');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'greek-mvp:pavel:cards',
        JSON.stringify([existingCards[1]])
      );
    });
  });

  describe('LocalLogsRepository', () => {
    it('should save and load logs with profile namespace', async () => {
      const logs: SessionSummary[] = [
        {
          date: '2024-01-01',
          totalReviewed: 10,
          correct: 8,
          incorrect: 2,
          newCards: 3,
          reviewCards: 5,
          learningCards: 2,
          accuracy: 80
        }
      ];

      await LocalLogsRepository.bulkSave(profileId, logs);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'greek-mvp:pavel:logs',
        JSON.stringify(logs)
      );
    });

    it('should return empty array when no logs exist', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const logs = await LocalLogsRepository.list(profileId);
      expect(logs).toEqual([]);
    });
  });

  describe('LocalConfigRepository', () => {
    it('should save and load config with profile namespace', async () => {
      const config: SRSConfig = {
        DAILY_NEW: 20,
        DAILY_REVIEWS: 100,
        LEARNING_STEPS_MIN: [1, 10],
        R_TARGET: {
          again: 0,
          hard: 0.8,
          good: 0.9,
          easy: 0.95
        }
      };

      await LocalConfigRepository.save(profileId, config);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'greek-mvp:pavel:config',
        JSON.stringify(config)
      );
    });

    it('should return default config when no config exists', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const config = await LocalConfigRepository.get(profileId);
      expect(config).toBeDefined();
      expect(config.DAILY_NEW).toBeDefined();
    });
  });

  describe('Profile Isolation', () => {
    it('should use different namespaces for different profiles', async () => {
      const card1: Card = {
        id: '1',
        greek: 'test1',
        translation: 'test1',
        status: 'new',
        due: '2024-01-01T10:00:00Z',
        reps: 0,
        lapses: 0,
        ease: 2.5,
        interval: 0,
        correct: 0,
        incorrect: 0
      };

      const card2: Card = {
        id: '2',
        greek: 'test2',
        translation: 'test2',
        status: 'new',
        due: '2024-01-01T10:00:00Z',
        reps: 0,
        lapses: 0,
        ease: 2.5,
        interval: 0,
        correct: 0,
        incorrect: 0
      };

      await LocalCardsRepository.bulkSave('pavel', [card1]);
      await LocalCardsRepository.bulkSave('aleksandra', [card2]);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'greek-mvp:pavel:cards',
        JSON.stringify([card1])
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'greek-mvp:aleksandra:cards',
        JSON.stringify([card2])
      );
    });
  });
});
