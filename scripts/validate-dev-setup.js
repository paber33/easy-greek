#!/usr/bin/env node

const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");

const execAsync = promisify(exec);

/**
 * Проверяет, что все необходимые файлы существуют
 */
function validateFiles() {
  const requiredFiles = [
    "package.json",
    "next.config.ts",
    "app/layout.tsx",
    "app/page.tsx",
    "scripts/dev-server.js",
    "scripts/cleanup-ports.js",
  ];

  const missingFiles = [];

  requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      missingFiles.push(file);
    }
  });

  if (missingFiles.length > 0) {
    console.error("❌ Отсутствуют необходимые файлы:");
    missingFiles.forEach(file => console.error(`   - ${file}`));
    return false;
  }

  console.log("✅ Все необходимые файлы присутствуют");
  return true;
}

/**
 * Проверяет, что package.json содержит нужные скрипты
 */
function validateScripts() {
  try {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const scripts = packageJson.scripts || {};

    const requiredScripts = ["dev", "dev:simple", "cleanup:ports", "ports:info"];
    const missingScripts = [];

    requiredScripts.forEach(script => {
      if (!scripts[script]) {
        missingScripts.push(script);
      }
    });

    if (missingScripts.length > 0) {
      console.error("❌ Отсутствуют необходимые скрипты в package.json:");
      missingScripts.forEach(script => console.error(`   - ${script}`));
      return false;
    }

    console.log("✅ Все необходимые скрипты присутствуют");
    return true;
  } catch (error) {
    console.error("❌ Ошибка чтения package.json:", error.message);
    return false;
  }
}

/**
 * Проверяет доступность Node.js и npm
 */
async function validateEnvironment() {
  try {
    const { stdout: nodeVersion } = await execAsync("node --version");
    const { stdout: npmVersion } = await execAsync("npm --version");

    console.log(`✅ Node.js: ${nodeVersion.trim()}`);
    console.log(`✅ npm: ${npmVersion.trim()}`);

    return true;
  } catch (error) {
    console.error("❌ Ошибка проверки окружения:", error.message);
    return false;
  }
}

/**
 * Проверяет, что зависимости установлены
 */
function validateDependencies() {
  if (!fs.existsSync("node_modules")) {
    console.error("❌ node_modules не найден. Запустите: npm install");
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const requiredDeps = ["next", "react", "react-dom"];

  for (const dep of requiredDeps) {
    if (!fs.existsSync(`node_modules/${dep}`)) {
      console.error(`❌ Зависимость ${dep} не установлена. Запустите: npm install`);
      return false;
    }
  }

  console.log("✅ Все зависимости установлены");
  return true;
}

/**
 * Проверяет доступность портов
 */
async function validatePorts() {
  try {
    const { stdout } = await execAsync("netstat -ano | findstr :3000");

    if (stdout.trim()) {
      console.log("⚠️  Порт 3000 занят, но это нормально - dev сервер автоматически его освободит");
    } else {
      console.log("✅ Порт 3000 свободен");
    }

    return true;
  } catch (error) {
    console.log("✅ Порт 3000 свободен");
    return true;
  }
}

/**
 * Основная функция валидации
 */
async function main() {
  console.log("🔍 Проверка настройки dev сервера...\n");

  const checks = [
    { name: "Файлы проекта", fn: validateFiles },
    { name: "Скрипты package.json", fn: validateScripts },
    { name: "Окружение Node.js", fn: validateEnvironment },
    { name: "Зависимости", fn: validateDependencies },
    { name: "Порты", fn: validatePorts },
  ];

  let allPassed = true;

  for (const check of checks) {
    console.log(`\n📋 ${check.name}:`);
    try {
      const result = await check.fn();
      if (!result) {
        allPassed = false;
      }
    } catch (error) {
      console.error(`❌ Ошибка проверки: ${error.message}`);
      allPassed = false;
    }
  }

  console.log("\n" + "=".repeat(50));

  if (allPassed) {
    console.log("🎉 Все проверки пройдены! Dev сервер готов к работе.");
    console.log("\n💡 Для запуска используйте: npm run dev");
  } else {
    console.log("❌ Обнаружены проблемы. Исправьте их перед запуском dev сервера.");
    console.log("\n💡 Для получения помощи см. DEV_SERVER_GUIDE.md");
    process.exit(1);
  }
}

main().catch(error => {
  console.error("❌ Критическая ошибка валидации:", error.message);
  process.exit(1);
});
