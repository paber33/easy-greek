#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

/**
 * Исправляет поврежденные логи в localStorage
 */
function fixCorruptedLogs() {
  console.log("🔧 Проверка и исправление поврежденных логов...");

  const profiles = ["pavel", "aleksandra"];
  let totalFixed = 0;

  profiles.forEach(profileId => {
    try {
      const key = `easy-greek:${profileId}:logs`;
      const logsData = localStorage.getItem(key);

      if (!logsData) {
        console.log(`✅ Профиль ${profileId}: логи не найдены`);
        return;
      }

      const logs = JSON.parse(logsData);
      const originalLength = logs.length;

      // Фильтруем поврежденные логи
      const validLogs = logs.filter(log => {
        const isValid =
          log.totalReviewed >= 0 &&
          log.totalReviewed <= 1000 &&
          log.correct >= 0 &&
          log.correct <= log.totalReviewed &&
          log.incorrect >= 0 &&
          log.incorrect <= log.totalReviewed &&
          log.newCards >= 0 &&
          log.newCards <= 100 &&
          log.reviewCards >= 0 &&
          log.reviewCards <= 1000 &&
          log.learningCards >= 0 &&
          log.learningCards <= 100 &&
          log.accuracy >= 0 &&
          log.accuracy <= 100 &&
          log.date &&
          log.date.length > 0;

        if (!isValid) {
          console.log(`❌ Удален поврежденный лог для ${profileId}:`, {
            date: log.date,
            totalReviewed: log.totalReviewed,
            correct: log.correct,
            incorrect: log.incorrect,
          });
        }

        return isValid;
      });

      const fixedCount = originalLength - validLogs.length;
      totalFixed += fixedCount;

      if (fixedCount > 0) {
        // Сохраняем исправленные логи
        localStorage.setItem(key, JSON.stringify(validLogs));
        console.log(`✅ Профиль ${profileId}: исправлено ${fixedCount} логов`);
      } else {
        console.log(`✅ Профиль ${profileId}: логи в порядке`);
      }
    } catch (error) {
      console.error(`❌ Ошибка при обработке профиля ${profileId}:`, error.message);
    }
  });

  console.log(`🎉 Всего исправлено: ${totalFixed} поврежденных логов`);

  if (totalFixed > 0) {
    console.log("💡 Перезагрузите страницу, чтобы увидеть исправления");
  }
}

/**
 * Показывает статистику логов
 */
function showLogsStats() {
  console.log("📊 Статистика логов:");

  const profiles = ["pavel", "aleksandra"];

  profiles.forEach(profileId => {
    try {
      const key = `easy-greek:${profileId}:logs`;
      const logsData = localStorage.getItem(key);

      if (!logsData) {
        console.log(`📋 Профиль ${profileId}: логи не найдены`);
        return;
      }

      const logs = JSON.parse(logsData);
      const totalReviewed = logs.reduce((sum, log) => sum + log.totalReviewed, 0);
      const maxReviewed = Math.max(...logs.map(log => log.totalReviewed));
      const corruptedCount = logs.filter(log => log.totalReviewed > 1000).length;

      console.log(`📋 Профиль ${profileId}:`);
      console.log(`   Всего логов: ${logs.length}`);
      console.log(`   Всего повторений: ${totalReviewed}`);
      console.log(`   Максимум за день: ${maxReviewed}`);
      console.log(`   Поврежденных логов: ${corruptedCount}`);
    } catch (error) {
      console.error(`❌ Ошибка при анализе профиля ${profileId}:`, error.message);
    }
  });
}

// Обработка аргументов командной строки
const args = process.argv.slice(2);
const command = args[0];

// Проверяем, что мы в браузере
if (typeof window === "undefined") {
  console.log("❌ Этот скрипт должен выполняться в браузере");
  console.log("💡 Откройте консоль браузера и выполните:");
  console.log("   fixCorruptedLogs() - исправить поврежденные логи");
  console.log("   showLogsStats() - показать статистику");
  process.exit(1);
}

// Экспортируем функции в глобальную область видимости
window.fixCorruptedLogs = fixCorruptedLogs;
window.showLogsStats = showLogsStats;

async function main() {
  switch (command) {
    case "fix":
      fixCorruptedLogs();
      break;
    case "stats":
      showLogsStats();
      break;
    default:
      console.log("🔧 Утилита для исправления поврежденных логов");
      console.log("");
      console.log("Использование в браузере:");
      console.log("  fixCorruptedLogs() - исправить поврежденные логи");
      console.log("  showLogsStats() - показать статистику");
      console.log("");
      console.log("Или добавьте в package.json:");
      console.log('  "fix:logs": "node scripts/fix-corrupted-logs.js fix"');
      console.log('  "logs:stats": "node scripts/fix-corrupted-logs.js stats"');
      break;
  }
}

if (typeof window !== "undefined") {
  main().catch(error => {
    console.error("❌ Ошибка:", error.message);
  });
}
