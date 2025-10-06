import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes
 * 
 * Combines clsx and tailwind-merge for optimal class handling.
 * Removes conflicting Tailwind classes and merges others.
 * 
 * @param inputs - Class values to merge
 * @returns Merged class string
 * 
 * @example
 * ```typescript
 * cn("px-2 py-1", "px-4") // "py-1 px-4"
 * cn("text-red-500", "text-blue-500") // "text-blue-500"
 * ```
 */
export const cn = (...inputs: ClassValue[]): string => {
  return twMerge(clsx(inputs));
};

/**
 * Clamp a value between minimum and maximum bounds
 * 
 * @param value - Value to clamp
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Clamped value
 * 
 * @example
 * ```typescript
 * clamp(5, 0, 10) // 5
 * clamp(-1, 0, 10) // 0
 * clamp(15, 0, 10) // 10
 * ```
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

/**
 * Add minutes to a date
 * 
 * @param date - Base date
 * @param minutes - Minutes to add (can be negative)
 * @returns New date with minutes added
 * 
 * @example
 * ```typescript
 * addMinutes(new Date('2024-01-01'), 30) // 30 minutes later
 * addMinutes(new Date('2024-01-01'), -15) // 15 minutes earlier
 * ```
 */
export const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + minutes * 60 * 1000);
};

/**
 * Add days to a date
 * 
 * @param date - Base date
 * @param days - Days to add (can be negative)
 * @returns New date with days added
 * 
 * @example
 * ```typescript
 * addDays(new Date('2024-01-01'), 7) // 7 days later
 * addDays(new Date('2024-01-01'), -1) // 1 day earlier
 * ```
 */
export const addDays = (date: Date, days: number): Date => {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
};

/**
 * Calculate days between two dates
 * 
 * @param date1 - First date (string or Date)
 * @param date2 - Second date (string or Date)
 * @returns Number of days between dates (positive if date2 is later)
 * 
 * @example
 * ```typescript
 * daysBetween('2024-01-01', '2024-01-08') // 7
 * daysBetween(new Date('2024-01-01'), new Date('2024-01-08')) // 7
 * ```
 */
export const daysBetween = (date1: Date | string, date2: Date | string): number => {
  const d1 = typeof date1 === "string" ? new Date(date1) : date1;
  const d2 = typeof date2 === "string" ? new Date(date2) : date2;
  return (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
};

/**
 * Apply random jitter to an interval (±15%)
 * 
 * Used in SRS to prevent cards from clustering on the same review dates.
 * 
 * @param days - Base interval in days
 * @returns Jittered interval (85% to 115% of original)
 * 
 * @example
 * ```typescript
 * applyJitter(7) // Random value between 5.95 and 8.05 days
 * ```
 */
export const applyJitter = (days: number): number => {
  return days * (0.85 + Math.random() * 0.3);
};

/**
 * Format due date for display
 * 
 * Converts ISO date string to human-readable format relative to today.
 * 
 * @param isoDate - ISO date string
 * @returns Formatted date string
 * 
 * @example
 * ```typescript
 * formatDueDate('2024-01-01T00:00:00.000Z') // "Today" or "2d overdue"
 * formatDueDate('2024-01-03T00:00:00.000Z') // "Tomorrow" or "1d"
 * ```
 */
export const formatDueDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  const now = new Date();
  const diffDays = Math.floor(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  return `${diffDays}d`;
};

/**
 * Get today's date as ISO string (date only)
 * 
 * Returns date in YYYY-MM-DD format for consistent date handling.
 * 
 * @returns Today's date as ISO string
 * 
 * @example
 * ```typescript
 * getTodayISO() // "2024-01-15"
 * ```
 */
export const getTodayISO = (): string => {
  return new Date().toISOString().split("T")[0];
};
