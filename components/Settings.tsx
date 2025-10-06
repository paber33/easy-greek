"use client";

import { SRSConfig } from "@/lib/types";
import { Card } from "@/lib/types";
import { exportToCSV } from "@/lib/storage";
import { useState } from "react";

interface SettingsProps {
  config: SRSConfig;
  cards: Card[];
  onUpdateConfig: (config: SRSConfig) => void;
  onImport: (cards: Card[]) => void;
}

export default function Settings({
  config,
  cards,
  onUpdateConfig,
  onImport,
}: SettingsProps) {
  const [localConfig, setLocalConfig] = useState(config);

  const handleSave = () => {
    onUpdateConfig(localConfig);
  };

  const handleExport = () => {
    const csv = exportToCSV(cards);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `greek-words-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csv = event.target?.result as string;
      if (csv) {
        const lines = csv.trim().split("\n");
        if (lines.length < 2) {
          alert("Invalid CSV file");
          return;
        }

        const importedCards: Card[] = [];
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(",");
          if (parts.length >= 3) {
            const [id, greek, translation, tagsStr] = parts;
            if (greek && translation) {
              importedCards.push({
                id: id || crypto.randomUUID(),
                greek: greek.trim(),
                translation: translation.trim(),
                tags: tagsStr
                  ? tagsStr.split(";").map((t) => t.trim())
                  : [],
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
        }

        if (importedCards.length > 0) {
          onImport(importedCards);
          alert(`Imported ${importedCards.length} cards successfully!`);
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Customize your learning experience
        </p>
      </div>

      {/* SRS Configuration */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Spaced Repetition Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Daily New Cards
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={localConfig.DAILY_NEW}
              onChange={(e) =>
                setLocalConfig({
                  ...localConfig,
                  DAILY_NEW: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum number of new cards to introduce per day
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Daily Reviews
            </label>
            <input
              type="number"
              min="0"
              max="500"
              value={localConfig.DAILY_REVIEWS}
              onChange={(e) =>
                setLocalConfig({
                  ...localConfig,
                  DAILY_REVIEWS: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum number of review cards per day
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Learning Steps (minutes)
            </label>
            <input
              type="text"
              value={localConfig.LEARNING_STEPS_MIN.join(", ")}
              onChange={(e) => {
                const steps = e.target.value
                  .split(",")
                  .map((s) => parseInt(s.trim()))
                  .filter((n) => !isNaN(n));
                setLocalConfig({
                  ...localConfig,
                  LEARNING_STEPS_MIN: steps,
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Comma-separated intervals for learning cards (e.g., 1, 10)
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium mb-3">
              Target Retrievability (0-1)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1">Again</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={localConfig.R_TARGET.again}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      R_TARGET: {
                        ...localConfig.R_TARGET,
                        again: parseFloat(e.target.value) || 0.95,
                      },
                    })
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs mb-1">Hard</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={localConfig.R_TARGET.hard}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      R_TARGET: {
                        ...localConfig.R_TARGET,
                        hard: parseFloat(e.target.value) || 0.9,
                      },
                    })
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs mb-1">Good</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={localConfig.R_TARGET.good}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      R_TARGET: {
                        ...localConfig.R_TARGET,
                        good: parseFloat(e.target.value) || 0.85,
                      },
                    })
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs mb-1">Easy</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={localConfig.R_TARGET.easy}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      R_TARGET: {
                        ...localConfig.R_TARGET,
                        easy: parseFloat(e.target.value) || 0.8,
                      },
                    })
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Lower values = longer intervals between reviews
            </p>
          </div>

          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Save Settings
          </button>
        </div>
      </div>

      {/* Import/Export */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Data Management</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Export Cards</h3>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Export to CSV
            </button>
            <p className="text-xs text-gray-500 mt-1">
              Download all cards as CSV (id, greek, translation, tags)
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Import Cards</h3>
            <input
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-200"
            />
            <p className="text-xs text-gray-500 mt-1">
              Import cards from CSV (format: id, greek, translation, tags)
            </p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Database Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {cards.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Cards
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {cards.filter((c) => c.status === "new").length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">New</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {
                cards.filter(
                  (c) => c.status === "learning" || c.status === "relearning"
                ).length
              }
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Learning
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {cards.filter((c) => c.status === "review").length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Review
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

