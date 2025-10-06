import { SRSConfig } from "@/types";

// ============================================================================
// SRS Algorithm Constants
// ============================================================================

/** Daily new cards limit */
export const DAILY_NEW = 10;

/** Daily review cards limit */
export const DAILY_REVIEWS = 120;

/** Learning steps in minutes */
export const LEARNING_STEPS_MIN = [1, 10];

/** Target retention rates for different ratings */
export const R_TARGET = { 
  again: 0.95, 
  hard: 0.90, 
  good: 0.85, 
  easy: 0.80,
};

/** Default SRS configuration */
export const DEFAULT_CONFIG: SRSConfig = {
  DAILY_NEW,
  DAILY_REVIEWS,
  LEARNING_STEPS_MIN,
  R_TARGET,
};

// ============================================================================
// SM-2 Algorithm Constants
// ============================================================================

/** Initial ease factor for new cards */
export const INITIAL_EASE = 2.5;

/** Minimum ease factor */
export const MIN_EASE = 1.3;

// ============================================================================
// Legacy FSRS Constants (kept for backward compatibility)
// ============================================================================

/** Initial difficulty for new cards */
export const INITIAL_DIFFICULTY = 6.0;

/** Minimum difficulty value */
export const MIN_DIFFICULTY = 1;

/** Maximum difficulty value */
export const MAX_DIFFICULTY = 10;

/** Minimum stability value */
export const MIN_STABILITY = 0.5;

// ============================================================================
// Leech Detection
// ============================================================================

/** Number of lapses before marking as leech */
export const LEECH_THRESHOLD = 8;

/** Days to suspend leech cards */
export const LEECH_SUSPEND_DAYS = 3;

// ============================================================================
// UI Constants
// ============================================================================

/** Rating button labels */
export const RATING_LABELS = ["Again", "Hard", "Good", "Easy"] as const;

/** Rating button colors */
export const RATING_COLORS = [
  "bg-red-500 hover:bg-red-600",
  "bg-orange-500 hover:bg-orange-600", 
  "bg-green-500 hover:bg-green-600",
  "bg-blue-500 hover:bg-blue-600",
] as const;

/** Russian rating labels */
export const RATING_LABELS_RU = ["Забыл", "Трудно", "Хорошо", "Легко"] as const;

// ============================================================================
// Storage Constants
// ============================================================================

/** Storage version for migration */
export const STORAGE_VERSION = "2.0.0";

/** App namespace for localStorage */
export const APP_NAMESPACE = "greek-mvp";
