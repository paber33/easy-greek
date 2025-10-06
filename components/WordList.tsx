"use client";

import { Card } from "@/lib/types";
import { useState } from "react";

interface WordListProps {
  cards: Card[];
  onAddCard: (card: Omit<Card, "id">) => void;
  onEditCard: (id: string, updates: Partial<Card>) => void;
  onResetCard: (id: string) => void;
  onStartSession: () => void;
}

export default function WordList({
  cards,
  onAddCard,
  onEditCard,
  onResetCard,
  onStartSession,
}: WordListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    greek: "",
    translation: "",
    tags: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.greek || !formData.translation) return;

    const newCard: Omit<Card, "id"> = {
      greek: formData.greek,
      translation: formData.translation,
      tags: formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      status: "new",
      reps: 0,
      lapses: 0,
      difficulty: 6.0,
      stability: 0,
      due: new Date().toISOString(),
      correct: 0,
      incorrect: 0,
    };

    if (editingId) {
      onEditCard(editingId, newCard);
      setEditingId(null);
    } else {
      onAddCard(newCard);
    }

    setFormData({ greek: "", translation: "", tags: "" });
    setShowAddForm(false);
  };

  const startEdit = (card: Card) => {
    setEditingId(card.id);
    setFormData({
      greek: card.greek,
      translation: card.translation,
      tags: (card.tags || []).join(", "),
    });
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ greek: "", translation: "", tags: "" });
    setShowAddForm(false);
  };

  const getStatusColor = (status: Card["status"]) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "learning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "review":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "relearning":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    }
  };

  const formatDate = (isoDate: string) => {
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

  const getSuccessRate = (card: Card) => {
    const total = card.correct + card.incorrect;
    if (total === 0) return "N/A";
    return `${Math.round((card.correct / total) * 100)}%`;
  };

  const dueCount = cards.filter((c) => c.due <= new Date().toISOString()).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Word List</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {cards.length} words • {dueCount} due for review
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            + Add Word
          </button>
          <button
            onClick={onStartSession}
            disabled={dueCount === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Session ({dueCount})
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? "Edit Word" : "Add New Word"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Greek</label>
              <input
                type="text"
                value={formData.greek}
                onChange={(e) =>
                  setFormData({ ...formData, greek: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Γεια σου"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Translation
              </label>
              <input
                type="text"
                value={formData.translation}
                onChange={(e) =>
                  setFormData({ ...formData, translation: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Hello"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., greetings, basics"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {editingId ? "Update" : "Add"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cards Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Greek
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Translation
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Tags
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Due
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Reps
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Success
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  S / D
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {cards.map((card) => (
                <tr
                  key={card.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <td className="px-4 py-3 font-semibold text-lg">
                    {card.greek}
                    {card.isLeech && (
                      <span className="ml-2 text-xs px-2 py-0.5 bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200 rounded">
                        LEECH
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{card.translation}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {card.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded ${getStatusColor(
                        card.status
                      )}`}
                    >
                      {card.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{formatDate(card.due)}</td>
                  <td className="px-4 py-3 text-sm">
                    {card.reps}
                    {card.lapses > 0 && (
                      <span className="text-red-600 ml-1">({card.lapses})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">{getSuccessRate(card)}</td>
                  <td className="px-4 py-3 text-sm">
                    {card.stability > 0 ? card.stability.toFixed(1) : "-"} /{" "}
                    {card.difficulty.toFixed(1)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(card)}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onResetCard(card.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Reset
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

