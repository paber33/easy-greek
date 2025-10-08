import { Card, SessionSummary, SRSConfig } from "@/types";
import { DEFAULT_CONFIG } from "../constants";
import { supabaseStorage } from "./supabase-storage";

// DEPRECATED: This file is kept for backward compatibility
// All new code should use supabaseStorage directly
// localStorage usage is blocked by ESLint rules

/**
 * DEPRECATED: Load cards from Supabase
 * Use supabaseStorage.loadCards() directly instead
 */
export const loadCards = async (): Promise<Card[]> => {
  console.warn("loadCards() is deprecated. Use supabaseStorage.loadCards() directly.");
  return await supabaseStorage.loadCards();
};

/**
 * DEPRECATED: Save cards to Supabase
 * Use supabaseStorage.saveCards() directly instead
 */
export const saveCards = async (cards: Card[]): Promise<void> => {
  console.warn("saveCards() is deprecated. Use supabaseStorage.saveCards() directly.");
  return await supabaseStorage.saveCards(cards);
};

/**
 * DEPRECATED: Load session logs from Supabase
 * Use supabaseStorage.loadLogs() directly instead
 */
export const loadLogs = (): SessionSummary[] => {
  console.warn("loadLogs() is deprecated. Use supabaseStorage.loadLogs() directly.");
  // This is a sync function, but we need to return a promise
  // For backward compatibility, return empty array and log warning
  return [];
};

/**
 * DEPRECATED: Append session log to Supabase
 * Use supabaseStorage.appendSessionLog() directly instead
 */
export const appendSessionLog = async (log: SessionSummary): Promise<void> => {
  console.warn(
    "appendSessionLog() is deprecated. Use supabaseStorage.appendSessionLog() directly."
  );
  return await supabaseStorage.appendSessionLog(log);
};

/**
 * DEPRECATED: Load user configuration from Supabase
 * Use supabaseStorage.loadConfig() directly instead
 */
export const loadConfig = async (): Promise<SRSConfig> => {
  console.warn("loadConfig() is deprecated. Use supabaseStorage.loadConfig() directly.");
  return await supabaseStorage.loadConfig();
};

/**
 * DEPRECATED: Save user configuration to Supabase
 * Use supabaseStorage.saveConfig() directly instead
 */
export const saveConfig = async (config: SRSConfig): Promise<void> => {
  console.warn("saveConfig() is deprecated. Use supabaseStorage.saveConfig() directly.");
  return await supabaseStorage.saveConfig(config);
};

/**
 * DEPRECATED: Get seed cards for new users
 * This is now handled by Supabase initialization
 */
export const getSeedCards = (): Card[] => {
  console.warn(
    "getSeedCards() is deprecated. Seed cards are now handled by Supabase initialization."
  );
  return [];
};

/**
 * DEPRECATED: Sync all data to Supabase
 * Data is now automatically synced through Supabase repositories
 */
export const syncAllDataToSupabase = async (): Promise<void> => {
  console.warn(
    "syncAllDataToSupabase() is deprecated. Data is now automatically synced through Supabase repositories."
  );
  // No-op for backward compatibility
};

/**
 * DEPRECATED: Merge user data with local data
 * This is now handled by the migration service
 */
export const mergeUserDataWithLocal = async (userData: {
  cards: Card[];
  logs: SessionSummary[];
  config: SRSConfig;
}): Promise<void> => {
  console.warn(
    "mergeUserDataWithLocal() is deprecated. Use supabaseStorage.importUserData() instead."
  );
  return await supabaseStorage.importUserData(userData);
};

/**
 * DEPRECATED: Clear user data
 * Use supabaseStorage.clearUserData() directly instead
 */
export const clearUserData = (): void => {
  console.warn("clearUserData() is deprecated. Use supabaseStorage.clearUserData() directly.");
  // No-op for backward compatibility
};

/**
 * DEPRECATED: Load and save user data from Supabase
 * Use supabaseStorage methods directly instead
 */
export const loadAndSaveUserDataFromSupabase = async (): Promise<void> => {
  console.warn(
    "loadAndSaveUserDataFromSupabase() is deprecated. Use supabaseStorage methods directly."
  );
  // No-op for backward compatibility
};

// Export the new Supabase storage service for direct use
export { supabaseStorage };
