import { Badge } from "./badge";
import { CardStatus } from "@/types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: CardStatus;
  className?: string;
}

const statusConfig = {
  new: {
    label: "Новая",
    className: "bg-blue-100 text-white dark:bg-blue-900/20 dark:text-white",
  },
  learning: {
    label: "Изучаю",
    className: "bg-orange-100 text-white dark:bg-orange-900/20 dark:text-white",
  },
  review: {
    label: "Повторяю",
    className: "bg-green-100 text-white dark:bg-green-900/20 dark:text-white",
  },
  relearning: {
    label: "Переучу",
    className: "bg-red-100 text-white dark:bg-red-900/20 dark:text-white",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge className={cn("text-xs font-medium transition-colors", config.className, className)}>
      {config.label}
    </Badge>
  );
}
