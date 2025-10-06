const { spawn } = require('child_process');

console.log('🚀 Запуск сервера разработки без Turbopack...');

const child = spawn('npx', ['next', 'dev'], {
  stdio: 'inherit',
  shell: true
});

child.on('close', (code) => {
  console.log(`Сервер завершился с кодом ${code}`);
});

child.on('error', (err) => {
  console.error('Ошибка запуска:', err);
});
