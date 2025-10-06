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

async function checkUserCards() {
  console.log('🔍 Проверка карточек пользователей...\n');

  try {
    // Проверяем текущую сессию
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Ошибка получения сессии:', sessionError.message);
      return;
    }
    
    if (!session) {
      console.log('❌ Нет активной сессии');
      return;
    }
    
    console.log(`👤 Текущий пользователь: ${session.user.email}`);
    console.log(`   ID: ${session.user.id}`);
    
    // Получаем карточки текущего пользователя
    const { data: cards, error: cardsError } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', session.user.id);
    
    if (cardsError) {
      console.log(`❌ Ошибка получения карточек: ${cardsError.message}`);
      return;
    }
    
    console.log(`\n📚 Карточек в БД: ${cards.length}`);
    
    if (cards.length > 0) {
      // Группируем по статусу
      const statusCounts = cards.reduce((acc, card) => {
        acc[card.status] = (acc[card.status] || 0) + 1;
        return acc;
      }, {});
      
      console.log(`📈 Статусы карточек:`);
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
      
      // Показываем примеры
      console.log(`\n📝 Примеры карточек:`);
      cards.slice(0, 5).forEach((card, index) => {
        console.log(`   ${index + 1}. ${card.greek} → ${card.translation} (${card.status})`);
        console.log(`      Повторений: ${card.reps}, Правильно: ${card.correct}, Неправильно: ${card.incorrect}`);
      });
      
      // Проверяем дубликаты
      const duplicates = cards.filter((card, index) => 
        cards.findIndex(c => c.greek === card.greek && c.translation === card.translation) !== index
      );
      
      if (duplicates.length > 0) {
        console.log(`\n⚠️  Найдено дубликатов: ${duplicates.length}`);
        duplicates.slice(0, 3).forEach((card, index) => {
          console.log(`   ${index + 1}. ${card.greek} → ${card.translation}`);
        });
      }
    }
    
    // Получаем логи сессий
    const { data: logs, error: logsError } = await supabase
      .from('session_logs')
      .select('*')
      .eq('user_id', session.user.id)
      .order('date', { ascending: false })
      .limit(10);
    
    if (logsError) {
      console.log(`❌ Ошибка получения логов: ${logsError.message}`);
      return;
    }
    
    console.log(`\n📊 Логов сессий: ${logs.length}`);
    if (logs.length > 0) {
      console.log(`📅 Последние сессии:`);
      logs.forEach(log => {
        console.log(`   ${log.date}: ${log.total_reviewed} карточек, точность ${log.accuracy}%`);
      });
    }
    
    // Проверяем настройки пользователя
    const { data: config, error: configError } = await supabase
      .from('user_configs')
      .select('*')
      .eq('user_id', session.user.id)
      .single();
    
    if (configError) {
      console.log(`❌ Ошибка получения настроек: ${configError.message}`);
    } else if (config) {
      console.log(`\n⚙️  Настройки пользователя:`);
      console.log(`   Новых карточек в день: ${config.daily_new}`);
      console.log(`   Повторений в день: ${config.daily_reviews}`);
    }
    
  } catch (error) {
    console.log('❌ Ошибка:', error.message);
  }
}

checkUserCards();
