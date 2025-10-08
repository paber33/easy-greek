#!/usr/bin/env node

/**
 * Скрипт для принудительной инициализации пользователей с базовыми словами
 * Используется когда пользователи уже существуют, но у них нет слов
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Загружаем переменные окружения
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  console.error("Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Загружаем слова из JSON файла
function loadWords() {
  try {
    const wordsPath = path.join(__dirname, "..", "greek-words-76.json");
    const wordsData = JSON.parse(fs.readFileSync(wordsPath, "utf8"));
    console.log(`📚 Loaded ${wordsData.length} words from greek-words-76.json`);
    return wordsData;
  } catch (error) {
    console.error("❌ Failed to load words:", error.message);
    process.exit(1);
  }
}

// Инициализируем пользователя с базовыми словами
async function initializeUser(userId, userEmail) {
  try {
    console.log(`\n🔄 Initializing user: ${userEmail} (${userId})`);

    // Проверяем, есть ли уже карточки у пользователя
    const { data: existingCards, error: checkError } = await supabase
      .from("cards")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (checkError) {
      console.error(`❌ Error checking existing cards:`, checkError);
      return false;
    }

    if (existingCards && existingCards.length > 0) {
      console.log(`⚠️ User ${userEmail} already has ${existingCards.length} cards, skipping...`);
      return true;
    }

    // Загружаем слова
    const words = loadWords();

    // Преобразуем в формат для Supabase
    const cardsToInsert = words.map(word => ({
      user_id: userId,
      greek: word.greek,
      translation: word.translation,
      tags: word.tags || [],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval_days: 0,
      due: new Date().toISOString(),
      correct: 0,
      incorrect: 0,
      examples: word.examples || null,
      pronunciation: word.pronunciation || null,
      notes: word.notes || null,
    }));

    // Вставляем карточки
    const { error: insertError } = await supabase.from("cards").insert(cardsToInsert);

    if (insertError) {
      console.error(`❌ Error inserting cards:`, insertError);
      return false;
    }

    console.log(`✅ Successfully initialized ${cardsToInsert.length} cards for ${userEmail}`);
    return true;
  } catch (error) {
    console.error(`❌ Error initializing user ${userEmail}:`, error);
    return false;
  }
}

// Получаем всех пользователей
async function getAllUsers() {
  try {
    const {
      data: { users },
      error,
    } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error("❌ Error fetching users:", error);
      return [];
    }

    return users || [];
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    return [];
  }
}

// Основная функция
async function main() {
  console.log("🚀 Starting user initialization...\n");

  try {
    // Получаем всех пользователей
    const users = await getAllUsers();

    if (users.length === 0) {
      console.log("⚠️ No users found in the database");
      return;
    }

    console.log(`👥 Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.id})`);
    });

    // Инициализируем каждого пользователя
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const user of users) {
      const result = await initializeUser(user.id, user.email);
      if (result === true) {
        if (user.email === "pavel@example.com" || user.email === "aleksandra@example.com") {
          successCount++;
        } else {
          skipCount++;
        }
      } else {
        errorCount++;
      }
    }

    console.log("\n📊 Summary:");
    console.log(`✅ Successfully initialized: ${successCount} users`);
    console.log(`⚠️ Skipped (already have cards): ${skipCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);

    if (successCount > 0) {
      console.log("\n🎉 Users have been initialized with 76 Greek words!");
      console.log("You can now test the application at https://greeklyfy.netlify.app/");
    }
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

// Запускаем скрипт
if (require.main === module) {
  main();
}

module.exports = { initializeUser, loadWords };
