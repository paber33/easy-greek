#!/usr/bin/env node

const { chromium } = require('@playwright/test');

async function debugAuth() {
  console.log('🔍 Детальная диагностика авторизации...\n');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3002/');
    await page.waitForLoadState('networkidle');
    
    // Получаем весь HTML для анализа
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        bodyText: document.body.textContent,
        allButtons: Array.from(document.querySelectorAll('button')).map(btn => ({
          text: btn.textContent?.trim(),
          className: btn.className,
          id: btn.id
        })),
        allInputs: Array.from(document.querySelectorAll('input')).map(input => ({
          type: input.type,
          placeholder: input.placeholder,
          className: input.className
        }))
      };
    });
    
    console.log('📄 Содержимое страницы:');
    console.log(`   Заголовок: ${pageContent.title}`);
    console.log(`   Текст страницы: ${pageContent.bodyText.substring(0, 200)}...`);
    
    console.log('\n🔘 Все кнопки на странице:');
    pageContent.allButtons.forEach((btn, index) => {
      console.log(`   ${index + 1}. "${btn.text}" (${btn.className})`);
    });
    
    console.log('\n📝 Все поля ввода:');
    pageContent.allInputs.forEach((input, index) => {
      console.log(`   ${index + 1}. ${input.type} - "${input.placeholder}"`);
    });
    
    // Проверяем localStorage
    const localStorageData = await page.evaluate(() => {
      const data = {};
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
    
    console.log('\n💾 LocalStorage:');
    Object.entries(localStorageData).forEach(([key, value]) => {
      if (typeof value === 'object') {
        console.log(`   ${key}: ${JSON.stringify(value).substring(0, 100)}...`);
      } else {
        console.log(`   ${key}: ${value}`);
      }
    });
    
    // Проверяем, есть ли ошибки в консоли
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });
    
    await page.waitForTimeout(3000);
    
    if (consoleMessages.length > 0) {
      console.log('\n📝 Сообщения консоли:');
      consoleMessages.forEach(msg => {
        console.log(`   ${msg.type}: ${msg.text}`);
      });
    }
    
    // Делаем скриншот
    await page.screenshot({ path: 'debug-auth.png' });
    console.log('\n📸 Скриншот сохранен: debug-auth.png');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await browser.close();
  }
}

debugAuth();
