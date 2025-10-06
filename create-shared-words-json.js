#!/usr/bin/env node

/**
 * Создает JSON файлы с одинаковыми словами для Павла и Александры
 * Эти файлы можно будет загрузить через приложение
 */

const fs = require('fs');
const path = require('path');

// Загружаем базовые слова
const wordsPath = path.join(__dirname, 'greek-words-76.json');

if (!fs.existsSync(wordsPath)) {
  console.error('❌ Файл greek-words-76.json не найден!');
  process.exit(1);
}

const wordsData = JSON.parse(fs.readFileSync(wordsPath, 'utf8'));

console.log('🚀 Создание одинаковых слов для Павла и Александры\n');

// Создаем файл для Павла
const pavelWords = wordsData.map((word, index) => ({
  id: `pavel-${index + 1}`,
  greek: word.greek,
  translation: word.translation,
  tags: word.tags || [],
  status: 'new',
  reps: 0,
  lapses: 0,
  ease: 2.5,
  interval: 0,
  lastReview: undefined,
  due: new Date().toISOString(),
  correct: 0,
  incorrect: 0,
  learningStepIndex: undefined,
  currentStep: undefined,
  isLeech: false,
  examples: word.examples || [],
  notes: word.notes || '',
  pronunciation: word.pronunciation || '',
  audioUrl: word.audioUrl || '',
  imageUrl: word.imageUrl || '',
  difficulty: undefined,
  stability: undefined,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}));

// Создаем файл для Александры
const aleksandraWords = wordsData.map((word, index) => ({
  id: `aleksandra-${index + 1}`,
  greek: word.greek,
  translation: word.translation,
  tags: word.tags || [],
  status: 'new',
  reps: 0,
  lapses: 0,
  ease: 2.5,
  interval: 0,
  lastReview: undefined,
  due: new Date().toISOString(),
  correct: 0,
  incorrect: 0,
  learningStepIndex: undefined,
  currentStep: undefined,
  isLeech: false,
  examples: word.examples || [],
  notes: word.notes || '',
  pronunciation: word.pronunciation || '',
  audioUrl: word.audioUrl || '',
  imageUrl: word.imageUrl || '',
  difficulty: undefined,
  stability: undefined,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}));

// Сохраняем файлы
const pavelPath = path.join(__dirname, 'pavel-words-76.json');
const aleksandraPath = path.join(__dirname, 'aleksandra-words-76.json');

fs.writeFileSync(pavelPath, JSON.stringify(pavelWords, null, 2));
fs.writeFileSync(aleksandraPath, JSON.stringify(aleksandraWords, null, 2));

console.log('✅ Созданы файлы с одинаковыми словами:');
console.log(`   📄 pavel-words-76.json (${pavelWords.length} слов)`);
console.log(`   📄 aleksandra-words-76.json (${aleksandraWords.length} слов)`);

console.log('\n📋 Инструкции по загрузке:');
console.log('1. Откройте приложение в браузере');
console.log('2. Войдите как Pavel');
console.log('3. Перейдите в раздел "Слова"');
console.log('4. Нажмите "Загрузить JSON"');
console.log('5. Выберите файл pavel-words-76.json');
console.log('6. Повторите для Aleksandra с файлом aleksandra-words-76.json');

console.log('\n🎯 Результат:');
console.log('   - У обоих пользователей будет по 76 одинаковых слов');
console.log('   - Все слова будут в статусе "new"');
console.log('   - Дальше прогресс будет развиваться индивидуально');
console.log('   - Синхронизация с Supabase произойдет автоматически');

// Создаем также общий файл для удобства
const sharedPath = path.join(__dirname, 'shared-words-76.json');
fs.writeFileSync(sharedPath, JSON.stringify(wordsData, null, 2));

console.log(`\n📄 Дополнительно создан: shared-words-76.json (${wordsData.length} слов)`);
console.log('   Этот файл можно использовать для любого пользователя');
