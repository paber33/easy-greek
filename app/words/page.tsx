"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card as CardType } from "@/types";
import { LocalCardsRepository } from "@/lib/localRepositories";
import { exportToCSV, importFromCSV } from "@/lib/core/csv";
import { useCurrentProfileId } from "@/lib/hooks/use-profile";
import { formatDueDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus,
  Play,
  Search,
  Download,
  Upload,
  MoreVertical,
  Edit2,
  RotateCcw,
  Trash2,
  FileUp,
} from "lucide-react";
import { JsonUpload } from "@/components/json-upload";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { StatusBadge } from "@/components/ui/status-badge";

function WordsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileId = useCurrentProfileId();
  const [cards, setCards] = useState<CardType[]>([]);
  const [filteredCards, setFilteredCards] = useState<CardType[]>([]);
  const [mounted, setMounted] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"due" | "greek" | "reps">("due");
  const [leechFilter, setLeechFilter] = useState<boolean>(false);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showJsonUploadDialog, setShowJsonUploadDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    greek: "",
    translation: "",
    tags: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Memoized function to load cards
  const loadCardsForProfile = useCallback(async () => {
    if (!profileId) return;

    try {
      const loaded = await LocalCardsRepository.list(profileId);
      setCards(loaded);
      setFilteredCards(loaded);
    } catch (error) {
      console.error("Failed to load cards:", error);
      setCards([]);
      setFilteredCards([]);
    }
  }, [profileId]);

  // Load cards for current profile
  useEffect(() => {
    if (mounted && profileId) {
      loadCardsForProfile();
    }
  }, [mounted, profileId, loadCardsForProfile]);

  useEffect(() => {
    // Apply URL parameters
    const status = searchParams.get("status");
    const leech = searchParams.get("leech");

    if (status) {
      setStatusFilter(status);
    }
    if (leech === "true") {
      setLeechFilter(true);
    }
  }, [searchParams]);

  // Auto-save cards when they change
  useEffect(() => {
    if (!mounted || !profileId || cards.length === 0) return;

    const saveCardsToRepository = async () => {
      try {
        await LocalCardsRepository.bulkSave(profileId, cards);
      } catch (error) {
        console.error("Failed to save cards:", error);
      }
    };

    saveCardsToRepository();
  }, [cards, mounted, profileId]);

  // Memoized filter function
  const applyFilters = useCallback(() => {
    let result = [...cards];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        c => c.greek.toLowerCase().includes(term) || c.translation.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter(c => c.status === statusFilter);
    }

    if (tagFilter !== "all") {
      result = result.filter(c => c.tags?.includes(tagFilter));
    }

    if (leechFilter) {
      result = result.filter(c => c.isLeech);
    }

    result.sort((a, b) => {
      if (sortBy === "due") return a.due.localeCompare(b.due);
      if (sortBy === "greek") return a.greek.localeCompare(b.greek);
      return b.reps - a.reps;
    });

    setFilteredCards(result);
  }, [cards, searchTerm, statusFilter, tagFilter, sortBy, leechFilter]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleSave = () => {
    if (!formData.greek || !formData.translation) {
      toast.error("Заполните все поля");
      return;
    }

    const newCard: CardType = {
      id: editingId || crypto.randomUUID(),
      greek: formData.greek,
      translation: formData.translation,
      tags: formData.tags
        .split(",")
        .map(t => t.trim())
        .filter(Boolean),
      status: "new",
      reps: 0,
      lapses: 0,
      ease: 2.5, // SM-2 initial ease factor
      interval: 0, // SM-2 initial interval
      due: new Date().toISOString(),
      correct: 0,
      incorrect: 0,
      // Legacy fields for backward compatibility
      difficulty: 6.0,
      stability: 0,
    };

    if (editingId) {
      setCards(cards.map(c => (c.id === editingId ? { ...c, ...newCard } : c)));
      toast.success("Карточка обновлена");
    } else {
      setCards([...cards, newCard]);
      toast.success("Карточка добавлена");
    }

    setFormData({ greek: "", translation: "", tags: "" });
    setShowAddDialog(false);
    setEditingId(null);
  };

  const startEdit = (card: CardType) => {
    setEditingId(card.id);
    setFormData({
      greek: card.greek,
      translation: card.translation,
      tags: (card.tags || []).join(", "),
    });
    setShowAddDialog(true);
  };

  const handleReset = (id: string) => {
    setCards(
      cards.map(c =>
        c.id === id
          ? {
              ...c,
              status: "new" as const,
              reps: 0,
              lapses: 0,
              ease: 2.5, // SM-2 initial ease factor
              interval: 0, // SM-2 initial interval
              due: new Date().toISOString(),
              correct: 0,
              incorrect: 0,
              learningStepIndex: undefined,
              isLeech: false,
              // Legacy fields for backward compatibility
              difficulty: 6.0,
              stability: 0,
              currentStep: undefined,
            }
          : c
      )
    );
    toast.success("Прогресс сброшен");
  };

  const handleDelete = (id: string) => {
    setCards(cards.filter(c => c.id !== id));
    toast.success("Карточка удалена");
  };

  const handleDeleteAll = () => {
    if (cards.length === 0) {
      toast.info("Словарь уже пуст");
      return;
    }

    if (
      confirm(
        `Вы уверены, что хотите удалить все ${cards.length} слов из словаря? Это действие нельзя отменить.`
      )
    ) {
      setCards([]);
      setFilteredCards([]);
      toast.success(`Удалено ${cards.length} слов из словаря`);
    }
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
    toast.success("Карточки экспортированы");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const csv = event.target?.result as string;
      if (csv) {
        const imported = importFromCSV(csv);
        if (imported.length > 0) {
          setCards([...cards, ...imported]);
          toast.success(`Импортировано ${imported.length} карточек`);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleJsonCardsAdded = async () => {
    if (!profileId) return;

    // Reload cards from repository after JSON upload
    try {
      const updatedCards = await LocalCardsRepository.list(profileId);
      setCards(updatedCards);
      setFilteredCards(updatedCards);
    } catch (error) {
      console.error("Failed to reload cards after JSON upload:", error);
    }
    // Закрываем попап после успешной загрузки
    setShowJsonUploadDialog(false);
  };

  const allTags = Array.from(new Set(cards.flatMap(c => c.tags || []))).sort();

  const dueCount = cards.filter(c => c.due <= new Date().toISOString()).length;

  if (!mounted || !profileId) {
    return <LoadingScreen message="Загружаем слова..." variant="default" />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Список слов 📚
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            {filteredCards.length} из {cards.length} слов • {dueCount} к повторению
            {(statusFilter !== "all" || leechFilter) && (
              <span className="ml-3 flex flex-wrap gap-2">
                {statusFilter !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    {statusFilter === "new" && "Новые"}
                    {statusFilter === "learning" && "Изучаются"}
                    {statusFilter === "review" && "На повторении"}
                    {statusFilter === "relearning" && "Переизучаются"}
                  </Badge>
                )}
                {leechFilter && (
                  <Badge variant="destructive" className="text-xs">
                    Трудные
                  </Badge>
                )}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingId(null);
                  setFormData({ greek: "", translation: "", tags: "" });
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Plus className="mr-2 h-4 w-4" />
                Добавить
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Редактировать слово" : "Добавить новое слово"}
                </DialogTitle>
                <DialogDescription>Введите греческое слово, перевод и теги</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Греческое слово</label>
                  <Input
                    placeholder="Γεια σου"
                    value={formData.greek}
                    onChange={e => setFormData({ ...formData, greek: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Перевод</label>
                  <Input
                    placeholder="Привет"
                    value={formData.translation}
                    onChange={e => setFormData({ ...formData, translation: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Теги (через запятую)</label>
                  <Input
                    placeholder="greetings, basics"
                    value={formData.tags}
                    onChange={e => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Отмена
                </Button>
                <Button onClick={handleSave}>{editingId ? "Сохранить" : "Добавить"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={showJsonUploadDialog} onOpenChange={setShowJsonUploadDialog}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-2 border-primary/20 hover:border-primary/40 bg-background hover:bg-primary/5 text-foreground transition-all duration-200"
              >
                <FileUp className="mr-2 h-4 w-4" />
                Загрузить JSON
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Загрузка слов из JSON</DialogTitle>
                <DialogDescription>
                  Загрузите JSON файл с греческими словами для массового добавления
                </DialogDescription>
              </DialogHeader>
              <JsonUpload onCardsAdded={handleJsonCardsAdded} hideHeader={true} />
            </DialogContent>
          </Dialog>
          <Button
            onClick={() => router.push("/session")}
            disabled={dueCount === 0}
            className="bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="mr-2 h-4 w-4" />
            Начать сессию ({dueCount})
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-2 border-primary/10 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Search className="h-5 w-5 text-primary" />
            Фильтры и поиск
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по греческому слову или переводу..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 h-11 border-2 focus:border-primary/50 transition-colors duration-200"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px] h-11 border-2 focus:border-primary/50 transition-colors duration-200">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="new">Новые</SelectItem>
                <SelectItem value="learning">Изучаются</SelectItem>
                <SelectItem value="review">На повторении</SelectItem>
                <SelectItem value="relearning">Переизучаются</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-full sm:w-[140px] h-11 border-2 focus:border-primary/50 transition-colors duration-200">
                <SelectValue placeholder="Все теги" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все теги</SelectItem>
                {allTags.map(tag => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
              <SelectTrigger className="w-full sm:w-[150px] h-11 border-2 focus:border-primary/50 transition-colors duration-200">
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="due">По сроку</SelectItem>
                <SelectItem value="greek">По алфавиту</SelectItem>
                <SelectItem value="reps">По повторениям</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="w-full sm:w-auto border-2 border-primary/20 hover:border-primary/40 bg-background hover:bg-primary/5 text-foreground transition-all duration-200"
            >
              <Download className="mr-2 h-4 w-4" />
              Экспорт CSV
            </Button>
            <label className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="w-full sm:w-auto border-2 border-primary/20 hover:border-primary/40 bg-background hover:bg-primary/5 text-foreground transition-all duration-200"
              >
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  Импорт CSV
                </span>
              </Button>
              <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteAll}
              disabled={cards.length === 0}
              className="w-full sm:w-auto border-2 border-red-200 hover:border-red-400 bg-background hover:bg-red-50 text-red-600 hover:text-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить все
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-2 border-primary/10 shadow-lg">
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Греческий</TableHead>
                  <TableHead>Перевод</TableHead>
                  <TableHead>Теги</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Срок</TableHead>
                  <TableHead>Повт.</TableHead>
                  <TableHead>Успех</TableHead>
                  <TableHead>S / D</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCards.map(card => (
                  <TableRow key={card.id}>
                    <TableCell className="font-semibold text-lg">
                      {card.greek}
                      {card.isLeech && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          LEECH
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{card.translation}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {card.tags?.map(tag => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={card.status} />
                    </TableCell>
                    <TableCell className="text-sm">{formatDueDate(card.due)}</TableCell>
                    <TableCell className="text-sm">
                      {card.reps}
                      {card.lapses > 0 && (
                        <span className="text-destructive ml-1">({card.lapses})</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {card.correct + card.incorrect > 0
                        ? Math.round((card.correct / (card.correct + card.incorrect)) * 100) + "%"
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {card.stability && card.stability > 0 ? card.stability.toFixed(1) : "—"} /{" "}
                      {card.difficulty && card.difficulty !== null
                        ? card.difficulty.toFixed(1)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Действия</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => startEdit(card)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleReset(card.id)}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Сбросить прогресс
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(card.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden">
            <div className="space-y-3 p-4">
              {filteredCards.map(card => (
                <Card key={card.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {card.greek}
                        {card.isLeech && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            LEECH
                          </Badge>
                        )}
                      </h3>
                      <p className="text-muted-foreground">{card.translation}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Действия</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => startEdit(card)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleReset(card.id)}>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Сбросить прогресс
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(card.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {card.tags?.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Статус:</span>
                      <StatusBadge status={card.status} />
                    </div>
                    <div>
                      <span className="text-muted-foreground">Срок:</span>
                      <span className="ml-1">{formatDueDate(card.due)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Повторений:</span>
                      <span className="ml-1">
                        {card.reps}
                        {card.lapses > 0 && (
                          <span className="text-destructive ml-1">({card.lapses})</span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Успех:</span>
                      <span className="ml-1">
                        {card.correct + card.incorrect > 0
                          ? Math.round((card.correct / (card.correct + card.incorrect)) * 100) + "%"
                          : "—"}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function WordsPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Загружаем страницу..." variant="minimal" />}>
      <WordsPageContent />
    </Suspense>
  );
}
