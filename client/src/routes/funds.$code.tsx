import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart2,
  Brain,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { AnimatedCard } from "@/components/AnimatedCard";

export const Route = createFileRoute("/funds/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Fund #${params.code} | Cash & Choices` },
      {
        name: "description",
        content: `Full performance history, AI insights, and metrics for mutual fund scheme ${params.code}.`,
      },
    ],
  }),
  component: FundDetailPage,
});

type NavValue = { date: string; nav: number };
type HistoryPoint = { date: string; nav: number };
type FundDetail = {
  meta: { scheme_name: string; fund_house: string; scheme_type: string; scheme_category: string; scheme_code: number };
  latest: NavValue;
  change1y: number | null;
  change3y: number | null;
  high52w: NavValue | null;
  low52w: NavValue | null;
  drawdownFromHigh: number | null;
  history: HistoryPoint[];
};

function FundDetailPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const schemeCode = parseInt(code, 10);

  const { data: fund, isLoading, error } = useQuery({
    queryKey: ["fundDetail", schemeCode],
    queryFn: async () => {
      const res = await apiFetch(`/api/funds/detail?code=${schemeCode}`);
      if (!res.ok) throw new Error("Failed to load fund details");
      return res.json() as Promise<FundDetail>;
    },
    enabled: !isNaN(schemeCode),
  });

  const ai = useMutation({
    mutationFn: async () => {
      if (!fund) return null;
      const res = await apiFetch("/api/funds/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fund.meta.scheme_name,
          category: fund.meta.scheme_category,
          change1y: fund.change1y,
          change3y: fund.change3y,
          drawdownFromHigh: fund.drawdownFromHigh,
        }),
      });
      if (!res.ok) throw new Error("Failed to get explanation");
      return res.json() as Promise<{ Text: string }>;
    },
  });

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <BarChart2 className="size-10 animate-pulse text-brand" />
            <p className="text-sm">Loading fund data…</p>
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (error || !fund) {
    return (
      <SiteLayout>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
          <p className="text-rose-500">Failed to load fund data.</p>
          <Button variant="outline" onClick={() => navigate({ to: "/funds" })}>
            <ArrowLeft className="mr-2 size-4" /> Back to Funds
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const hasHistory = fund.history && fund.history.length > 1;

  // Build SVG path from history
  const navHistory = hasHistory ? fund.history.slice(-180) : []; // last ~6 months
  const navValues = navHistory.map((p) => p.nav);
  const minNav = Math.min(...navValues);
  const maxNav = Math.max(...navValues);
  const navRange = maxNav - minNav || 1;
  const W = 1000;
  const H = 220;
  const pts = navHistory.map((p, i) => {
    const x = (i / (navHistory.length - 1)) * W;
    const y = H - ((p.nav - minNav) / navRange) * H;
    return `${x},${y}`;
  });
  const svgPath = `M ${pts.join(" L ")}`;
  const firstNav = navHistory[0]?.nav ?? 0;
  const lastNav = navHistory[navHistory.length - 1]?.nav ?? 0;
  const historyPositive = lastNav >= firstNav;

  // 52-week progress
  const low52 = fund.low52w?.nav ?? 0;
  const high52 = fund.high52w?.nav ?? 0;
  const latest = fund.latest.nav;
  const progress52 = high52 > low52 ? ((latest - low52) / (high52 - low52)) * 100 : 50;

  return (
    <SiteLayout>
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {/* Back + breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/funds" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" /> Funds
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium line-clamp-1">{fund.meta.scheme_name}</span>
        </div>

        {/* Header */}
        <AnimatedCard delay={0} className="rounded-3xl border border-border/70 bg-card p-6 shadow-card sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                <BarChart2 className="size-3.5" /> {fund.meta.scheme_category}
              </div>
              <h1 className="mt-3 text-xl font-bold leading-snug sm:text-2xl">{fund.meta.scheme_name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{fund.meta.fund_house} · {fund.meta.scheme_type}</p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-2xl font-bold tracking-tight">₹{fund.latest.nav}</div>
              <div className="text-xs text-muted-foreground">NAV as of {fund.latest.date}</div>
            </div>
          </div>

          {/* Key metrics row */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricBox
              label="1Y Return"
              value={fund.change1y != null ? `${fund.change1y >= 0 ? "+" : ""}${fund.change1y}%` : "N/A"}
              positive={fund.change1y != null ? fund.change1y >= 0 : undefined}
              icon={fund.change1y != null && fund.change1y >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            />
            <MetricBox
              label="3Y Return"
              value={fund.change3y != null ? `${fund.change3y >= 0 ? "+" : ""}${fund.change3y}%` : "N/A"}
              positive={fund.change3y != null ? fund.change3y >= 0 : undefined}
            />
            <MetricBox
              label="Drawdown from High"
              value={fund.drawdownFromHigh != null ? `${fund.drawdownFromHigh}%` : "N/A"}
              positive={fund.drawdownFromHigh != null ? fund.drawdownFromHigh >= 0 : undefined}
            />
            <MetricBox label="Scheme Code" value={`#${fund.meta.scheme_code}`} />
          </div>
        </AnimatedCard>

        {/* Performance Chart */}
        {hasHistory && (
          <AnimatedCard delay={0.1} className="mt-6 rounded-3xl border border-border/70 bg-card p-6 shadow-soft sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 font-semibold">
                  <Activity className="size-4 text-brand" /> NAV History
                  <span className="text-xs font-normal text-muted-foreground">(last 6 months)</span>
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {navHistory[0]?.date} → {navHistory[navHistory.length - 1]?.date}
                </p>
              </div>
              <div className={cn("flex items-center gap-1 text-sm font-bold", historyPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500")}>
                {historyPositive ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                {historyPositive ? "+" : ""}{((lastNav - firstNav) / firstNav * 100).toFixed(2)}%
              </div>
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl bg-muted/40 p-3">
              <svg
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="none"
                className="h-44 w-full"
              >
                {/* Gradient fill */}
                <defs>
                  <linearGradient id="navGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={historyPositive ? "#10b981" : "#f43f5e"} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={historyPositive ? "#10b981" : "#f43f5e"} stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path
                  d={`${svgPath} L ${W},${H} L 0,${H} Z`}
                  fill="url(#navGrad)"
                />
                <path
                  d={svgPath}
                  fill="none"
                  stroke={historyPositive ? "#10b981" : "#f43f5e"}
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                <span>₹{minNav.toFixed(2)}</span>
                <span>₹{maxNav.toFixed(2)}</span>
              </div>
            </div>
          </AnimatedCard>
        )}

        {/* 52-Week Range */}
        {fund.high52w && fund.low52w && (
          <AnimatedCard delay={0.2} className="mt-6 rounded-3xl border border-border/70 bg-card p-6 shadow-soft sm:p-8">
            <h2 className="flex items-center gap-2 font-semibold">
              <Info className="size-4 text-brand" /> 52-Week Range
            </h2>
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Low · ₹{fund.low52w.nav} <span className="opacity-60">({fund.low52w.date})</span></span>
                <span>High · ₹{fund.high52w.nav} <span className="opacity-60">({fund.high52w.date})</span></span>
              </div>
              <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-brand to-emerald-500"
                  style={{ width: `${Math.min(100, Math.max(0, progress52))}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Current ₹{fund.Latest.Nav}</span>
                <span className="text-muted-foreground font-medium">
                  {progress52.toFixed(0)}% from low
                </span>
              </div>
            </div>
          </AnimatedCard>
        )}

        {/* AI Insight */}
        <AnimatedCard delay={0.3} className="mt-6 rounded-3xl border border-border/70 bg-card p-6 shadow-soft sm:p-8">
          <h2 className="flex items-center gap-2 font-semibold">
            <Sparkles className="size-4 text-brand" /> AI Performance Summary
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Powered by your backend AI — plain-English interpretation of this fund's numbers.
          </p>

          {ai.data ? (
            <div className="mt-5 rounded-2xl bg-accent/60 p-4 text-sm leading-relaxed text-foreground">
              <Brain className="mb-3 size-5 text-brand" />
              {ai.data.Text}
            </div>
          ) : (
            <div className="mt-5">
              <Button
                onClick={() => ai.mutate()}
                disabled={ai.isPending || isLoading}
                className="rounded-full bg-gradient-brand text-white shadow-glow"
              >
                {ai.isPending ? (
                  <span className="flex items-center gap-2">
                    <Sparkles className="size-4 animate-pulse" /> Analysing…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="size-4" /> Explain these numbers
                  </span>
                )}
              </Button>
              {ai.isError && (
                <p className="mt-3 text-xs text-rose-500">Could not generate AI summary. Try again.</p>
              )}
            </div>
          )}
        </AnimatedCard>

        {/* CTA */}
        <AnimatedCard delay={0.4} className="mt-6 rounded-3xl border border-brand/30 bg-gradient-to-r from-brand/5 to-emerald-500/5 p-6 shadow-soft">
          <h2 className="font-semibold">Want to compare this fund?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Stack it against other funds side-by-side and see how it ranks on cost, risk, and returns.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild className="rounded-full bg-gradient-brand text-white shadow-glow">
              <Link to="/funds/compare">
                Compare funds <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/funds">
                <ArrowLeft className="mr-1 size-4" /> Back to search
              </Link>
            </Button>
          </div>
        </AnimatedCard>
      </section>
    </SiteLayout>
  );
}

function MetricBox({
  label,
  value,
  sub,
  positive,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-background p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 flex items-center gap-1 text-lg font-semibold",
          positive === true && "text-emerald-600 dark:text-emerald-400",
          positive === false && "text-rose-600 dark:text-rose-400",
        )}
      >
        {icon && <span>{icon}</span>}
        {value}
      </div>
      {sub && <div className="mt-1 text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
