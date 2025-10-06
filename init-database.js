const fs = require("fs");

// Читаем слова Александры (76 слов)
const aleksandraWords = JSON.parse(fs.readFileSync("aleksandra-words-76.json", "utf8"));

console.log("Found", aleksandraWords.length, "words in aleksandra-words-76.json");

// Создаем скрипт для инициализации базы данных
let initScript = `
-- Скрипт для инициализации базы данных с 76 словами
-- Выполните этот скрипт в Supabase SQL Editor

-- Создаем таблицу для хранения начальных слов (если не существует)
CREATE TABLE IF NOT EXISTS initial_words (
  id SERIAL PRIMARY KEY,
  greek TEXT NOT NULL,
  translation TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  examples TEXT[] DEFAULT '{}',
  pronunciation TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Очищаем таблицу перед вставкой новых данных
TRUNCATE TABLE initial_words;

-- Вставляем 76 слов
`;

// Генерируем SQL для вставки всех слов
aleksandraWords.forEach((word, index) => {
  const greek = word.greek.replace(/'/g, "''"); // Экранируем одинарные кавычки
  const translation = word.translation.replace(/'/g, "''");
  const pronunciation = (word.pronunciation || "").replace(/'/g, "''");
  const notes = (word.notes || "").replace(/'/g, "''");

  const tags = JSON.stringify(word.tags || []);
  const examples = JSON.stringify(word.examples || []);

  initScript += `INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('${greek}', '${translation}', '${tags}', '${examples}', '${pronunciation}', '${notes}');\n`;
});

initScript += `
-- Создаем функцию для инициализации слов пользователя
CREATE OR REPLACE FUNCTION init_user_words(user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Вставляем все начальные слова для пользователя
  INSERT INTO cards (user_id, greek, translation, tags, status, reps, lapses, ease, interval_days, due, correct, incorrect, examples, pronunciation, notes)
  SELECT 
    user_id,
    iw.greek,
    iw.translation,
    iw.tags,
    'new'::card_status,
    0,
    0,
    2.5,
    0,
    NOW(),
    0,
    0,
    iw.examples,
    iw.pronunciation,
    iw.notes
  FROM initial_words iw
  WHERE NOT EXISTS (
    SELECT 1 FROM cards c 
    WHERE c.user_id = init_user_words.user_id 
    AND c.greek = iw.greek 
    AND c.translation = iw.translation
  );
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автоматической инициализации слов при создании пользователя
CREATE OR REPLACE FUNCTION trigger_init_user_words()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM init_user_words(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер (если не существует)
DROP TRIGGER IF EXISTS init_words_on_user_create ON auth.users;
CREATE TRIGGER init_words_on_user_create
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_init_user_words();

-- Инициализируем слова для существующих пользователей
-- Замените 'USER_ID_1' и 'USER_ID_2' на реальные ID пользователей Pavel и Aleksandra
-- SELECT init_user_words('USER_ID_1'::UUID);
-- SELECT init_user_words('USER_ID_2'::UUID);

COMMIT;
`;

// Сохраняем скрипт
fs.writeFileSync("init-database.sql", initScript);
console.log("Generated init-database.sql script");

// Также создаем JSON файл для ручной загрузки
const wordsForUpload = aleksandraWords.map(word => ({
  greek: word.greek,
  translation: word.translation,
  tags: word.tags || [],
  status: "new",
  reps: 0,
  lapses: 0,
  ease: 2.5,
  interval: 0,
  due: new Date().toISOString(),
  correct: 0,
  incorrect: 0,
  examples: word.examples || [],
  pronunciation: word.pronunciation || "",
  notes: word.notes || "",
}));

fs.writeFileSync("words-for-upload.json", JSON.stringify(wordsForUpload, null, 2));
console.log("Generated words-for-upload.json for manual upload");
