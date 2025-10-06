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

async function checkUsers() {
  console.log('🔍 Проверка пользователей в базе данных...\n');
  
  // Проверяем пользователей через SQL (если возможно)
  try {
    const { data, error } = await supabase
      .from('auth.users')
      .select('id, email, email_confirmed_at, created_at')
      .in('email', ['pavel@easy-greek.com', 'aleksandra@easy-greek.com']);
    
    if (error) {
      console.log('❌ Не удалось получить пользователей через SQL:', error.message);
    } else {
      console.log('📊 Пользователи через SQL:', data);
    }
  } catch (err) {
    console.log('ℹ️  Не удалось получить пользователей через SQL (это нормально для RLS)');
  }
  
  // Проверяем через Auth API
  console.log('\n🔍 Проверка через Auth API...');
  
  try {
    // Пытаемся войти как Pavel
    const { data: pavelData, error: pavelError } = await supabase.auth.signInWithPassword({
      email: 'pavel@easy-greek.com',
      password: 'pavel123456',
    });
    
    if (pavelError) {
      console.log('❌ Pavel - ошибка входа:', pavelError.message);
      console.log('Код ошибки:', pavelError.status);
    } else {
      console.log('✅ Pavel - вход успешен!');
      console.log('User ID:', pavelData.user?.id);
      console.log('Email confirmed:', pavelData.user?.email_confirmed_at);
    }
  } catch (err) {
    console.log('❌ Pavel - критическая ошибка:', err.message);
  }
  
  try {
    // Пытаемся войти как Aleksandra
    const { data: aleksandraData, error: aleksandraError } = await supabase.auth.signInWithPassword({
      email: 'aleksandra@easy-greek.com',
      password: 'aleksandra123456',
    });
    
    if (aleksandraError) {
      console.log('❌ Aleksandra - ошибка входа:', aleksandraError.message);
      console.log('Код ошибки:', aleksandraError.status);
    } else {
      console.log('✅ Aleksandra - вход успешен!');
      console.log('User ID:', aleksandraData.user?.id);
      console.log('Email confirmed:', aleksandraData.user?.email_confirmed_at);
    }
  } catch (err) {
    console.log('❌ Aleksandra - критическая ошибка:', err.message);
  }
  
  // Проверяем текущую сессию
  console.log('\n🔍 Проверка текущей сессии...');
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.log('❌ Ошибка получения сессии:', sessionError.message);
    } else if (session) {
      console.log('✅ Активная сессия:', session.user?.email);
    } else {
      console.log('ℹ️  Нет активной сессии');
    }
  } catch (err) {
    console.log('❌ Критическая ошибка получения сессии:', err.message);
  }
}

checkUsers();
