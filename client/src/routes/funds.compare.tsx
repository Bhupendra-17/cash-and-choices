import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MUTUAL_FUNDS, fundCategoryLabel, type MutualFund } from "@/data/mutualFunds";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/funds/compare")({
  head: () => ({
    meta: [
      { title: "Smart Fund Comparison — Cash&Choices" },
      {
        name: "description",
        content:
          "Compare any two or three mutual funds across returns, risk, expense ratio, Sharpe, tax and hidden charges. See exactly which one wins each parameter and why.",
      },
      { property: "og:title", content: "Smart Fund Comparison — Cash&Choices" },
      {
        property: "og:description",
        content:
          "Compare mutual funds side by side. Cash&Choices highlights the better value for every parameter and explains why.",
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
  const [ids, setIds] = useState<string[]>([
    MUTUAL_FUNDS[0].id,
    MUTUAL_FUNDS[3].id,
    MUTUAL_FUNDS[6].id,
  ]);

  const funds = useMemo(
    () => ids.map((id) => MUTUAL_FUNDS.find((f) => f.id === id)!).filter(Boolean),
    [ids],
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

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6">
        <Link to="/funds" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to funds
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Smart Fund Comparison</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Compare any funds — across category or head-to-head. We highlight which one wins each
          parameter, and explain why it matters.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {ids.map((id, i) => (
            <Select
              key={i}
              value={id}
              onValueChange={(v) => setIds((prev) => prev.map((x, idx) => (idx === i ? v : x)))}
            >
              <SelectTrigger className="rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MUTUAL_FUNDS.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name} · {fundCategoryLabel(f.category)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>

        <div className="mt-6 overflow-x-auto rounded-3xl border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-accent/40 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Parameter</th>
                {funds.map((f) => (
                  <th key={f.id} className="px-4 py-3 font-semibold">
                    <div>{f.name}</div>
                    <div className="text-xs font-normal text-muted-foreground">{fundCategoryLabel(f.category)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.key} className="border-t border-border">
                  <td className="align-top px-4 py-3">
                    <div className="font-medium">{row.label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{row.why}</div>
                  </td>
                  {funds.map((f) => {
                    const isBest = row.numeric(f) === bestByRow[row.key];
                    return (
                      <td
                        key={f.id}
                        className={cn(
                          "px-4 py-3",
                          isBest && "bg-brand/5 font-semibold text-foreground",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {isBest && <CheckCircle2 className="size-4 text-brand" />}
                          <span>{row.format(f)}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-3xl border border-border bg-accent/40 p-5 text-sm text-muted-foreground">
          Highlighted cells win that parameter. A single fund rarely wins on every row — pick the
          fund whose winning parameters match <em>your</em> priority (lower cost, higher risk-adjusted
          returns, more diversification, favourable tax, etc.).
          <div className="mt-3">
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/recommend">Not sure? Get a recommendation</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}