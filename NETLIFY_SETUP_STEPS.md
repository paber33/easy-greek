# 🚀 Пошаговая настройка Netlify для исправления Supabase

## 📋 Ключи Supabase (уже получены)

```
NEXT_PUBLIC_SUPABASE_URL=https://swlsejtlrctqeemvmuwu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bHNlanRscmN0cWVlbXZtdXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MTUwNTYsImV4cCI6MjA3NTI5MTA1Nn0.7q0Q7HDWpMxz90dPGGP1Zlej8zu-D0HTgf-mmngBLuQ
```

## 🔧 Шаги настройки Netlify

### Шаг 1: Откройте панель Netlify
1. Перейдите на [https://app.netlify.com/](https://app.netlify.com/)
2. Войдите в свой аккаунт
3. Найдите проект `greek-words` в списке сайтов

### Шаг 2: Откройте настройки сайта
1. Нажмите на название сайта `greek-words`
2. В левом меню нажмите **Site settings**

### Шаг 3: Добавьте переменные окружения
1. В левом меню нажмите **Environment variables**
2. Нажмите кнопку **Add variable**

### Шаг 4: Добавьте первую переменную
1. **Key:** `NEXT_PUBLIC_SUPABASE_URL`
2. **Value:** `https://swlsejtlrctqeemvmuwu.supabase.co`
3. Нажмите **Save**

### Шаг 5: Добавьте вторую переменную
1. Нажмите **Add variable** еще раз
2. **Key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bHNlanRscmN0cWVlbXZtdXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MTUwNTYsImV4cCI6MjA3NTI5MTA1Nn0.7q0Q7HDWpMxz90dPGGP1Zlej8zu-D0HTgf-mmngBLuQ`
4. Нажмите **Save**

### Шаг 6: Пересоберите сайт
1. В левом меню нажмите **Deploys**
2. Нажмите **Trigger deploy** → **Deploy site**
3. Дождитесь завершения деплоя (обычно 2-3 минуты)

## ✅ Проверка результата

После завершения деплоя:

1. **Откройте сайт:** [https://greek-words.netlify.app/](https://greek-words.netlify.app/)
2. **Проверьте:** Ошибка "Supabase не настроен" должна исчезнуть
3. **Нажмите кнопку "🔍 Тест БД"** - должно появиться сообщение об успехе
4. **Проверьте консоль браузера** (F12) - не должно быть ошибок Supabase

## 🧪 Автоматическая проверка

После настройки можно запустить тесты:

```bash
# Проверить продакшн сайт
npx playwright test tests/production.spec.ts

# Проверить через MCP
npm run mcp:playwright:run
```

## 📊 Ожидаемый результат

После исправления:
- ✅ Сайт загружается без ошибок Supabase
- ✅ Кнопка "🔍 Тест БД" работает
- ✅ Синхронизация данных между устройствами
- ✅ Авторизация пользователей
- ✅ Сохранение прогресса в облаке

## 🆘 Если что-то пошло не так

1. **Проверьте переменные:** Убедитесь, что ключи скопированы полностью
2. **Проверьте деплой:** В разделе Deploys должна быть зеленая галочка
3. **Очистите кэш:** Попробуйте открыть сайт в режиме инкогнито
4. **Проверьте консоль:** F12 → Console на предмет ошибок

---

**Время выполнения:** ~5 минут  
**Сложность:** Простая  
**Результат:** Полностью рабочий сайт с базой данных
