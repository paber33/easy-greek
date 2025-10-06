import { cn } from "@/lib/utils";

interface LoaderProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Spinner({ size = "md", className }: LoaderProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8",
    xl: "h-12 w-12"
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-current border-t-transparent",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function DotsLoader({ size = "md", className }: LoaderProps) {
  const sizeClasses = {
    sm: "h-1 w-1",
    md: "h-2 w-2",
    lg: "h-3 w-3", 
    xl: "h-4 w-4"
  };

  return (
    <div className={cn("flex space-x-1", className)}>
      <div
        className={cn(
          "rounded-full bg-current animate-bounce",
          sizeClasses[size]
        )}
        style={{ animationDelay: "0ms" }}
      />
      <div
        className={cn(
          "rounded-full bg-current animate-bounce",
          sizeClasses[size]
        )}
        style={{ animationDelay: "150ms" }}
      />
      <div
        className={cn(
          "rounded-full bg-current animate-bounce",
          sizeClasses[size]
        )}
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
}

export function PulseLoader({ size = "md", className }: LoaderProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12"
  };

  return (
    <div
      className={cn(
        "rounded-full bg-current animate-pulse",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function WaveLoader({ size = "md", className }: LoaderProps) {
  const sizeClasses = {
    sm: "h-3 w-1",
    md: "h-4 w-1.5",
    lg: "h-6 w-2",
    xl: "h-8 w-3"
  };

  return (
    <div className={cn("flex items-end space-x-1", className)}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={cn(
            "bg-current rounded-full animate-pulse",
            sizeClasses[size]
          )}
          style={{
            animationDelay: `${i * 100}ms`,
            animationDuration: "1s"
          }}
        />
      ))}
    </div>
  );
}

export function GreekLoader({ className }: { className?: string }) {
  return (
    <div 
      className={cn("flex items-center justify-center space-x-2", className)}
      suppressHydrationWarning
    >
      <div 
        className="text-2xl animate-bounce [animation-delay:0ms]"
        suppressHydrationWarning
      >
        Γ
      </div>
      <div 
        className="text-2xl animate-bounce [animation-delay:100ms]"
        suppressHydrationWarning
      >
        ρ
      </div>
      <div 
        className="text-2xl animate-bounce [animation-delay:200ms]"
        suppressHydrationWarning
      >
        ε
      </div>
      <div 
        className="text-2xl animate-bounce [animation-delay:300ms]"
        suppressHydrationWarning
      >
        ε
      </div>
      <div 
        className="text-2xl animate-bounce [animation-delay:400ms]"
        suppressHydrationWarning
      >
        κ
      </div>
    </div>
  );
}
