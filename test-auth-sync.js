#!/usr/bin/env node

const { chromium } = require('@playwright/test');

async function testAuthSync() {
  console.log('🔍 Тестирование авторизации и синхронизации...\n');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Переходим на локальный сайт
    await page.goto('http://localhost:3001/');
    await page.waitForLoadState('networkidle');
    
    // Проверяем конфигурацию Supabase через проверку ошибок
    const supabaseConfig = await page.evaluate(() => {
      // Проверяем, есть ли ошибка "Supabase не настроен" на странице
      const bodyText = document.body.textContent || '';
      const isConfigured = !bodyText.includes('Supabase не настроен');
      
      return {
        isConfigured,
        hasError: bodyText.includes('Supabase не настроен')
      };
    });
    
    console.log('🔧 Конфигурация Supabase:');
    console.log(`   Настроен: ${supabaseConfig.isConfigured}`);
    console.log(`   Есть ошибка: ${supabaseConfig.hasError}`);
    
    if (!supabaseConfig.isConfigured) {
      console.log('❌ Supabase не настроен локально!');
      console.log('📋 Нужно настроить переменные окружения в .env.local');
      return false;
    }
    
    // Проверяем начальное состояние
    const initialState = await page.evaluate(() => {
      return {
        cards: JSON.parse(localStorage.getItem('easy-greek-cards') || '[]'),
        isSignedIn: localStorage.getItem('supabase.auth.token') !== null,
        authToken: localStorage.getItem('supabase.auth.token') ? 'есть' : 'нет'
      };
    });
    
    console.log('\n📊 Начальное состояние:');
    console.log(`   Карточек: ${initialState.cards.length}`);
    console.log(`   Авторизован: ${initialState.isSignedIn}`);
    console.log(`   Токен: ${initialState.authToken}`);
    
    // Ищем кнопки входа
    const pavelButton = page.locator('button:has-text("Pavel"), button:has-text("👨‍💻 Pavel")');
    const aleksandraButton = page.locator('button:has-text("Aleksandra"), button:has-text("👩‍💻 Aleksandra")');
    
    console.log(`\n🔍 Кнопки найдены:`);
    console.log(`   Pavel: ${await pavelButton.count()}`);
    console.log(`   Aleksandra: ${await aleksandraButton.count()}`);
    
    if (await pavelButton.count() > 0) {
      console.log('\n🔄 Тестируем вход Pavel...');
      
      // Входим как Pavel
      await pavelButton.first().click();
      await page.waitForTimeout(5000); // Увеличиваем время ожидания
      
      // Проверяем состояние после входа
      const pavelState = await page.evaluate(() => {
        return {
          cards: JSON.parse(localStorage.getItem('easy-greek-cards') || '[]'),
          isSignedIn: localStorage.getItem('supabase.auth.token') !== null,
          authToken: localStorage.getItem('supabase.auth.token') ? 'есть' : 'нет',
          allLocalStorage: Object.keys(localStorage).filter(key => key.includes('supabase') || key.includes('auth'))
        };
      });
      
      console.log('👨‍💻 Состояние Pavel:');
      console.log(`   Карточек: ${pavelState.cards.length}`);
      console.log(`   Авторизован: ${pavelState.isSignedIn}`);
      console.log(`   Токен: ${pavelState.authToken}`);
      console.log(`   Supabase ключи: ${pavelState.allLocalStorage.join(', ')}`);
      
      if (pavelState.isSignedIn) {
        console.log('✅ Pavel успешно авторизован!');
        
        // Проверяем синхронизацию
        const syncButtons = page.locator('button:has-text("Отправить в облако"), button:has-text("Синхронизация"), button:has-text("Загрузить из облака")');
        console.log(`🔄 Кнопки синхронизации: ${await syncButtons.count()}`);
        
        if (await syncButtons.count() > 0) {
          console.log('🔄 Тестируем синхронизацию...');
          await syncButtons.first().click();
          await page.waitForTimeout(3000);
        }
      } else {
        console.log('❌ Pavel не авторизован');
        
        // Проверяем ошибки в консоли
        const consoleErrors = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
          }
        });
        
        await page.waitForTimeout(2000);
        
        if (consoleErrors.length > 0) {
          console.log('🚨 Ошибки в консоли:');
          consoleErrors.forEach(error => console.log(`   ${error}`));
        }
      }
    }
    
    // Переключаемся на Aleksandra
    if (await aleksandraButton.count() > 0) {
      console.log('\n🔄 Переключаемся на Aleksandra...');
      
      await aleksandraButton.first().click();
      await page.waitForTimeout(5000);
      
      const aleksandraState = await page.evaluate(() => {
        return {
          cards: JSON.parse(localStorage.getItem('easy-greek-cards') || '[]'),
          isSignedIn: localStorage.getItem('supabase.auth.token') !== null,
          authToken: localStorage.getItem('supabase.auth.token') ? 'есть' : 'нет'
        };
      });
      
      console.log('👩‍💻 Состояние Aleksandra:');
      console.log(`   Карточек: ${aleksandraState.cards.length}`);
      console.log(`   Авторизован: ${aleksandraState.isSignedIn}`);
      console.log(`   Токен: ${aleksandraState.authToken}`);
      
      if (aleksandraState.isSignedIn) {
        console.log('✅ Aleksandra успешно авторизована!');
      } else {
        console.log('❌ Aleksandra не авторизована');
      }
    }
    
    // Делаем скриншот
    await page.screenshot({ path: 'auth-sync-test.png' });
    console.log('\n📸 Скриншот сохранен: auth-sync-test.png');
    
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Запускаем тест
testAuthSync().then(success => {
  process.exit(success ? 0 : 1);
});
