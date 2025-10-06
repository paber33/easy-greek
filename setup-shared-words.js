#!/usr/bin/env node

/**
 * Скрипт для настройки одинаковых слов у Павла и Александры
 * Загружает 76 слов в Supabase для обоих пользователей
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Конфигурация Supabase
const supabaseUrl = 'https://swlsejtlrctqeemvmuwu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bHNlanRscmN0cWVlbXZtdXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MTUwNTYsImV4cCI6MjA3NTI5MTA1Nn0.7q0Q7HDWpMxz90dPGGP1Zlej8zu-D0HTgf-mmngBLuQ';

const supabase = createClient(supabaseUrl, supabaseKey);

// ID пользователей (нужно будет получить из Supabase)
const USER_EMAILS = {
  pavel: 'pavel@example.com',
  aleksandra: 'aleksandra@example.com'
};

async function setupSharedWords() {
  try {
    console.log('🚀 Настройка одинаковых слов для Павла и Александры\n');

    // 1. Загружаем слова из JSON файла
    console.log('1️⃣ Загружаем слова из greek-words-76.json...');
    const wordsPath = path.join(__dirname, 'greek-words-76.json');
    
    if (!fs.existsSync(wordsPath)) {
      console.error('❌ Файл greek-words-76.json не найден!');
      return;
    }

    const wordsData = JSON.parse(fs.readFileSync(wordsPath, 'utf8'));
    console.log(`✅ Загружено ${wordsData.length} слов из файла\n`);

    // 2. Получаем пользователей из Supabase
    console.log('2️⃣ Получаем пользователей из Supabase...');
    
    // Сначала попробуем получить всех пользователей
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.log('⚠️ Не удалось получить пользователей через admin API');
      console.log('💡 Попробуем другой подход...\n');
      
      // Альтернативный подход - создадим тестовых пользователей
      await createTestUsers(wordsData);
      return;
    }

    console.log(`✅ Найдено ${users.users.length} пользователей в системе`);
    
    // Ищем Павла и Александру
    const pavelUser = users.users.find(u => u.email === USER_EMAILS.pavel);
    const aleksandraUser = users.users.find(u => u.email === USER_EMAILS.aleksandra);

    if (!pavelUser || !aleksandraUser) {
      console.log('⚠️ Пользователи Pavel или Aleksandra не найдены');
      console.log('💡 Создаем тестовых пользователей...\n');
      await createTestUsers(wordsData);
      return;
    }

    console.log(`✅ Pavel: ${pavelUser.email} (ID: ${pavelUser.id})`);
    console.log(`✅ Aleksandra: ${aleksandraUser.email} (ID: ${aleksandraUser.id})\n`);

    // 3. Загружаем слова для обоих пользователей
    console.log('3️⃣ Загружаем слова в Supabase...');
    
    await loadWordsForUser(pavelUser.id, wordsData, 'Pavel');
    await loadWordsForUser(aleksandraUser.id, wordsData, 'Aleksandra');

    console.log('\n🎉 Настройка завершена успешно!');
    console.log('📋 Результат:');
    console.log(`   - Pavel: ${wordsData.length} слов`);
    console.log(`   - Aleksandra: ${wordsData.length} слов`);
    console.log('   - Все слова одинаковые для начала');
    console.log('   - Дальше прогресс будет индивидуальным');

  } catch (error) {
    console.error('❌ Ошибка при настройке:', error);
  }
}

async function createTestUsers(wordsData) {
  console.log('🔧 Создаем тестовых пользователей...');
  
  try {
    // Создаем пользователя Pavel
    const { data: pavelData, error: pavelError } = await supabase.auth.signUp({
      email: USER_EMAILS.pavel,
      password: 'test123456',
      options: {
        data: {
          name: 'Pavel',
          profile_type: 'pavel'
        }
      }
    });

    if (pavelError) {
      console.log('⚠️ Pavel уже существует или ошибка:', pavelError.message);
    } else {
      console.log('✅ Pavel создан:', pavelData.user?.email);
    }

    // Создаем пользователя Aleksandra
    const { data: aleksandraData, error: aleksandraError } = await supabase.auth.signUp({
      email: USER_EMAILS.aleksandra,
      password: 'test123456',
      options: {
        data: {
          name: 'Aleksandra',
          profile_type: 'aleksandra'
        }
      }
    });

    if (aleksandraError) {
      console.log('⚠️ Aleksandra уже существует или ошибка:', aleksandraError.message);
    } else {
      console.log('✅ Aleksandra создана:', aleksandraData.user?.email);
    }

    // Ждем немного для создания пользователей
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Получаем созданных пользователей
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Не удалось получить пользователей:', listError);
      return;
    }

    const pavelUser = users.find(u => u.email === USER_EMAILS.pavel);
    const aleksandraUser = users.find(u => u.email === USER_EMAILS.aleksandra);

    if (pavelUser && aleksandraUser) {
      console.log('\n📚 Загружаем слова для созданных пользователей...');
      await loadWordsForUser(pavelUser.id, wordsData, 'Pavel');
      await loadWordsForUser(aleksandraUser.id, wordsData, 'Aleksandra');
    }

  } catch (error) {
    console.error('❌ Ошибка при создании пользователей:', error);
  }
}

async function loadWordsForUser(userId, wordsData, userName) {
  try {
    console.log(`📝 Загружаем слова для ${userName}...`);

    // Преобразуем слова в формат Supabase
    const cardsToInsert = wordsData.map((word, index) => ({
      user_id: userId,
      greek: word.greek,
      translation: word.translation,
      tags: word.tags || [],
      status: word.status || 'new',
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval_days: 0,
      last_review: null,
      due: new Date().toISOString(),
      correct: 0,
      incorrect: 0,
      learning_step_index: null,
      is_leech: false,
      examples: word.examples ? JSON.stringify(word.examples) : null,
      notes: word.notes || null,
      pronunciation: word.pronunciation || null,
      audio_url: word.audioUrl || null,
      image_url: word.imageUrl || null,
      difficulty: null,
      stability: null,
      current_step: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Вставляем карточки
    const { error: insertError } = await supabase
      .from('cards')
      .upsert(cardsToInsert, { 
        onConflict: 'user_id,greek,translation',
        ignoreDuplicates: false 
      });

    if (insertError) {
      console.error(`❌ Ошибка при загрузке слов для ${userName}:`, insertError);
      return;
    }

    console.log(`✅ ${userName}: загружено ${cardsToInsert.length} слов`);

  } catch (error) {
    console.error(`❌ Ошибка при загрузке слов для ${userName}:`, error);
  }
}

// Запускаем настройку
setupSharedWords();
