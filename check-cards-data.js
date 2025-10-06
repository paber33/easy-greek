const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Читаем .env.local файл
let supabaseUrl, supabaseKey;
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
  console.log('❌ Не удалось прочитать .env.local');
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Supabase не настроен');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCardsData() {
  console.log('🔍 Проверка данных карточек в базе данных...\n');

  try {
    // Получаем всех пользователей
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.log('❌ Ошибка получения пользователей:', usersError.message);
      return;
    }

    console.log(`👥 Найдено пользователей: ${users.users.length}`);
    
    for (const user of users.users) {
      console.log(`\n📊 Пользователь: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      
      // Получаем карточки пользователя
      const { data: cards, error: cardsError } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', user.id);
      
      if (cardsError) {
        console.log(`   ❌ Ошибка получения карточек: ${cardsError.message}`);
        continue;
      }
      
      console.log(`   📚 Карточек в БД: ${cards.length}`);
      
      if (cards.length > 0) {
        // Группируем по статусу
        const statusCounts = cards.reduce((acc, card) => {
          acc[card.status] = (acc[card.status] || 0) + 1;
          return acc;
        }, {});
        
        console.log(`   📈 Статусы карточек:`);
        Object.entries(statusCounts).forEach(([status, count]) => {
          console.log(`      ${status}: ${count}`);
        });
        
        // Показываем несколько примеров
        console.log(`   📝 Примеры карточек:`);
        cards.slice(0, 3).forEach((card, index) => {
          console.log(`      ${index + 1}. ${card.greek} → ${card.translation} (${card.status})`);
        });
      }
      
      // Получаем логи сессий
      const { data: logs, error: logsError } = await supabase
        .from('session_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(5);
      
      if (logsError) {
        console.log(`   ❌ Ошибка получения логов: ${logsError.message}`);
        continue;
      }
      
      console.log(`   📊 Логов сессий: ${logs.length}`);
      if (logs.length > 0) {
        console.log(`   📅 Последние сессии:`);
        logs.forEach(log => {
          console.log(`      ${log.date}: ${log.total_reviewed} карточек, точность ${log.accuracy}%`);
        });
      }
    }
    
    // Общая статистика
    console.log('\n📊 Общая статистика:');
    const { data: allCards, error: allCardsError } = await supabase
      .from('cards')
      .select('user_id, status');
    
    if (!allCardsError && allCards) {
      const totalCards = allCards.length;
      const userCardCounts = allCards.reduce((acc, card) => {
        acc[card.user_id] = (acc[card.user_id] || 0) + 1;
        return acc;
      }, {});
      
      console.log(`   📚 Всего карточек в БД: ${totalCards}`);
      console.log(`   👥 Карточек по пользователям:`);
      Object.entries(userCardCounts).forEach(([userId, count]) => {
        const user = users.users.find(u => u.id === userId);
        console.log(`      ${user?.email || userId}: ${count}`);
      });
    }
    
  } catch (error) {
    console.log('❌ Ошибка:', error.message);
  }
}

checkCardsData();
