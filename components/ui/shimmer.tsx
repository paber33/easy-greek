import { cn } from "@/lib/utils";

interface ShimmerProps {
  className?: string;
}

export function Shimmer({ className }: ShimmerProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]",
        className
      )}
      style={{
        animation: "shimmer 2s infinite linear"
      }}
    />
  );
}

export function CardSkeleton({ className }: ShimmerProps) {
  return (
    <div className={cn("rounded-lg border p-6 space-y-4", className)}>
      <div className="space-y-2">
        <Shimmer className="h-4 w-3/4 rounded" />
        <Shimmer className="h-3 w-1/2 rounded" />
      </div>
      <Shimmer className="h-20 w-full rounded" />
      <div className="flex space-x-2">
        <Shimmer className="h-8 w-20 rounded" />
        <Shimmer className="h-8 w-16 rounded" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, className }: ShimmerProps & { rows?: number }) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="grid grid-cols-4 gap-4">
        <Shimmer className="h-4 w-full rounded" />
        <Shimmer className="h-4 w-full rounded" />
        <Shimmer className="h-4 w-full rounded" />
        <Shimmer className="h-4 w-full rounded" />
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-4 gap-4">
          <Shimmer className="h-8 w-full rounded" />
          <Shimmer className="h-8 w-full rounded" />
          <Shimmer className="h-8 w-full rounded" />
          <Shimmer className="h-8 w-full rounded" />
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton({ className }: ShimmerProps) {
  return (
    <div className={cn("grid grid-cols-3 sm:grid-cols-6 gap-2", className)}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-3 space-y-2">
          <Shimmer className="h-4 w-8 rounded" />
          <Shimmer className="h-3 w-12 rounded" />
        </div>
      ))}
    </div>
  );
}

export function SessionSkeleton({ className }: ShimmerProps) {
  return (
    <div className={cn("max-w-2xl mx-auto space-y-6", className)}>
      {/* Card */}
      <div className="rounded-lg border p-8 space-y-6">
        <div className="text-center space-y-4">
          <Shimmer className="h-8 w-48 mx-auto rounded" />
          <Shimmer className="h-4 w-32 mx-auto rounded" />
        </div>
        
        {/* Buttons */}
        <div className="flex justify-center space-x-4">
          <Shimmer className="h-12 w-20 rounded-lg" />
          <Shimmer className="h-12 w-20 rounded-lg" />
          <Shimmer className="h-12 w-20 rounded-lg" />
          <Shimmer className="h-12 w-20 rounded-lg" />
        </div>
      </div>
      
      {/* Progress */}
      <div className="space-y-2">
        <Shimmer className="h-4 w-32 rounded" />
        <Shimmer className="h-2 w-full rounded" />
      </div>
    </div>
  );
}

export function CalendarSkeleton({ className }: ShimmerProps) {
  return (
    <div className={cn("rounded-lg border p-6 space-y-4", className)}>
      <Shimmer className="h-6 w-32 rounded" />
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Shimmer key={i} className="h-8 w-8 rounded" />
        ))}
      </div>
      <div className="flex justify-between">
        <Shimmer className="h-4 w-16 rounded" />
        <Shimmer className="h-4 w-16 rounded" />
      </div>
    </div>
  );
}

export function PageSkeleton({ className }: ShimmerProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="space-y-2">
        <Shimmer className="h-8 w-64 rounded" />
        <Shimmer className="h-4 w-48 rounded" />
      </div>
      
      {/* Stats */}
      <StatsSkeleton />
      
      {/* Content */}
      <div className="grid gap-6 md:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
      
      {/* Table */}
      <div className="rounded-lg border p-6">
        <Shimmer className="h-6 w-32 mb-4 rounded" />
        <TableSkeleton rows={3} />
      </div>
    </div>
  );
}
