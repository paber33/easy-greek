import { SRSConfig } from "@/types";

// SM-2 Algorithm Constants
export const DAILY_NEW = 10;
export const DAILY_REVIEWS = 120;
export const LEARNING_STEPS_MIN = [1, 10];

// Legacy FSRS constants (kept for backward compatibility)
export const R_TARGET = { again: 0.95, hard: 0.90, good: 0.85, easy: 0.80 };

export const DEFAULT_CONFIG: SRSConfig = {
  DAILY_NEW,
  DAILY_REVIEWS,
  LEARNING_STEPS_MIN,
  R_TARGET,
};

// SM-2 Constants
export const INITIAL_EASE = 2.5;
export const MIN_EASE = 1.3;

// Legacy FSRS constants (kept for backward compatibility)
export const INITIAL_DIFFICULTY = 6.0;
export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 10;
export const MIN_STABILITY = 0.5;

// Leech detection
export const LEECH_THRESHOLD = 8;
export const LEECH_SUSPEND_DAYS = 3;

// Rating labels
export const RATING_LABELS = ["Again", "Hard", "Good", "Easy"] as const;
export const RATING_COLORS = [
  "bg-red-500 hover:bg-red-600",
  "bg-orange-500 hover:bg-orange-600",
  "bg-green-500 hover:bg-green-600",
  "bg-blue-500 hover:bg-blue-600",
] as const;
