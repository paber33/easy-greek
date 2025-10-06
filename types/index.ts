// ============================================================================
// Core Types
// ============================================================================

/** Card status in the SRS system */
export type CardStatus = "new" | "learning" | "review" | "relearning";

/** Rating values for card reviews */
export type Rating = 0 | 1 | 2 | 3; // Again, Hard, Good, Easy

/** Profile ID type */
export type ProfileId = 'pavel' | 'aleksandra';

/**
 * Card interface representing a flashcard in the SRS system
 */
export interface Card {
  /** Unique identifier */
  id: string;
  
  /** Greek text */
  greek: string;
  
  /** Translation text */
  translation: string;
  
  /** Optional tags for categorization */
  tags?: string[];
  
  // ============================================================================
  // SRS State (SM-2 Algorithm)
  // ============================================================================
  
  /** Current status in the learning process */
  status: CardStatus;
  
  /** Total number of reviews */
  reps: number;
  
  /** Number of times failed from review to relearning */
  lapses: number;
  
  /** Ease factor (EF), starts at 2.5 */
  ease: number;
  
  /** Current interval in days */
  interval: number;
  
  /** Last review timestamp (ISO string) */
  lastReview?: string;
  
  /** Due date for next review (ISO string) */
  due: string;
  
  // ============================================================================
  // Statistics
  // ============================================================================
  
  /** Number of correct answers */
  correct: number;
  
  /** Number of incorrect answers */
  incorrect: number;
  
  // ============================================================================
  // Learning State
  // ============================================================================
  
  /** Current position in learning steps */
  learningStepIndex?: number;
  
  /** Whether card is marked as leech */
  isLeech?: boolean;
  
  // ============================================================================
  // Additional Content
  // ============================================================================
  
  /** Usage examples */
  examples?: string[];
  
  /** Additional notes */
  notes?: string;
  
  /** Pronunciation guide */
  pronunciation?: string;
  
  /** Audio file URL */
  audioUrl?: string;
  
  /** Image file URL */
  imageUrl?: string;
  
  // ============================================================================
  // Legacy Fields (for backward compatibility)
  // ============================================================================
  
  /** Difficulty rating (1-10, lower = easier) */
  difficulty?: number;
  
  /** Stability in days */
  stability?: number;
  
  /** Current step in learning process */
  currentStep?: number;
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

export interface SRS {
  buildQueue(all: Card[], now: Date): Card[];
  rate(card: Card, rating: Rating, now: Date): Card;
}

// Supabase Database Types
export interface Database {
  public: {
    Tables: {
      cards: {
        Row: {
          id: string
          user_id: string
          greek: string
          translation: string
          tags: string[]
          status: CardStatus
          reps: number
          lapses: number
          ease: number
          interval_days: number
          last_review: string | null
          due: string
          correct: number
          incorrect: number
          learning_step_index: number | null
          is_leech: boolean
          examples: string[] | null
          notes: string | null
          pronunciation: string | null
          audio_url: string | null
          image_url: string | null
          created_at: string
          updated_at: string
          // Legacy fields для обратной совместимости
          difficulty: number | null
          stability: number | null
          current_step: number | null
        }
        Insert: Omit<Database['public']['Tables']['cards']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Database['public']['Tables']['cards']['Row'], 'id' | 'user_id' | 'created_at'>>
      }
      session_logs: {
        Row: {
          id: string
          user_id: string
          date: string
          total_reviewed: number
          correct: number
          incorrect: number
          new_cards: number
          review_cards: number
          learning_cards: number
          accuracy: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['session_logs']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Database['public']['Tables']['session_logs']['Row'], 'id' | 'user_id' | 'created_at'>>
      }
      user_configs: {
        Row: {
          id: string
          user_id: string
          daily_new: number
          daily_reviews: number
          learning_steps_min: number[]
          r_target: {
            again: number
            hard: number
            good: number
            easy: number
          }
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_configs']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Database['public']['Tables']['user_configs']['Row'], 'id' | 'user_id' | 'created_at'>>
      }
    }
  }
}

