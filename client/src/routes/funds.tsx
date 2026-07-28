import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Sparkles, TrendingUp, Info, Activity, X } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

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
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Mutual Funds Explorer</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Live data from mfapi.in. Search for any Indian mutual fund to see performance, drawdown, and AI-powered insights. No commissions or affiliations.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/funds/compare">Compare funds</Link>
            </Button>
            <Button asChild className="rounded-full bg-gradient-brand text-white">
              <Link to="/calculators">Calculators</Link>
            </Button>
          </div>
        </div>

        <div className="mt-8 max-w-xl">
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
              onClick={() => setSelectedCode(f.schemeCode)}
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

      <Sheet open={!!selectedCode} onOpenChange={(o) => !o && setSelectedCode(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl p-0 sm:p-6">
          {selectedCode && <FundDetailView code={selectedCode} onClose={() => setSelectedCode(null)} />}
        </SheetContent>
      </Sheet>
    </SiteLayout>
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