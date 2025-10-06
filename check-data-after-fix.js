#!/usr/bin/env node

const { chromium } = require('@playwright/test');

async function checkDataAfterFix() {
  console.log('🔍 Проверка данных после исправления Supabase...\n');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Переходим на локальный сайт
    await page.goto('http://localhost:3002/');
    await page.waitForLoadState('networkidle');
    
    // Проверяем авторизацию
    const isAuthenticated = await page.evaluate(() => {
      return localStorage.getItem('supabase.auth.token') !== null;
    });
    
    if (!isAuthenticated) {
      console.log('❌ Пользователь не авторизован');
      console.log('📋 Нужно войти в систему для синхронизации данных');
      return false;
    }
    
    console.log('✅ Пользователь авторизован');
    
    // Получаем данные из localStorage
    const localData = await page.evaluate(() => {
      return {
        cards: JSON.parse(localStorage.getItem('easy-greek-cards') || '[]'),
        config: JSON.parse(localStorage.getItem('easy-greek-config') || '{}'),
        version: localStorage.getItem('easy-greek-version')
      };
    });
    
    console.log(`📚 Локальных карточек: ${localData.cards.length}`);
    
    // Проверяем синхронизацию с Supabase
    const syncStatus = await page.evaluate(async () => {
      try {
        // Проверяем, есть ли данные в Supabase
        const response = await fetch('/api/sync-status');
        if (response.ok) {
          const data = await response.json();
          return { success: true, data };
        }
        return { success: false, error: 'API недоступен' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    if (syncStatus.success) {
      console.log('✅ Синхронизация с Supabase работает');
      console.log(`📊 Данных в облаке: ${syncStatus.data?.cardsCount || 'неизвестно'}`);
    } else {
      console.log('⚠️  Синхронизация недоступна:', syncStatus.error);
    }
    
    // Проверяем переключатель пользователей
    const userSwitcher = page.locator('button:has-text("Pavel"), button:has-text("Aleksandra"), [data-testid="user-switcher"]');
    
    if (await userSwitcher.count() > 0) {
      console.log('🔄 Проверяем данные разных пользователей...');
      
      // Получаем данные первого пользователя
      const firstUserData = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('easy-greek-cards') || '[]');
      });
      
      console.log(`👤 Первый пользователь: ${firstUserData.length} карточек`);
      
      // Переключаемся на другого пользователя
      await userSwitcher.first().click();
      await page.waitForTimeout(2000);
      
      // Получаем данные второго пользователя
      const secondUserData = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('easy-greek-cards') || '[]');
      });
      
      console.log(`👤 Второй пользователь: ${secondUserData.length} карточек`);
      
      // Проверяем, что данные разные
      if (firstUserData.length !== secondUserData.length) {
        console.log('✅ У пользователей разные данные - это правильно');
      } else {
        console.log('⚠️  У пользователей одинаковое количество карточек');
      }
    }
    
    // Проверяем статусы карточек
    if (localData.cards.length > 0) {
      const statusCounts = localData.cards.reduce((acc, card) => {
        acc[card.status] = (acc[card.status] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\n📈 Статусы карточек:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
    }
    
    // Делаем скриншот
    await page.screenshot({ path: 'data-after-fix-check.png' });
    console.log('📸 Скриншот сохранен: data-after-fix-check.png');
    
    console.log('\n🎉 Проверка завершена!');
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка при проверке:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Запускаем проверку
checkDataAfterFix().then(success => {
  process.exit(success ? 0 : 1);
});
