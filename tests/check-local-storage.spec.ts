import { test, expect } from '@playwright/test';

test.describe('Local Storage Check', () => {
  test('check local storage data', async ({ page }) => {
    await page.goto('http://localhost:3002/');
    await page.waitForLoadState('networkidle');
    
    // Получаем данные из localStorage
    const localStorageData = await page.evaluate(() => {
      const data: any = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          try {
            data[key] = JSON.parse(localStorage.getItem(key) || '');
          } catch {
            data[key] = localStorage.getItem(key);
          }
        }
      }
      return data;
    });
    
    console.log('📦 LocalStorage данные:');
    Object.entries(localStorageData).forEach(([key, value]) => {
      console.log(`   ${key}:`, typeof value === 'object' ? JSON.stringify(value, null, 2) : value);
    });
    
    // Проверяем наличие карточек
    const cards = localStorageData['easy-greek-cards'] || [];
    console.log(`\n📚 Карточек в localStorage: ${Array.isArray(cards) ? cards.length : 'не массив'}`);
    
    if (Array.isArray(cards) && cards.length > 0) {
      console.log('📝 Примеры карточек:');
      cards.slice(0, 5).forEach((card: any, index: number) => {
        console.log(`   ${index + 1}. ${card.greek} → ${card.translation} (${card.status})`);
      });
      
      // Группируем по статусу
      const statusCounts = cards.reduce((acc: any, card: any) => {
        acc[card.status] = (acc[card.status] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\n📈 Статусы карточек:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
    }
    
    // Проверяем настройки
    const config = localStorageData['easy-greek-config'];
    if (config) {
      console.log('\n⚙️  Настройки:');
      console.log(`   Новых карточек в день: ${config.dailyNew}`);
      console.log(`   Повторений в день: ${config.dailyReviews}`);
    }
    
    // Проверяем сессию
    const session = localStorageData['supabase.auth.token'];
    if (session) {
      console.log('\n🔐 Сессия найдена');
    } else {
      console.log('\n❌ Сессия не найдена');
    }
    
    // Делаем скриншот
    await page.screenshot({ path: 'local-storage-check.png' });
  });
  
  test('check if users have same data', async ({ page }) => {
    await page.goto('http://localhost:3002/');
    await page.waitForLoadState('networkidle');
    
    // Проверяем, есть ли переключатель пользователей
    const userSwitcher = page.locator('[data-testid="user-switcher"], .user-switcher, button:has-text("Pavel"), button:has-text("Aleksandra")');
    
    if (await userSwitcher.count() > 0) {
      console.log('🔄 Найден переключатель пользователей');
      
      // Получаем данные первого пользователя
      const firstUserData = await page.evaluate(() => {
        return {
          cards: JSON.parse(localStorage.getItem('easy-greek-cards') || '[]'),
          config: JSON.parse(localStorage.getItem('easy-greek-config') || '{}')
        };
      });
      
      console.log(`📊 Первый пользователь: ${firstUserData.cards.length} карточек`);
      
      // Переключаемся на другого пользователя (если возможно)
      await userSwitcher.first().click();
      await page.waitForTimeout(2000);
      
      // Получаем данные второго пользователя
      const secondUserData = await page.evaluate(() => {
        return {
          cards: JSON.parse(localStorage.getItem('easy-greek-cards') || '[]'),
          config: JSON.parse(localStorage.getItem('easy-greek-config') || '{}')
        };
      });
      
      console.log(`📊 Второй пользователь: ${secondUserData.cards.length} карточек`);
      
      // Сравниваем данные
      if (firstUserData.cards.length === secondUserData.cards.length) {
        console.log('⚠️  ПРОБЛЕМА: У пользователей одинаковое количество карточек!');
        
        // Проверяем, одинаковые ли карточки
        const sameCards = firstUserData.cards.every((card: any, index: number) => {
          const secondCard = secondUserData.cards[index];
          return secondCard && card.greek === secondCard.greek && card.translation === secondCard.translation;
        });
        
        if (sameCards) {
          console.log('❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: У пользователей одинаковые карточки!');
        }
      } else {
        console.log('✅ У пользователей разное количество карточек - это нормально');
      }
    } else {
      console.log('❌ Переключатель пользователей не найден');
    }
  });
});
