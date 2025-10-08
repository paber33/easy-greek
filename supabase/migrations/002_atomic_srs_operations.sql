-- Atomic SRS Operations Migration
-- This migration adds atomic card rating operations with idempotency and concurrency control

-- Add rating transaction tracking table for idempotency
CREATE TABLE IF NOT EXISTS rating_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  rating_tx_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 3),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure idempotency: same rating_tx_id can only be used once per card
  UNIQUE(card_id, rating_tx_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_rating_transactions_user_id ON rating_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_rating_transactions_card_id ON rating_transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_rating_transactions_tx_id ON rating_transactions(rating_tx_id);

-- Enable RLS
ALTER TABLE rating_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY IF NOT EXISTS "rating_transactions_owner_all" ON rating_transactions
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Atomic card rating function with idempotency and concurrency control
CREATE OR REPLACE FUNCTION rate_card_atomic(
  card_uuid UUID,
  rating_value INTEGER,
  rating_tx_uuid UUID,
  review_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  id UUID,
  greek TEXT,
  translation TEXT,
  tags TEXT[],
  status TEXT,
  reps INTEGER,
  lapses INTEGER,
  ease DECIMAL,
  interval_days INTEGER,
  last_review TIMESTAMPTZ,
  due TIMESTAMPTZ,
  correct INTEGER,
  incorrect INTEGER,
  learning_step_index INTEGER,
  is_leech BOOLEAN,
  examples TEXT[],
  notes TEXT,
  pronunciation TEXT,
  audio_url TEXT,
  image_url TEXT,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  current_user_id UUID;
  card_record RECORD;
  updated_card RECORD;
  new_ease DECIMAL(3,2);
  new_interval INTEGER;
  new_due TIMESTAMPTZ;
  new_status TEXT;
  new_learning_step INTEGER;
  is_success BOOLEAN;
  q5_rating INTEGER;
  jitter DECIMAL;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Validate rating
  IF rating_value < 0 OR rating_value > 3 THEN
    RAISE EXCEPTION 'Invalid rating: % (must be 0-3)', rating_value;
  END IF;
  
  -- Check if this transaction already exists (idempotency)
  IF EXISTS (
    SELECT 1 FROM rating_transactions 
    WHERE card_id = card_uuid AND rating_tx_id = rating_tx_uuid
  ) THEN
    -- Return existing result without modification
    RETURN QUERY
    SELECT 
      c.id, c.greek, c.translation, c.tags, c.status, c.reps, c.lapses,
      c.ease, c.interval_days, c.last_review, c.due, c.correct, c.incorrect,
      c.learning_step_index, c.is_leech, c.examples, c.notes, c.pronunciation,
      c.audio_url, c.image_url, c.updated_at
    FROM cards c
    WHERE c.id = card_uuid AND c.user_id = current_user_id;
    RETURN;
  END IF;
  
  -- Get current card state with row-level lock
  SELECT * INTO card_record
  FROM cards 
  WHERE id = card_uuid AND user_id = current_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Card not found or access denied';
  END IF;
  
  -- Initialize variables
  new_ease := card_record.ease;
  new_interval := card_record.interval_days;
  new_due := card_record.due;
  new_status := card_record.status;
  new_learning_step := card_record.learning_step_index;
  is_success := rating_value > 0;
  
  -- Convert rating to q5 scale (1-5)
  q5_rating := CASE 
    WHEN rating_value = 0 THEN 1
    WHEN rating_value = 1 THEN 3
    WHEN rating_value = 2 THEN 4
    ELSE 5
  END;
  
  -- === Learning or Relearning Logic ===
  IF card_record.status IN ('learning', 'relearning') THEN
    IF rating_value = 0 THEN
      -- Again: back to first step
      new_learning_step := 0;
      new_due := review_timestamp + INTERVAL '1 minute';
      new_status := 'learning';
    ELSE
      -- Success: advance to next step or graduate
      new_learning_step := COALESCE(card_record.learning_step_index, 0) + 1;
      
      -- Check if we should graduate (simplified: after 2 successful steps)
      IF new_learning_step >= 2 THEN
        -- Graduate to review
        new_status := 'review';
        new_learning_step := NULL;
        new_interval := CASE rating_value
          WHEN 1 THEN 1  -- Hard
          WHEN 2 THEN 1  -- Good
          ELSE 4         -- Easy
        END;
        new_ease := 2.5;
        new_due := review_timestamp + (new_interval || ' days')::INTERVAL;
      ELSE
        -- Continue learning
        new_due := review_timestamp + INTERVAL '10 minutes';
      END IF;
    END IF;
  END IF;
  
  -- === Review Logic ===
  IF card_record.status = 'review' THEN
    IF rating_value = 0 THEN
      -- Again: fail, move to relearning
      new_status := 'relearning';
      new_learning_step := 0;
      new_interval := 0;
      new_due := review_timestamp + INTERVAL '1 minute';
    ELSE
      -- Success in review - update ease factor and interval
      new_ease := GREATEST(1.3, new_ease + (0.1 - (3 - q5_rating) * (0.08 + (3 - q5_rating) * 0.02)));
      
      -- Calculate new interval
      IF card_record.reps = 0 THEN
        new_interval := 1;
      ELSIF card_record.reps = 1 THEN
        new_interval := 6;
      ELSE
        new_interval := ROUND(card_record.interval_days * new_ease * 
          CASE rating_value
            WHEN 1 THEN 0.85  -- Hard
            WHEN 3 THEN 1.15  -- Easy
            ELSE 1.0          -- Good
          END);
      END IF;
      
      -- Apply jitter (±15%)
      jitter := 0.85 + (RANDOM() * 0.3);
      new_interval := GREATEST(1, ROUND(new_interval * jitter));
      new_due := review_timestamp + (new_interval || ' days')::INTERVAL;
    END IF;
  END IF;
  
  -- Update the card atomically
  UPDATE cards SET
    status = new_status,
    reps = CASE WHEN is_success THEN reps + 1 ELSE reps END,
    lapses = CASE WHEN rating_value = 0 AND status = 'review' THEN lapses + 1 ELSE lapses END,
    ease = new_ease,
    interval_days = new_interval,
    last_review = review_timestamp,
    due = new_due,
    correct = CASE WHEN is_success THEN correct + 1 ELSE correct END,
    incorrect = CASE WHEN NOT is_success THEN incorrect + 1 ELSE incorrect END,
    learning_step_index = new_learning_step,
    is_leech = CASE 
      WHEN rating_value = 0 AND status = 'review' AND lapses >= 8 THEN true 
      ELSE is_leech 
    END,
    updated_at = NOW()
  WHERE id = card_uuid AND user_id = current_user_id;
  
  -- Record the transaction for idempotency
  INSERT INTO rating_transactions (user_id, card_id, rating_tx_id, rating)
  VALUES (current_user_id, card_uuid, rating_tx_uuid, rating_value);
  
  -- Return updated card
  RETURN QUERY
  SELECT 
    c.id, c.greek, c.translation, c.tags, c.status, c.reps, c.lapses,
    c.ease, c.interval_days, c.last_review, c.due, c.correct, c.incorrect,
    c.learning_step_index, c.is_leech, c.examples, c.notes, c.pronunciation,
    c.audio_url, c.image_url, c.updated_at
  FROM cards c
  WHERE c.id = card_uuid AND c.user_id = current_user_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback any changes and re-raise the exception
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get cards with keyset pagination
CREATE OR REPLACE FUNCTION get_cards_paginated(
  user_uuid UUID,
  limit_count INTEGER DEFAULT 100,
  cursor_due TIMESTAMPTZ DEFAULT NULL,
  cursor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  greek TEXT,
  translation TEXT,
  tags TEXT[],
  status TEXT,
  reps INTEGER,
  lapses INTEGER,
  ease DECIMAL,
  interval_days INTEGER,
  last_review TIMESTAMPTZ,
  due TIMESTAMPTZ,
  correct INTEGER,
  incorrect INTEGER,
  learning_step_index INTEGER,
  is_leech BOOLEAN,
  examples TEXT[],
  notes TEXT,
  pronunciation TEXT,
  audio_url TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id, c.greek, c.translation, c.tags, c.status, c.reps, c.lapses,
    c.ease, c.interval_days, c.last_review, c.due, c.correct, c.incorrect,
    c.learning_step_index, c.is_leech, c.examples, c.notes, c.pronunciation,
    c.audio_url, c.image_url, c.created_at, c.updated_at
  FROM cards c
  WHERE c.user_id = user_uuid
    AND (
      cursor_due IS NULL OR 
      c.due > cursor_due OR 
      (c.due = cursor_due AND c.id > cursor_id)
    )
  ORDER BY c.due ASC, c.id ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get session logs with pagination
CREATE OR REPLACE FUNCTION get_session_logs_paginated(
  user_uuid UUID,
  limit_count INTEGER DEFAULT 100,
  cursor_date DATE DEFAULT NULL,
  cursor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  date DATE,
  total_reviewed INTEGER,
  correct INTEGER,
  incorrect INTEGER,
  new_cards INTEGER,
  review_cards INTEGER,
  learning_cards INTEGER,
  accuracy DECIMAL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sl.id, sl.date, sl.total_reviewed, sl.correct, sl.incorrect,
    sl.new_cards, sl.review_cards, sl.learning_cards, sl.accuracy,
    sl.created_at, sl.updated_at
  FROM session_logs sl
  WHERE sl.user_id = user_uuid
    AND (
      cursor_date IS NULL OR 
      sl.date < cursor_date OR 
      (sl.date = cursor_date AND sl.id < cursor_id)
    )
  ORDER BY sl.date DESC, sl.id DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to start a session atomically
CREATE OR REPLACE FUNCTION start_session_atomic(
  user_uuid UUID
)
RETURNS UUID AS $$
DECLARE
  session_id UUID;
BEGIN
  -- Clean up any old unfinished sessions (older than 24 hours)
  UPDATE sessions 
  SET finished_at = NOW()
  WHERE user_id = user_uuid 
    AND finished_at IS NULL 
    AND started_at < NOW() - INTERVAL '24 hours';
  
  -- Create new session
  INSERT INTO sessions (user_id, started_at)
  VALUES (user_uuid, NOW())
  RETURNING id INTO session_id;
  
  RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to finish a session atomically
CREATE OR REPLACE FUNCTION finish_session_atomic(
  session_uuid UUID,
  reviewed_count INTEGER,
  accuracy_value DECIMAL
)
RETURNS VOID AS $$
DECLARE
  current_user_id UUID;
  session_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Get session user_id and validate ownership
  SELECT user_id INTO session_user_id
  FROM sessions 
  WHERE id = session_uuid AND user_id = current_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or access denied';
  END IF;
  
  -- Update session
  UPDATE sessions 
  SET 
    finished_at = NOW(),
    reviewed_count = reviewed_count,
    accuracy = accuracy_value
  WHERE id = session_uuid AND user_id = current_user_id;
  
  -- Update or create daily log
  INSERT INTO daily_logs (user_id, day, reviewed_count, accuracy)
  VALUES (current_user_id, CURRENT_DATE, reviewed_count, accuracy_value)
  ON CONFLICT (user_id, day) 
  DO UPDATE SET
    reviewed_count = daily_logs.reviewed_count + reviewed_count,
    accuracy = CASE 
      WHEN daily_logs.reviewed_count + reviewed_count > 0 
      THEN ((daily_logs.accuracy * daily_logs.reviewed_count + accuracy_value * reviewed_count) / (daily_logs.reviewed_count + reviewed_count))
      ELSE accuracy_value
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION rate_card_atomic IS 'Atomically rate a card with idempotency and concurrency control';
COMMENT ON FUNCTION get_cards_paginated IS 'Get cards with keyset pagination for performance';
COMMENT ON FUNCTION get_session_logs_paginated IS 'Get session logs with pagination';
COMMENT ON FUNCTION start_session_atomic IS 'Start a new session atomically';
COMMENT ON FUNCTION finish_session_atomic IS 'Finish a session and update daily logs atomically';
