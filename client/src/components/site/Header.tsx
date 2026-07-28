import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/recommend", label: "Recommendations" },
  { to: "/funds", label: "Funds" },
  { to: "/funds/compare", label: "Compare" },
  { to: "/charges", label: "Hidden Charges" },
  { to: "/calculators", label: "Calculators" },
  { to: "/privacy", label: "Privacy" },
] as const;

import { useAuth } from "@/lib/auth-context";
import { User as UserIcon } from "lucide-react";

export function Header() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="shrink-0">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              activeProps={{ className: "bg-accent text-accent-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {user ? (
            <Button asChild variant="outline" className="rounded-full flex items-center gap-2 border-border">
              <Link to="/profile">
                <UserIcon className="size-4 text-brand" />
                <span className="max-w-[100px] truncate">{user.name.split(" ")[0]}</span>
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" className="rounded-full border-border">
              <Link to="/auth">Sign In</Link>
            </Button>
          )}
          <Button asChild className="rounded-full bg-gradient-brand text-white hover:opacity-95 shadow-glow">
            <Link to="/recommend">Try free</Link>
          </Button>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            className="grid size-10 place-items-center rounded-full border border-border"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      <div
        className={cn(
          "grid overflow-hidden border-t border-border/60 bg-background/95 md:hidden",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          "transition-[grid-template-rows] duration-300",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-1 px-4 py-3">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                {n.label}
              </Link>
            ))}
            {user ? (
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-brand hover:bg-accent flex items-center gap-2"
              >
                <UserIcon className="size-4" /> Profile ({user.name})
              </Link>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Sign In / Sign Up
              </Link>
            )}
            <Button asChild className="mt-2 w-full rounded-full bg-gradient-brand text-white">
              <Link to="/recommend" onClick={() => setOpen(false)}>
                Try free
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
