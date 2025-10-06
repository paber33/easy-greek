#!/usr/bin/env node

const { chromium } = require('@playwright/test');

async function checkButtonsAfterLogin() {
  console.log('🔍 Проверка кнопок после входа...\n');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    
    // Входим как Pavel
    console.log('🔄 Входим как Pavel...');
    const pavelButton = page.locator('button:has-text("Pavel"), button:has-text("👨‍💻 Pavel")');
    await pavelButton.first().click();
    await page.waitForTimeout(5000);
    
    // Получаем все кнопки на странице
    const allButtons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(btn => ({
        text: btn.textContent?.trim(),
        className: btn.className,
        id: btn.id,
        disabled: btn.disabled
      }));
    });
    
    console.log('🔘 Все кнопки на странице после входа:');
    allButtons.forEach((btn, index) => {
      console.log(`   ${index + 1}. "${btn.text}" (disabled: ${btn.disabled})`);
    });
    
    // Проверяем, есть ли переключатель пользователей
    const userSwitcherButtons = allButtons.filter(btn => 
      btn.text?.includes('Pavel') || 
      btn.text?.includes('Aleksandra') ||
      btn.text?.includes('👨‍💻') ||
      btn.text?.includes('👩‍💻')
    );
    
    console.log('\n👥 Кнопки переключения пользователей:');
    userSwitcherButtons.forEach((btn, index) => {
      console.log(`   ${index + 1}. "${btn.text}" (disabled: ${btn.disabled})`);
    });
    
    // Проверяем состояние авторизации
    const authState = await page.evaluate(() => {
      return {
        isSignedIn: localStorage.getItem('supabase.auth.token') !== null,
        cards: JSON.parse(localStorage.getItem('easy-greek-cards') || '[]').length,
        currentUser: localStorage.getItem('supabase.auth.token') ? 'авторизован' : 'не авторизован'
      };
    });
    
    console.log('\n📊 Состояние авторизации:');
    console.log(`   Авторизован: ${authState.isSignedIn}`);
    console.log(`   Карточек: ${authState.cards}`);
    console.log(`   Статус: ${authState.currentUser}`);
    
    // Делаем скриншот
    await page.screenshot({ path: 'buttons-after-login.png' });
    console.log('\n📸 Скриншот сохранен: buttons-after-login.png');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await browser.close();
  }
}

checkButtonsAfterLogin();
