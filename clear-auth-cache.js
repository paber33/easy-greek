#!/usr/bin/env node

const { chromium } = require('@playwright/test');

async function clearAuthCache() {
  console.log('🧹 Очистка кэша аутентификации...\n');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3001/');
    await page.waitForLoadState('networkidle');
    
    // Очищаем все данные аутентификации
    await page.evaluate(() => {
      // Очищаем localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('auth') || key.includes('easy-greek'))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`Удален ключ: ${key}`);
      });
      
      // Очищаем sessionStorage
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('auth'))) {
          sessionKeysToRemove.push(key);
        }
      }
      
      sessionKeysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
        console.log(`Удален session ключ: ${key}`);
      });
      
      return {
        removedLocalKeys: keysToRemove,
        removedSessionKeys: sessionKeysToRemove
      };
    });
    
    console.log('✅ Кэш аутентификации очищен');
    
    // Проверяем состояние после очистки
    const cleanState = await page.evaluate(() => {
      return {
        localStorageKeys: Object.keys(localStorage).filter(key => 
          key.includes('supabase') || key.includes('auth') || key.includes('easy-greek')
        ),
        sessionStorageKeys: Object.keys(sessionStorage).filter(key => 
          key.includes('supabase') || key.includes('auth')
        ),
        cards: JSON.parse(localStorage.getItem('easy-greek-cards') || '[]').length
      };
    });
    
    console.log('\n📊 Состояние после очистки:');
    console.log(`   LocalStorage ключи: ${cleanState.localStorageKeys.join(', ') || 'нет'}`);
    console.log(`   SessionStorage ключи: ${cleanState.sessionStorageKeys.join(', ') || 'нет'}`);
    console.log(`   Карточек: ${cleanState.cards}`);
    
    // Перезагружаем страницу
    console.log('\n🔄 Перезагружаем страницу...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Проверяем, что ошибки исчезли
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    if (consoleErrors.length === 0) {
      console.log('✅ Ошибки аутентификации устранены');
    } else {
      console.log('⚠️  Найдены ошибки:');
      consoleErrors.forEach(error => {
        console.log(`   ❌ ${error}`);
      });
    }
    
    // Делаем скриншот
    await page.screenshot({ path: 'auth-cache-cleared.png' });
    console.log('\n📸 Скриншот сохранен: auth-cache-cleared.png');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await browser.close();
  }
}

clearAuthCache();
