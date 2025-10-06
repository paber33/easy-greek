#!/usr/bin/env node

const { chromium } = require('@playwright/test');

async function testPavelLogin() {
  console.log('🔍 Тестирование входа Pavel...\n');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    
    // Проверяем начальное состояние
    const initialState = await page.evaluate(() => {
      return {
        cards: JSON.parse(localStorage.getItem('easy-greek-cards') || '[]').length,
        isSignedIn: localStorage.getItem('supabase.auth.token') !== null,
        allKeys: Object.keys(localStorage).filter(key => key.includes('supabase') || key.includes('auth'))
      };
    });
    
    console.log('📊 Начальное состояние:');
    console.log(`   Карточек: ${initialState.cards}`);
    console.log(`   Авторизован: ${initialState.isSignedIn}`);
    console.log(`   Supabase ключи: ${initialState.allKeys.join(', ')}`);
    
    // Ищем кнопку Pavel
    const pavelButton = page.locator('button:has-text("Pavel"), button:has-text("👨‍💻 Pavel")');
    
    if (await pavelButton.count() > 0) {
      console.log('\n🔄 Кликаем на кнопку Pavel...');
      
      // Добавляем обработчик консоли для отслеживания ошибок
      const consoleMessages = [];
      page.on('console', msg => {
        consoleMessages.push({
          type: msg.type(),
          text: msg.text()
        });
      });
      
      // Кликаем на кнопку
      await pavelButton.first().click();
      
      // Ждем и проверяем состояние
      await page.waitForTimeout(5000);
      
      const afterClickState = await page.evaluate(() => {
        return {
          cards: JSON.parse(localStorage.getItem('easy-greek-cards') || '[]').length,
          isSignedIn: localStorage.getItem('supabase.auth.token') !== null,
          allKeys: Object.keys(localStorage).filter(key => key.includes('supabase') || key.includes('auth')),
          bodyText: document.body.textContent?.substring(0, 500)
        };
      });
      
      console.log('\n👨‍💻 После клика:');
      console.log(`   Карточек: ${afterClickState.cards}`);
      console.log(`   Авторизован: ${afterClickState.isSignedIn}`);
      console.log(`   Supabase ключи: ${afterClickState.allKeys.join(', ')}`);
      console.log(`   Текст страницы: ${afterClickState.bodyText}`);
      
      // Проверяем сообщения консоли
      if (consoleMessages.length > 0) {
        console.log('\n📝 Сообщения консоли:');
        consoleMessages.forEach(msg => {
          if (msg.type === 'error') {
            console.log(`   ❌ ${msg.text}`);
          } else if (msg.type === 'warn') {
            console.log(`   ⚠️  ${msg.text}`);
          } else {
            console.log(`   ℹ️  ${msg.text}`);
          }
        });
      }
      
      // Проверяем, есть ли уведомления на странице
      const notifications = await page.evaluate(() => {
        const toasts = document.querySelectorAll('[data-sonner-toast], .toast, [role="alert"]');
        return Array.from(toasts).map(toast => toast.textContent?.trim()).filter(Boolean);
      });
      
      if (notifications.length > 0) {
        console.log('\n🔔 Уведомления:');
        notifications.forEach(notification => {
          console.log(`   ${notification}`);
        });
      }
      
    } else {
      console.log('❌ Кнопка Pavel не найдена');
    }
    
    // Делаем скриншот
    await page.screenshot({ path: 'pavel-login-test.png' });
    console.log('\n📸 Скриншот сохранен: pavel-login-test.png');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await browser.close();
  }
}

testPavelLogin();
