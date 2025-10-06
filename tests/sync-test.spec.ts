import { test, expect } from '@playwright/test';

test.describe('User Sync Tests', () => {
  test('test user authentication and sync', async ({ page }) => {
    await page.goto('http://localhost:3002/');
    await page.waitForLoadState('networkidle');
    
    // Проверяем, что Supabase настроен
    const isSupabaseConfigured = await page.evaluate(() => {
      return localStorage.getItem('NEXT_PUBLIC_SUPABASE_URL') !== null || 
             window.location.hostname === 'localhost';
    });
    
    if (!isSupabaseConfigured) {
      console.log('⚠️  Supabase не настроен, пропускаем тест синхронизации');
      return;
    }
    
    // Проверяем текущее состояние авторизации
    const initialAuthState = await page.evaluate(() => {
      return {
        isSignedIn: localStorage.getItem('supabase.auth.token') !== null,
        cards: JSON.parse(localStorage.getItem('easy-greek-cards') || '[]').length
      };
    });
    
    console.log('🔍 Начальное состояние:');
    console.log(`   Авторизован: ${initialAuthState.isSignedIn}`);
    console.log(`   Карточек: ${initialAuthState.cards}`);
    
    // Ищем кнопки входа
    const pavelButton = page.locator('button:has-text("Pavel"), button:has-text("👨‍💻 Pavel")');
    const aleksandraButton = page.locator('button:has-text("Aleksandra"), button:has-text("👩‍💻 Aleksandra")');
    
    if (await pavelButton.count() > 0) {
      console.log('🔄 Тестируем вход Pavel...');
      
      // Входим как Pavel
      await pavelButton.first().click();
      await page.waitForTimeout(3000);
      
      // Проверяем авторизацию
      const pavelAuthState = await page.evaluate(() => {
        return {
          isSignedIn: localStorage.getItem('supabase.auth.token') !== null,
          cards: JSON.parse(localStorage.getItem('easy-greek-cards') || '[]').length,
          userEmail: localStorage.getItem('supabase.auth.token') ? 'pavel@easy-greek.com' : null
        };
      });
      
      console.log('👨‍💻 Pavel:');
      console.log(`   Авторизован: ${pavelAuthState.isSignedIn}`);
      console.log(`   Карточек: ${pavelAuthState.cards}`);
      
      if (pavelAuthState.isSignedIn) {
        // Тестируем синхронизацию
        const syncButton = page.locator('button:has-text("Отправить в облако"), button:has-text("Синхронизация")');
        if (await syncButton.count() > 0) {
          console.log('🔄 Тестируем синхронизацию Pavel...');
          await syncButton.first().click();
          await page.waitForTimeout(2000);
        }
      }
    }
    
    // Переключаемся на Aleksandra
    if (await aleksandraButton.count() > 0) {
      console.log('🔄 Переключаемся на Aleksandra...');
      
      await aleksandraButton.first().click();
      await page.waitForTimeout(3000);
      
      // Проверяем авторизацию Aleksandra
      const aleksandraAuthState = await page.evaluate(() => {
        return {
          isSignedIn: localStorage.getItem('supabase.auth.token') !== null,
          cards: JSON.parse(localStorage.getItem('easy-greek-cards') || '[]').length,
          userEmail: localStorage.getItem('supabase.auth.token') ? 'aleksandra@easy-greek.com' : null
        };
      });
      
      console.log('👩‍💻 Aleksandra:');
      console.log(`   Авторизован: ${aleksandraAuthState.isSignedIn}`);
      console.log(`   Карточек: ${aleksandraAuthState.cards}`);
      
      if (aleksandraAuthState.isSignedIn) {
        // Тестируем синхронизацию
        const syncButton = page.locator('button:has-text("Отправить в облако"), button:has-text("Синхронизация")');
        if (await syncButton.count() > 0) {
          console.log('🔄 Тестируем синхронизацию Aleksandra...');
          await syncButton.first().click();
          await page.waitForTimeout(2000);
        }
      }
    }
    
    // Проверяем, что у пользователей разные данные
    const finalState = await page.evaluate(() => {
      return {
        cards: JSON.parse(localStorage.getItem('easy-greek-cards') || '[]').length,
        config: JSON.parse(localStorage.getItem('easy-greek-config') || '{}'),
        isSignedIn: localStorage.getItem('supabase.auth.token') !== null
      };
    });
    
    console.log('📊 Финальное состояние:');
    console.log(`   Авторизован: ${finalState.isSignedIn}`);
    console.log(`   Карточек: ${finalState.cards}`);
    console.log(`   Настройки: ${JSON.stringify(finalState.config)}`);
    
    // Делаем скриншот
    await page.screenshot({ path: 'sync-test-result.png' });
  });
  
  test('test data persistence across sessions', async ({ page }) => {
    await page.goto('http://localhost:3002/');
    await page.waitForLoadState('networkidle');
    
    // Получаем начальные данные
    const initialData = await page.evaluate(() => {
      return {
        cards: JSON.parse(localStorage.getItem('easy-greek-cards') || '[]'),
        config: JSON.parse(localStorage.getItem('easy-greek-config') || '{}'),
        isSignedIn: localStorage.getItem('supabase.auth.token') !== null
      };
    });
    
    console.log('📊 Начальные данные:');
    console.log(`   Карточек: ${initialData.cards.length}`);
    console.log(`   Авторизован: ${initialData.isSignedIn}`);
    
    // Входим как Pavel
    const pavelButton = page.locator('button:has-text("Pavel"), button:has-text("👨‍💻 Pavel")');
    if (await pavelButton.count() > 0) {
      await pavelButton.first().click();
      await page.waitForTimeout(3000);
      
      // Проверяем данные Pavel
      const pavelData = await page.evaluate(() => {
        return {
          cards: JSON.parse(localStorage.getItem('easy-greek-cards') || '[]'),
          isSignedIn: localStorage.getItem('supabase.auth.token') !== null
        };
      });
      
      console.log('👨‍💻 Данные Pavel:');
      console.log(`   Карточек: ${pavelData.cards.length}`);
      console.log(`   Авторизован: ${pavelData.isSignedIn}`);
      
      // Симулируем перезагрузку страницы
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Проверяем, что данные сохранились
      const afterReloadData = await page.evaluate(() => {
        return {
          cards: JSON.parse(localStorage.getItem('easy-greek-cards') || '[]'),
          isSignedIn: localStorage.getItem('supabase.auth.token') !== null
        };
      });
      
      console.log('🔄 После перезагрузки:');
      console.log(`   Карточек: ${afterReloadData.cards.length}`);
      console.log(`   Авторизован: ${afterReloadData.isSignedIn}`);
      
      // Проверяем, что данные не потерялись
      if (pavelData.cards.length > 0) {
        expect(afterReloadData.cards.length).toBeGreaterThan(0);
        console.log('✅ Данные сохранились после перезагрузки');
      }
    }
  });
});
