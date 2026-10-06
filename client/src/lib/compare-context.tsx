import React, { createContext, useContext, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { MUTUAL_FUNDS } from "@/data/mutualFunds";
import { Check, X, ArrowRight, Scale, Trash2 } from "lucide-react";

type CompareContextType = {
  selectedIds: string[];
  toggleFund: (id: string, name?: string) => void;
  removeFund: (id: string) => void;
  clearCompare: () => void;
  isFundSelected: (id: string) => boolean;
  goToCompare: () => void;
};

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [fundNames, setFundNames] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const toggleFund = (id: string, name?: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 4) {
        return prev;
      }
      return [...prev, id];
    });

    if (name) {
      setFundNames((prev) => ({ ...prev, [id]: name }));
    }
  };

  const removeFund = (id: string) => {
    setSelectedIds((prev) => prev.filter((item) => item !== id));
  };

  const clearCompare = () => {
    setSelectedIds([]);
  };

  const isFundSelected = (id: string) => selectedIds.includes(id);

  const goToCompare = () => {
    if (selectedIds.length < 2) return;

    navigate({
      to: "/funds/compare",
      search: { ids: selectedIds.join(",") },
    });
  };

  return (
    <CompareContext.Provider
      value={{
        selectedIds,
        toggleFund,
        removeFund,
        clearCompare,
        isFundSelected,
        goToCompare,
      }}
    >
      {children}
      <CompareTray fundNames={fundNames} />
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) {
    throw new Error("useCompare must be used within CompareProvider");
  }
  return ctx;
}

function CompareTray({ fundNames }: { fundNames: Record<string, string> }) {
  const { selectedIds, toggleFund, removeFund, clearCompare, goToCompare } = useCompare();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (selectedIds.length === 0 || pathname === "/funds/compare") return null;

  const funds = selectedIds.map((id) => {
    const curated = MUTUAL_FUNDS.find((f) => f.id === id);
    const name = curated?.name || fundNames[id] || `Fund #${id}`;
    return { id, name };
  });

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-[calc(100vw-2rem)] w-80 sm:w-88 animate-in slide-in-from-bottom-5 fade-in-0 duration-300">
      <div className="rounded-3xl border border-brand/40 bg-card/95 p-4 shadow-2xl backdrop-blur-md">
        {/* Tray Header */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
              <Scale className="size-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold leading-tight">Compare Funds</h4>
              <p className="text-[10px] text-muted-foreground">{selectedIds.length} of 4 funds selected</p>
            </div>
          </div>
          <button
            onClick={clearCompare}
            className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground text-[10px] flex items-center gap-1 px-2 transition-colors"
            title="Clear all"
          >
            <Trash2 className="size-3" /> Clear
          </button>
        </div>

        {/* Selected Fund List with Tick boxes */}
        <div className="mt-2.5 space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {funds.map((fund) => (
            <div
              key={fund.id}
              onClick={() => toggleFund(fund.id)}
              className="group flex items-center justify-between gap-2 rounded-xl bg-accent/40 hover:bg-accent/60 px-3 py-2 text-xs transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => toggleFund(fund.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="size-3.5 rounded border-brand/50 text-brand focus:ring-brand accent-emerald-500 cursor-pointer"
                />
                <span className="font-semibold truncate text-[11px] sm:text-xs text-foreground group-hover:text-brand transition-colors">
                  {fund.name}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFund(fund.id);
                }}
                className="text-muted-foreground hover:text-destructive shrink-0 p-0.5 transition-colors"
                title="Remove"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="mt-3 pt-2 border-t border-border/60">
          <button
            onClick={goToCompare}
            disabled={selectedIds.length < 2}
            className="w-full rounded-full bg-gradient-brand py-2.5 px-4 text-xs font-bold text-white shadow-glow flex items-center justify-center gap-2 hover:opacity-95 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>{selectedIds.length < 2 ? "Select 2 funds to compare" : `Compare (${selectedIds.length})`}</span>
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

