import { cn } from "@/lib/utils";

export function Logo({ className, showWord = true }: { className?: string; showWord?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display font-bold", className)}>
      <img
        src="/Logo.png"
        alt="Cash&Choices Logo"
        className="h-8 w-auto object-contain"
      />
      {showWord && (
        <span className="tracking-tight text-foreground">
          Cash<span className="text-gradient-brand">&amp;</span>Choices
        </span>
      )}
    </span>
  );
}
