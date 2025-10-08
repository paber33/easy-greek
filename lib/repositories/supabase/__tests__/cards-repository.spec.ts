import { SupabaseCardsRepository } from "../cards-repository";
import { supabase } from "@/lib/supabase";
import { Card } from "@/types";

// Mock Supabase
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe("SupabaseCardsRepository", () => {
  let repository: SupabaseCardsRepository;
  let mockSupabase: any;

  beforeEach(() => {
    repository = new SupabaseCardsRepository();
    mockSupabase = supabase as any;
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should return cards filtered by user_id", async () => {
      const userId = "user-123";
      const mockCards = [
        {
          id: "card-1",
          user_id: userId,
          greek: "Καλημέρα",
          translation: "Доброе утро",
          status: "new",
          reps: 0,
          lapses: 0,
          ease: 2.5,
          interval_days: 0,
          due: "2024-01-01T00:00:00Z",
          correct: 0,
          incorrect: 0,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockCards, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await repository.list(userId);

      expect(mockSupabase.from).toHaveBeenCalledWith("cards");
      expect(mockQuery.eq).toHaveBeenCalledWith("user_id", userId);
      expect(result).toHaveLength(1);
      expect(result[0].greek).toBe("Καλημέρα");
    });

    it("should throw error when Supabase query fails", async () => {
      const userId = "user-123";
      const mockError = new Error("Database error");

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: mockError }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await expect(repository.list(userId)).rejects.toThrow(
        "Failed to fetch cards: Database error"
      );
    });
  });

  describe("create", () => {
    it("should create a new card with correct user_id", async () => {
      const userId = "user-123";
      const cardData: Omit<Card, "id"> = {
        greek: "Καλησπέρα",
        translation: "Добрый вечер",
        status: "new",
        reps: 0,
        lapses: 0,
        ease: 2.5,
        interval: 0,
        due: "2024-01-01T00:00:00Z",
        correct: 0,
        incorrect: 0,
      };

      const mockCreatedCard = {
        id: "card-2",
        user_id: userId,
        ...cardData,
        interval_days: cardData.interval,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCreatedCard, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await repository.create(userId, cardData);

      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          greek: cardData.greek,
          translation: cardData.translation,
        })
      );
      expect(result.id).toBe("card-2");
    });
  });

  describe("update", () => {
    it("should update card with correct user_id and card_id", async () => {
      const userId = "user-123";
      const cardId = "card-1";
      const updates = { reps: 1, correct: 1 };

      const mockUpdatedCard = {
        id: cardId,
        user_id: userId,
        greek: "Καλημέρα",
        translation: "Доброе утро",
        status: "new",
        reps: 1,
        lapses: 0,
        ease: 2.5,
        interval_days: 0,
        due: "2024-01-01T00:00:00Z",
        correct: 1,
        incorrect: 0,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUpdatedCard, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await repository.update(userId, cardId, updates);

      expect(mockQuery.eq).toHaveBeenCalledWith("user_id", userId);
      expect(mockQuery.eq).toHaveBeenCalledWith("id", cardId);
      expect(result.reps).toBe(1);
      expect(result.correct).toBe(1);
    });
  });

  describe("remove", () => {
    it("should delete card with correct user_id and card_id", async () => {
      const userId = "user-123";
      const cardId = "card-1";

      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        mockResolvedValue: jest.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await repository.remove(userId, cardId);

      expect(mockQuery.eq).toHaveBeenCalledWith("user_id", userId);
      expect(mockQuery.eq).toHaveBeenCalledWith("id", cardId);
    });
  });

  describe("bulkImport", () => {
    it("should import multiple cards with correct user_id", async () => {
      const userId = "user-123";
      const cards: Omit<Card, "id">[] = [
        {
          greek: "Καλημέρα",
          translation: "Доброе утро",
          status: "new",
          reps: 0,
          lapses: 0,
          ease: 2.5,
          interval: 0,
          due: "2024-01-01T00:00:00Z",
          correct: 0,
          incorrect: 0,
        },
        {
          greek: "Καλησπέρα",
          translation: "Добрый вечер",
          status: "new",
          reps: 0,
          lapses: 0,
          ease: 2.5,
          interval: 0,
          due: "2024-01-01T00:00:00Z",
          correct: 0,
          incorrect: 0,
        },
      ];

      const mockImportedCards = cards.map((card, index) => ({
        id: `card-${index + 1}`,
        user_id: userId,
        ...card,
        interval_days: card.interval,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      }));

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ data: mockImportedCards, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await repository.bulkImport(userId, cards);

      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ user_id: userId, greek: "Καλημέρα" }),
          expect.objectContaining({ user_id: userId, greek: "Καλησπέρα" }),
        ])
      );
      expect(result).toHaveLength(2);
    });
  });

  describe("data isolation", () => {
    it("should not allow access to other users cards", async () => {
      const userId1 = "user-1";
      const userId2 = "user-2";

      // Mock that user 1 can only see their own cards
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockImplementation((field, options) => {
          // Simulate RLS - only return cards for the requesting user
          const requestingUserId = mockQuery.eq.mock.calls.find(call => call[0] === "user_id")?.[1];
          if (requestingUserId === userId1) {
            return Promise.resolve({
              data: [{ id: "card-1", user_id: userId1, greek: "User 1 card" }],
              error: null,
            });
          }
          return Promise.resolve({ data: [], error: null });
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const user1Cards = await repository.list(userId1);
      const user2Cards = await repository.list(userId2);

      expect(user1Cards).toHaveLength(1);
      expect(user1Cards[0].user_id).toBe(userId1);
      expect(user2Cards).toHaveLength(0);
    });
  });
});
