import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { FUND_CATEGORIES, MUTUAL_FUNDS, fundCategoryLabel, type FundCategory, type MutualFund } from "@/data/mutualFunds";

export const Route = createFileRoute("/funds")({
  head: () => ({
    meta: [
      { title: "Mutual Funds Explorer — Cash&Choices" },
      { name: "description", content: "Explore mutual funds with live API data." },
    ],
  }),
  component: FundsPage,
});

type SchemeListItem = { schemeCode: number; schemeName: string };

type NavValue = { Date: string; Nav: number };
type HistoryPoint = { Date: string; Nav: number };
type FundDetail = {
  Meta: {
    fund_house: string;
    scheme_type: string;
    scheme_category: string;
    scheme_code: number;
    scheme_name: string;
  };
  Latest: NavValue;
  Change1m: number | null;
  Change6m: number | null;
  Change1y: number | null;
  Change3y: number | null;
  High52w: NavValue | null;
  Low52w: NavValue | null;
  DrawdownFromHigh: number | null;
  History: HistoryPoint[];
};

function FundsPage() {
  const [query, setQuery] = useState("");
  const [selectedCode, setSelectedCode] = useState<number | null>(null);
  const [selectedFund, setSelectedFund] = useState<MutualFund | null>(null);
  const [selectedFeaturedId, setSelectedFeaturedId] = useState(MUTUAL_FUNDS[0].id);
  const [selectedCategory, setSelectedCategory] = useState<FundCategory | null>(null);

  const featuredFunds = useMemo(() => {
    return [...MUTUAL_FUNDS]
      .sort((a, b) => fundScore(b) - fundScore(a))
      .slice(0, 3);
  }, []);
  const selectedFeatured = MUTUAL_FUNDS.find((fund) => fund.id === selectedFeaturedId) ?? featuredFunds[0];
  const visibleFunds = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return MUTUAL_FUNDS.filter((fund) => {
      const matchesCategory = !selectedCategory || fund.category === selectedCategory;
      const matchesQuery = !normalizedQuery || `${fund.name} ${fund.amc} ${fundCategoryLabel(fund.category)}`.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [query, selectedCategory]);
  const popularCategories = useMemo(() => {
    const categoryCounts = MUTUAL_FUNDS.reduce<Record<string, number>>((counts, fund) => {
      counts[fund.category] = (counts[fund.category] || 0) + 1;
      return counts;
    }, {});
    return [...FUND_CATEGORIES]
      .sort((a, b) => (categoryCounts[b.id] || 0) - (categoryCounts[a.id] || 0))
      .slice(0, 6);
  }, []);

  const { data: searchResults = [], isFetching } = useQuery({
    queryKey: ["fundsSearch", query],
    queryFn: async () => {
      if (query.length < 2) return [];
      const res = await apiFetch(`/api/funds/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json() as Promise<SchemeListItem[]>;
    },
    enabled: query.length >= 2,
  });

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              <BarChart3 className="size-3.5" /> Mutual fund discovery
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Find funds that fit your plan.</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Start with a shortlist built around consistency, cost and risk-adjusted performance. Then search live NAV data when you have a fund in mind.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/funds/compare">Compare funds</Link>
            </Button>
            <Button asChild className="rounded-full bg-gradient-brand text-white">
              <Link to="/calculators">Check returns</Link>
            </Button>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.45fr_0.85fr]">
          <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-card sm:p-7">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-deep">
                  <ShieldCheck className="size-3.5" /> Editorial shortlist
                </div>
                <h2 className="mt-2 text-xl font-bold">Funds worth understanding first</h2>
                <p className="mt-1 text-xs text-muted-foreground">A starting list, not a buy signal. We balance return, cost and volatility.</p>
              </div>
              <Link to="/recommend" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-deep hover:underline">
                Use my profile <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {featuredFunds.map((fund, index) => (
                <button
                  key={fund.id}
                  type="button"
                  onClick={() => {
                    setSelectedFeaturedId(fund.id);
                    setSelectedFund(fund);
                  }}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-soft",
                    selectedFeatured?.id === fund.id ? "border-brand bg-brand/5 ring-1 ring-brand/30" : "border-border bg-background",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">#{index + 1} shortlist</span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{fund.returns.y3.toFixed(1)}% 3Y</span>
                  </div>
                  <h3 className="mt-3 line-clamp-2 text-sm font-semibold">{fund.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{fundCategoryLabel(fund.category)} · {fund.risk} risk</p>
                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Cost</span>
                    <span className="font-semibold">{fund.expenseRatio.toFixed(2)}%</span>
                  </div>
                </button>
              ))}
            </div>

            {selectedFeatured && <FeaturedFundSnapshot fund={selectedFeatured} />}
          </div>

          <div className="rounded-3xl border border-border/70 bg-surface p-6 shadow-soft sm:p-7">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <TrendingUp className="size-3.5 text-brand" /> Popular categories
            </div>
            <h2 className="mt-2 text-xl font-bold">Choose by what you need.</h2>
            <div className="mt-5 space-y-2">
              {popularCategories.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  selected={selectedCategory === category.id}
                  onSelect={() => {
                    setSelectedCategory(category.id);
                    const categoryFund = MUTUAL_FUNDS.find((fund) => fund.category === category.id);
                    if (categoryFund) {
                      setSelectedFeaturedId(categoryFund.id);
                      setSelectedFund(categoryFund);
                    }
                  }}
                />
              ))}
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
              Categories describe the kind of exposure a fund gives you. They are not risk ratings.
            </p>
          </div>
        </div>

        <div className="mt-12 max-w-2xl">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-lg font-bold">Search the live fund universe</h2>
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">mfapi.in</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value.slice(0, 80))}
              placeholder="Search by fund name (e.g. Parag Parikh, HDFC)..."
              className="rounded-full pl-9"
            />
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft">
          <div className="flex flex-col justify-between gap-3 border-b border-border/70 p-5 sm:flex-row sm:items-center sm:px-6">
            <div>
              <h2 className="text-lg font-bold">Funds at a glance</h2>
              <p className="mt-1 text-xs text-muted-foreground">Tap any fund to see its full profile and performance details.</p>
            </div>
            <span className="text-xs text-muted-foreground">{visibleFunds.length} funds shown</span>
          </div>
          <div className="divide-y divide-border/70">
            {visibleFunds.map((fund) => (
              <button
                key={fund.id}
                type="button"
                onClick={() => setSelectedFund(fund)}
                className="grid w-full gap-4 p-4 text-left transition-colors hover:bg-accent/40 sm:grid-cols-[minmax(0,1.6fr)_110px_120px_150px] sm:items-center sm:px-6"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold">{fund.name}</h3>
                    <span className="hidden rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground sm:inline-flex">{fund.planType}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{fund.amc} · {fundCategoryLabel(fund.category)} · {fund.risk} risk</p>
                </div>
                <div className="hidden sm:block">
                  <MiniPerformanceChart fund={fund} />
                </div>
                <div className="flex items-center justify-between gap-3 sm:block">
                  <span className="text-xs text-muted-foreground">3M return</span>
                  <span className={cn("text-sm font-bold", fund.returns.m3 >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>{formatReturn(fund.returns.m3)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs sm:block">
                  <span className="text-muted-foreground">5Y CAGR</span>
                  <span className="font-semibold">{fund.returns.y5.toFixed(1)}% <ArrowRight className="ml-1 inline size-3.5 text-brand" /></span>
                </div>
              </button>
            ))}
            {visibleFunds.length === 0 && (
              <div className="p-10 text-center text-sm text-muted-foreground">No curated funds match this search.</div>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {query.length >= 2 && searchResults.length === 0 && !isFetching && (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
              No funds match your search.
            </p>
          )}
          {isFetching && (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground animate-pulse">
              Searching...
            </p>
          )}
          {searchResults.map((f) => (
            <button
              key={f.schemeCode}
              onClick={() => {
                setSelectedCode(f.schemeCode);
                setSelectedFund(null);
              }}
              className="group flex flex-col rounded-3xl border border-border bg-card p-5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-glow"
            >
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                Code: {f.schemeCode}
              </div>
              <h3 className="font-semibold group-hover:text-brand line-clamp-2">{f.schemeName}</h3>
            </button>
          ))}
        </div>
      </section>

      <Sheet
        open={!!selectedCode || !!selectedFund}
        onOpenChange={(o) => {
          if (!o) {
            setSelectedCode(null);
            setSelectedFund(null);
          }
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl p-0 sm:p-6">
          {selectedCode && <FundDetailView code={selectedCode} onClose={() => setSelectedCode(null)} />}
          {selectedFund && <CuratedFundDetailView fund={selectedFund} onClose={() => setSelectedFund(null)} />}
        </SheetContent>
      </Sheet>
    </SiteLayout>
  );
}

function fundScore(fund: MutualFund) {
  return fund.returns.y3 * 2 + fund.sharpe * 10 - fund.expenseRatio * 3 - fund.volatilityStdDev * 0.2;
}

function CategoryRow({
  category,
  selected,
  onSelect,
}: {
  category: { id: FundCategory; label: string; blurb: string };
  selected: boolean;
  onSelect: () => void;
}) {
  const categoryFundCount = MUTUAL_FUNDS.filter((fund) => fund.category === category.id).length;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-colors",
        selected ? "border-brand bg-brand/5" : "border-border bg-background hover:bg-accent",
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{category.label}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{category.blurb}</span>
      </span>
      <span className="ml-3 shrink-0 rounded-full bg-accent px-2 py-1 text-[10px] font-semibold text-accent-foreground">
        {categoryFundCount} funds
      </span>
    </button>
  );
}

function FeaturedFundSnapshot({ fund }: { fund: MutualFund }) {
  const performance = [fund.returns.m1, fund.returns.m3, fund.returns.m6, fund.returns.y1, fund.returns.y3];
  const min = Math.min(...performance);
  const max = Math.max(...performance);
  const range = max - min || 1;
  const points = performance
    .map((value, index) => `${(index / (performance.length - 1)) * 100},${36 - ((value - min) / range) * 28}`)
    .join(" ");

  return (
    <div className="mt-5 rounded-2xl border border-border/70 bg-background p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Selected snapshot</div>
          <h3 className="mt-1 font-semibold">{fund.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{fund.amc} · {fund.benchmark}</p>
        </div>
        <Link to="/funds/compare" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-deep hover:underline">
          Compare funds <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1.4fr] sm:items-center">
        <div className="grid grid-cols-3 gap-2">
          <SnapshotMetric label="3Y CAGR" value={`${fund.returns.y3.toFixed(1)}%`} positive />
          <SnapshotMetric label="5Y CAGR" value={`${fund.returns.y5.toFixed(1)}%`} positive />
          <SnapshotMetric label="Volatility" value={`${fund.volatilityStdDev.toFixed(1)}%`} />
        </div>
        <div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Recent return trend</span>
            <span>1M · 3M · 6M · 1Y · 3Y</span>
          </div>
          <svg viewBox="0 0 100 42" preserveAspectRatio="none" className="mt-2 h-14 w-full overflow-visible">
            <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" vectorEffect="non-scaling-stroke" className="text-brand" />
            {performance.map((value, index) => (
              <circle key={`${value}-${index}`} cx={(index / (performance.length - 1)) * 100} cy={36 - ((value - min) / range) * 28} r="1.8" className="fill-brand" />
            ))}
          </svg>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Expense ratio <strong className="text-foreground">{fund.expenseRatio.toFixed(2)}%</strong></span>
        <span>Min SIP <strong className="text-foreground">₹{fund.minSip.toLocaleString("en-IN")}</strong></span>
        <span>Risk <strong className="text-foreground">{fund.risk}</strong></span>
      </div>
    </div>
  );
}

function SnapshotMetric({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-xl border border-border p-2.5">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-sm font-bold", positive && "text-emerald-600 dark:text-emerald-400")}>{value}</div>
    </div>
  );
}

function formatReturn(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function MiniPerformanceChart({ fund }: { fund: MutualFund }) {
  const values = [0, fund.returns.m1, fund.returns.m3];
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;
  const y = (value: number) => 22 - ((value - min) / range) * 18;
  const points = values.map((value, index) => `${index * 50},${y(value)}`).join(" ");
  const positive = fund.returns.m3 >= 0;

  return (
    <div className="w-full" aria-label={`Three month performance ${formatReturn(fund.returns.m3)}`}>
      <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-full">
        <line x1="0" x2="100" y1={y(0)} y2={y(0)} stroke="currentColor" strokeDasharray="2 2" className="text-border" />
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" vectorEffect="non-scaling-stroke" className={positive ? "text-emerald-500" : "text-rose-500"} />
        {values.map((value, index) => <circle key={index} cx={index * 50} cy={y(value)} r="1.7" className={positive ? "fill-emerald-500" : "fill-rose-500"} />)}
      </svg>
      <div className="mt-0.5 flex justify-between text-[9px] text-muted-foreground"><span>Start</span><span>1M</span><span>3M</span></div>
    </div>
  );
}

function CuratedFundDetailView({ fund, onClose }: { fund: MutualFund; onClose: () => void }) {
  return (
    <div className="p-6 sm:p-0">
      <SheetHeader className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <SheetTitle className="text-left text-xl leading-tight">{fund.name}</SheetTitle>
            <SheetDescription className="mt-1 text-left">{fund.amc} · {fundCategoryLabel(fund.category)} · {fund.planType} plan</SheetDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="-mr-2 shrink-0"><X className="size-4" /></Button>
        </div>
      </SheetHeader>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricBox label="NAV" value={`₹${fund.nav}`} sub={`As of ${fund.navAsOf}`} />
        <MetricBox label="3M return" value={formatReturn(fund.returns.m3)} positive={fund.returns.m3 >= 0} />
        <MetricBox label="5Y CAGR" value={`${fund.returns.y5.toFixed(1)}%`} positive />
        <MetricBox label="Risk" value={fund.risk} />
      </div>
      <div className="mt-6 rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">3-month performance</h3>
            <p className="mt-1 text-xs text-muted-foreground">A small view of the recent return path.</p>
          </div>
          <span className={cn("text-sm font-bold", fund.returns.m3 >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>{formatReturn(fund.returns.m3)}</span>
        </div>
        <div className="mt-5 rounded-2xl bg-background p-3"><MiniPerformanceChart fund={fund} /></div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <MetricBox label="Expense ratio" value={`${fund.expenseRatio.toFixed(2)}%`} sub="Lower is generally cheaper" />
        <MetricBox label="Minimum SIP" value={`₹${fund.minSip.toLocaleString("en-IN")}`} sub={fund.exitLoad} />
      </div>
      <div className="mt-6 rounded-3xl border border-border bg-muted/30 p-5">
        <h3 className="font-semibold">Good fit when</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">{fund.goodIf.map((item) => <li key={item}>• {item}</li>)}</ul>
        <h3 className="mt-5 font-semibold">Watch out when</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">{fund.avoidIf.map((item) => <li key={item}>• {item}</li>)}</ul>
      </div>
      <Button asChild className="mt-6 w-full rounded-full bg-gradient-brand text-white"><Link to="/funds/compare">Compare this fund <ArrowRight className="size-4" /></Link></Button>
    </div>
  );
}

function FundDetailView({ code, onClose }: { code: number; onClose: () => void }) {
  const { data: fund, isLoading, error } = useQuery({
    queryKey: ["fundDetail", code],
    queryFn: async () => {
      const res = await apiFetch(`/api/funds/detail?code=${code}`);
      if (!res.ok) throw new Error("Failed to load fund details");
      return res.json() as Promise<FundDetail>;
    },
  });

  const ai = useMutation({
    mutationFn: async () => {
      if (!fund) return null;
      const res = await apiFetch("/api/funds/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fund.Meta.scheme_name,
          category: fund.Meta.scheme_category,
          change1y: fund.Change1y,
          change3y: fund.Change3y,
          drawdownFromHigh: fund.DrawdownFromHigh,
        }),
      });
      if (!res.ok) throw new Error("Failed to get explanation");
      return res.json() as Promise<{ Text: string }>;
    },
  });

  if (isLoading) {
    return <div className="flex h-full items-center justify-center p-6 text-muted-foreground">Loading details...</div>;
  }

  if (error || !fund) {
    return <div className="flex h-full items-center justify-center p-6 text-rose-500">Failed to load fund data.</div>;
  }

  return (
    <div className="p-6 sm:p-0">
      <SheetHeader className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <SheetTitle className="text-left text-xl leading-tight">{fund.Meta.scheme_name}</SheetTitle>
            <SheetDescription className="text-left mt-1">
              {fund.Meta.fund_house} · {fund.Meta.scheme_category}
            </SheetDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 -mr-2">
            <X className="size-4" />
          </Button>
        </div>
      </SheetHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricBox label="Latest NAV" value={`₹${fund.Latest.Nav}`} sub={fund.Latest.Date} />
        <MetricBox label="1Y Return" value={fund.Change1y ? `${fund.Change1y}%` : "N/A"} positive={fund.Change1y ? fund.Change1y >= 0 : undefined} />
        <MetricBox label="3Y Return" value={fund.Change3y ? `${fund.Change3y}%` : "N/A"} positive={fund.Change3y ? fund.Change3y >= 0 : undefined} />
        <MetricBox label="Drawdown" value={fund.DrawdownFromHigh ? `${fund.DrawdownFromHigh}%` : "N/A"} positive={fund.DrawdownFromHigh ? fund.DrawdownFromHigh >= 0 : undefined} />
      </div>

      <div className="mt-8 rounded-3xl border bg-card p-6">
        <div className="flex items-center gap-2 font-medium">
          <Sparkles className="size-4 text-brand" />
          AI Performance Summary
        </div>
        
        {ai.data ? (
          <div className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {ai.data.Text}
          </div>
        ) : (
          <div className="mt-4">
            <Button
              onClick={() => ai.mutate()}
              disabled={ai.isPending}
              variant="outline"
              className="w-full sm:w-auto"
            >
              {ai.isPending ? "Analysing..." : "Explain these numbers"}
            </Button>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Activity className="size-4 text-muted-foreground" />
          52-Week Range
        </h3>
        <div className="rounded-2xl border p-4 bg-muted/30">
          <div className="flex justify-between text-sm">
            <div>
              <div className="text-muted-foreground mb-1">Low ({fund.Low52w?.Date})</div>
              <div className="font-medium">₹{fund.Low52w?.Nav}</div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground mb-1">High ({fund.High52w?.Date})</div>
              <div className="font-medium">₹{fund.High52w?.Nav}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-background p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-lg font-semibold", 
        positive === true && "text-emerald-600 dark:text-emerald-400",
        positive === false && "text-rose-600 dark:text-rose-400"
      )}>
        {value}
      </div>
      {sub && <div className="mt-1 text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}