# 👥 Создание пользователей вручную в Supabase

## Проблема
Ошибка "Database error saving new user" возникает при попытке автоматического создания пользователей. Временно отключим автоматическое создание и создадим пользователей вручную.

## Решение

### 1. Создайте пользователей через Supabase Dashboard:

1. **Зайдите в Supabase Dashboard:**
   - Откройте https://supabase.com/dashboard
   - Выберите ваш проект

2. **Перейдите в Authentication:**
   - В левом меню нажмите **Authentication**
   - Выберите **Users**

3. **Создайте пользователя Pavel:**
   - Нажмите **Add user**
   - **Email:** `pavel@easy-greek.com`
   - **Password:** `pavel123456`
   - **Auto Confirm User:** ✅ (включено)
   - Нажмите **Create user**

4. **Создайте пользователя Aleksandra:**
   - Нажмите **Add user**
   - **Email:** `aleksandra@easy-greek.com`
   - **Password:** `aleksandra123456`
   - **Auto Confirm User:** ✅ (включено)
   - Нажмите **Create user**

### 2. Альтернативно - через SQL:

Выполните этот SQL в **SQL Editor**:

```sql
-- Создаем пользователя Pavel
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
) VALUES (
    gen_random_uuid(),
    'pavel@easy-greek.com',
    crypt('pavel123456', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    false,
    'authenticated'
);

-- Создаем пользователя Aleksandra
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
) VALUES (
    gen_random_uuid(),
    'aleksandra@easy-greek.com',
    crypt('aleksandra123456', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    false,
    'authenticated'
);
```

### 3. Создайте конфигурации пользователей:

После создания пользователей, создайте их конфигурации:

```sql
-- Получаем ID пользователей
SELECT id, email FROM auth.users WHERE email IN ('pavel@easy-greek.com', 'aleksandra@easy-greek.com');

-- Создаем конфигурации (замените USER_ID на реальные ID)
INSERT INTO user_configs (user_id) 
SELECT id FROM auth.users WHERE email = 'pavel@easy-greek.com';

INSERT INTO user_configs (user_id) 
SELECT id FROM auth.users WHERE email = 'aleksandra@easy-greek.com';
```

### 4. Проверьте результат:

1. **Обновите страницу приложения**
2. **Попробуйте войти как Pavel:**
   - Нажмите кнопку **👨‍💻 Pavel**
   - Должен произойти успешный вход
3. **Попробуйте войти как Aleksandra:**
   - Нажмите кнопку **👩‍💻 Aleksandra**
   - Должен произойти успешный вход

### 5. Если все работает:

После успешного создания пользователей можно:
- Добавлять греческие слова
- Начинать тренировки
- Переключаться между пользователями

## Проверка

После создания пользователей:
- ✅ Кнопки входа должны работать без ошибок
- ✅ Переключение между пользователями должно работать
- ✅ Каждый пользователь должен иметь свои данные
- ✅ Синхронизация с облаком должна работать

---

**Готово!** Теперь у вас есть два пользователя, и приложение должно работать корректно.
