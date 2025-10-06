import { Card } from "@/types";

/**
 * Build session queue with proper prioritization
 */
export function buildSessionQueue(
  allCards: Card[],
  now: Date,
  dailyNew: number,
  dailyReviews: number
): Card[] {
  const queue: Card[] = [];
  const nowISO = now.toISOString();

  // 1. All due learning/relearning cards (time-critical)
  const learningDue = allCards.filter(
    c => (c.status === "learning" || c.status === "relearning") && c.due <= nowISO
  );
  queue.push(...learningDue);

  // 2. Due review cards (sorted by overdue, then by difficulty)
  const reviewDue = allCards
    .filter(c => c.status === "review" && c.due <= nowISO)
    .map(c => ({
      card: c,
      overdue: now.getTime() - new Date(c.due).getTime(),
    }))
    .sort((a, b) => b.overdue - a.overdue)
    .slice(0, dailyReviews)
    .map(x => x.card);
  queue.push(...reviewDue);

  // 3. New cards (FIFO or tag-balanced)
  const newCards = allCards.filter(c => c.status === "new").slice(0, dailyNew);
  queue.push(...newCards);

  return queue;
}

/**
 * Generate MCQ distractors for a card
 */
export function generateDistractors(
  correctCard: Card,
  allCards: Card[],
  count: number = 3
): string[] {
  const distractors: string[] = [];

  // Try to get distractors from same tags
  const sameTags = allCards.filter(
    c =>
      c.id !== correctCard.id &&
      c.tags?.some(t => correctCard.tags?.includes(t)) &&
      c.translation !== correctCard.translation &&
      !correctCard.translation.includes(c.translation) &&
      !c.translation.includes(correctCard.translation)
  );

  // Add from same tags first
  for (const card of sameTags) {
    if (distractors.length >= count) break;
    if (!distractors.includes(card.translation)) {
      distractors.push(card.translation);
    }
  }

  // Fill remaining with random cards
  const otherCards = allCards.filter(
    c =>
      c.id !== correctCard.id &&
      c.translation !== correctCard.translation &&
      !correctCard.translation.includes(c.translation) &&
      !c.translation.includes(correctCard.translation) &&
      !distractors.includes(c.translation)
  );

  const shuffled = otherCards.sort(() => Math.random() - 0.5);
  for (const card of shuffled) {
    if (distractors.length >= count) break;
    distractors.push(card.translation);
  }

  return distractors.slice(0, count);
}

/**
 * Shuffle an array (Fisher-Yates)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
