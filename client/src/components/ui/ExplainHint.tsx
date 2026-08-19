import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ExplainHint({
  label = "Explain",
  children,
  className,
}: {
  label?: string;
  children: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium text-brand-deep transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        {open ? <X className="size-3" /> : <HelpCircle className="size-3" />}
        {label}
      </button>
      {open && (
        <span className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-border bg-popover p-3 text-left text-xs leading-relaxed text-popover-foreground shadow-card">
          {children}
        </span>
      )}
    </span>
  );
}
