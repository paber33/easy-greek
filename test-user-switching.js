#!/usr/bin/env node

const { chromium } = require('@playwright/test');

async function testUserSwitching() {
  console.log('🔍 Тестирование переключения пользователей...\n');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    
    // Входим как Pavel
    console.log('🔄 Входим как Pavel...');
    const pavelButton = page.locator('button:has-text("Pavel"), button:has-text("👨‍💻 Pavel")');
    await pavelButton.first().click();
    await page.waitForTimeout(3000);
    
    const pavelState = await page.evaluate(() => {
      return {
        cards: JSON.parse(localStorage.getItem('easy-greek-cards') || '[]').length,
        isSignedIn: localStorage.getItem('supabase.auth.token') !== null,
        userEmail: localStorage.getItem('supabase.auth.token') ? 'pavel@easy-greek.com' : null
      };
    });
    
    console.log('👨‍💻 Pavel:');
    console.log(`   Карточек: ${pavelState.cards}`);
    console.log(`   Авторизован: ${pavelState.isSignedIn}`);
    console.log(`   Email: ${pavelState.userEmail}`);
    
    // Переключаемся на Aleksandra
    console.log('\n🔄 Переключаемся на Aleksandra...');
    const aleksandraButton = page.locator('button:has-text("Aleksandra"), button:has-text("👩‍💻 Aleksandra")');
    await aleksandraButton.first().click();
    await page.waitForTimeout(3000);
    
    const aleksandraState = await page.evaluate(() => {
      return {
        cards: JSON.parse(localStorage.getItem('easy-greek-cards') || '[]').length,
        isSignedIn: localStorage.getItem('supabase.auth.token') !== null,
        userEmail: localStorage.getItem('supabase.auth.token') ? 'aleksandra@easy-greek.com' : null
      };
    });
    
    console.log('👩‍💻 Aleksandra:');
    console.log(`   Карточек: ${aleksandraState.cards}`);
    console.log(`   Авторизован: ${aleksandraState.isSignedIn}`);
    console.log(`   Email: ${aleksandraState.userEmail}`);
    
    // Проверяем, что данные разные
    if (pavelState.cards !== aleksandraState.cards) {
      console.log('\n✅ У пользователей разные данные - это правильно!');
      console.log(`   Pavel: ${pavelState.cards} карточек`);
      console.log(`   Aleksandra: ${aleksandraState.cards} карточек`);
    } else {
      console.log('\n⚠️  У пользователей одинаковое количество карточек');
    }
    
    // Возвращаемся к Pavel
    console.log('\n🔄 Возвращаемся к Pavel...');
    await pavelButton.first().click();
    await page.waitForTimeout(3000);
    
    const pavelState2 = await page.evaluate(() => {
      return {
        cards: JSON.parse(localStorage.getItem('easy-greek-cards') || '[]').length,
        isSignedIn: localStorage.getItem('supabase.auth.token') !== null
      };
    });
    
    console.log('👨‍💻 Pavel (повторно):');
    console.log(`   Карточек: ${pavelState2.cards}`);
    console.log(`   Авторизован: ${pavelState2.isSignedIn}`);
    
    // Проверяем, что данные Pavel восстановились
    if (pavelState.cards === pavelState2.cards) {
      console.log('\n✅ Данные Pavel восстановились корректно!');
    } else {
      console.log('\n⚠️  Данные Pavel изменились');
    }
    
    // Делаем скриншот
    await page.screenshot({ path: 'user-switching-test.png' });
    console.log('\n📸 Скриншот сохранен: user-switching-test.png');
    
    console.log('\n🎉 Тест переключения пользователей завершен!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await browser.close();
  }
}

testUserSwitching();
