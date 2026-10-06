import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, Copy, Scale } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { MUTUAL_FUNDS, fundCategoryLabel, type MutualFund } from "@/data/mutualFunds";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/funds/compare")({
  validateSearch: (search: Record<string, unknown>): { ids?: string } => ({
    ids: typeof search.ids === "string" && search.ids.trim() ? search.ids.trim() : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Compare Mutual Funds | Cash&Choices" },
      { name: "description", content: "Compare selected mutual funds across returns, risk, and costs." },
    ],
  }),
  component: ComparePage,
});

type ComparisonMetric = {
  label: string;
  format: (fund: MutualFund) => string;
  value: (fund: MutualFund) => number;
  higherIsBetter?: boolean;
};

type PerformancePeriod = keyof MutualFund["returns"];

const PERFORMANCE_PERIODS: { key: PerformancePeriod; label: string }[] = [
  { key: "m1", label: "1M" },
  { key: "m3", label: "3M" },
  { key: "m6", label: "6M" },
  { key: "y1", label: "1Y" },
  { key: "y3", label: "3Y CAGR" },
  { key: "y5", label: "5Y CAGR" },
];

const BAR_COLORS = ["bg-brand", "bg-emerald-500", "bg-amber-500", "bg-sky-500"];

const METRIC_GROUPS: { label: string; metrics: ComparisonMetric[] }[] = [
  {
    label: "Returns",
    metrics: [
      { label: "1 month", format: (fund) => `${fund.returns.m1.toFixed(1)}%`, value: (fund) => fund.returns.m1 },
      { label: "3 months", format: (fund) => `${fund.returns.m3.toFixed(1)}%`, value: (fund) => fund.returns.m3 },
      { label: "6 months", format: (fund) => `${fund.returns.m6.toFixed(1)}%`, value: (fund) => fund.returns.m6 },
      { label: "1 year", format: (fund) => `${fund.returns.y1.toFixed(1)}%`, value: (fund) => fund.returns.y1 },
      { label: "3 year CAGR", format: (fund) => `${fund.returns.y3.toFixed(1)}%`, value: (fund) => fund.returns.y3 },
      { label: "5 year CAGR", format: (fund) => `${fund.returns.y5.toFixed(1)}%`, value: (fund) => fund.returns.y5 },
      { label: "Since inception CAGR", format: (fund) => `${fund.cagrSinceInception.toFixed(1)}%`, value: (fund) => fund.cagrSinceInception },
    ],
  },
  {
    label: "Risk & efficiency",
    metrics: [
      { label: "Risk level", format: (fund) => fund.risk, value: (fund) => ({ Low: 1, "Low-Moderate": 2, Moderate: 3, "Moderately High": 4, High: 5, "Very High": 6 })[fund.risk] },
      { label: "Volatility", format: (fund) => `${fund.volatilityStdDev.toFixed(1)}%`, value: (fund) => fund.volatilityStdDev, higherIsBetter: false },
      { label: "Sharpe ratio", format: (fund) => fund.sharpe.toFixed(2), value: (fund) => fund.sharpe },
      { label: "Alpha", format: (fund) => fund.alpha.toFixed(2), value: (fund) => fund.alpha },
      { label: "Benchmark", format: (fund) => fund.benchmark, value: () => 0 },
    ],
  },
  {
    label: "Costs & details",
    metrics: [
      { label: "Expense ratio", format: (fund) => `${fund.expenseRatio.toFixed(2)}%`, value: (fund) => fund.expenseRatio, higherIsBetter: false },
      { label: "Assets under management", format: (fund) => `₹${fund.aumCrore.toLocaleString("en-IN")} Cr`, value: (fund) => fund.aumCrore },
      { label: "Minimum SIP", format: (fund) => `₹${fund.minSip.toLocaleString("en-IN")}`, value: (fund) => fund.minSip, higherIsBetter: false },
      { label: "Exit load", format: (fund) => fund.exitLoad, value: () => 0 },
    ],
  },
];

function ComparePage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [performancePeriod, setPerformancePeriod] = useState<PerformancePeriod>("m3");

  const funds = useMemo(() => {
    const ids = [...new Set((search.ids ?? "").split(",").map((id) => id.trim()).filter(Boolean))].slice(0, 4);
    return ids
      .map((id) => MUTUAL_FUNDS.find((fund) => fund.id === id))
      .filter((fund): fund is MutualFund => Boolean(fund));
  }, [search.ids]);

  const goBackToFunds = () => navigate({ to: "/funds" });

  const shareComparison = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (funds.length < 2) {
    return (
      <SiteLayout>
        <section className="mx-auto flex min-h-[65vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
          <div className="grid size-14 place-items-center rounded-full bg-brand/10 text-brand">
            <Scale className="size-7" />
          </div>
          <h1 className="mt-5 text-2xl font-bold">Choose funds to compare</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Select at least two funds from the fund list. Your comparison will show only those selections.
          </p>
          <Button asChild className="mt-6 rounded-full bg-gradient-brand text-white">
            <Link to="/funds"><ArrowLeft className="mr-2 size-4" /> Browse funds</Link>
          </Button>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={goBackToFunds} className="-ml-3 rounded-full text-muted-foreground">
            <ArrowLeft className="mr-2 size-4" /> Back to funds
          </Button>
          <Button type="button" variant="outline" onClick={shareComparison} className="rounded-full">
            {copied ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
            {copied ? "Link copied" : "Share comparison"}
          </Button>
        </div>

        <header className="mt-7 border-b border-border pb-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-brand">
            <Scale className="size-4" /> {funds.length} funds selected
          </div>
          <h1 className="mt-2 text-3xl font-bold">Fund comparison</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Returns, risk and costs for the funds you selected, shown side by side.
          </p>
        </header>

        <PerformanceComparisonChart
          funds={funds}
          period={performancePeriod}
          onPeriodChange={setPerformancePeriod}
        />

        <div className="mt-7 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th scope="col" className="sticky left-0 z-20 w-48 min-w-48 border-b border-r border-border bg-muted/90 px-4 py-4 font-semibold backdrop-blur sm:w-64 sm:min-w-64">
                  Fund details
                </th>
                {funds.map((fund) => (
                  <th key={fund.id} scope="col" className="min-w-52 border-b border-border px-4 py-4 align-top sm:min-w-60">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">{fundCategoryLabel(fund.category)}</div>
                    <div className="mt-1 max-w-64 text-sm font-bold leading-snug">{fund.name}</div>
                    <div className="mt-1 text-xs font-normal text-muted-foreground">{fund.amc} · {fund.planType}</div>
                    <Link to="/funds/$code" params={{ code: fund.id }} className="mt-3 inline-flex text-xs font-semibold text-brand hover:underline">
                      Fund profile
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRIC_GROUPS.map((group) => (
                <ComparisonGroup key={group.label} group={group} funds={funds} />
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Returns and risk figures are illustrative and do not guarantee future performance.
        </p>
      </section>
    </SiteLayout>
  );
}

function PerformanceComparisonChart({
  funds,
  period,
  onPeriodChange,
}: {
  funds: MutualFund[];
  period: PerformancePeriod;
  onPeriodChange: (period: PerformancePeriod) => void;
}) {
  const values = funds.map((fund) => fund.returns[period]);
  const rawMin = Math.min(0, ...values);
  const rawMax = Math.max(0, ...values);
  const padding = Math.max((rawMax - rawMin) * 0.12, 0.5);
  const min = rawMin < 0 ? rawMin - padding : 0;
  const max = rawMax > 0 ? rawMax + padding : 0.5;
  const range = max - min;
  const zeroPosition = ((0 - min) / range) * 100;
  const selectedPeriod = PERFORMANCE_PERIODS.find((item) => item.key === period);

  return (
    <section aria-labelledby="returns-chart-title" className="mt-6 rounded-lg border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 id="returns-chart-title" className="text-base font-bold">Performance by timeline</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {selectedPeriod?.label} return for each selected fund. 3Y and 5Y figures are annualized.
          </p>
        </div>
        <div role="group" aria-label="Performance timeline" className="flex flex-wrap gap-1 rounded-md bg-muted p-1">
          {PERFORMANCE_PERIODS.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={period === item.key}
              onClick={() => onPeriodChange(item.key)}
              className={cn(
                "rounded px-2.5 py-1.5 text-xs font-semibold transition-colors",
                period === item.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-3" role="img" aria-label={`${selectedPeriod?.label} return comparison chart`}>
        {funds.map((fund, index) => {
          const value = fund.returns[period];
          const valuePosition = ((value - min) / range) * 100;
          const barStart = Math.min(zeroPosition, valuePosition);
          const barWidth = Math.max(Math.abs(valuePosition - zeroPosition), 0.5);

          return (
            <div key={fund.id} className="grid grid-cols-[minmax(7rem,10rem)_minmax(0,1fr)] items-center gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-sm", BAR_COLORS[index])} />
                <span className="truncate text-xs font-medium" title={fund.name}>{fund.name}</span>
              </div>
              <div className="relative h-8 rounded-sm bg-muted/70">
                {[0, 1, 2, 3, 4].map((tick) => (
                  <span
                    key={tick}
                    aria-hidden="true"
                    className="absolute inset-y-0 w-px bg-border/80"
                    style={{ left: `${tick * 25}%` }}
                  />
                ))}
                <span aria-hidden="true" className="absolute inset-y-0 z-10 w-px bg-foreground/50" style={{ left: `${zeroPosition}%` }} />
                <span
                  aria-hidden="true"
                  className={cn("absolute top-1 bottom-1 rounded-sm transition-all duration-300", BAR_COLORS[index])}
                  style={{ left: `${barStart}%`, width: `${barWidth}%` }}
                />
                <span
                  className="absolute top-1/2 z-20 -translate-y-1/2 whitespace-nowrap rounded bg-card/90 px-1 text-[11px] font-bold tabular-nums"
                  style={{
                    left: `${valuePosition}%`,
                    transform: `translate(${value >= 0 ? "0.25rem" : "calc(-100% - 0.25rem)"}, -50%)`,
                  }}
                >
                  {value.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 grid grid-cols-[minmax(7rem,10rem)_minmax(0,1fr)] gap-3">
        <span />
        <div className="flex justify-between text-[10px] tabular-nums text-muted-foreground">
          {[0, 1, 2, 3, 4].map((tick) => (
            <span key={tick}>{(min + (range * tick) / 4).toFixed(1)}%</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComparisonGroup({
  group,
  funds,
}: {
  group: (typeof METRIC_GROUPS)[number];
  funds: MutualFund[];
}) {
  return (
    <>
      <tr className="bg-brand/[0.06]">
        <th colSpan={funds.length + 1} className="px-4 py-2.5 text-xs font-bold uppercase text-brand">
          {group.label}
        </th>
      </tr>
      {group.metrics.map((metric) => {
        const values = funds.map((fund) => metric.value(fund));
        const best = metric.higherIsBetter === undefined
          ? undefined
          : metric.higherIsBetter
            ? Math.max(...values)
            : Math.min(...values);

        return (
          <tr key={metric.label} className="border-t border-border/70 even:bg-muted/20">
            <th scope="row" className="sticky left-0 z-10 border-r border-border bg-card px-4 py-3 text-xs font-medium text-muted-foreground sm:text-sm">
              {metric.label}
            </th>
            {funds.map((fund) => {
              const isBest = best !== undefined && metric.value(fund) === best;
              return (
                <td key={fund.id} className={cn("px-4 py-3 text-sm", isBest && "font-bold text-emerald-700 dark:text-emerald-400")}>
                  {metric.format(fund)}
                  {isBest && <span className="ml-2 text-[10px] font-semibold uppercase">Best</span>}
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}