import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  FUND_CATEGORIES,
  MUTUAL_FUNDS,
  fundCategoryLabel,
  type FundCategory,
  type MutualFund,
} from "@/data/mutualFunds";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/funds/compare")({
  validateSearch: (search: Record<string, unknown>): { ids?: string } => ({
    ids: typeof search.ids === "string" && search.ids.trim() ? search.ids.trim() : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Smart Fund Comparison — Cash&Choices" },
      {
        name: "description",
        content:
          "Compare up to 4 mutual funds side by side across returns, risk, expense ratio, Sharpe, tax and hidden charges.",
      },
      { property: "og:title", content: "Smart Fund Comparison — Cash&Choices" },
      {
        property: "og:description",
        content:
          "Compare up to 4 mutual funds side by side. Cash&Choices highlights the winning fund for every parameter.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComparePage,
});

type RowDir = "higher" | "lower";
type Row = {
  key: string;
  label: string;
  format: (f: MutualFund) => string;
  numeric: (f: MutualFund) => number;
  betterIs: RowDir;
  why: string;
};

const ROWS: Row[] = [
  { key: "y1", label: "1Y return", format: (f) => `${f.returns.y1.toFixed(1)}%`, numeric: (f) => f.returns.y1, betterIs: "higher", why: "More recent performance." },
  { key: "y3", label: "3Y CAGR", format: (f) => `${f.returns.y3.toFixed(1)}%`, numeric: (f) => f.returns.y3, betterIs: "higher", why: "Compounded annual growth over 3 years." },
  { key: "y5", label: "5Y CAGR", format: (f) => `${f.returns.y5.toFixed(1)}%`, numeric: (f) => f.returns.y5, betterIs: "higher", why: "Longer track record — smooths cycles." },
  { key: "std", label: "Volatility (Std Dev)", format: (f) => `${f.volatilityStdDev}%`, numeric: (f) => f.volatilityStdDev, betterIs: "lower", why: "Lower means a smoother ride." },
  { key: "sharpe", label: "Sharpe ratio", format: (f) => f.sharpe.toFixed(2), numeric: (f) => f.sharpe, betterIs: "higher", why: "Return earned per unit of risk." },
  { key: "alpha", label: "Alpha", format: (f) => f.alpha.toFixed(2), numeric: (f) => f.alpha, betterIs: "higher", why: "Excess return vs benchmark." },
  { key: "beta", label: "Beta", format: (f) => f.beta.toFixed(2), numeric: (f) => Math.abs(1 - f.beta), betterIs: "lower", why: "Closer to 1 = market-like sensitivity." },
  { key: "expense", label: "Expense ratio", format: (f) => `${f.expenseRatio}%`, numeric: (f) => f.expenseRatio, betterIs: "lower", why: "Every 1% you save is 1% more in your pocket." },
  { key: "exit", label: "Exit load", format: (f) => f.exitLoad, numeric: (f) => (f.exitLoad.toLowerCase().includes("nil") ? 0 : 1), betterIs: "lower", why: "Fewer penalties on redemption." },
  { key: "lock", label: "Lock-in", format: (f) => (f.lockInMonths ? `${f.lockInMonths} months` : "None"), numeric: (f) => f.lockInMonths, betterIs: "lower", why: "More freedom to exit." },
  { key: "te", label: "Tracking error", format: (f) => (f.trackingError !== undefined ? `${f.trackingError}%` : "n/a"), numeric: (f) => f.trackingError ?? 99, betterIs: "lower", why: "For index funds — closer to benchmark is better." },
  { key: "aum", label: "AUM (₹ Cr)", format: (f) => f.aumCrore.toLocaleString("en-IN"), numeric: (f) => f.aumCrore, betterIs: "higher", why: "Larger funds tend to be more stable operationally." },
  { key: "tax", label: "Tax category", format: (f) => f.taxCategory, numeric: (f) => (f.taxCategory === "Equity" ? 2 : f.taxCategory.startsWith("Hybrid-Equity") ? 1 : 0), betterIs: "higher", why: "Equity taxation is usually more favourable than slab." },
  { key: "liq", label: "Liquidity", format: (f) => (f.category === "liquid" ? "T+1" : "T+3"), numeric: (f) => (f.category === "liquid" ? 1 : 0), betterIs: "higher", why: "Faster access to your money." },
  { key: "risk", label: "Risk", format: (f) => f.risk, numeric: (f) => ({ Low: 1, "Low-Moderate": 2, Moderate: 3, "Moderately High": 4, High: 5, "Very High": 6 }[f.risk]), betterIs: "lower", why: "Lower risk = smaller drawdowns." },
  { key: "tco", label: "Total cost / ₹1L over 10Y", format: (f) => `₹${(1000 * f.expenseRatio * 10).toLocaleString("en-IN")}`, numeric: (f) => 1000 * f.expenseRatio * 10, betterIs: "lower", why: "The rupee cost of the expense ratio over a decade." },
];

function ComparePage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  // Parse IDs from search params URL: e.g. /funds/compare?ids=nifty_50_index,discovery_small_cap
  const activeIds = useMemo(() => {
    if (search.ids) {
      const parsed = search.ids
        .split(",")
        .map((s) => s.trim())
        .filter((id) => MUTUAL_FUNDS.some((f) => f.id === id));
      if (parsed.length >= 2) {
        return parsed.slice(0, 4);
      }
      if (parsed.length === 1) {
        const second = MUTUAL_FUNDS.find((f) => f.id !== parsed[0])?.id ?? MUTUAL_FUNDS[1].id;
        return [parsed[0], second];
      }
    }
    return [MUTUAL_FUNDS[0].id, MUTUAL_FUNDS[3].id];
  }, [search.ids]);

  const updateIds = (newIds: string[]) => {
    const valid = newIds.slice(0, 4);
    navigate({
      to: "/funds/compare",
      search: { ids: valid.join(",") },
      replace: true,
    });
  };

  const funds = useMemo(
    () => activeIds.map((id) => MUTUAL_FUNDS.find((f) => f.id === id)!).filter(Boolean),
    [activeIds],
  );

  const bestByRow = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of ROWS) {
      const values = funds.map((f) => row.numeric(f));
      const best = row.betterIs === "higher" ? Math.max(...values) : Math.min(...values);
      map[row.key] = best;
    }
    return map;
  }, [funds]);

  // Modal State for Selection Popup
  const [modalOpen, setModalOpen] = useState(false);
  const [swapIndex, setSwapIndex] = useState<number | null>(null);

  const openAddModal = () => {
    setSwapIndex(null);
    setModalOpen(true);
  };

  const openSwapModal = (index: number) => {
    setSwapIndex(index);
    setModalOpen(true);
  };

  const handleSelectFund = (fundId: string) => {
    if (swapIndex !== null) {
      const next = [...activeIds];
      next[swapIndex] = fundId;
      updateIds(next);
    } else {
      if (!activeIds.includes(fundId) && activeIds.length < 4) {
        updateIds([...activeIds, fundId]);
      }
    }
    setModalOpen(false);
  };

  const handleRemoveFund = (index: number) => {
    if (activeIds.length <= 2) return;
    const next = activeIds.filter((_, i) => i !== index);
    updateIds(next);
  };

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-3.5 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-10 min-w-0 w-full overflow-hidden">
        <Link to="/funds" className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5 sm:size-4" /> Back to funds
        </Link>
        <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">Smart Fund Comparison</h1>
            <p className="mt-1.5 max-w-2xl text-xs sm:text-base text-muted-foreground">
              Compare 2 to 4 mutual funds side-by-side. Shareable URL parameters keep your exact comparison link intact.
            </p>
          </div>
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground self-start sm:self-auto">
            {funds.length} of 4 funds comparing
          </span>
        </div>

        {/* Selected Fund Slot Cards */}
        <div className="mt-6 sm:mt-8 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {funds.map((f, i) => (
            <div
              key={f.id}
              className="relative flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:border-brand/40"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Fund {i + 1}
                  </span>
                  {funds.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFund(i)}
                      className="rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title="Remove from comparison"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
                <h3 className="mt-2 text-xs sm:text-sm font-bold line-clamp-2">{f.name}</h3>
                <p className="mt-1 text-[11px] text-muted-foreground truncate">
                  {fundCategoryLabel(f.category)} · {f.amc}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between pt-2.5 border-t border-border/50">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {f.returns.y3.toFixed(1)}% 3Y
                </span>
                <button
                  type="button"
                  onClick={() => openSwapModal(i)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
                >
                  <RefreshCw className="size-3" /> Change
                </button>
              </div>
            </div>
          ))}

          {activeIds.length < 4 && (
            <button
              type="button"
              onClick={openAddModal}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border hover:border-brand/50 bg-accent/20 hover:bg-brand/5 p-5 text-center transition-all group min-h-[120px]"
            >
              <div className="size-8 sm:size-9 rounded-full bg-brand/10 text-brand flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="size-4 sm:size-5" />
              </div>
              <span className="mt-2 text-xs font-bold text-foreground">Add Fund to Compare</span>
              <span className="text-[10px] text-muted-foreground">({4 - activeIds.length} slot left)</span>
            </button>
          )}
        </div>

        {/* Side-by-Side Comparison Table */}
        <div className="mt-6 overflow-x-auto overscroll-x-contain rounded-2xl sm:rounded-3xl border border-border bg-card shadow-soft">
          <table className="w-full text-xs sm:text-sm min-w-[540px]">
            <thead className="bg-accent/40 text-left">
              <tr>
                <th className="px-3 py-3 sm:px-4 sm:py-3.5 font-semibold sticky left-0 z-20 bg-card border-r border-border/60 shadow-sm min-w-[120px] sm:min-w-[170px]">
                  Parameter
                </th>
                {funds.map((f) => (
                  <th key={f.id} className="px-3 py-3 sm:px-4 sm:py-3.5 font-semibold min-w-[150px] sm:min-w-[180px]">
                    <div className="line-clamp-1">{f.name}</div>
                    <div className="text-[10px] sm:text-xs font-normal text-muted-foreground">
                      {fundCategoryLabel(f.category)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.key} className="border-t border-border/60">
                  <td className="align-top px-3 py-3 sm:px-4 sm:py-3.5 sticky left-0 z-20 bg-card border-r border-border/60 shadow-sm">
                    <div className="font-medium text-xs sm:text-sm">{row.label}</div>
                    <div className="mt-0.5 text-[10px] sm:text-xs text-muted-foreground line-clamp-2">{row.why}</div>
                  </td>
                  {funds.map((f) => {
                    const isBest = row.numeric(f) === bestByRow[row.key];
                    return (
                      <td
                        key={f.id}
                        className={cn(
                          "px-3 py-3 sm:px-4 sm:py-3.5",
                          isBest && "bg-brand/5 font-semibold text-foreground",
                        )}
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          {isBest && <CheckCircle2 className="size-3.5 sm:size-4 shrink-0 text-brand" />}
                          <span className="truncate">{row.format(f)}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-2xl sm:rounded-3xl border border-border bg-accent/40 p-4 sm:p-5 text-xs sm:text-sm text-muted-foreground">
          Highlighted cells win that parameter. A single fund rarely wins on every row — pick the
          fund whose winning parameters match <em>your</em> priority (lower cost, higher risk-adjusted
          returns, more diversification, favourable tax, etc.).
          <div className="mt-3">
            <Button asChild variant="outline" className="rounded-full text-xs sm:text-sm">
              <Link to="/recommend">Not sure? Get a recommendation</Link>
            </Button>
          </div>
        </div>

        {/* Selection Popup Modal */}
        <FundSelectionDialog
          open={modalOpen}
          onOpenChange={setModalOpen}
          activeIds={activeIds}
          onSelect={handleSelectFund}
          isSwap={swapIndex !== null}
        />
      </section>
    </SiteLayout>
  );
}

function FundSelectionDialog({
  open,
  onOpenChange,
  activeIds,
  onSelect,
  isSwap,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeIds: string[];
  onSelect: (fundId: string) => void;
  isSwap: boolean;
}) {
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<FundCategory | "all">("all");

  const filteredFunds = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MUTUAL_FUNDS.filter((f) => {
      const matchesCat = catFilter === "all" || f.category === catFilter;
      const matchesQ = !q || `${f.name} ${f.amc} ${fundCategoryLabel(f.category)}`.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [query, catFilter]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isSwap ? "Change Fund to Compare" : "Add Fund to Compare"}</DialogTitle>
        <DialogDescription>
          {isSwap ? "Pick a fund to replace the current selection." : "Select a fund (up to 4 allowed) for side-by-side comparison."}
        </DialogDescription>
      </DialogHeader>

      <div className="relative mt-1 mb-3">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by fund name or AMC..."
          className="rounded-full pl-9 text-xs sm:text-sm h-9"
        />
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-1 pb-2.5 mb-2 border-b border-border/60">
        <button
          type="button"
          onClick={() => setCatFilter("all")}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
            catFilter === "all" ? "bg-brand text-white" : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          All
        </button>
        {FUND_CATEGORIES.map((c) => (
          <button
            type="button"
            key={c.id}
            onClick={() => setCatFilter(c.id)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              catFilter === c.id ? "bg-brand text-white" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Fund List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/60 pr-1 max-h-[280px]">
        {filteredFunds.map((f) => {
          const isSelected = activeIds.includes(f.id);
          return (
            <button
              key={f.id}
              type="button"
              disabled={isSelected && !isSwap}
              onClick={() => onSelect(f.id)}
              className={cn(
                "flex w-full items-center justify-between p-2.5 text-left transition-colors hover:bg-accent/50 rounded-xl gap-2",
                isSelected && !isSwap && "opacity-60 cursor-not-allowed bg-accent/20"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-semibold truncate">{f.name}</h4>
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-medium text-accent-foreground">{fundCategoryLabel(f.category)}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{f.amc} · {f.risk} risk · {f.expenseRatio}% TER</p>
              </div>
              <div className="shrink-0">
                {isSelected ? (
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Active
                  </span>
                ) : (
                  <span className="rounded-full bg-gradient-brand text-white px-3 py-1 text-xs font-medium">
                    {isSwap ? "Swap" : "Select"}
                  </span>
                )}
              </div>
            </button>
          );
        })}
        {filteredFunds.length === 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground">No funds match your search.</div>
        )}
      </div>
    </Dialog>
  );
}