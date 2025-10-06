import { Badge } from './badge';
import { CardStatus } from '@/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: CardStatus;
  className?: string;
}

const statusConfig = {
  new: {
    label: 'Новая',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  },
  learning: {
    label: 'Изучаю',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
  },
  review: {
    label: 'Повторяю',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  },
  relearning: {
    label: 'Переучу',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge 
      className={cn(
        'text-xs font-medium transition-colors',
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
