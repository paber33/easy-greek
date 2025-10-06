import { Card, Rating, SRSConfig, SRS } from "@/types";
import {
  INITIAL_EASE,
  MIN_EASE,
  LEECH_THRESHOLD,
  DEFAULT_CONFIG,
  LEARNING_STEPS_MIN,
} from "../constants";
import { addMinutes, addDays } from "../utils";

/**
 * SM-2 Algorithm Implementation (Anki-style)
 * 
 * This class implements the SuperMemo 2 algorithm for spaced repetition learning.
 * It manages card scheduling, queue building, and rating processing.
 * 
 * @example
 * ```typescript
 * const scheduler = new SRSScheduler();
 * const queue = scheduler.buildQueue(cards, new Date());
 * const updatedCard = scheduler.rate(card, 2, new Date());
 * ```
 */
export class SRSScheduler implements SRS {
  constructor(private config: SRSConfig = DEFAULT_CONFIG) {}

  /**
   * Build daily session queue based on card status and due dates
   * 
   * Priority order:
   * 1. Learning/relearning cards that are due (time-critical)
   * 2. Review cards that are due (up to DAILY_REVIEWS limit)
   * 3. New cards (up to DAILY_NEW limit)
   * 
   * @param allCards - All available cards
   * @param now - Current timestamp
   * @returns Array of cards ordered by priority for the session
   */
  buildQueue = (allCards: Card[], now: Date): Card[] => {
    const queue: Card[] = [];
    const nowISO = now.toISOString();

    // 1. All due learning/relearning cards (time-critical, strictly urgent)
    const learningDue = allCards.filter(
      (c) =>
        (c.status === "learning" || c.status === "relearning") &&
        c.due <= nowISO
    );
    queue.push(...learningDue);

    // 2. Up to DAILY_REVIEWS due review cards, sorted by most overdue first
    const reviewDue = allCards
      .filter((c) => c.status === "review" && c.due <= nowISO)
      .map((c) => ({
        card: c,
        overdue: now.getTime() - new Date(c.due).getTime(),
      }))
      .sort((a, b) => b.overdue - a.overdue) // most overdue first
      .slice(0, this.config.DAILY_REVIEWS)
      .map((x) => x.card);
    queue.push(...reviewDue);

    // 3. Up to DAILY_NEW new cards (FIFO)
    const newCards = allCards
      .filter((c) => c.status === "new")
      .slice(0, this.config.DAILY_NEW);
    queue.push(...newCards);

    return queue;
  }

  /**
   * Rate a card and return updated version using SM-2 Algorithm
   * 
   * Updates card state based on the rating:
   * - 0 (Again): Reset to learning, increment lapses
   * - 1 (Hard): Reduce ease factor, shorter interval
   * - 2 (Good): Normal ease factor, standard interval
   * - 3 (Easy): Increase ease factor, longer interval
   * 
   * @param card - The card to rate
   * @param rating - User rating (0-3)
   * @param now - Current timestamp
   * @returns Updated card with new state
   */
  rate = (card: Card, rating: Rating, now: Date): Card => {
    const updated = { ...card };
    
    // Convert rating to q5 scale (1-5)
    const q5 = rating === 0 ? 1 : rating === 1 ? 3 : rating === 2 ? 4 : 5;

    // === Learning or Relearning ===
    if (updated.status === "learning" || updated.status === "relearning") {
      if (rating === 0) {
        // Again: back to first step
        updated.learningStepIndex = 0;
        updated.due = addMinutes(now, LEARNING_STEPS_MIN[0]).toISOString();
        updated.incorrect += 1;
      } else {
        // Success: advance to next step or graduate
        updated.correct += 1;
        const nextStep = getNextLearningStep(updated);
        if (nextStep !== null) {
          updated.due = addMinutes(now, nextStep).toISOString();
        } else {
          // Graduate to review
          updated.status = "review";
          updated.reps = 0;
          updated.learningStepIndex = undefined;
          updated.interval = initialInterval(rating);
          updated.ease = INITIAL_EASE;
          updated.due = addDays(now, updated.interval).toISOString();
        }
      }
      updated.lastReview = now.toISOString();
      return updated;
    }

    // === Review ===
    if (rating === 0) {
      // Again: fail, move to relearning
      updated.lapses += 1;
      updated.status = "relearning";
      updated.reps = 0;
      updated.interval = 0;
      updated.learningStepIndex = 0;
      updated.due = addMinutes(now, LEARNING_STEPS_MIN[0]).toISOString();
      updated.incorrect += 1;
      updated.lastReview = now.toISOString();

      // Check for leech
      if (updated.lapses >= LEECH_THRESHOLD) {
        updated.isLeech = true;
      }

      return updated;
    }

    // Success in review
    updated.reps += 1;
    updated.correct += 1;

    // Update Ease Factor (EF) using SM-2 formula
    const oldEF = updated.ease ?? INITIAL_EASE;
    const EF = Math.max(
      MIN_EASE,
      oldEF + (0.1 - (3 - q5) * (0.08 + (3 - q5) * 0.02))
    );
    updated.ease = EF;

    // Calculate new interval
    if (updated.reps === 1) {
      updated.interval = 1;
    } else if (updated.reps === 2) {
      updated.interval = 6;
    } else {
      const mod = rating === 1 ? 0.85 : rating === 3 ? 1.15 : 1.0;
      updated.interval = Math.round(updated.interval * EF * mod);
    }

    // Apply jitter (±15%)
    const jitter = uniform(0.85, 1.15);
    const nextDays = Math.max(1, Math.round(updated.interval * jitter));
    updated.due = addDays(now, nextDays).toISOString();
    updated.lastReview = now.toISOString();

    return updated;
  }
}

/**
 * Get initial interval for graduating card based on rating
 * 
 * @param rating - User rating (0-3)
 * @returns Initial interval in days
 */
const initialInterval = (rating: Rating): number => {
  if (rating === 1) return 1; // Hard
  if (rating === 3) return 4; // Easy
  return 2; // Good default
};

/**
 * Get next learning step duration in minutes
 * 
 * @param card - Card with current learning step index
 * @returns Next step duration in minutes, or null if graduated
 */
const getNextLearningStep = (card: Card): number | null => {
  const currentIndex = card.learningStepIndex ?? 0;
  const nextIndex = currentIndex + 1;
  card.learningStepIndex = nextIndex;
  return LEARNING_STEPS_MIN[nextIndex] ?? null;
};

/**
 * Generate random number in range [min, max] for interval jitter
 * 
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Random number in range
 */
const uniform = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

// Export helper functions for testing
export { initialInterval, getNextLearningStep, uniform };
