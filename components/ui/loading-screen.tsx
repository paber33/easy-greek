import { GreekLoader, Spinner } from "./loader";
import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  message?: string;
  variant?: "default" | "greek" | "minimal";
  className?: string;
}

export function LoadingScreen({ 
  message = "Загрузка...", 
  variant = "default",
  className 
}: LoadingScreenProps) {
  return (
    <div className={cn(
      "flex items-center justify-center min-h-[400px]",
      className
    )}>
      <div className="flex flex-col items-center space-y-4">
        {variant === "greek" ? (
          <GreekLoader className="text-primary" />
        ) : variant === "minimal" ? (
          <Spinner size="lg" className="text-primary" />
        ) : (
          <div className="relative">
            <Spinner size="xl" className="text-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full bg-primary/20 animate-pulse" />
            </div>
          </div>
        )}
        
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-foreground">{message}</p>
          {variant === "greek" && (
            <p className="text-sm text-muted-foreground">
              Изучаем греческий язык...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  className?: string;
}

export function LoadingOverlay({ 
  isVisible, 
  message = "Загрузка...", 
  className 
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center",
      "bg-background/80 backdrop-blur-sm",
      className
    )}>
      <div className="flex flex-col items-center space-y-4">
        <Spinner size="lg" className="text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
