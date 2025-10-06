import { Card, SessionSummary, SRSConfig } from "./types";
import { DEFAULT_CONFIG } from "./constants";

const STORAGE_VERSION = "1";
const CARDS_KEY = "easy-greek-cards";
const LOGS_KEY = "easy-greek-logs";
const CONFIG_KEY = "easy-greek-config";
const VERSION_KEY = "easy-greek-version";

export function loadCards(): Card[] {
  if (typeof window === "undefined") return [];
  
  try {
    const version = localStorage.getItem(VERSION_KEY);
    const data = localStorage.getItem(CARDS_KEY);
    
    if (!data) return [];
    
    const cards = JSON.parse(data) as Card[];
    
    // Migration logic if needed
    if (version !== STORAGE_VERSION) {
      // Perform any schema migrations here
      localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
    }
    
    return cards;
  } catch (error) {
    console.error("Failed to load cards:", error);
    return [];
  }
}

export function saveCards(cards: Card[]): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
    localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
  } catch (error) {
    console.error("Failed to save cards:", error);
  }
}

export function loadLogs(): SessionSummary[] {
  if (typeof window === "undefined") return [];
  
  try {
    const data = localStorage.getItem(LOGS_KEY);
    if (!data) return [];
    return JSON.parse(data) as SessionSummary[];
  } catch (error) {
    console.error("Failed to load logs:", error);
    return [];
  }
}

export function appendSessionLog(summary: SessionSummary): void {
  if (typeof window === "undefined") return;
  
  try {
    const logs = loadLogs();
    const existingIndex = logs.findIndex((log) => log.date === summary.date);
    
    if (existingIndex >= 0) {
      // Update existing log for the day
      logs[existingIndex] = summary;
    } else {
      logs.push(summary);
    }
    
    // Keep only last 90 days
    const sorted = logs.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 90);
    localStorage.setItem(LOGS_KEY, JSON.stringify(sorted));
  } catch (error) {
    console.error("Failed to save log:", error);
  }
}

export function loadConfig(): SRSConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  
  try {
    const data = localStorage.getItem(CONFIG_KEY);
    if (!data) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch (error) {
    console.error("Failed to load config:", error);
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: SRSConfig): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error("Failed to save config:", error);
  }
}

export function exportToCSV(cards: Card[]): string {
  const headers = ["id", "greek", "translation", "tags"];
  const rows = cards.map((c) => [
    c.id,
    c.greek,
    c.translation,
    (c.tags || []).join(";"),
  ]);
  
  return [headers, ...rows].map((row) => row.join(",")).join("\n");
}

export function importFromCSV(csv: string): Card[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  
  const cards: Card[] = [];
  for (let i = 1; i < lines.length; i++) {
    const [id, greek, translation, tagsStr] = lines[i].split(",");
    if (greek && translation) {
      cards.push({
        id: id || crypto.randomUUID(),
        greek: greek.trim(),
        translation: translation.trim(),
        tags: tagsStr ? tagsStr.split(";").map((t) => t.trim()) : [],
        status: "new",
        reps: 0,
        lapses: 0,
        difficulty: 6.0,
        stability: 0,
        due: new Date().toISOString(),
        correct: 0,
        incorrect: 0,
      });
    }
  }
  
  return cards;
}

