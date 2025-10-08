#!/usr/bin/env node

const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

/**
 * Очищает все процессы на указанных портах
 */
async function cleanupPorts(ports = [3000, 3001, 3002]) {
  console.log("🧹 Очистка портов...");

  for (const port of ports) {
    try {
      console.log(`🔍 Проверка порта ${port}...`);

      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);

      if (!stdout.trim()) {
        console.log(`✅ Порт ${port} свободен`);
        continue;
      }

      const lines = stdout.trim().split("\n");
      const pids = new Set();

      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5 && parts[1].includes(`:${port}`)) {
          const pid = parts[parts.length - 1];
          if (pid && !isNaN(pid)) {
            pids.add(pid);
          }
        }
      });

      if (pids.size === 0) {
        console.log(`✅ Порт ${port} свободен`);
        continue;
      }

      console.log(`⚠️  Найдены процессы на порту ${port}: ${Array.from(pids).join(", ")}`);

      for (const pid of pids) {
        try {
          await execAsync(`taskkill /PID ${pid} /F`);
          console.log(`✅ Процесс ${pid} завершен`);
        } catch (error) {
          console.log(`⚠️  Не удалось завершить процесс ${pid}: ${error.message}`);
        }
      }
    } catch (error) {
      console.log(`✅ Порт ${port} свободен`);
    }
  }

  console.log("🎉 Очистка завершена");
}

/**
 * Показывает информацию о занятых портах
 */
async function showPortInfo(ports = [3000, 3001, 3002]) {
  console.log("📊 Информация о портах:");

  for (const port of ports) {
    try {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);

      if (!stdout.trim()) {
        console.log(`✅ Порт ${port}: свободен`);
        continue;
      }

      const lines = stdout.trim().split("\n");
      const pids = new Set();

      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5 && parts[1].includes(`:${port}`)) {
          const pid = parts[parts.length - 1];
          if (pid && !isNaN(pid)) {
            pids.add(pid);
          }
        }
      });

      if (pids.size > 0) {
        console.log(`⚠️  Порт ${port}: занят процессами ${Array.from(pids).join(", ")}`);
      } else {
        console.log(`✅ Порт ${port}: свободен`);
      }
    } catch (error) {
      console.log(`✅ Порт ${port}: свободен`);
    }
  }
}

// Обработка аргументов командной строки
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case "clean":
    case "cleanup":
      await cleanupPorts();
      break;
    case "info":
    case "status":
      await showPortInfo();
      break;
    default:
      console.log("🔧 Утилита для работы с портами");
      console.log("");
      console.log("Использование:");
      console.log("  node scripts/cleanup-ports.js clean   - очистить порты 3000-3002");
      console.log("  node scripts/cleanup-ports.js info    - показать информацию о портах");
      console.log("");
      console.log("Или добавьте в package.json:");
      console.log('  "cleanup:ports": "node scripts/cleanup-ports.js clean"');
      console.log('  "ports:info": "node scripts/cleanup-ports.js info"');
      break;
  }
}

main().catch(error => {
  console.error("❌ Ошибка:", error.message);
  process.exit(1);
});
