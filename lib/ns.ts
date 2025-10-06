const APP = "greek-mvp";

/**
 * Создает неймспейсный ключ для хранения данных профиля
 * @param profileId - ID профиля
 * @param key - ключ данных
 * @returns неймспейсный ключ
 */
export const ns = (profileId: string, key: string): string => `${APP}:${profileId}:${key}`;

/**
 * Создает ключ для хранения текущего активного профиля
 */
export const CURRENT_PROFILE_KEY = `${APP}:currentProfile`;

/**
 * Создает ключ для флага миграции
 */
export const MIGRATION_FLAG_KEY = `${APP}:migrated:v2`;

/**
 * Старые ключи без неймспейса (для миграции)
 */
export const LEGACY_KEYS = {
  CARDS: "easy-greek-cards",
  LOGS: "easy-greek-logs", 
  CONFIG: "easy-greek-config",
  VERSION: "easy-greek-version",
} as const;

/**
 * Проверяет, является ли ключ старым (без неймспейса)
 */
export const isLegacyKey = (key: string): boolean => {
  return Object.values(LEGACY_KEYS).some(legacyKey => key.startsWith(legacyKey));
};

/**
 * Извлекает profileId из неймспейсного ключа
 */
export const extractProfileId = (key: string): string | null => {
  const parts = key.split(':');
  if (parts.length >= 3 && parts[0] === APP) {
    return parts[1];
  }
  return null;
};
