import { describe, it, expect, beforeEach } from 'vitest';
import { SRSScheduler } from '../srs';
import { Card, Rating } from '../../types';
import { DEFAULT_CONFIG } from '../constants';

describe('SRS Algorithm', () => {
  let scheduler: SRSScheduler;
  let now: Date;

  beforeEach(() => {
    scheduler = new SRSScheduler(DEFAULT_CONFIG);
    now = new Date('2024-01-01T10:00:00Z');
  });

  describe('buildQueue', () => {
    it('should prioritize learning cards over review cards', () => {
      const cards: Card[] = [
        {
          id: '1',
          greek: 'test1',
          translation: 'test1',
          status: 'learning',
          due: now.toISOString(),
          reps: 0,
          lapses: 0,
          ease: 2.5,
          interval: 0,
          correct: 0,
          incorrect: 0,
          learningStepIndex: 0
        },
        {
          id: '2',
          greek: 'test2',
          translation: 'test2',
          status: 'review',
          due: now.toISOString(),
          reps: 5,
          lapses: 0,
          ease: 2.5,
          interval: 1,
          correct: 5,
          incorrect: 0
        }
      ];

      const queue = scheduler.buildQueue(cards, now);
      expect(queue[0].id).toBe('1'); // learning card first
    });

    it('should limit review cards to DAILY_REVIEWS', () => {
      const cards: Card[] = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        greek: `test${i}`,
        translation: `test${i}`,
        status: 'review' as const,
        due: now.toISOString(),
        reps: 5,
        lapses: 0,
        ease: 2.5,
        interval: 1,
        correct: 5,
        incorrect: 0
      }));

      const queue = scheduler.buildQueue(cards, now);
      const reviewCards = queue.filter(c => c.status === 'review');
      expect(reviewCards.length).toBeLessThanOrEqual(DEFAULT_CONFIG.DAILY_REVIEWS);
    });

    it('should limit new cards to DAILY_NEW', () => {
      const cards: Card[] = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        greek: `test${i}`,
        translation: `test${i}`,
        status: 'new' as const,
        due: now.toISOString(),
        reps: 0,
        lapses: 0,
        ease: 2.5,
        interval: 0,
        correct: 0,
        incorrect: 0
      }));

      const queue = scheduler.buildQueue(cards, now);
      const newCards = queue.filter(c => c.status === 'new');
      expect(newCards.length).toBeLessThanOrEqual(DEFAULT_CONFIG.DAILY_NEW);
    });
  });

  describe('rate', () => {
    it('should handle Again rating for learning card', () => {
      const card: Card = {
        id: '1',
        greek: 'test',
        translation: 'test',
        status: 'learning',
        due: now.toISOString(),
        reps: 0,
        lapses: 0,
        ease: 2.5,
        interval: 0,
        correct: 0,
        incorrect: 0,
        learningStepIndex: 1
      };

      const updated = scheduler.rate(card, 0, now); // Again
      expect(updated.learningStepIndex).toBe(0);
      expect(updated.incorrect).toBe(1);
      expect(updated.status).toBe('learning');
    });

    it('should graduate learning card to review on success', () => {
      const card: Card = {
        id: '1',
        greek: 'test',
        translation: 'test',
        status: 'learning',
        due: now.toISOString(),
        reps: 0,
        lapses: 0,
        ease: 2.5,
        interval: 0,
        correct: 0,
        incorrect: 0,
        learningStepIndex: 1 // last step
      };

      const updated = scheduler.rate(card, 2, now); // Good
      expect(updated.status).toBe('review');
      expect(updated.learningStepIndex).toBeUndefined();
      expect(updated.interval).toBeGreaterThan(0);
    });

    it('should handle Again rating for review card', () => {
      const card: Card = {
        id: '1',
        greek: 'test',
        translation: 'test',
        status: 'review',
        due: now.toISOString(),
        reps: 5,
        lapses: 0,
        ease: 2.5,
        interval: 7,
        correct: 5,
        incorrect: 0
      };

      const updated = scheduler.rate(card, 0, now); // Again
      expect(updated.status).toBe('relearning');
      expect(updated.lapses).toBe(1);
      expect(updated.learningStepIndex).toBe(0);
      expect(updated.interval).toBe(0);
    });

    it('should update ease factor correctly', () => {
      const card: Card = {
        id: '1',
        greek: 'test',
        translation: 'test',
        status: 'review',
        due: now.toISOString(),
        reps: 5,
        lapses: 0,
        ease: 2.5,
        interval: 7,
        correct: 5,
        incorrect: 0
      };

      const updated = scheduler.rate(card, 2, now); // Good
      expect(updated.ease).toBeGreaterThan(0);
      expect(updated.interval).toBeGreaterThan(0);
    });

    it('should apply jitter to intervals', () => {
      const card: Card = {
        id: '1',
        greek: 'test',
        translation: 'test',
        status: 'review',
        due: now.toISOString(),
        reps: 5,
        lapses: 0,
        ease: 2.5,
        interval: 7,
        correct: 5,
        incorrect: 0
      };

      const updated = scheduler.rate(card, 2, now); // Good
      expect(updated.interval).toBeGreaterThanOrEqual(1); // minimum 1 day
    });

    it('should mark card as leech after threshold', () => {
      const card: Card = {
        id: '1',
        greek: 'test',
        translation: 'test',
        status: 'review',
        due: now.toISOString(),
        reps: 5,
        lapses: 7, // close to threshold
        ease: 2.5,
        interval: 7,
        correct: 5,
        incorrect: 0
      };

      const updated = scheduler.rate(card, 0, now); // Again
      expect(updated.isLeech).toBe(true);
    });
  });
});
