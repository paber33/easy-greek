#!/usr/bin/env node

/**
 * Seed script for initializing demo data
 * Usage: pnpm seed
 */

const { LocalCardsRepository } = require('../lib/localRepositories');

const DEMO_CARDS = [
  {
    id: 'demo-1',
    greek: 'Καλημέρα',
    translation: 'Доброе утро',
    tags: ['greetings'],
    status: 'new',
    reps: 0,
    lapses: 0,
    ease: 2.5,
    interval: 0,
    due: new Date().toISOString(),
    correct: 0,
    incorrect: 0,
    examples: [
      'Καλημέρα! Πώς είσαι; - Доброе утро! Как дела?',
      'Καλημέρα κύριε! - Доброе утро, господин!',
    ],
    pronunciation: 'кали-мЭ-ра',
    notes: 'Используется до 12:00. После полудня говорят Καλησπέρα',
  },
  {
    id: 'demo-2',
    greek: 'Ευχαριστώ',
    translation: 'Спасибо',
    tags: ['greetings'],
    status: 'new',
    reps: 0,
    lapses: 0,
    ease: 2.5,
    interval: 0,
    due: new Date().toISOString(),
    correct: 0,
    incorrect: 0,
    examples: [
      'Ευχαριστώ πολύ! - Большое спасибо!',
      'Ευχαριστώ για τη βοήθεια - Спасибо за помощь',
    ],
    pronunciation: 'эф-ха-рис-тО',
    notes: 'Можно сократить до Ευχαριστώ πολύ (большое спасибо)',
  },
  {
    id: 'demo-3',
    greek: 'τρώω',
    translation: 'есть (кушать)',
    tags: ['verbs', 'food'],
    status: 'new',
    reps: 0,
    lapses: 0,
    ease: 2.5,
    interval: 0,
    due: new Date().toISOString(),
    correct: 0,
    incorrect: 0,
    examples: [
      'Τρώω ψωμί - Я ем хлеб',
      'Τι τρως; - Что ты ешь?',
      'Δεν τρώω κρέας - Я не ем мясо',
    ],
    pronunciation: 'трО-о',
    notes: 'Неправильный глагол. Спряжение: τρώω, τρως, τρώει, τρώμε, τρώτε, τρώνε',
  },
  {
    id: 'demo-4',
    greek: 'νερό',
    translation: 'вода',
    tags: ['food'],
    status: 'new',
    reps: 0,
    lapses: 0,
    ease: 2.5,
    interval: 0,
    due: new Date().toISOString(),
    correct: 0,
    incorrect: 0,
  },
  {
    id: 'demo-5',
    greek: 'σπίτι',
    translation: 'дом',
    tags: ['nouns'],
    status: 'new',
    reps: 0,
    lapses: 0,
    ease: 2.5,
    interval: 0,
    due: new Date().toISOString(),
    correct: 0,
    incorrect: 0,
  },
];

async function seedDemoData() {
  try {
    console.log('🌱 Seeding demo data...');
    
    // Note: This script runs in Node.js context, so we can't use the browser-based repositories directly
    // In a real implementation, you would need to set up a proper seeding mechanism
    // For now, this serves as a template for the seed data structure
    
    console.log('✅ Demo data structure created');
    console.log('📝 To use this data, copy the cards from DEMO_CARDS array to your app');
    console.log('💡 Consider implementing a proper seeding API endpoint');
    
  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedDemoData();
}

module.exports = { DEMO_CARDS, seedDemoData };
