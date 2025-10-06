#!/usr/bin/env node

/**
 * Скрипт для тестирования синхронизации с Supabase
 * Проверяет, что слова загружаются из Supabase
 */

const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://swlsejtlrctqeemvmuwu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bHNlanRscmN0cWVlbXZtdXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MTUwNTYsImV4cCI6MjA3NTI5MTA1Nn0.7q0Q7HDWpMxz90dPGGP1Zlej8zu-D0HTgf-mmngBLuQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseSync() {
  try {
    console.log('🔍 Тестируем подключение к Supabase...');
    
    // Проверяем подключение
    const { data, error } = await supabase
      .from('cards')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Ошибка подключения к Supabase:', error);
      return;
    }
    
    console.log('✅ Подключение к Supabase успешно');
    
    // Получаем все карточки
    console.log('📚 Загружаем все карточки из таблицы cards...');
    const { data: cards, error: cardsError } = await supabase
      .from('cards')
      .select('*')
      .limit(100);
    
    if (cardsError) {
      console.error('❌ Ошибка загрузки карточек:', cardsError);
      return;
    }
    
    console.log(`📊 Найдено карточек в Supabase: ${cards.length}`);
    
    if (cards.length === 0) {
      console.log('⚠️ В Supabase нет карточек');
      console.log('💡 Это означает, что:');
      console.log('   1. Пользователи еще не авторизованы');
      console.log('   2. Слова еще не загружены через приложение');
      console.log('   3. Нужно сначала загрузить слова через JSON');
      return;
    }
    
    // Группируем по пользователям
    const users = {};
    cards.forEach(card => {
      const userId = card.user_id;
      if (!users[userId]) {
        users[userId] = [];
      }
      users[userId].push(card);
    });
    
    console.log('\n👥 Статистика по пользователям:');
    Object.entries(users).forEach(([userId, userCards]) => {
      console.log(`  Пользователь ${userId}: ${userCards.length} карточек`);
      
      // Показываем примеры слов
      const sampleWords = userCards.slice(0, 3).map(card => 
        `${card.greek} - ${card.translation}`
      );
      console.log(`    Примеры: ${sampleWords.join(', ')}`);
    });
    
    // Проверяем структуру данных
    console.log('\n🔍 Проверяем структуру данных...');
    const sampleCard = cards[0];
    console.log('Пример карточки:');
    console.log(`  ID: ${sampleCard.id}`);
    console.log(`  User ID: ${sampleCard.user_id}`);
    console.log(`  Greek: ${sampleCard.greek}`);
    console.log(`  Translation: ${sampleCard.translation}`);
    console.log(`  Status: ${sampleCard.status}`);
    console.log(`  Tags: ${JSON.stringify(sampleCard.tags)}`);
    console.log(`  Examples: ${sampleCard.examples ? 'Есть' : 'Нет'}`);
    console.log(`  Pronunciation: ${sampleCard.pronunciation || 'Нет'}`);
    console.log(`  Notes: ${sampleCard.notes || 'Нет'}`);
    
    console.log('\n✅ Тест завершен успешно!');
    console.log('💡 Если слова не загружаются в приложении:');
    console.log('   1. Убедитесь, что пользователь авторизован');
    console.log('   2. Проверьте консоль браузера на ошибки');
    console.log('   3. Попробуйте перезагрузить страницу');
    console.log('   4. Проверьте переменные окружения в Netlify');
    
  } catch (error) {
    console.error('❌ Неожиданная ошибка:', error);
  }
}

// Запускаем тест
testSupabaseSync();
