export type CardStatus = "new" | "learning" | "review" | "relearning";

export type Rating = 0 | 1 | 2 | 3; // Again, Hard, Good, Easy

export interface Card {
  id: string;
  greek: string;
  translation: string;
  tags?: string[];
  // SRS state (SM-2 Algorithm)
  status: CardStatus;
  reps: number;        // total reviews
  lapses: number;      // times failed from review→relearning
  ease: number;        // EF (Ease Factor), start 2.5
  interval: number;    // in days
  lastReview?: string; // ISO
  due: string;         // ISO
  // stats
  correct: number;
  incorrect: number;
  // learning/relearning state
  learningStepIndex?: number; // current position in LEARNING_STEPS
  isLeech?: boolean;    // marked as leech
  // Additional content fields
  examples?: string[];  // примеры использования слова
  notes?: string;       // дополнительные заметки/помощь
  pronunciation?: string; // транскрипция произношения
  audioUrl?: string;    // ссылка на аудио файл
  imageUrl?: string;    // ссылка на изображение
  // Legacy fields for backward compatibility
  difficulty?: number;  // D, 1..10 (lower = easier), init 6.0
  stability?: number;   // S, days, init depends on first rating
  currentStep?: number; // current position in LEARNING_STEPS
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

