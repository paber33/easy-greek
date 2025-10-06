# 🎭 Playwright E2E Testing Setup

## Обзор

В проект добавлена полная настройка для end-to-end тестирования с использованием Playwright и MCP-сервера для интеграции с Cursor.

## 📁 Структура файлов

```
├── tests/
│   ├── playwright.config.ts    # Конфигурация Playwright
│   └── example.spec.ts         # Примеры тестов
├── .cursor/
│   └── mcp.json               # MCP конфигурация для Cursor
├── mcp-playwright.js          # MCP-сервер для Playwright
├── playwright-report/         # HTML отчеты тестов
└── package.json               # Обновлен с новыми скриптами
```

## 🚀 Команды для запуска

### Основные команды тестирования:
```bash
# Запуск всех тестов
npm run test:e2e

# Запуск с UI интерфейсом
npm run test:e2e:ui

# Запуск в видимом режиме браузера
npm run test:e2e:headed

# Запуск через MCP-сервер
npm run mcp:playwright:run
```

### Дополнительные команды:
```bash
# Показать HTML отчет
npx playwright show-report

# Установить браузеры (если нужно)
npx playwright install

# Запуск конкретного теста
npx playwright test tests/example.spec.ts
```

## 🔧 MCP-сервер

MCP-сервер предоставляет следующие команды:

### runTests
```bash
node mcp-playwright.js runTests
```

### screenshot
```bash
node mcp-playwright.js screenshot --url "http://localhost:3000" --filename "screenshot.png"
```

### open
```bash
node mcp-playwright.js open --url "http://localhost:3000"
```

### getTestResults
```bash
node mcp-playwright.js getTestResults
```

## 📊 Результаты тестирования

### Последний запуск тестов:
- ✅ **3 теста прошли успешно**
- ⏱️ **Время выполнения: ~2.4 секунды**
- 🌐 **Тестируемый URL: http://localhost:3000**

### Покрытые сценарии:
1. **home page renders** - Проверка загрузки главной страницы
2. **navigation works** - Проверка навигации
3. **database connection test button works** - Проверка кнопки тестирования БД

## 📈 HTML отчеты

HTML отчеты сохраняются в папке `playwright-report/` и содержат:
- Детальную информацию о каждом тесте
- Скриншоты при ошибках
- Трассировку выполнения
- Метрики производительности

**Открыть отчет:** `npx playwright show-report`

## ⚙️ Конфигурация

### Playwright конфиг (`tests/playwright.config.ts`):
- Базовый URL: `http://localhost:3000`
- Headless режим по умолчанию
- 1 повтор при падении
- HTML репортер

### MCP конфиг (`.cursor/mcp.json`):
- Интеграция с Cursor IDE
- Настройки окружения для headless режима
- Автоматическое управление браузерами

## 🔄 Интеграция с CI/CD

Для автоматического тестирования в CI/CD добавьте:

```yaml
# GitHub Actions пример
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run tests
  run: npm run test:e2e
```

## 🐛 Отладка

### Проблемы с браузерами:
```bash
npx playwright install --with-deps
```

### Проблемы с портами:
```bash
# Проверить занятые порты
netstat -ano | findstr :3000
```

### Проблемы с MCP:
```bash
# Проверить MCP сервер
node mcp-playwright.js runTests
```

## 📝 Добавление новых тестов

1. Создайте файл в папке `tests/`
2. Используйте стандартный синтаксис Playwright:

```typescript
import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/My App/);
});
```

## 🎯 Следующие шаги

- [ ] Добавить тесты для всех страниц приложения
- [ ] Настроить тестирование в CI/CD
- [ ] Добавить тесты для мобильных устройств
- [ ] Интегрировать с системой мониторинга

---

**Статус:** ✅ Настроено и работает  
**Версия:** 1.0.0  
**Последнее обновление:** 2025-10-06
