import { ProfileId } from "@/types/profile";
import { MIGRATION_FLAG_KEY, LEGACY_KEYS, isLegacyKey } from "./ns";
import { localRepository } from "./localRepositories";
import { getTestCards } from "./test-data";

/**
 * Проверяет, была ли уже выполнена миграция
 */
const isMigrationCompleted = (): boolean => {
  if (typeof window === "undefined") return true;

  try {
    return localStorage.getItem(MIGRATION_FLAG_KEY) === "true";
  } catch {
    return true;
  }
};

/**
 * Помечает миграцию как выполненную
 */
const markMigrationCompleted = (): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(MIGRATION_FLAG_KEY, "true");
  } catch (error) {
    console.error("Failed to mark migration as completed:", error);
  }
};

/**
 * Находит все старые ключи в localStorage
 */
const findLegacyKeys = (): string[] => {
  if (typeof window === "undefined") return [];

  try {
    const allKeys = Object.keys(localStorage);
    return allKeys.filter(key => isLegacyKey(key));
  } catch {
    return [];
  }
};

/**
 * Мигрирует данные из старых ключей в новый формат
 */
const migrateLegacyDataToProfile = async (profileId: ProfileId): Promise<void> => {
  if (typeof window === "undefined") return;

  try {
    // Мигрируем карточки
    const legacyCards = localStorage.getItem(LEGACY_KEYS.CARDS);
    if (legacyCards) {
      const cards = JSON.parse(legacyCards);
      if (Array.isArray(cards) && cards.length > 0) {
        await localRepository.cards.bulkSave(profileId, cards);
        console.log(`Migrated ${cards.length} cards to profile ${profileId}`);
      }
    }

    // Мигрируем логи
    const legacyLogs = localStorage.getItem(LEGACY_KEYS.LOGS);
    if (legacyLogs) {
      const logs = JSON.parse(legacyLogs);
      if (Array.isArray(logs) && logs.length > 0) {
        for (const log of logs) {
          await localRepository.logs.append(profileId, log);
        }
        console.log(`Migrated ${logs.length} logs to profile ${profileId}`);
      }
    }

    // Мигрируем конфигурацию
    const legacyConfig = localStorage.getItem(LEGACY_KEYS.CONFIG);
    if (legacyConfig) {
      const config = JSON.parse(legacyConfig);
      await localRepository.config.save(profileId, config);
      console.log(`Migrated config to profile ${profileId}`);
    }
  } catch (error) {
    console.error(`Failed to migrate data to profile ${profileId}:`, error);
  }
};

/**
 * Очищает старые ключи после миграции
 */
const cleanupLegacyKeys = (): void => {
  if (typeof window === "undefined") return;

  try {
    const legacyKeys = findLegacyKeys();
    legacyKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    console.log(`Cleaned up ${legacyKeys.length} legacy keys`);
  } catch (error) {
    console.error("Failed to cleanup legacy keys:", error);
  }
};

/**
 * Инициализирует данные профиля если они пустые
 */
const initializeProfileData = async (profileId: ProfileId): Promise<void> => {
  try {
    const cards = await localRepository.cards.list(profileId);

    // Если у профиля нет карточек, добавляем тестовые данные
    if (cards.length === 0) {
      const testCards = getTestCards();
      await localRepository.cards.bulkSave(profileId, testCards);
      console.log(`Initialized ${testCards.length} test cards for profile ${profileId}`);
    }
  } catch (error) {
    console.error(`Failed to initialize data for profile ${profileId}:`, error);
  }
};

/**
 * Главная функция миграции
 */
export const migrateLegacyData = async (): Promise<void> => {
  if (isMigrationCompleted()) {
    return; // Миграция уже выполнена
  }

  console.log("Starting legacy data migration...");

  try {
    const legacyKeys = findLegacyKeys();

    if (legacyKeys.length > 0) {
      // Если есть старые данные, мигрируем их в профиль Pavel
      await migrateLegacyDataToProfile("pavel");
      cleanupLegacyKeys();
    }

    // Инициализируем данные для обоих профилей
    await initializeProfileData("pavel");
    await initializeProfileData("aleksandra");

    // Помечаем миграцию как выполненную
    markMigrationCompleted();

    console.log("Legacy data migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    // Не помечаем как выполненную, чтобы попробовать снова
  }
};
