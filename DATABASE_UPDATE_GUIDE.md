# 🔄 Обновление базы данных для SM-2 алгоритма

## ❌ **Проблема**

Текущая схема базы данных Supabase использует **старые FSRS поля**, но приложение уже переведено на **SM-2 алгоритм**. Нужно обновить схему базы данных.

## 🔍 **Что нужно обновить**

### Старые поля (FSRS) → Новые поля (SM-2)
- `difficulty` (1-10) → `ease` (Ease Factor, 1.3-3.0)
- `stability` (дни) → `interval_days` (дни)
- `current_step` → `learning_step_index`

### Новые поля для дополнительного контента
- `examples` - примеры использования
- `notes` - заметки и подсказки
- `pronunciation` - транскрипция
- `audio_url` - ссылка на аудио
- `image_url` - ссылка на изображение

## 🚀 **Как обновить**

### 1. Выполните SQL скрипт

Откройте **SQL Editor** в вашем Supabase проекте и выполните содержимое файла `update-database-schema.sql`:

```sql
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
```

### 2. Проверьте обновление

После выполнения SQL проверьте, что поля добавились:

```sql
-- Проверяем структуру таблицы
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'cards' 
ORDER BY ordinal_position;
```

### 3. Обновите типы TypeScript

Типы в `types/index.ts` уже обновлены для поддержки новых полей.

## 📊 **Результат**

После обновления таблица `cards` будет содержать:

### ✅ **SM-2 поля**
- `ease` - Ease Factor (1.3-3.0)
- `interval_days` - интервал в днях
- `learning_step_index` - текущий шаг изучения

### ✅ **Дополнительный контент**
- `examples` - примеры использования
- `notes` - заметки
- `pronunciation` - произношение
- `audio_url` - аудио файл
- `image_url` - изображение

### ✅ **Legacy поля (сохранены)**
- `difficulty` - для обратной совместимости
- `stability` - для обратной совместимости
- `current_step` - для обратной совместимости

## 🔄 **Миграция данных**

SQL скрипт автоматически:
1. **Конвертирует** `difficulty` → `ease` по формуле
2. **Конвертирует** `stability` → `interval_days`
3. **Копирует** `current_step` → `learning_step_index`
4. **Сохраняет** старые поля для совместимости

## ⚠️ **Важно**

- **Сделайте бэкап** базы данных перед обновлением
- **Проверьте** работу приложения после обновления
- **Legacy поля** остаются для совместимости, но не используются в новом коде

## 🎯 **После обновления**

Приложение сможет:
- ✅ Использовать SM-2 алгоритм с Supabase
- ✅ Сохранять примеры и заметки в базе данных
- ✅ Синхронизировать все новые поля
- ✅ Работать с существующими данными (миграция)
