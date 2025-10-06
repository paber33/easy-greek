export type CardStatus = "new" | "learning" | "review" | "relearning";

export type Rating = 0 | 1 | 2 | 3; // Again, Hard, Good, Easy

export interface Card {
  id: string;
  greek: string;
  translation: string;
  tags?: string[];
  // SRS state
  status: CardStatus;
  reps: number;        // total reviews
  lapses: number;      // times failed from review→relearning
  difficulty: number;  // D, 1..10 (lower = easier), init 6.0
  stability: number;   // S, days, init depends on first rating
  lastReview?: string; // ISO
  due: string;         // ISO
  // stats
  correct: number;
  incorrect: number;
  // learning/relearning state
  currentStep?: number; // current position in LEARNING_STEPS
  isLeech?: boolean;    // marked as leech
}

export interface SessionSummary {
  date: string; // ISO date (day only)
  totalReviewed: number;
  correct: number;
  incorrect: number;
  newCards: number;
  reviewCards: number;
  learningCards: number;
  accuracy: number; // percentage
}

export interface SRSConfig {
  DAILY_NEW: number;
  DAILY_REVIEWS: number;
  LEARNING_STEPS_MIN: number[];
  R_TARGET: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
}

