#!/usr/bin/env node

const { chromium } = require('@playwright/test');

async function checkProductionSite() {
  console.log('🔍 Проверка продакшн сайта после настройки Supabase...\n');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Переходим на сайт
    console.log('📡 Загружаем сайт...');
    await page.goto('https://greek-words.netlify.app/');
    await page.waitForLoadState('networkidle');
    
    // Проверяем заголовок
    const title = await page.title();
    console.log(`📝 Заголовок: ${title}`);
    
    // Проверяем контент на наличие ошибки Supabase
    const bodyText = await page.textContent('body');
    const hasSupabaseError = bodyText.includes('Supabase не настроен') || 
                           bodyText.includes('Для использования синхронизации данных настройте переменные окружения');
    
    if (hasSupabaseError) {
      console.log('❌ ОШИБКА: Supabase все еще не настроен!');
      console.log('📋 Нужно добавить переменные окружения в Netlify:');
      console.log('   NEXT_PUBLIC_SUPABASE_URL=https://swlsejtlrctqeemvmuwu.supabase.co');
      console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
      return false;
    } else {
      console.log('✅ УСПЕХ: Supabase настроен корректно!');
    }
    
    // Проверяем кнопку тестирования БД
    const testButton = page.locator('button:has-text("Тест БД"), button:has-text("🔍")');
    if (await testButton.count() > 0) {
      console.log('🔍 Найдена кнопка тестирования БД');
      
      // Кликаем на кнопку
      await testButton.first().click();
      await page.waitForTimeout(2000);
      
      // Проверяем результат
      const successMessage = page.locator('text=Подключение к базе данных работает');
      if (await successMessage.count() > 0) {
        console.log('✅ Тест БД: Подключение работает!');
      } else {
        console.log('⚠️  Тест БД: Результат неясен');
      }
    }
    
    // Проверяем консоль на ошибки
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(3000);
    
    if (consoleErrors.length > 0) {
      console.log('⚠️  Ошибки в консоли:');
      consoleErrors.forEach(error => console.log(`   ${error}`));
    } else {
      console.log('✅ Ошибок в консоли нет');
    }
    
    // Делаем скриншот
    await page.screenshot({ path: 'production-after-fix.png' });
    console.log('📸 Скриншот сохранен: production-after-fix.png');
    
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
checkProductionSite().then(success => {
  process.exit(success ? 0 : 1);
});
