import { Card, Rating, SRSConfig } from "./types";
import {
  INITIAL_DIFFICULTY,
  MIN_DIFFICULTY,
  MAX_DIFFICULTY,
  MIN_STABILITY,
  LEECH_THRESHOLD,
  LEECH_SUSPEND_DAYS,
  DEFAULT_CONFIG,
} from "./constants";

export class SRSScheduler {
  constructor(private config: SRSConfig = DEFAULT_CONFIG) {}

  /**
   * Build daily session queue
   */
  buildQueue(allCards: Card[], now: Date): Card[] {
    const queue: Card[] = [];
    const nowISO = now.toISOString();

    // 1. All due learning/relearning cards (time-critical)
    const learningDue = allCards.filter(
      (c) =>
        (c.status === "learning" || c.status === "relearning") &&
        c.due <= nowISO
    );
    queue.push(...learningDue);

    // 2. Up to DAILY_REVIEWS due review cards, sorted by overdue + retrievability
    const reviewDue = allCards
      .filter((c) => c.status === "review" && c.due <= nowISO)
      .map((c) => ({
        card: c,
        overdue: now.getTime() - new Date(c.due).getTime(),
        r: this.computeRetrievability(c, now),
      }))
      .sort((a, b) => b.overdue - a.overdue || a.r - b.r) // most overdue first, then hardest
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
   * Rate a card and return updated version
   */
  rate(card: Card, rating: Rating, now: Date): Card {
    const updated = { ...card };
    updated.reps += 1;
    updated.lastReview = now.toISOString();

    if (rating === 0) {
      // Again: fail
      updated.incorrect += 1;
      if (card.status === "review") {
        updated.lapses += 1;
        updated.status = "relearning";
        updated.currentStep = 0;
        this.applyRelearningStep(updated, now);
        // Check for leech
        if (updated.lapses >= LEECH_THRESHOLD) {
          const r = this.computeRetrievability(card, now);
          if (r < 0.5) {
            updated.isLeech = true;
            updated.due = this.addDays(now, LEECH_SUSPEND_DAYS).toISOString();
          }
        }
      } else if (card.status === "learning" || card.status === "relearning") {
        // Back to first step
        updated.currentStep = 0;
        this.applyLearningStep(updated, now);
      } else {
        // new → learning
        updated.status = "learning";
        updated.currentStep = 0;
        this.applyLearningStep(updated, now);
      }
      // Update stability for failed review cards
      if (card.status === "review") {
        updated.stability = Math.max(MIN_STABILITY, card.stability * 0.5);
      }
    } else {
      // Hard (1), Good (2), Easy (3): success
      updated.correct += 1;

      if (card.status === "new" || card.status === "learning" || card.status === "relearning") {
        const currentStep = card.currentStep ?? 0;
        const steps = this.config.LEARNING_STEPS_MIN;

        if (currentStep < steps.length - 1) {
          // Advance to next step
          updated.currentStep = currentStep + 1;
          this.applyLearningStep(updated, now);
        } else {
          // Graduate to review
          updated.status = "review";
          updated.currentStep = undefined;
          this.graduateCard(updated, rating, now);
        }
      } else {
        // Already in review
        this.updateReviewCard(updated, rating, now);
      }
    }

    return updated;
  }

  /**
   * Compute retrievability R(t) = exp(-t/S)
   */
  computeRetrievability(card: Card, now: Date): number {
    if (!card.lastReview || card.status === "new") {
      return 1.0;
    }
    const t = Math.max(
      0.01,
      (now.getTime() - new Date(card.lastReview).getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.exp(-t / card.stability);
  }

  /**
   * Apply learning/relearning step
   */
  private applyLearningStep(card: Card, now: Date) {
    const step = card.currentStep ?? 0;
    const minutes = this.config.LEARNING_STEPS_MIN[step];
    card.due = this.addMinutes(now, minutes).toISOString();
  }

  private applyRelearningStep(card: Card, now: Date) {
    this.applyLearningStep(card, now);
  }

  /**
   * Graduate card from learning to review
   */
  private graduateCard(card: Card, rating: Rating, now: Date) {
    let deltaD = 0;
    let initialS = 2.5;

    if (rating === 1) {
      // Hard
      deltaD = 0.3;
      initialS = 1.5;
    } else if (rating === 2) {
      // Good
      deltaD = -0.2;
      initialS = 2.5;
    } else if (rating === 3) {
      // Easy
      deltaD = -0.5;
      initialS = 4.0;
    }

    card.difficulty = this.clamp(
      (card.difficulty ?? INITIAL_DIFFICULTY) + deltaD,
      MIN_DIFFICULTY,
      MAX_DIFFICULTY
    );
    card.stability = initialS;

    const rTarget = this.getRTarget(rating);
    const intervalDays = this.calculateInterval(card.stability, rTarget);
    card.due = this.addDays(now, intervalDays).toISOString();
  }

  /**
   * Update review card based on rating
   */
  private updateReviewCard(card: Card, rating: Rating, now: Date) {
    const t = Math.max(
      0.01,
      (now.getTime() - new Date(card.lastReview!).getTime()) / (1000 * 60 * 60 * 24)
    );
    const R = Math.exp(-t / card.stability);

    // Difficulty update
    let deltaD = 0;
    if (rating === 1) deltaD = 0.3; // Hard
    else if (rating === 2) deltaD = -0.15; // Good
    else if (rating === 3) deltaD = -0.35; // Easy

    const newD = this.clamp(
      card.difficulty + deltaD + 0.4 * (1 - R),
      MIN_DIFFICULTY,
      MAX_DIFFICULTY
    );
    card.difficulty = newD;

    // Stability update
    const growth = rating === 1 ? 0.1 : rating === 2 ? 0.35 : 0.6;
    const diffFactor = 1 - (newD - 1) / 12;
    const learnFactor = 1 + growth * diffFactor * (0.6 + 0.4 * R);
    const newS = Math.max(MIN_STABILITY, card.stability * learnFactor);
    card.stability = newS;

    // Next interval
    const rTarget = this.getRTarget(rating);
    const intervalDays = this.calculateInterval(newS, rTarget);
    card.due = this.addDays(now, intervalDays).toISOString();
  }

  /**
   * Calculate interval from target retrievability
   */
  private calculateInterval(stability: number, rTarget: number): number {
    const interval = -stability * Math.log(rTarget);
    const jittered = interval * (0.85 + Math.random() * 0.3); // 0.85 to 1.15
    return Math.max(1, Math.round(jittered));
  }

  private getRTarget(rating: Rating): number {
    if (rating === 0) return this.config.R_TARGET.again;
    if (rating === 1) return this.config.R_TARGET.hard;
    if (rating === 2) return this.config.R_TARGET.good;
    return this.config.R_TARGET.easy;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }
}

