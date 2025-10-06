const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Читаем .env.local файл
let supabaseUrl = '';
let supabaseKey = '';

try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1];
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.split('=')[1];
    }
  }
} catch (error) {
  console.log('❌ Не удалось прочитать .env.local файл');
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Отсутствуют переменные окружения');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseStructure() {
  console.log('🔍 Проверка структуры базы данных...\n');
  
  // Проверяем таблицы
  const tables = ['cards', 'session_logs', 'user_configs'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ Таблица ${table}: ${error.message}`);
      } else {
        console.log(`✅ Таблица ${table}: существует`);
      }
    } catch (err) {
      console.log(`❌ Таблица ${table}: ${err.message}`);
    }
  }
  
  console.log('\n🔍 Проверка политик RLS...');
  
  // Проверяем RLS политики через SQL запрос
  try {
    const { data, error } = await supabase.rpc('check_rls_policies');
    if (error) {
      console.log('ℹ️  Функция check_rls_policies не существует (это нормально)');
    }
  } catch (err) {
    console.log('ℹ️  Не удалось проверить RLS политики через RPC');
  }
  
  console.log('\n🔍 Проверка создания пользователя...');
  
  try {
    // Пытаемся создать тестового пользователя
    const { data, error } = await supabase.auth.signUp({
      email: 'test-check@easy-greek.com',
      password: 'test123456',
    });
    
    if (error) {
      if (error.message.includes('User already registered')) {
        console.log('✅ Пользователь test-check уже существует - удаляем его');
        
        // Пытаемся войти и удалить
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: 'test-check@easy-greek.com',
          password: 'test123456',
        });
        
        if (signInData?.user) {
          // Удаляем пользователя
          const { error: deleteError } = await supabase.auth.admin.deleteUser(signInData.user.id);
          if (deleteError) {
            console.log('ℹ️  Не удалось удалить тестового пользователя (это нормально)');
          } else {
            console.log('✅ Тестовый пользователь удален');
          }
        }
      } else {
        console.log('❌ Ошибка создания пользователя:', error.message);
        console.log('Код ошибки:', error.status);
      }
    } else {
      console.log('✅ Пользователь test-check создан успешно!');
      console.log('User ID:', data.user?.id);
      
      // Удаляем тестового пользователя
      if (data.user?.id) {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(data.user.id);
        if (deleteError) {
          console.log('ℹ️  Не удалось удалить тестового пользователя');
        } else {
          console.log('✅ Тестовый пользователь удален');
        }
      }
    }
  } catch (err) {
    console.log('❌ Критическая ошибка при проверке создания пользователя:', err.message);
  }
}

checkDatabaseStructure();
