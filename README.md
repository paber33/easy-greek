# Easy Greek - Греческий язык для изучения 🇬🇷

Приложение для изучения греческого языка с использованием системы интервальных повторений (SRS).

## 🚀 Быстрый старт

### Установка и запуск

```bash
# Клонируйте репозиторий
git clone <repository-url>
cd easy-greek

# Установите зависимости
npm install

# Запустите в режиме разработки
npm run dev
```

Приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000)

### Доступные команды

```bash
# Разработка
npm run dev          # Запуск в режиме разработки
npm run build        # Сборка для продакшена
npm run start        # Запуск продакшен версии

# Качество кода
npm run lint         # Проверка ESLint
npm run typecheck    # Проверка TypeScript
npm run format       # Форматирование кода Prettier
npm run format:check # Проверка форматирования

# Тестирование
npm test             # Запуск unit тестов
npm run test:watch   # Тесты в режиме наблюдения
npm run test:coverage # Тесты с покрытием
npm run test:e2e     # E2E тесты с Playwright

# Утилиты
npm run seed         # Инициализация демо-данных
```

## 📁 Структура проекта

```
easy-greek/
├── app/                    # Next.js App Router
│   ├── (routes)/          # Страницы приложения
│   ├── providers/         # React провайдеры
│   └── globals.css        # Глобальные стили
├── components/            # React компоненты
│   ├── ui/               # Переиспользуемые UI компоненты (shadcn/ui)
│   ├── pages/            # Компоненты конкретных страниц
│   └── ...               # Другие компоненты
├── lib/                  # Библиотеки и утилиты
│   ├── core/             # Чистые функции (SRS, storage, CSV)
│   ├── hooks/            # Кастомные React хуки
│   ├── __tests__/        # Unit тесты
│   └── ...               # Другие утилиты
├── types/                # TypeScript типы
├── tests/                # E2E тесты (Playwright)
└── public/               # Статические файлы
```

## 🎯 Основные функции

### Система интервальных повторений (SRS)
- **SM-2 алгоритм** (как в Anki)
- Автоматическое планирование повторений
- Адаптивные интервалы на основе успешности
- Обнаружение "трудных" карточек (leeches)

### Управление профилями
- Поддержка нескольких пользователей (Pavel / Aleksandra)
- Изолированные данные для каждого профиля
- Синхронизация с Supabase

### Импорт/экспорт данных
- Загрузка слов из JSON файлов
- Экспорт в CSV формат
- Импорт из CSV

### Статистика и аналитика
- Календарь прогресса
- Детальная статистика по сессиям
- Отслеживание серий (streaks)

## 🔧 Настройка

### Переменные окружения

Создайте файл `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Конфигурация SRS

Настройки системы интервальных повторений можно изменить в `lib/constants.ts`:

```typescript
export const DAILY_NEW = 10;           // Новых карточек в день
export const DAILY_REVIEWS = 120;      // Повторений в день
export const LEARNING_STEPS_MIN = [1, 10]; // Шаги изучения (минуты)
```

## 🧪 Тестирование

### Unit тесты
```bash
npm test
```

### E2E тесты
```bash
npm run test:e2e
```

### Покрытие кода
```bash
npm run test:coverage
```

## 📊 Мониторинг и аналитика

### Логирование
- Все действия пользователя логируются
- Статистика по сессиям сохраняется
- Данные синхронизируются с облаком

### Производительность
- Мемоизация тяжелых вычислений
- Lazy loading компонентов
- Оптимизированные re-renders

## 🚀 Развертывание

### Netlify
```bash
npm run build
# Загрузите папку 'out' на Netlify
```

### Vercel
```bash
npm run build
# Подключите репозиторий к Vercel
```

## 🤝 Разработка

### Стиль кода
- **Prettier** для форматирования
- **ESLint** для проверки качества
- **TypeScript** для типизации
- **Arrow functions** для компонентов и утилит

### Коммиты
Используйте conventional commits:
```
feat: добавить новую функцию
fix: исправить баг
docs: обновить документацию
style: изменить форматирование
refactor: рефакторинг кода
test: добавить тесты
```

### Pull Requests
1. Создайте feature branch
2. Внесите изменения
3. Запустите тесты: `npm test`
4. Проверьте типы: `npm run typecheck`
5. Создайте Pull Request

## 📚 Документация

- [Настройка Supabase](SUPABASE_SETUP.md)
- [Руководство по развертыванию](NETLIFY_DEPLOYMENT.md)
- [Тестирование](PLAYWRIGHT_SETUP.md)
- [Анализ проблем](DATA_ISSUES_ANALYSIS.md)

## 🐛 Известные проблемы

- См. [Анализ проблем](DATA_ISSUES_ANALYSIS.md) для подробностей
- Все критические проблемы исправлены в последней версии

## 📄 Лицензия

MIT License - см. файл [LICENSE](LICENSE) для подробностей.

## 🙏 Благодарности

- [Anki](https://apps.ankiweb.net/) за алгоритм SM-2
- [shadcn/ui](https://ui.shadcn.com/) за компоненты UI
- [Next.js](https://nextjs.org/) за фреймворк
- [Supabase](https://supabase.com/) за backend