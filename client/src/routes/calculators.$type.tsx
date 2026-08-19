import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SvgAreaChart, SvgPieChart } from "@/components/ui/svg-charts";
import { Info } from "lucide-react";
import { ExplainHint } from "@/components/ui/ExplainHint";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fd,
  gold,
  lumpSum,
  ppf,
  rd,
  sip,
  type CalcResult,
  estimateWithdrawal,
  INVESTMENT_KINDS,
  type InvestmentKind
} from "@/lib/calculators";
import { cn } from "@/lib/utils";

const TYPES = ["sip", "lumpsum", "fd", "rd", "ppf", "gold", "withdrawal-tax"] as const;
type CalcType = (typeof TYPES)[number];

export const Route = createFileRoute("/calculators/$type")({
  loader: ({ params }) => {
    if (!TYPES.includes(params.type as CalcType)) throw notFound();
    return { type: params.type as CalcType };
  },
  head: ({ params }) => {
    const label =
      { sip: "SIP", lumpsum: "Lump Sum", fd: "Fixed Deposit", rd: "Recurring Deposit", ppf: "PPF", gold: "Gold", "withdrawal-tax": "Withdrawal & Tax" }[
        params.type as CalcType
      ] ?? "Investment";
    return {
      meta: [
        { title: `${label} Calculator — Cash&Choices` },
        {
          name: "description",
          content: `Estimate ${label} returns, taxes and inflation-adjusted value. Runs entirely on your device.`,
        },
        { property: "og:title", content: `${label} Calculator — Cash&Choices` },
        {
          property: "og:description",
          content: `Estimate ${label} returns, taxes and inflation-adjusted value with plain-English explanations.`,
        },
        { property: "og:type", content: "website" },
      ],
    };
  },
  component: CalculatorRoute,
  notFoundComponent: () => (
    <p className="text-sm text-muted-foreground">
      Calculator not found. <Link to="/calculators" className="text-brand">Go back</Link>.
    </p>
  ),
  errorComponent: ({ error }) => (
    <p className="text-sm text-destructive">{error.message}</p>
  ),
});

function CalculatorRoute() {
  const { type } = Route.useLoaderData();
  if (type === "withdrawal-tax") {
    return <TaxCalcForm />;
  }
  return <CalculatorForm type={type} />;
}

const INR = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN")}`;

function CalculatorForm({ type }: { type: CalcType }) {
  // Shared state
  const [monthly, setMonthly] = useState(10000);
  const [amount, setAmount] = useState(500000);
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(type === "fd" ? 7 : type === "rd" ? 6.8 : type === "ppf" ? 7.1 : type === "gold" ? 8 : 12);
  const [slab, setSlab] = useState(30);
  const [inflation, setInflation] = useState(5.5);

  // Active highlighted metric selected by user clicking table rows
  const [selectedMetric, setSelectedMetric] = useState<string>("all");

  const result: CalcResult = useMemo(() => {
    switch (type) {
      case "sip":
        return sip({ monthly, years, ratePct: rate, inflation });
      case "lumpsum":
        return lumpSum({ amount, years, ratePct: rate, inflation });
      case "fd":
        return fd({ amount, years, ratePct: rate, slabPct: slab, inflation });
      case "rd":
        return rd({ monthly, years, ratePct: rate, slabPct: slab, inflation });
      case "ppf":
        return ppf({ yearly: amount, years: Math.max(15, years), ratePct: rate });
      case "gold":
        return gold({ amount, years, appreciationPct: rate, slabPct: slab });
      default:
        return sip({ monthly, years, ratePct: rate, inflation });
    }
  }, [type, monthly, amount, years, rate, slab, inflation]);

  const usesMonthly = type === "sip" || type === "rd";
  const usesSlab = type === "fd" || type === "rd" || type === "gold";
  const amountLabel = type === "ppf" ? "Yearly contribution" : "Investment amount";

  const toggleMetric = (metricKey: string) => {
    setSelectedMetric((prev) => (prev === metricKey ? "all" : metricKey));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      {/* Inputs Sidebar */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold capitalize tracking-tight">{type} Inputs</h2>
          <ExplainHint>Change these assumptions to see how the outcome changes. They are estimates, not promises.</ExplainHint>
        </div>
        <div className="mt-4 space-y-5">
          {usesMonthly ? (
            <Field label="Monthly amount" value={monthly} onChange={setMonthly} suffix="₹" min={500} max={200000} step={500} />
          ) : (
            <Field label={amountLabel} value={amount} onChange={setAmount} suffix="₹" min={1000} max={type === "ppf" ? 150000 : 10000000} step={1000} />
          )}
          <Field label="Duration (years)" value={years} onChange={setYears} min={type === "ppf" ? 15 : 1} max={40} step={1} />
          <Field
            label={type === "gold" ? "Expected appreciation %" : "Expected return %"}
            help="Use a cautious estimate. A higher number makes the result look better but is not guaranteed."
            value={rate}
            onChange={setRate}
            step={0.1}
            min={0.5}
            max={30}
          />
          
          {usesSlab && (
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your Tax Slab</Label>
              <div className="mt-2 flex items-center gap-3">
                <Slider value={[slab]} min={0} max={30} step={5} onValueChange={(v) => setSlab(v[0])} />
                <span className="w-10 text-right text-sm font-medium">{slab}%</span>
              </div>
            </div>
          )}

          {type !== "ppf" && type !== "gold" && (
            <div className="rounded-xl border border-brand/20 bg-brand/5 p-3.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-brand">
                  Inflation Rate
                </Label>
                <span className="rounded-md bg-brand text-white px-2 py-0.5 text-[10px] font-bold">
                  AI Predicted: 5.5% p.a.
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
                Showing as per current macro status predicted by AI engine (India CPI ~5.5%).
              </p>
              <div className="mt-2.5 flex items-center gap-3">
                <Slider value={[inflation]} min={0} max={12} step={0.5} onValueChange={(v) => setInflation(v[0])} />
                <span className="w-12 text-right text-sm font-bold text-neutral-900 dark:text-neutral-100">{inflation}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table-Based Calculations & Dynamic Graph */}
      <div className="space-y-6">
        
        {/* Main Calculation Summary Table */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-card shadow-sm">
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2 bg-neutral-50/50 dark:bg-neutral-950/40">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                  Calculation Summary Table
                </h3>
                <span className="text-[10px] font-medium text-neutral-500 bg-neutral-200/60 dark:bg-neutral-800 px-2 py-0.5 rounded">
                  Click any row to focus graph
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select a row below to isolate its series on the visual growth graph.
              </p>
            </div>
            <span className="text-xs font-bold text-brand bg-brand/10 dark:bg-brand/20 px-3 py-1 rounded-full">
              CAGR: {result.effectiveAnnualReturn}%
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-100/70 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase text-[10px] tracking-wider font-semibold select-none">
                <tr>
                  <th className="p-3.5 pl-4">Calculation Component (Click to Focus Graph)</th>
                  <th className="p-3.5 text-right">Gross Nominal</th>
                  <th className="p-3.5 text-right">Deductions / Impact</th>
                  <th className="p-3.5 text-right pr-4 font-bold text-neutral-900 dark:text-neutral-100">Net Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 cursor-pointer">
                
                {/* 1. Invested Row */}
                <tr
                  onClick={() => toggleMetric("invested")}
                  className={cn(
                    "transition-colors duration-150 hover:bg-neutral-50 dark:hover:bg-neutral-850",
                    selectedMetric === "invested" && "bg-purple-50 dark:bg-purple-950/40 border-l-4 border-l-purple-600 font-semibold"
                  )}
                >
                  <td className="p-3.5 pl-4 font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#7B5AF0]" />
                    1. Total Invested Capital
                  </td>
                  <td className="p-3.5 text-right font-medium">{INR(result.invested)}</td>
                  <td className="p-3.5 text-right text-neutral-400">—</td>
                  <td className="p-3.5 text-right pr-4 font-medium text-neutral-900 dark:text-neutral-100">{INR(result.invested)}</td>
                </tr>

                {/* 2. Capital Gains Row */}
                <tr
                  onClick={() => toggleMetric("gains")}
                  className={cn(
                    "transition-colors duration-150 hover:bg-neutral-50 dark:hover:bg-neutral-850",
                    selectedMetric === "gains" && "bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-l-emerald-600 font-semibold"
                  )}
                >
                  <td className="p-3.5 pl-4 font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#10B981]" />
                    2. Capital Gains / Profit Generated
                  </td>
                  <td className="p-3.5 text-right font-medium text-emerald-600 dark:text-emerald-400">+{INR(result.gains)}</td>
                  <td className="p-3.5 text-right text-neutral-400">—</td>
                  <td className="p-3.5 text-right pr-4 font-medium text-emerald-600 dark:text-emerald-400">+{INR(result.gains)}</td>
                </tr>

                {/* 3. Total Value Row */}
                <tr
                  onClick={() => toggleMetric("total")}
                  className={cn(
                    "transition-colors duration-150 hover:bg-neutral-50 dark:hover:bg-neutral-850 font-semibold",
                    selectedMetric === "total" && "bg-brand/10 dark:bg-brand/20 border-l-4 border-l-brand"
                  )}
                >
                  <td className="p-3.5 pl-4 text-neutral-900 dark:text-neutral-100">3. Gross Maturity Value (Total Value)</td>
                  <td className="p-3.5 text-right text-neutral-900 dark:text-neutral-100">{INR(result.totalValue)}</td>
                  <td className="p-3.5 text-right text-neutral-400">—</td>
                  <td className="p-3.5 text-right pr-4 text-neutral-900 dark:text-neutral-100">{INR(result.totalValue)}</td>
                </tr>

                {/* 4. Tax Row */}
                <tr
                  onClick={() => toggleMetric("tax")}
                  className={cn(
                    "transition-colors duration-150 hover:bg-neutral-50 dark:hover:bg-neutral-850",
                    selectedMetric === "tax" && "bg-rose-50 dark:bg-rose-950/40 border-l-4 border-l-rose-600 font-semibold"
                  )}
                >
                  <td className="p-3.5 pl-4 font-medium text-neutral-900 dark:text-neutral-100">4. Estimated Capital Gains Tax ({result.taxableGain > 0 ? "Taxable" : "Exempt"})</td>
                  <td className="p-3.5 text-right text-neutral-400">—</td>
                  <td className="p-3.5 text-right text-rose-600 dark:text-rose-400 font-medium">-{INR(result.estimatedTax)}</td>
                  <td className="p-3.5 text-right pr-4 text-rose-600 dark:text-rose-400 font-medium">-{INR(result.estimatedTax)}</td>
                </tr>

                {/* 5. Inflation Row */}
                <tr
                  onClick={() => toggleMetric("real")}
                  className={cn(
                    "transition-colors duration-150 hover:bg-neutral-50 dark:hover:bg-neutral-850",
                    selectedMetric === "real" && "bg-amber-50 dark:bg-amber-950/40 border-l-4 border-l-amber-600 font-semibold"
                  )}
                >
                  <td className="p-3.5 pl-4 font-medium text-neutral-900 dark:text-neutral-100">
                    5. Inflation Impact ({inflation}% p.a. AI predicted)
                  </td>
                  <td className="p-3.5 text-right text-neutral-400">—</td>
                  <td className="p-3.5 text-right text-amber-600 dark:text-amber-400 font-medium">
                    -{INR(result.totalValue - result.inflationAdjusted)}
                  </td>
                  <td className="p-3.5 text-right pr-4 text-amber-600 dark:text-amber-400 font-medium">
                    {INR(result.inflationAdjusted)}
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-bold border-t-2 border-neutral-200 dark:border-neutral-800">
                <tr>
                  <td className="p-4 pl-4 uppercase tracking-wider text-xs">TOTAL NET IN-HAND WITHDRAWAL</td>
                  <td className="p-4 text-right opacity-80 font-normal">{INR(result.totalValue)}</td>
                  <td className="p-4 text-right opacity-80 font-normal">-{INR(result.estimatedTax)}</td>
                  <td className="p-4 text-right pr-4 text-sm sm:text-base font-extrabold text-emerald-400 dark:text-emerald-700">{INR(result.netWithdrawal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Visual Graph Refinement reflecting Selected Table Row */}
        {result.yearly && (
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Growth Projection Visual Graph</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reflecting focused metric: <strong className="text-brand capitalize">{selectedMetric === "all" ? "All Series (Complete Overview)" : selectedMetric}</strong>
                </p>
              </div>

              {selectedMetric !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedMetric("all")}
                  className="rounded-lg bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                >
                  Reset Focus
                </button>
              )}
            </div>

            <div className="mt-4 h-64 w-full">
              <SvgAreaChart
                data={result.yearly}
                valueFormatter={(v) => INR(v)}
                highlightMetric={selectedMetric}
              />
            </div>
          </div>
        )}

        {/* Calculation Logic & Rules Explanation */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/40 p-5">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100">
            <Info className="size-4 text-brand" /> Calculation Logic & Rules
          </div>
          <p className="mt-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{explanation(type)}</p>
          <p className="mt-3 text-[11px] text-neutral-400 dark:text-neutral-500">
            Estimates only. Tax rules based on FY 2025-26 (Finance Act 2024). Actual outcomes depend
            on realized returns, timing of cash flows, and your tax slab.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  help,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  label: string;
  help?: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1">
        <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
        {help && <ExplainHint>{help}</ExplainHint>}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {suffix && <span className="text-muted-foreground text-sm font-medium">{suffix}</span>}
        <Input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isFinite(n)) return;
            onChange(Math.max(min, Math.min(max, n)));
          }}
          className="rounded-xl font-medium"
        />
      </div>
      <div className="mt-2.5">
        <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} />
      </div>
    </div>
  );
}

function explanation(type: CalcType) {
  switch (type) {
    case "sip":
      return "SIP future value is calculated with the standard annuity-due formula: monthly contributions compound at the expected monthly return for the full term. Tax assumes equity mutual fund LTCG — 12.5% above ₹1.25 lakh yearly exemption.";
    case "lumpsum":
      return "Lump sum compounds annually at the expected return. Tax defaults to equity LTCG (12.5% above ₹1.25 lakh) — swap in your instrument's rule via the tax calculator.";
    case "fd":
      return "FD interest is compounded quarterly and taxed at your income slab. Banks deduct 10% TDS on interest above ₹40,000/year (₹50,000 for seniors); the balance is settled in your ITR.";
    case "rd":
      return "RD accrues on each monthly deposit until maturity, compounded quarterly. Interest is added to your income and taxed at slab.";
    case "ppf":
      return "PPF is EEE — the yearly contribution qualifies for 80C, interest is tax-free, and the maturity amount is tax-exempt. Rate compounds annually. Government revises the rate quarterly.";
    case "gold":
      return "Physical/digital gold sold after 24 months is taxed at 12.5% LTCG (no indexation post July 2024). Sold within 24 months, gains are added to income at slab. SGBs held to maturity are fully exempt.";
  }
}

const PIE = ["#2563EB", "#10B981", "#F59E0B", "#EF4444"];

function TaxCalcForm() {
  const [kind, setKind] = useState<InvestmentKind>("equity_mf");
  const [invested, setInvested] = useState(500000);
  const [current, setCurrent] = useState(820000);
  const [withdraw, setWithdraw] = useState(300000);
  const [date, setDate] = useState("2023-04-15");
  const [slab, setSlab] = useState(30);
  const [exitLoad, setExitLoad] = useState(0);

  // Selected slice index on pie chart
  const [selectedSlice, setSelectedSlice] = useState<number | null>(null);

  const breakdown = useMemo(
    () =>
      estimateWithdrawal({
        kind,
        investmentDate: date,
        investedAmount: invested,
        currentValue: current,
        withdrawalAmount: withdraw,
        slabPct: slab,
        exitLoadPct: exitLoad,
      }),
    [kind, invested, current, withdraw, date, slab, exitLoad],
  );

  const pieData = [
    { name: "Net Received", value: breakdown.netReceived },
    { name: "Estimated Tax", value: breakdown.estimatedTax },
    { name: "Exit Load", value: breakdown.exitLoad },
  ].filter((x) => x.value > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      {/* Inputs Panel */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-card p-5 shadow-sm">
        <div className="space-y-4">
          <div>
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Investment type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as InvestmentKind)}>
              <SelectTrigger className="mt-2 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVESTMENT_KINDS.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Money label="Original invested" value={invested} onChange={setInvested} />
          <Money label="Current value" value={current} onChange={setCurrent} />
          <Money label="Withdrawal amount" value={withdraw} onChange={setWithdraw} />
          <div>
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Investment date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-2 rounded-xl" />
          </div>
          <div>
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your tax slab</Label>
            <div className="mt-2 flex items-center gap-3">
              <Slider value={[slab]} min={0} max={30} step={5} onValueChange={(v) => setSlab(v[0])} />
              <span className="w-10 text-right text-sm font-medium">{slab}%</span>
            </div>
          </div>
          <div>
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Exit load %</Label>
            <div className="mt-2 flex items-center gap-3">
              <Slider value={[exitLoad]} min={0} max={3} step={0.25} onValueChange={(v) => setExitLoad(v[0])} />
              <span className="w-12 text-right text-sm font-medium">{exitLoad}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Output Panel — Table View */}
      <div className="space-y-6">
        
        {/* Table View for Tax Breakdown */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-card shadow-sm">
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40">
            <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
              Withdrawal Tax & Payout Table
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click any table row to highlight its slice in the breakdown pie chart.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-100/70 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase text-[10px] tracking-wider font-semibold select-none">
                <tr>
                  <th className="p-3.5 pl-4">Withdrawal Component</th>
                  <th className="p-3.5 text-right">Gross Amount</th>
                  <th className="p-3.5 text-right">Deduction / Rule</th>
                  <th className="p-3.5 text-right pr-4 font-bold text-neutral-900 dark:text-neutral-100">Net Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 cursor-pointer">
                <tr
                  onClick={() => setSelectedSlice(selectedSlice === 0 ? null : 0)}
                  className={cn("transition-colors duration-150 hover:bg-neutral-50 dark:hover:bg-neutral-850", selectedSlice === 0 && "bg-blue-50 dark:bg-blue-950/40 border-l-4 border-l-blue-600 font-semibold")}
                >
                  <td className="p-3.5 pl-4 font-medium text-neutral-900 dark:text-neutral-100">Net Payout Received</td>
                  <td className="p-3.5 text-right font-medium">{INR(breakdown.netReceived)}</td>
                  <td className="p-3.5 text-right text-emerald-600 dark:text-emerald-400 font-medium">Net Payout</td>
                  <td className="p-3.5 text-right pr-4 font-medium text-emerald-600 dark:text-emerald-400">{INR(breakdown.netReceived)}</td>
                </tr>
                <tr
                  onClick={() => setSelectedSlice(selectedSlice === 1 ? null : 1)}
                  className={cn("transition-colors duration-150 hover:bg-neutral-50 dark:hover:bg-neutral-850", selectedSlice === 1 && "bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-l-emerald-600 font-semibold")}
                >
                  <td className="p-3.5 pl-4 font-medium text-neutral-900 dark:text-neutral-100">Estimated Capital Gains Tax</td>
                  <td className="p-3.5 text-right text-neutral-400">—</td>
                  <td className="p-3.5 text-right text-rose-600 dark:text-rose-400 font-medium">-{INR(breakdown.estimatedTax)}</td>
                  <td className="p-3.5 text-right pr-4 text-rose-600 dark:text-rose-400 font-medium">-{INR(breakdown.estimatedTax)}</td>
                </tr>
                <tr
                  onClick={() => setSelectedSlice(selectedSlice === 2 ? null : 2)}
                  className={cn("transition-colors duration-150 hover:bg-neutral-50 dark:hover:bg-neutral-850", selectedSlice === 2 && "bg-amber-50 dark:bg-amber-950/40 border-l-4 border-l-amber-600 font-semibold")}
                >
                  <td className="p-3.5 pl-4 font-medium text-neutral-900 dark:text-neutral-100">Exit Load Deductions ({exitLoad}%)</td>
                  <td className="p-3.5 text-right text-neutral-400">—</td>
                  <td className="p-3.5 text-right text-amber-600 dark:text-amber-400 font-medium">-{INR(breakdown.exitLoad)}</td>
                  <td className="p-3.5 text-right pr-4 text-amber-600 dark:text-amber-400 font-medium">-{INR(breakdown.exitLoad)}</td>
                </tr>
              </tbody>
              <tfoot className="bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-bold border-t-2 border-neutral-200 dark:border-neutral-800">
                <tr>
                  <td className="p-4 pl-4 uppercase tracking-wider text-xs">TOTAL NET IN-HAND RECEIVED</td>
                  <td className="p-4 text-right opacity-80 font-normal">{INR(withdraw)}</td>
                  <td className="p-4 text-right opacity-80 font-normal">-{INR(breakdown.estimatedTax + breakdown.exitLoad)}</td>
                  <td className="p-4 text-right pr-4 text-sm sm:text-base font-extrabold text-emerald-400 dark:text-emerald-700">{INR(breakdown.netReceived)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Rule explanation & pie chart */}
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/40 p-5">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100">
              <Info className="size-4 text-brand" /> Tax Rule Applied &amp; Rationale
            </div>
            <p className="mt-2 text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100">{breakdown.rule}</p>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">{breakdown.ruleExplainer}</p>
            <ul className="mt-3.5 space-y-2 text-xs">
              <li>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">Is tax applied to principal?</span>{" "}
                <span className="text-neutral-500 dark:text-neutral-400">No — only profit portion is taxable.</span>
              </li>
              <li>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">Holding Period ({breakdown.holdingDays} days):</span>{" "}
                <span className="text-neutral-500 dark:text-neutral-400">{(breakdown.holdingDays / 365.25).toFixed(2)} years ({breakdown.gainCategory})</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-card p-4">
            <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">Payout Breakdown Pie Chart</h3>
            <div className="mt-2 h-44">
              <SvgPieChart
                data={pieData}
                colors={PIE}
                valueFormatter={(v) => INR(v)}
                selectedIndex={selectedSlice}
                onSelectSlice={setSelectedSlice}
              />
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-2 text-[11px]">
              {pieData.map((p, i) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setSelectedSlice(selectedSlice === i ? null : i)}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-all text-neutral-500 dark:text-neutral-400",
                    selectedSlice === i && "font-bold text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800"
                  )}
                >
                  <span className="inline-block size-2 rounded-full" style={{ background: PIE[i % PIE.length] }} />
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
          Estimates based on Finance Act 2024 (FY 2025-26). Actual tax depends on your overall income and tax filing status.
        </p>
      </div>
    </div>
  );
}

function Money({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-muted-foreground text-sm font-medium">₹</span>
        <Input
          type="number"
          value={value}
          min={0}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n) && n >= 0) onChange(n);
          }}
          className="rounded-xl font-medium"
        />
      </div>
    </div>
  );
}