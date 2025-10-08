#!/usr/bin/env node

const { spawn, exec } = require("child_process");
const net = require("net");

const PORT = 3000;

/**
 * Проверяет, свободен ли порт
 */
function isPortFree(port) {
  return new Promise(resolve => {
    const server = net.createServer();

    server.listen(port, () => {
      server.once("close", () => {
        resolve(true);
      });
      server.close();
    });

    server.on("error", () => {
      resolve(false);
    });
  });
}

/**
 * Находит и убивает процесс, занимающий порт
 */
function killProcessOnPort(port) {
  return new Promise((resolve, reject) => {
    exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
      if (error) {
        resolve(false);
        return;
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
        resolve(false);
        return;
      }

      console.log(`🔍 Найдены процессы на порту ${port}: ${Array.from(pids).join(", ")}`);

      const killPromises = Array.from(pids).map(pid => {
        return new Promise(resolveKill => {
          exec(`taskkill /PID ${pid} /F`, killError => {
            if (killError) {
              console.log(`⚠️  Не удалось завершить процесс ${pid}: ${killError.message}`);
            } else {
              console.log(`✅ Процесс ${pid} завершен`);
            }
            resolveKill();
          });
        });
      });

      Promise.all(killPromises).then(() => {
        // Даем время процессам завершиться
        setTimeout(resolve, 1000);
      });
    });
  });
}

/**
 * Запускает Next.js dev сервер
 */
function startDevServer() {
  console.log(`🚀 Запуск Next.js dev сервера на порту ${PORT}...`);

  const child = spawn("npx", ["next", "dev", "-p", PORT.toString()], {
    stdio: "inherit",
    shell: true,
  });

  child.on("error", error => {
    console.error("❌ Ошибка запуска сервера:", error.message);
    process.exit(1);
  });

  child.on("exit", code => {
    if (code !== 0) {
      console.error(`❌ Сервер завершился с кодом ${code}`);
      process.exit(code);
    }
  });

  // Обработка Ctrl+C
  process.on("SIGINT", () => {
    console.log("\n🛑 Остановка сервера...");
    child.kill("SIGINT");
  });
}

/**
 * Основная функция
 */
async function main() {
  console.log("🔧 Проверка доступности порта...");

  const portFree = await isPortFree(PORT);

  if (!portFree) {
    console.log(`⚠️  Порт ${PORT} занят. Попытка освободить...`);

    const killed = await killProcessOnPort(PORT);

    if (killed) {
      console.log("✅ Порт освобожден");
    } else {
      console.log("❌ Не удалось освободить порт");
      console.log("💡 Попробуйте:");
      console.log("   1. Закрыть другие приложения, использующие порт 3000");
      console.log("   2. Перезапустить терминал");
      console.log("   3. Использовать другой порт: npm run dev -- -p 3001");
      process.exit(1);
    }
  } else {
    console.log(`✅ Порт ${PORT} свободен`);
  }

  startDevServer();
}

main().catch(error => {
  console.error("❌ Критическая ошибка:", error.message);
  process.exit(1);
});
