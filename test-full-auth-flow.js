#!/usr/bin/env node

const { chromium } = require('@playwright/test');

async function testFullAuthFlow() {
  console.log('🔍 Тестирование полного потока аутентификации...\n');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3001/');
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
    console.log(`   Supabase ключи: ${initialState.allKeys.join(', ') || 'нет'}`);
    
    // Входим как Pavel
    console.log('\n🔄 Входим как Pavel...');
    const pavelButton = page.locator('button:has-text("Pavel"), button:has-text("👨‍💻 Pavel")');
    await pavelButton.first().click();
    await page.waitForTimeout(5000);
    
    const pavelState = await page.evaluate(() => {
      return {
        cards: JSON.parse(localStorage.getItem('easy-greek-cards') || '[]').length,
        isSignedIn: localStorage.getItem('supabase.auth.token') !== null,
        allKeys: Object.keys(localStorage).filter(key => key.includes('supabase') || key.includes('auth')),
        userEmail: 'pavel@easy-greek.com'
      };
    });
    
    console.log('👨‍💻 Pavel:');
    console.log(`   Карточек: ${pavelState.cards}`);
    console.log(`   Авторизован: ${pavelState.isSignedIn}`);
    console.log(`   Supabase ключи: ${pavelState.allKeys.join(', ')}`);
    console.log(`   Email: ${pavelState.userEmail}`);
    
    // Проверяем сообщения консоли
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });
    
    await page.waitForTimeout(2000);
    
    const syncMessages = consoleMessages.filter(msg => 
      msg.text.includes('sync') || 
      msg.text.includes('Supabase') || 
      msg.text.includes('Loaded') ||
      msg.text.includes('Synced')
    );
    
    if (syncMessages.length > 0) {
      console.log('\n📝 Сообщения синхронизации:');
      syncMessages.forEach(msg => {
        if (msg.type === 'error') {
          console.log(`   ❌ ${msg.text}`);
        } else if (msg.type === 'warn') {
          console.log(`   ⚠️  ${msg.text}`);
        } else {
          console.log(`   ✅ ${msg.text}`);
        }
      });
    }
    
    // Проверяем уведомления
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
    
    // Проверяем, есть ли ошибки
    const errors = consoleMessages.filter(msg => msg.type === 'error');
    if (errors.length === 0) {
      console.log('\n✅ Ошибок не найдено!');
    } else {
      console.log('\n❌ Найдены ошибки:');
      errors.forEach(error => {
        console.log(`   ${error.text}`);
      });
    }
    
    // Делаем скриншот
    await page.screenshot({ path: 'full-auth-flow-test.png' });
    console.log('\n📸 Скриншот сохранен: full-auth-flow-test.png');
    
    console.log('\n🎉 Тест полного потока аутентификации завершен!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await browser.close();
  }
}

testFullAuthFlow();
