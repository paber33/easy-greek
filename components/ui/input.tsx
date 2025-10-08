import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-white/20 h-10 w-full min-w-0 rounded-2xl border bg-white/20 backdrop-blur-md px-4 py-2 text-base shadow-soft transition-all duration-300 ease-out outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-primary focus-visible:ring-primary/50 focus-visible:ring-[3px] focus-visible:bg-white/30",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        "dark:bg-black/20 dark:border-white/10 dark:focus-visible:bg-black/30",
        className
      )}
      {...props}
    />
  );
}

export { Input };
