import { SRSConfig } from "./types";

export const DEFAULT_CONFIG: SRSConfig = {
  DAILY_NEW: 10,
  DAILY_REVIEWS: 120,
  LEARNING_STEPS_MIN: [1, 10],
  R_TARGET: {
    again: 0.95,
    hard: 0.90,
    good: 0.85,
    easy: 0.80,
  },
};

export const INITIAL_DIFFICULTY = 6.0;
export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 10;
export const MIN_STABILITY = 0.5;
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

