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

async function testCreateUser() {
  console.log('🔍 Тестирование создания пользователя...\n');
  
  const testEmail = 'test@example.com';
  const testPassword = 'test123456';
  
  console.log(`Создаем тестового пользователя: ${testEmail}`);
  
  try {
    // Пытаемся создать пользователя
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (error) {
      console.log('❌ Ошибка создания пользователя:', error.message);
      console.log('Код ошибки:', error.status);
      console.log('Детали:', error);
    } else {
      console.log('✅ Пользователь создан успешно!');
      console.log('User ID:', data.user?.id);
      console.log('Email confirmed:', data.user?.email_confirmed_at);
      
      // Пытаемся войти с созданным пользователем
      console.log('\n🔍 Тестирование входа...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });
      
      if (signInError) {
        console.log('❌ Ошибка входа:', signInError.message);
      } else {
        console.log('✅ Вход успешен!');
        console.log('User ID:', signInData.user?.id);
      }
    }
  } catch (err) {
    console.log('❌ Критическая ошибка:', err.message);
  }
}

testCreateUser();
