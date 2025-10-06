"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileText, CheckCircle, AlertCircle, Download } from "lucide-react";
import { Card as CardType, CardStatus } from "@/types";
import { LocalCardsRepository } from "@/lib/localRepositories";
import { useCurrentProfileId } from "@/lib/hooks/use-profile";
import { syncService } from "@/lib/sync";
import { toast } from "sonner";

interface JsonUploadProps {
  onCardsAdded?: (cards: CardType[]) => void;
  hideHeader?: boolean;
}

export function JsonUpload({ onCardsAdded }: JsonUploadProps) {
  const profileId = useCurrentProfileId();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadedCards, setUploadedCards] = useState<CardType[]>([]);
  const [shareWithPartner, setShareWithPartner] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Функция для определения текущего пользователя и партнера
  const getCurrentUserAndPartner = () => {
    // Получаем текущего пользователя из localStorage или Supabase
    const currentUser = localStorage.getItem("current-user") || "Pavel";
    const partner = currentUser === "Pavel" ? "Aleksandra" : "Pavel";
    return { currentUser, partner };
  };

  const validateCard = useCallback((card: unknown): CardType | null => {
    try {
      // Проверяем, что card является объектом
      if (!card || typeof card !== "object") {
        throw new Error("Карточка должна быть объектом");
      }

      const cardObj = card as Record<string, unknown>;

      // Проверяем обязательные поля
      if (!cardObj.greek || !cardObj.translation) {
        throw new Error("Поля greek и translation обязательны");
      }

      // Создаем валидную карточку с дефолтными значениями
      const validCard: CardType = {
        id:
          (cardObj.id as string) ||
          `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        greek: String(cardObj.greek).trim(),
        translation: String(cardObj.translation).trim(),
        tags: Array.isArray(cardObj.tags)
          ? (cardObj.tags as string[])
          : cardObj.tags
            ? [String(cardObj.tags)]
            : [],
        status: (cardObj.status as CardStatus) || "new",
        reps: Number(cardObj.reps) || 0,
        lapses: Number(cardObj.lapses) || 0,
        ease: Number(cardObj.ease) || 2.5,
        interval: Number(cardObj.interval) || 0,
        lastReview: (cardObj.lastReview as string) || undefined,
        due: (cardObj.due as string) || new Date().toISOString(),
        correct: Number(cardObj.correct) || 0,
        incorrect: Number(cardObj.incorrect) || 0,
        learningStepIndex: (cardObj.learningStepIndex as number) || undefined,
        isLeech: Boolean(cardObj.isLeech) || false,
        // Новые поля для дополнительного контента
        examples: Array.isArray(cardObj.examples) ? (cardObj.examples as string[]) : undefined,
        notes: cardObj.notes ? String(cardObj.notes).trim() : undefined,
        pronunciation: cardObj.pronunciation ? String(cardObj.pronunciation).trim() : undefined,
        audioUrl: cardObj.audioUrl ? String(cardObj.audioUrl).trim() : undefined,
        imageUrl: cardObj.imageUrl ? String(cardObj.imageUrl).trim() : undefined,
        // Legacy поля для обратной совместимости
        difficulty: Number(cardObj.difficulty) || undefined,
        stability: Number(cardObj.stability) || undefined,
        currentStep: (cardObj.currentStep as number) || undefined,
      };

      // Валидация значений
      if (validCard.ease < 1.3 || validCard.ease > 3.0) {
        validCard.ease = 2.5;
      }
      if (validCard.interval < 0) {
        validCard.interval = 0;
      }
      if (!["new", "learning", "review", "relearning"].includes(validCard.status)) {
        validCard.status = "new";
      }
      // Legacy валидация
      if (validCard.difficulty && (validCard.difficulty < 1 || validCard.difficulty > 10)) {
        validCard.difficulty = 6.0;
      }
      if (validCard.stability && validCard.stability < 0) {
        validCard.stability = 0;
      }

      return validCard;
    } catch (error) {
      console.error("Ошибка валидации карточки:", error);
      return null;
    }
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setUploadStatus("idle");
      setErrorMessage("");

      try {
        // Читаем файл
        const text = await file.text();

        // Парсим JSON
        const jsonData = JSON.parse(text);

        // Проверяем структуру
        if (!Array.isArray(jsonData)) {
          throw new Error("JSON файл должен содержать массив карточек");
        }

        // Валидируем и преобразуем карточки
        const validCards: CardType[] = [];
        const errors: string[] = [];

        jsonData.forEach((card, index) => {
          const validCard = validateCard(card);
          if (validCard) {
            validCards.push(validCard);
          } else {
            errors.push(`Карточка ${index + 1}: неверный формат`);
          }
        });

        if (validCards.length === 0) {
          throw new Error("Не найдено ни одной валидной карточки");
        }

        // Сохраняем карточки
        if (!profileId) {
          throw new Error("Не выбран профиль пользователя");
        }
        await LocalCardsRepository.bulkSave(profileId, validCards);
        setUploadedCards(validCards);
        setUploadStatus("success");

        // Если включено совместное добавление, добавляем слова партнеру
        console.log("shareWithPartner state:", shareWithPartner);
        if (shareWithPartner) {
          console.log("Добавляем слова партнеру...");
          const { partner } = getCurrentUserAndPartner();

          try {
            // Создаем копии карточек для партнера
            const partnerCards = validCards.map(card => ({
              ...card,
              id: crypto.randomUUID(), // Новый ID для партнера
            }));

            // Сохраняем карточки для партнера
            await syncService.syncCardsForPartner(partnerCards, partner);

            toast.success(`Слова также добавлены для ${partner}`);
          } catch (error) {
            console.error("Ошибка при добавлении слов партнеру:", error);
            toast.warning("Слова добавлены только для вас. Ошибка при добавлении партнеру.");
          }
        } else {
          console.log("Чекбокс не отмечен, слова добавляются только для текущего пользователя");
        }

        // Показываем результат
        if (errors.length > 0) {
          toast.warning(`Добавлено ${validCards.length} карточек. Ошибок: ${errors.length}`);
        } else {
          toast.success(`Успешно добавлено ${validCards.length} карточек`);
        }

        // Уведомляем родительский компонент
        onCardsAdded?.(validCards);
      } catch (error) {
        console.error("Ошибка при загрузке файла:", error);
        setUploadStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Неизвестная ошибка");
        toast.error("Ошибка при загрузке файла");
      } finally {
        setIsLoading(false);
      }
    },
    [profileId, shareWithPartner, onCardsAdded, validateCard]
  );

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      const jsonFile = files.find(
        file => file.type === "application/json" || file.name.endsWith(".json")
      );

      if (jsonFile) {
        // Обрабатываем файл напрямую
        processFile(jsonFile);
      } else {
        setUploadStatus("error");
        setErrorMessage("Пожалуйста, выберите JSON файл");
      }
    },
    [processFile]
  );

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await processFile(file);

    // Очищаем input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const downloadExample = async () => {
    try {
      // Загружаем обновленный пример JSON файл
      const response = await fetch("/greek-words-example.json");
      const jsonString = await response.text();

      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "greek-words-example.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Ошибка загрузки примера:", error);
      toast.error("Ошибка при загрузке примера JSON");
    }
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop зона */}
      <div className="space-y-2">
        <Label htmlFor="json-file">Выберите JSON файл или перетащите его сюда</Label>
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          } ${isLoading ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isDragOver
              ? "Отпустите файл здесь"
              : "Перетащите JSON файл сюда или нажмите для выбора"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Поддерживаются только .json файлы</p>
        </div>
        <Input
          ref={fileInputRef}
          id="json-file"
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          disabled={isLoading}
          className="hidden"
        />
      </div>

      {/* Кнопка скачивания примера */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={downloadExample} disabled={isLoading}>
          <Download className="h-4 w-4 mr-2" />
          Скачать пример JSON
        </Button>
      </div>

      {/* Чекбокс для совместного добавления */}
      {(() => {
        const { partner } = getCurrentUserAndPartner();
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="share-with-partner"
              checked={shareWithPartner}
              onCheckedChange={checked => setShareWithPartner(checked as boolean)}
              disabled={isLoading}
            />
            <Label
              htmlFor="share-with-partner"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Также добавить слова для {partner}
            </Label>
          </div>
        );
      })()}

      {/* Статус загрузки */}
      {isLoading && (
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>Обработка файла...</AlertDescription>
        </Alert>
      )}

      {/* Успешная загрузка */}
      {uploadStatus === "success" && uploadedCards.length > 0 && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Успешно загружено {uploadedCards.length} карточек!
          </AlertDescription>
        </Alert>
      )}

      {/* Ошибка загрузки */}
      {uploadStatus === "error" && (
        <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Информация о формате */}
      <div className="text-sm text-muted-foreground space-y-1">
        <p>
          <strong>Формат JSON файла:</strong>
        </p>
        <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
          {`[
  {
    "greek": "Καλημέρα",
    "translation": "Доброе утро",
    "tags": ["greetings", "basic"],
    "status": "new",
    "examples": [
      "Καλημέρα! Πώς είσαι; - Доброе утро! Как дела?",
      "Καλημέρα κύрие! - Доброе утро, господин!"
    ],
    "pronunciation": "кали-мЭ-ра",
    "notes": "Используется до 12:00. После полудня говорят Καλησπέρα"
  }
]`}
        </pre>
        <p>
          <strong>Обязательные поля:</strong> greek, translation, status
        </p>
        <p>
          <strong>Опциональные поля:</strong> tags, examples, pronunciation, notes, audioUrl,
          imageUrl
        </p>
        <p>
          <strong>SRS поля (автоматически):</strong> ease, interval, reps, lapses, correct,
          incorrect
        </p>
      </div>
    </div>
  );
}
