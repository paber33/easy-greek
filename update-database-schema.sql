-- Обновление схемы базы данных для SM-2 алгоритма
-- Выполните этот SQL в SQL Editor вашего Supabase проекта

-- Добавляем новые поля для SM-2 алгоритма
ALTER TABLE cards 
ADD COLUMN IF NOT EXISTS ease DECIMAL(3,2) DEFAULT 2.5 CHECK (ease >= 1.3),
ADD COLUMN IF NOT EXISTS interval_days INTEGER DEFAULT 0 CHECK (interval_days >= 0),
ADD COLUMN IF NOT EXISTS learning_step_index INTEGER;

-- Добавляем поля для дополнительного контента
ALTER TABLE cards 
ADD COLUMN IF NOT EXISTS examples TEXT[],
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS pronunciation TEXT,
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Миграция данных: конвертируем старые поля в новые
UPDATE cards 
SET 
  ease = CASE 
    WHEN difficulty IS NOT NULL THEN 
      -- Конвертируем difficulty (1-10) в ease (1.3-3.0)
      GREATEST(1.3, LEAST(3.0, 2.5 - (difficulty - 6.0) * 0.1))
    ELSE 2.5 
  END,
  interval_days = CASE 
    WHEN stability IS NOT NULL THEN GREATEST(0, ROUND(stability))
    ELSE 0 
  END,
  learning_step_index = current_step
WHERE ease IS NULL OR interval_days IS NULL;

-- Обновляем индексы
CREATE INDEX IF NOT EXISTS idx_cards_ease ON cards(ease);
CREATE INDEX IF NOT EXISTS idx_cards_interval ON cards(interval_days);
CREATE INDEX IF NOT EXISTS idx_cards_learning_step ON cards(learning_step_index);

-- Обновляем функцию get_due_cards для новых полей
CREATE OR REPLACE FUNCTION get_due_cards(user_uuid UUID, limit_count INTEGER DEFAULT 100)
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
    -- Legacy fields для обратной совместимости
    difficulty DECIMAL,
    stability DECIMAL,
    current_step INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.greek,
        c.translation,
        c.tags,
        c.status,
        c.reps,
        c.lapses,
        c.ease,
        c.interval_days,
        c.last_review,
        c.due,
        c.correct,
        c.incorrect,
        c.learning_step_index,
        c.is_leech,
        c.examples,
        c.notes,
        c.pronunciation,
        c.audio_url,
        c.image_url,
        -- Legacy fields
        c.difficulty,
        c.stability,
        c.current_step
    FROM cards c
    WHERE c.user_id = user_uuid 
    AND c.due <= NOW()
    ORDER BY 
        CASE 
            WHEN c.status IN ('learning', 'relearning') THEN 1
            WHEN c.status = 'review' THEN 2
            ELSE 3
        END,
        c.due ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Обновляем комментарии
COMMENT ON COLUMN cards.ease IS 'Ease Factor для SM-2 алгоритма (1.3-3.0)';
COMMENT ON COLUMN cards.interval_days IS 'Интервал повторения в днях для SM-2';
COMMENT ON COLUMN cards.learning_step_index IS 'Текущий шаг изучения (0-based индекс)';
COMMENT ON COLUMN cards.examples IS 'Примеры использования слова в предложениях';
COMMENT ON COLUMN cards.notes IS 'Дополнительные заметки и подсказки';
COMMENT ON COLUMN cards.pronunciation IS 'Транскрипция произношения';
COMMENT ON COLUMN cards.audio_url IS 'Ссылка на аудио файл';
COMMENT ON COLUMN cards.image_url IS 'Ссылка на изображение';

-- Добавляем комментарии о legacy полях
COMMENT ON COLUMN cards.difficulty IS 'LEGACY: Сложность для FSRS (1-10), заменено на ease';
COMMENT ON COLUMN cards.stability IS 'LEGACY: Стабильность для FSRS (дни), заменено на interval_days';
COMMENT ON COLUMN cards.current_step IS 'LEGACY: Шаг изучения для FSRS, заменено на learning_step_index';
