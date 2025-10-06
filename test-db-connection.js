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
}

console.log('🔍 Проверка переменных окружения:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Найдена' : '❌ Отсутствует');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✅ Найдена' : '❌ Отсутствует');

if (supabaseUrl && supabaseKey) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('\n🔗 Тестирование подключения к Supabase...');
  
  // Тест 1: Проверка подключения
  supabase.from('cards').select('id').limit(1)
    .then(({ data, error }) => {
      if (error) {
        if (error.code === '42P01') {
          console.log('❌ Таблица cards не существует. Нужно выполнить supabase-schema.sql');
        } else {
          console.log('❌ Ошибка подключения:', error.message);
        }
      } else {
        console.log('✅ Подключение к базе данных работает!');
        console.log('📊 Данные:', data);
      }
    })
    .catch(err => {
      console.log('❌ Критическая ошибка:', err.message);
    });
} else {
  console.log('❌ Не удалось проверить подключение - отсутствуют переменные окружения');
}
