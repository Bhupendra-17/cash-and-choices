import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Plus,
  RefreshCw,
  Scale,
  Search,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ExplainHint } from "@/components/ui/ExplainHint";
import { SvgRadarChart } from "@/components/ui/svg-charts";
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
      { title: "Smart Mutual Fund Comparison — Cash&Choices" },
      {
        name: "description",
        content:
          "Compare up to 4 mutual funds side by side across returns, risk, expense ratio, Sharpe, tax and hidden charges with interactive left-to-right slider controls.",
      },
      { property: "og:title", content: "Smart Mutual Fund Comparison — Cash&Choices" },
      {
        property: "og:description",
        content:
          "Compare up to 4 mutual funds side by side with interactive left-to-right slider views and parameter matrix.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComparePage,
});

type RowDir = "higher" | "lower";
type MetricCategory = "performance" | "risk" | "cost" | "specs";

type Row = {
  key: string;
  label: string;
  category: MetricCategory;
  format: (f: MutualFund) => string;
  numeric: (f: MutualFund) => number;
  betterIs: RowDir;
  why: string;
};

const CATEGORY_LABELS: Record<MetricCategory, string> = {
  performance: "Performance & Returns",
  risk: "Risk & Volatility Ratios",
  cost: "Expenses & Penalties",
  specs: "Operational & Tax Specs",
};

const ROWS: Row[] = [
  // Performance
  { key: "y1", label: "1Y Return", category: "performance", format: (f) => `${f.returns.y1.toFixed(1)}%`, numeric: (f) => f.returns.y1, betterIs: "higher", why: "12-month trailing absolute growth." },
  { key: "y3", label: "3Y CAGR", category: "performance", format: (f) => `${f.returns.y3.toFixed(1)}%`, numeric: (f) => f.returns.y3, betterIs: "higher", why: "Compounded annual return over 3 years." },
  { key: "y5", label: "5Y CAGR", category: "performance", format: (f) => `${f.returns.y5.toFixed(1)}%`, numeric: (f) => f.returns.y5, betterIs: "higher", why: "Longer 5-year track record across market cycles." },
  // Risk
  { key: "std", label: "Volatility (Std Dev)", category: "risk", format: (f) => `${f.volatilityStdDev}%`, numeric: (f) => f.volatilityStdDev, betterIs: "lower", why: "Lower percentage means smoother, less bumpy trajectory." },
  { key: "sharpe", label: "Sharpe Ratio", category: "risk", format: (f) => f.sharpe.toFixed(2), numeric: (f) => f.sharpe, betterIs: "higher", why: "Return generated per unit of risk taken (risk efficiency)." },
  { key: "alpha", label: "Alpha", category: "risk", format: (f) => f.alpha.toFixed(2), numeric: (f) => f.alpha, betterIs: "higher", why: "Excess return relative to benchmark index." },
  { key: "beta", label: "Beta", category: "risk", format: (f) => f.beta.toFixed(2), numeric: (f) => Math.abs(1 - f.beta), betterIs: "lower", why: "Closer to 1.0 indicates market-aligned sensitivity." },
  { key: "risk", label: "Risk Level", category: "risk", format: (f) => f.risk, numeric: (f) => ({ Low: 1, "Low-Moderate": 2, Moderate: 3, "Moderately High": 4, High: 5, "Very High": 6 }[f.risk] || 4), betterIs: "lower", why: "SEBI Riskometer level." },
  // Cost
  { key: "expense", label: "Expense Ratio (TER)", category: "cost", format: (f) => `${f.expenseRatio}%`, numeric: (f) => f.expenseRatio, betterIs: "lower", why: "Annual fee charged by the fund house." },
  { key: "tco", label: "10Y Cost / ₹1 Lakh", category: "cost", format: (f) => `₹${(1000 * f.expenseRatio * 10).toLocaleString("en-IN")}`, numeric: (f) => 1000 * f.expenseRatio * 10, betterIs: "lower", why: "Total estimated fees paid over 10 years on ₹1L investment." },
  { key: "exit", label: "Exit Load", category: "cost", format: (f) => f.exitLoad, numeric: (f) => (f.exitLoad.toLowerCase().includes("nil") ? 0 : 1), betterIs: "lower", why: "Early exit penalty." },
  { key: "lock", label: "Lock-in Period", category: "cost", format: (f) => (f.lockInMonths ? `${f.lockInMonths} months` : "None"), numeric: (f) => f.lockInMonths, betterIs: "lower", why: "Duration during which funds cannot be redeemed." },
  // Specs
  { key: "te", label: "Tracking Error", category: "specs", format: (f) => (f.trackingError !== undefined ? `${f.trackingError}%` : "n/a"), numeric: (f) => f.trackingError ?? 99, betterIs: "lower", why: "Deviation from underlying index for passive funds." },
  { key: "aum", label: "AUM (₹ Cr)", category: "specs", format: (f) => `₹${f.aumCrore.toLocaleString("en-IN")} Cr`, numeric: (f) => f.aumCrore, betterIs: "higher", why: "Total Assets Under Management." },
  { key: "tax", label: "Tax Classification", category: "specs", format: (f) => f.taxCategory, numeric: (f) => (f.taxCategory === "Equity" ? 2 : f.taxCategory.startsWith("Hybrid-Equity") ? 1 : 0), betterIs: "higher", why: "Favourable 12.5% LTCG (>₹1.25L) vs slab rate." },
  { key: "liq", label: "Redemption Liquidity", category: "specs", format: (f) => (f.category === "liquid" ? "T+1 Day" : "T+3 Days"), numeric: (f) => (f.category === "liquid" ? 1 : 0), betterIs: "higher", why: "Payout settlement timeline." },
];

function ComparePage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  // Parse up to 4 fund IDs from URL search param `ids`
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
    return [MUTUAL_FUNDS[0].id, MUTUAL_FUNDS[1].id, MUTUAL_FUNDS[3].id];
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

  // Calculate best values per metric
  const bestByRow = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of ROWS) {
      const values = funds.map((f) => row.numeric(f));
      const best = row.betterIs === "higher" ? Math.max(...values) : Math.min(...values);
      map[row.key] = best;
    }
    return map;
  }, [funds]);

  // Overall Score Calculation
  const fundScores = useMemo(() => {
    return funds.map((f) => {
      let score = 0;
      for (const row of ROWS) {
        if (row.numeric(f) === bestByRow[row.key]) {
          score += 1;
        }
      }
      return { fund: f, score };
    });
  }, [funds, bestByRow]);

  const winningFund = useMemo(() => {
    const sorted = [...fundScores].sort((a, b) => b.score - a.score);
    return sorted[0];
  }, [fundScores]);

  // Slider & Focus State
  const [activeSliderIndex, setActiveSliderIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"slider" | "table" | "radar">("slider");
  const [selectedCatFilter, setSelectedCatFilter] = useState<MetricCategory | "all">("all");
  const [copiedLink, setCopiedLink] = useState(false);

  // Modal State for Selection Popup
  const [modalOpen, setModalOpen] = useState(false);
  const [swapIndex, setSwapIndex] = useState<number | null>(null);

  // Scroll Container Ref for Slider Carousel
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Keep slider index within bounds if funds count changes
  useEffect(() => {
    if (activeSliderIndex >= funds.length) {
      setActiveSliderIndex(Math.max(0, funds.length - 1));
    }
  }, [funds.length, activeSliderIndex]);

  const handleSliderChange = (newIdx: number) => {
    const clamped = Math.max(0, Math.min(funds.length - 1, newIdx));
    setActiveSliderIndex(clamped);

    // Scroll card carousel to selected fund index
    if (sliderContainerRef.current) {
      const cardWidth = sliderContainerRef.current.firstElementChild?.clientWidth || 300;
      sliderContainerRef.current.scrollTo({
        left: clamped * (cardWidth + 16),
        behavior: "smooth",
      });
    }

    // Scroll table horizontally to fund column
    if (tableContainerRef.current) {
      const colWidth = 200;
      tableContainerRef.current.scrollTo({
        left: clamped * colWidth,
        behavior: "smooth",
      });
    }
  };

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

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const filteredRows = useMemo(() => {
    if (selectedCatFilter === "all") return ROWS;
    return ROWS.filter((r) => r.category === selectedCatFilter);
  }, [selectedCatFilter]);

  // Data for Radar Chart
  const radarAxes = [
    { key: "returns", label: "3Y Return" },
    { key: "sharpe", label: "Sharpe Ratio" },
    { key: "alpha", label: "Alpha" },
    { key: "cost", label: "Low Cost" },
    { key: "safety", label: "Stability" },
  ];

  const radarData = useMemo(() => {
    return funds.map((f) => ({
      name: f.name.split(" ")[0] + " " + (f.name.split(" ")[1] || ""),
      scores: {
        returns: Math.min(100, Math.max(10, Math.round((f.returns.y3 / 25) * 100))),
        sharpe: Math.min(100, Math.max(10, Math.round((f.sharpe / 2.5) * 100))),
        alpha: Math.min(100, Math.max(10, Math.round(((f.alpha + 5) / 10) * 100))),
        cost: Math.min(100, Math.max(10, Math.round((1 - f.expenseRatio / 2) * 100))),
        safety: Math.min(100, Math.max(10, Math.round((1 - f.volatilityStdDev / 25) * 100))),
      },
    }));
  }, [funds]);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-3.5 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-10 min-w-0 w-full">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/funds"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5 sm:size-4" /> Back to fund list
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
            >
              <Share2 className="size-3.5 text-brand" />
              <span>{copiedLink ? "Link Copied!" : "Share Comparison"}</span>
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 border border-brand/20 px-3 py-1 text-xs font-semibold text-brand">
              <Scale className="size-3.5" /> Side-by-Side Fund Analysis (Max 4 Funds)
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">
              Mutual Fund Comparison Engine
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs sm:text-base text-muted-foreground">
              Analyze return consistency, risk efficiency, total cost drag, and operational parameters across up to 4 funds with interactive left-to-right slider views.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
              {funds.length} of 4 funds loaded
            </span>
            {activeIds.length < 4 && (
              <Button onClick={openAddModal} size="sm" className="rounded-full bg-brand text-white hover:bg-brand-deep text-xs">
                <Plus className="size-3.5 mr-1" /> Add Fund
              </Button>
            )}
          </div>
        </div>

        {/* --- INTERACTIVE LEFT-TO-RIGHT FUND SLIDER CONTROLLER BAR --- */}
        <div className="mt-8 rounded-3xl border border-brand/30 bg-card/90 p-4 sm:p-5 shadow-lg backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-brand" />
              <h3 className="text-xs sm:text-sm font-bold">Left-to-Right Fund Focus Slider</h3>
              <ExplainHint hint="Use the slider or arrow buttons to slide focus smoothly across selected funds from left to right." />
            </div>

            {/* View Mode Tabs */}
            <div className="flex items-center gap-1 rounded-full bg-accent/60 p-1 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setViewMode("slider")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all",
                  viewMode === "slider" ? "bg-brand text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Layers className="size-3.5" /> Slider View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all",
                  viewMode === "table" ? "bg-brand text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <BarChart3 className="size-3.5" /> Matrix View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("radar")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all",
                  viewMode === "radar" ? "bg-brand text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Sparkles className="size-3.5" /> Radar Spotlight
              </button>
            </div>
          </div>

          {/* Slider Controls Row */}
          <div className="mt-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={activeSliderIndex === 0}
                onClick={() => handleSliderChange(activeSliderIndex - 1)}
                className="grid size-9 place-items-center rounded-full border border-border bg-background hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Slide left to previous fund"
              >
                <ChevronLeft className="size-5" />
              </button>
              <span className="text-xs font-bold w-24 text-center">
                Fund {activeSliderIndex + 1} of {funds.length}
              </span>
              <button
                type="button"
                disabled={activeSliderIndex === funds.length - 1}
                onClick={() => handleSliderChange(activeSliderIndex + 1)}
                className="grid size-9 place-items-center rounded-full border border-border bg-background hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Slide right to next fund"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>

            {/* Range Slider Track */}
            <div className="w-full flex-1 px-2">
              <Slider
                min={0}
                max={funds.length - 1}
                step={1}
                value={[activeSliderIndex]}
                onValueChange={(val) => handleSliderChange(val[0])}
                className="w-full"
              />
            </div>

            {/* Fund Name Quick Selector Pills */}
            <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-end shrink-0">
              {funds.map((f, i) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleSliderChange(i)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all flex items-center gap-1",
                    activeSliderIndex === i
                      ? "bg-brand text-white shadow"
                      : "bg-accent/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <span className="size-1.5 rounded-full bg-current" />
                  <span className="max-w-[110px] truncate">{f.name.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* --- VIEW MODE 1: CAROUSEL CARD SLIDER VIEW --- */}
        {viewMode === "slider" && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Layers className="size-5 text-brand" /> Slide & Compare Fund Profiles
              </h2>
              <span className="text-xs text-muted-foreground">Swipe or use arrows to view all details</span>
            </div>

            <div
              ref={sliderContainerRef}
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-4 pt-1"
            >
              {funds.map((f, i) => {
                const isSelected = activeSliderIndex === i;
                const isWinner = winningFund?.fund.id === f.id;
                const winCount = fundScores.find((fs) => fs.fund.id === f.id)?.score || 0;

                return (
                  <div
                    key={f.id}
                    onClick={() => handleSliderChange(i)}
                    className={cn(
                      "snap-center shrink-0 w-[300px] sm:w-[340px] rounded-3xl border p-5 transition-all duration-300 relative flex flex-col justify-between cursor-pointer",
                      isSelected
                        ? "border-brand bg-card ring-2 ring-brand/30 shadow-xl scale-[1.01]"
                        : "border-border bg-card/60 opacity-85 hover:opacity-100 hover:border-brand/40"
                    )}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Fund #{i + 1}
                        </span>
                        {isWinner && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            <Sparkles className="size-3" /> Parameter Leader ({winCount} wins)
                          </span>
                        )}
                        {funds.length > 2 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFund(i);
                            }}
                            className="rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            title="Remove"
                          >
                            <X className="size-4" />
                          </button>
                        )}
                      </div>

                      {/* Header Info */}
                      <h3 className="text-base font-bold text-foreground line-clamp-2 min-h-[48px]">
                        {f.name}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {fundCategoryLabel(f.category)} · {f.amc}
                      </p>

                      {/* Key Metric Highlights */}
                      <div className="mt-5 grid grid-cols-2 gap-2.5 rounded-2xl bg-accent/40 p-3.5">
                        <div>
                          <span className="text-[10px] text-muted-foreground block font-medium">3Y CAGR</span>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {f.returns.y3.toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block font-medium">Expense Ratio</span>
                          <span className="text-sm font-bold text-foreground">{f.expenseRatio}%</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block font-medium">Sharpe Ratio</span>
                          <span className="text-sm font-bold text-foreground">{f.sharpe.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block font-medium">Risk Level</span>
                          <span className="text-sm font-bold text-foreground">{f.risk}</span>
                        </div>
                      </div>

                      {/* Detailed Return Bar Gauges */}
                      <div className="mt-4 space-y-2">
                        <span className="text-[11px] font-bold text-foreground block">Return Trajectory</span>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-muted-foreground">1-Year</span>
                            <span className="font-semibold">{f.returns.y1.toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-accent overflow-hidden">
                            <div
                              className="h-full bg-brand rounded-full transition-all"
                              style={{ width: `${Math.min(100, (f.returns.y1 / 35) * 100)}%` }}
                            />
                          </div>

                          <div className="flex justify-between items-center text-[11px] pt-1">
                            <span className="text-muted-foreground">5-Year CAGR</span>
                            <span className="font-semibold">{f.returns.y5.toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-accent overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${Math.min(100, (f.returns.y5 / 35) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Cost Summary */}
                      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">10Y Fee / ₹1L:</span>
                        <span className="font-bold text-foreground">₹{(1000 * f.expenseRatio * 10).toLocaleString("en-IN")}</span>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openSwapModal(i);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                      >
                        <RefreshCw className="size-3.5" /> Swap Fund
                      </button>
                      <Link
                        to="/funds/$code"
                        params={{ code: f.id }}
                        className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-foreground hover:bg-accent/80 transition-colors"
                      >
                        Full Profile <ArrowRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}

              {/* Add Fund Slot Card */}
              {activeIds.length < 4 && (
                <div
                  onClick={openAddModal}
                  className="snap-center shrink-0 w-[260px] sm:w-[300px] rounded-3xl border-2 border-dashed border-border hover:border-brand/50 bg-accent/20 hover:bg-brand/5 p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group min-h-[360px]"
                >
                  <div className="size-12 rounded-full bg-brand/10 text-brand flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="size-6" />
                  </div>
                  <h4 className="mt-3 text-sm font-bold text-foreground">Add Another Fund</h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Compare up to 4 funds simultaneously side-by-side. ({4 - activeIds.length} slot remaining)
                  </p>
                  <Button size="sm" className="mt-4 rounded-full bg-brand text-white text-xs">
                    Browse Funds
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- VIEW MODE 2: MATRIX TABLE WITH STICKY HEADERS --- */}
        {viewMode === "table" && (
          <div className="mt-8 space-y-4">
            {/* Category Filter Pills for Table */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <span className="text-xs font-bold text-muted-foreground shrink-0">Filter Metrics:</span>
              <button
                type="button"
                onClick={() => setSelectedCatFilter("all")}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors shrink-0",
                  selectedCatFilter === "all" ? "bg-brand text-white" : "bg-accent/60 text-muted-foreground hover:text-foreground"
                )}
              >
                All Metrics ({ROWS.length})
              </button>
              {(Object.keys(CATEGORY_LABELS) as MetricCategory[]).map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setSelectedCatFilter(cat)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold transition-colors shrink-0",
                    selectedCatFilter === cat ? "bg-brand text-white" : "bg-accent/60 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            {/* Side-by-Side Comparison Table */}
            <div
              ref={tableContainerRef}
              className="overflow-x-auto overscroll-x-contain rounded-3xl border border-border bg-card shadow-lg"
            >
              <table className="w-full text-xs sm:text-sm min-w-[650px]">
                <thead className="bg-accent/50 text-left">
                  <tr>
                    <th className="px-4 py-4 font-bold sticky left-0 z-30 bg-card border-r border-border/60 shadow-sm min-w-[160px] sm:min-w-[210px]">
                      Parameter
                    </th>
                    {funds.map((f, i) => (
                      <th
                        key={f.id}
                        className={cn(
                          "px-4 py-4 font-bold min-w-[170px] sm:min-w-[200px] border-r border-border/40 transition-colors",
                          activeSliderIndex === i && "bg-brand/5 border-brand/40"
                        )}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] uppercase font-bold text-brand">Fund #{i + 1}</span>
                          <button
                            type="button"
                            onClick={() => openSwapModal(i)}
                            className="text-[10px] text-muted-foreground hover:text-brand"
                          >
                            Swap
                          </button>
                        </div>
                        <div className="line-clamp-1 text-xs sm:text-sm font-bold mt-0.5">{f.name}</div>
                        <div className="text-[10px] font-normal text-muted-foreground">
                          {fundCategoryLabel(f.category)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.key} className="border-t border-border/60 hover:bg-accent/20 transition-colors">
                      <td className="align-top px-4 py-3.5 sticky left-0 z-20 bg-card border-r border-border/60 shadow-sm">
                        <div className="font-semibold text-xs sm:text-sm flex items-center justify-between gap-1">
                          <span>{row.label}</span>
                          <ExplainHint hint={row.why} />
                        </div>
                      </td>
                      {funds.map((f, i) => {
                        const isBest = row.numeric(f) === bestByRow[row.key];
                        return (
                          <td
                            key={f.id}
                            className={cn(
                              "px-4 py-3.5 border-r border-border/30 transition-colors",
                              isBest && "bg-emerald-500/10 dark:bg-emerald-500/15 font-bold text-foreground",
                              activeSliderIndex === i && !isBest && "bg-brand/5"
                            )}
                          >
                            <div className="flex items-center gap-1.5">
                              {isBest && <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />}
                              <span className={cn("truncate", isBest && "text-emerald-700 dark:text-emerald-300 font-bold")}>
                                {row.format(f)}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- VIEW MODE 3: RADAR SPOTLIGHT VIEW --- */}
        {viewMode === "radar" && (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {/* Radar Multi-Metric Chart Card */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-brand" />
                  <h3 className="text-base font-bold">Multi-Metric Radar Comparison</h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Visual decision overlay across returns, risk efficiency (Sharpe), alpha, TER cost savings, and stability.
                </p>
              </div>

              <div className="mt-6 h-64 sm:h-72 w-full flex items-center justify-center">
                <SvgRadarChart data={radarData} axes={radarAxes} />
              </div>
            </div>

            {/* Decision Leaderboard Summary Card */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-brand" />
                  <h3 className="text-base font-bold">Parameter Leadership Scoreboard</h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Which fund leads on the most parameters overall?
                </p>

                <div className="mt-6 space-y-3">
                  {fundScores.map(({ fund, score }, idx) => (
                    <div
                      key={fund.id}
                      className={cn(
                        "rounded-2xl border p-4 flex items-center justify-between gap-3 transition-colors",
                        winningFund?.fund.id === fund.id ? "border-emerald-500/50 bg-emerald-500/10" : "border-border bg-accent/20"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                          <h4 className="text-xs sm:text-sm font-bold truncate">{fund.name}</h4>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {fundCategoryLabel(fund.category)} · TER: {fund.expenseRatio}%
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-brand block">{score} Parameter Wins</span>
                        <span className="text-[10px] text-muted-foreground">Out of {ROWS.length} metrics</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border/60">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  💡 <strong>Decision Tip:</strong> Do not rely solely on return numbers. Check Sharpe Ratio for risk efficiency and TER for long-term compound savings.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Recommendation Callout */}
        <div className="mt-10 rounded-3xl border border-border bg-gradient-brand/5 p-5 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-foreground">Need a personalized recommendation?</h3>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-xl">
              Answer 3 quick questions about your investment horizon and risk tolerance to get a customized fund allocation plan.
            </p>
          </div>
          <Button asChild className="rounded-full bg-gradient-brand text-white shadow-glow shrink-0">
            <Link to="/recommend">Start Personal Profiling</Link>
          </Button>
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
        <DialogTitle>{isSwap ? "Swap Fund Selection" : "Add Fund to Compare"}</DialogTitle>
        <DialogDescription>
          {isSwap ? "Select a fund to replace the current selection slot." : "Pick a fund (up to 4 allowed) for side-by-side comparison."}
        </DialogDescription>
      </DialogHeader>

      <div className="relative mt-2 mb-3">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by fund name, AMC, or category..."
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
      <div className="flex-1 overflow-y-auto divide-y divide-border/60 pr-1 max-h-[300px]">
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
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-medium text-accent-foreground">
                    {fundCategoryLabel(f.category)}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                  {f.amc} · 3Y: {f.returns.y3}% · TER: {f.expenseRatio}%
                </p>
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
          <div className="py-8 text-center text-xs text-muted-foreground">No funds match your search criteria.</div>
        )}
      </div>
    </Dialog>
  );
}