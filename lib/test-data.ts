import { Card } from "@/types";

export function getTestCards(userId?: "pavel" | "aleksandra" | "test"): Card[] {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 1 * 864e5);
  const twoDaysAgo = new Date(now.getTime() - 2 * 864e5);
  const fourDaysAgo = new Date(now.getTime() - 4 * 864e5);

  const prefix = userId ? `${userId}-` : "test-";

  return [
    // Greetings (new)
    {
      id: `${prefix}1`,
      greek: "Καλημέρα",
      translation: "Доброе утро",
      tags: ["greetings"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
      // Legacy fields
      difficulty: 6,
      stability: 0,
    },
    {
      id: `${prefix}2`,
      greek: "Ευχαριστώ",
      translation: "Спасибо",
      tags: ["greetings"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
      // Legacy fields
      difficulty: 6,
      stability: 0,
    },
    {
      id: `${prefix}3`,
      greek: "Παρακαλώ",
      translation: "Пожалуйста",
      tags: ["greetings"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
      // Legacy fields
      difficulty: 6,
      stability: 0,
    },

    // Verbs
    {
      id: `${prefix}4`,
      greek: "τρώω",
      translation: "есть (кушать)",
      tags: ["verbs", "food"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
      // Legacy fields
      difficulty: 6,
      stability: 0,
    },
    {
      id: `${prefix}5`,
      greek: "πίνω",
      translation: "пить",
      tags: ["verbs", "food"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
      // Legacy fields
      difficulty: 6,
      stability: 0,
    },

    // Food
    {
      id: `${prefix}6`,
      greek: "νερό",
      translation: "вода",
      tags: ["food"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
      // Legacy fields
      difficulty: 6,
      stability: 0,
    },
    {
      id: `${prefix}7`,
      greek: "κρασί",
      translation: "вино",
      tags: ["food"],
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,
      due: now.toISOString(),
      correct: 0,
      incorrect: 0,
      // Legacy fields
      difficulty: 6,
      stability: 0,
    },

    // Review examples (with different S/D)
    {
      id: `${prefix}r1`,
      greek: "γεια",
      translation: "привет",
      tags: ["greetings"],
      status: "review",
      reps: 12,
      lapses: 1,
      ease: 2.3,
      interval: 7,
      lastReview: fourDaysAgo.toISOString(),
      due: yesterday.toISOString(),
      correct: 10,
      incorrect: 2,
      // Legacy fields
      difficulty: 5.4,
      stability: 7.0,
    },
    {
      id: `${prefix}r2`,
      greek: "ψωμί",
      translation: "хлеб",
      tags: ["food"],
      status: "review",
      reps: 7,
      lapses: 2,
      ease: 2.1,
      interval: 3,
      lastReview: twoDaysAgo.toISOString(),
      due: new Date(now.getTime() - 0.5 * 864e5).toISOString(),
      correct: 5,
      incorrect: 2,
      // Legacy fields
      difficulty: 7.2,
      stability: 3.5,
    },
    {
      id: `${prefix}r3`,
      greek: "θέλω",
      translation: "хотеть (я хочу)",
      tags: ["verbs"],
      status: "review",
      reps: 15,
      lapses: 0,
      ease: 2.7,
      interval: 10,
      lastReview: fourDaysAgo.toISOString(),
      due: new Date(now.getTime() + 2 * 864e5).toISOString(),
      correct: 15,
      incorrect: 0,
      // Legacy fields
      difficulty: 4.2,
      stability: 10.0,
    },
  ];
}
