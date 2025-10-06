-- Easy Greek Database Schema
-- Выполните этот SQL в SQL Editor вашего Supabase проекта

-- Включаем расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Таблица карточек
CREATE TABLE cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  greek TEXT NOT NULL,
  translation TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('new', 'learning', 'review', 'relearning')),
  reps INTEGER DEFAULT 0,
  lapses INTEGER DEFAULT 0,
  difficulty DECIMAL(3,1) DEFAULT 6.0 CHECK (difficulty >= 1 AND difficulty <= 10),
  stability DECIMAL(5,2) DEFAULT 0 CHECK (stability >= 0),
  last_review TIMESTAMPTZ,
  due TIMESTAMPTZ NOT NULL,
  correct INTEGER DEFAULT 0 CHECK (correct >= 0),
  incorrect INTEGER DEFAULT 0 CHECK (incorrect >= 0),
  current_step INTEGER,
  is_leech BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Уникальность: один пользователь не может иметь дубликаты карточек
  UNIQUE(user_id, greek, translation)
);

-- Таблица логов сессий
CREATE TABLE session_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_reviewed INTEGER DEFAULT 0 CHECK (total_reviewed >= 0),
  correct INTEGER DEFAULT 0 CHECK (correct >= 0),
  incorrect INTEGER DEFAULT 0 CHECK (incorrect >= 0),
  new_cards INTEGER DEFAULT 0 CHECK (new_cards >= 0),
  review_cards INTEGER DEFAULT 0 CHECK (review_cards >= 0),
  learning_cards INTEGER DEFAULT 0 CHECK (learning_cards >= 0),
  accuracy DECIMAL(5,2) DEFAULT 0 CHECK (accuracy >= 0 AND accuracy <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Один лог на пользователя в день
  UNIQUE(user_id, date)
);

-- Таблица настроек пользователя
CREATE TABLE user_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  daily_new INTEGER DEFAULT 10 CHECK (daily_new > 0),
  daily_reviews INTEGER DEFAULT 120 CHECK (daily_reviews > 0),
  learning_steps_min INTEGER[] DEFAULT '{1, 10}',
  r_target JSONB DEFAULT '{"again": 0.95, "hard": 0.90, "good": 0.85, "easy": 0.80}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_cards_due ON cards(due);
CREATE INDEX idx_cards_status ON cards(status);
CREATE INDEX idx_cards_user_status_due ON cards(user_id, status, due);

CREATE INDEX idx_session_logs_user_id ON session_logs(user_id);
CREATE INDEX idx_session_logs_date ON session_logs(date);
CREATE INDEX idx_session_logs_user_date ON session_logs(user_id, date);

CREATE INDEX idx_user_configs_user_id ON user_configs(user_id);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_logs_updated_at BEFORE UPDATE ON session_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_configs_updated_at BEFORE UPDATE ON user_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Включаем Row Level Security (RLS)
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_configs ENABLE ROW LEVEL SECURITY;

-- Политики для таблицы cards
CREATE POLICY "Users can view own cards" ON cards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cards" ON cards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cards" ON cards
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cards" ON cards
    FOR DELETE USING (auth.uid() = user_id);

-- Политики для таблицы session_logs
CREATE POLICY "Users can view own logs" ON session_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs" ON session_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own logs" ON session_logs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own logs" ON session_logs
    FOR DELETE USING (auth.uid() = user_id);

-- Политики для таблицы user_configs
CREATE POLICY "Users can view own config" ON user_configs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own config" ON user_configs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own config" ON user_configs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own config" ON user_configs
    FOR DELETE USING (auth.uid() = user_id);

-- Функция для создания дефолтной конфигурации пользователя
CREATE OR REPLACE FUNCTION create_default_user_config()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_configs (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического создания конфигурации при регистрации
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_default_user_config();

-- Функция для получения статистики пользователя
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS TABLE (
    total_cards BIGINT,
    new_cards BIGINT,
    learning_cards BIGINT,
    review_cards BIGINT,
    relearning_cards BIGINT,
    total_reviews BIGINT,
    total_correct BIGINT,
    total_incorrect BIGINT,
    overall_accuracy DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_cards,
        COUNT(*) FILTER (WHERE status = 'new') as new_cards,
        COUNT(*) FILTER (WHERE status = 'learning') as learning_cards,
        COUNT(*) FILTER (WHERE status = 'review') as review_cards,
        COUNT(*) FILTER (WHERE status = 'relearning') as relearning_cards,
        COALESCE(SUM(reps), 0) as total_reviews,
        COALESCE(SUM(correct), 0) as total_correct,
        COALESCE(SUM(incorrect), 0) as total_incorrect,
        CASE 
            WHEN SUM(correct + incorrect) > 0 
            THEN ROUND((SUM(correct)::DECIMAL / SUM(correct + incorrect)) * 100, 2)
            ELSE 0 
        END as overall_accuracy
    FROM cards 
    WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения карточек на повторение
CREATE OR REPLACE FUNCTION get_due_cards(user_uuid UUID, limit_count INTEGER DEFAULT 100)
RETURNS TABLE (
    id UUID,
    greek TEXT,
    translation TEXT,
    tags TEXT[],
    status TEXT,
    reps INTEGER,
    lapses INTEGER,
    difficulty DECIMAL,
    stability DECIMAL,
    last_review TIMESTAMPTZ,
    due TIMESTAMPTZ,
    correct INTEGER,
    incorrect INTEGER,
    current_step INTEGER,
    is_leech BOOLEAN
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
        c.difficulty,
        c.stability,
        c.last_review,
        c.due,
        c.correct,
        c.incorrect,
        c.current_step,
        c.is_leech
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

-- Комментарии к таблицам
COMMENT ON TABLE cards IS 'Карточки для изучения греческого языка';
COMMENT ON TABLE session_logs IS 'Логи тренировочных сессий';
COMMENT ON TABLE user_configs IS 'Настройки пользователя для алгоритма SRS';

-- Комментарии к полям
COMMENT ON COLUMN cards.greek IS 'Греческое слово или фраза';
COMMENT ON COLUMN cards.translation IS 'Перевод на русский язык';
COMMENT ON COLUMN cards.tags IS 'Теги для категоризации карточек';
COMMENT ON COLUMN cards.status IS 'Статус карточки: new, learning, review, relearning';
COMMENT ON COLUMN cards.reps IS 'Общее количество повторений';
COMMENT ON COLUMN cards.lapses IS 'Количество провалов (переходов в relearning)';
COMMENT ON COLUMN cards.difficulty IS 'Сложность карточки (1-10)';
COMMENT ON COLUMN cards.stability IS 'Стабильность карточки в днях';
COMMENT ON COLUMN cards.due IS 'Дата следующего повторения';
COMMENT ON COLUMN cards.is_leech IS 'Помечена ли карточка как проблемная (leech)';

COMMENT ON COLUMN session_logs.date IS 'Дата сессии';
COMMENT ON COLUMN session_logs.total_reviewed IS 'Общее количество повторенных карточек';
COMMENT ON COLUMN session_logs.accuracy IS 'Точность в процентах';

COMMENT ON COLUMN user_configs.daily_new IS 'Количество новых карточек в день';
COMMENT ON COLUMN user_configs.daily_reviews IS 'Максимальное количество повторений в день';
COMMENT ON COLUMN user_configs.learning_steps_min IS 'Шаги изучения в минутах';
COMMENT ON COLUMN user_configs.r_target IS 'Целевые значения retrievability для каждого рейтинга';
