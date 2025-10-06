import { Card } from "@/types";
import { INITIAL_DIFFICULTY } from "../constants";

/**
 * Export cards to CSV format
 */
export function exportToCSV(cards: Card[]): string {
  const headers = ["id", "greek", "translation", "tags"];
  const rows = cards.map((c) => [
    c.id,
    escapeCSV(c.greek),
    escapeCSV(c.translation),
    (c.tags || []).join(";"),
  ]);

  return [headers, ...rows].map((row) => row.join(",")).join("\n");
}

/**
 * Import cards from CSV format
 */
export function importFromCSV(csv: string): Card[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const cards: Card[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]);
    if (parts.length >= 3) {
      const [id, greek, translation, tagsStr] = parts;
      if (greek && translation) {
        cards.push({
          id: id || crypto.randomUUID(),
          greek: greek.trim(),
          translation: translation.trim(),
          tags: tagsStr
            ? tagsStr.split(";").map((t) => t.trim()).filter(Boolean)
            : [],
          status: "new",
          reps: 0,
          lapses: 0,
          ease: 2.5, // SM-2 initial ease factor
          interval: 0, // SM-2 initial interval
          due: new Date().toISOString(),
          correct: 0,
          incorrect: 0,
          // Legacy fields for backward compatibility
          difficulty: INITIAL_DIFFICULTY,
          stability: 0,
        });
      }
    }
  }

  return cards;
}

/**
 * Escape CSV field
 */
function escapeCSV(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Parse CSV line (handles quoted fields)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

