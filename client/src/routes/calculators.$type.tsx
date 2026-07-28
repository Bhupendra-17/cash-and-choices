import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SvgAreaChart, SvgPieChart } from "@/components/ui/svg-charts";
import { Info, Scale } from "lucide-react";
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
  `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

function CalculatorForm({ type }: { type: CalcType }) {
  // Shared state — different calcs use different subsets
  const [monthly, setMonthly] = useState(10000);
  const [amount, setAmount] = useState(500000);
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(type === "fd" ? 7 : type === "rd" ? 6.8 : type === "ppf" ? 7.1 : type === "gold" ? 8 : 12);
  const [slab, setSlab] = useState(30);
  const [inflation, setInflation] = useState(6);

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

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <h2 className="text-lg font-semibold capitalize">{type} inputs</h2>
        <div className="mt-4 space-y-4">
          {usesMonthly ? (
            <Field label="Monthly amount" value={monthly} onChange={setMonthly} suffix="₹" min={500} max={200000} step={500} />
          ) : (
            <Field label={amountLabel} value={amount} onChange={setAmount} suffix="₹" min={1000} max={type === "ppf" ? 150000 : 10000000} step={1000} />
          )}
          <Field label="Duration (years)" value={years} onChange={setYears} min={type === "ppf" ? 15 : 1} max={40} step={1} />
          <Field label={type === "gold" ? "Expected appreciation %" : "Expected return %"} value={rate} onChange={setRate} step={0.1} min={0.5} max={30} />
          {usesSlab && (
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Your tax slab</Label>
              <div className="mt-2 flex items-center gap-3">
                <Slider value={[slab]} min={0} max={30} step={5} onValueChange={(v) => setSlab(v[0])} />
                <span className="w-10 text-right text-sm font-medium">{slab}%</span>
              </div>
            </div>
          )}
          {type !== "ppf" && type !== "gold" && (
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Inflation assumption</Label>
              <div className="mt-2 flex items-center gap-3">
                <Slider value={[inflation]} min={0} max={12} step={0.5} onValueChange={(v) => setInflation(v[0])} />
                <span className="w-12 text-right text-sm font-medium">{inflation}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ResultCard k="Invested" v={INR(result.invested)} />
          <ResultCard k="Total value" v={INR(result.totalValue)} accent />
          <ResultCard k="Est. tax" v={INR(result.estimatedTax)} />
          <ResultCard k="Net withdrawal" v={INR(result.netWithdrawal)} accent />
          <ResultCard k="Gains" v={INR(result.gains)} />
          <ResultCard k="Taxable gains" v={INR(result.taxableGain)} />
          <ResultCard k="Inflation-adjusted" v={INR(result.inflationAdjusted)} />
          <ResultCard k="Effective annual return" v={`${result.effectiveAnnualReturn}%`} />
        </div>

        {result.yearly && (
          <div className="rounded-3xl border border-border bg-card p-4 shadow-soft">
            <h3 className="text-sm font-semibold">Growth over time</h3>
            <div className="mt-3 h-64 w-full">
              <SvgAreaChart data={result.yearly} valueFormatter={(v) => INR(v)} />
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-brand/30 bg-brand/5 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Info className="size-4 text-brand" /> How this is calculated
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{explanation(type)}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            Estimates only. Tax rules based on FY 2025-26 (Finance Act 2024). Actual outcomes depend
            on realised returns, timing of cash flows and your full tax situation.
          </p>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div
      className={
        "rounded-2xl border border-border p-4 " +
        (accent ? "bg-brand/5" : "bg-card")
      }
    >
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</div>
      <div className="mt-1 text-xl font-semibold">{v}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="mt-2 flex items-center gap-2">
        {suffix && <span className="text-muted-foreground">{suffix}</span>}
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
          className="rounded-full"
        />
      </div>
      <div className="mt-2">
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

const PIE = ["#7B5AF0", "#F05AA8", "#FFB454", "#48D3B4"];

function TaxCalcForm() {
  const [kind, setKind] = useState<InvestmentKind>("equity_mf");
  const [invested, setInvested] = useState(500000);
  const [current, setCurrent] = useState(820000);
  const [withdraw, setWithdraw] = useState(300000);
  const [date, setDate] = useState("2023-04-15");
  const [slab, setSlab] = useState(30);
  const [exitLoad, setExitLoad] = useState(0);

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
    { name: "Net to you", value: breakdown.netReceived },
    { name: "Tax", value: breakdown.estimatedTax },
    { name: "Exit load", value: breakdown.exitLoad },
  ].filter((x) => x.value > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Investment type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as InvestmentKind)}>
              <SelectTrigger className="mt-2 rounded-full">
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
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Investment date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-2 rounded-full" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Your tax slab</Label>
            <div className="mt-2 flex items-center gap-3">
              <Slider value={[slab]} min={0} max={30} step={5} onValueChange={(v) => setSlab(v[0])} />
              <span className="w-10 text-right text-sm font-medium">{slab}%</span>
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Exit load %</Label>
            <div className="mt-2 flex items-center gap-3">
              <Slider value={[exitLoad]} min={0} max={3} step={0.25} onValueChange={(v) => setExitLoad(v[0])} />
              <span className="w-12 text-right text-sm font-medium">{exitLoad}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card k="Original capital in this withdrawal" v={INR(breakdown.originalInvestment)} sub="Not taxed" />
          <Card k="Gains" v={INR(breakdown.gains)} sub={breakdown.gainCategory} accent />
          <Card k="Estimated tax" v={INR(breakdown.estimatedTax)} sub={breakdown.gainCategory === "Exempt" ? "Tax-free" : "On gains only"} />
          <Card k="Exit load" v={INR(breakdown.exitLoad)} />
          <Card k="Holding period" v={`${(breakdown.holdingDays / 365.25).toFixed(2)} yrs`} sub={`${breakdown.holdingDays} days`} />
          <Card k="Net you receive" v={INR(breakdown.netReceived)} accent />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-3xl border border-brand/30 bg-brand/5 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Info className="size-4 text-brand" /> Which rule applies &amp; why
            </div>
            <p className="mt-2 text-sm font-medium">{breakdown.rule}</p>
            <p className="mt-2 text-sm text-muted-foreground">{breakdown.ruleExplainer}</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <span className="font-medium">Is tax applied to your original invested amount?</span>{" "}
                <span className="text-muted-foreground">No — only the profit portion of the withdrawal is taxable.</span>
              </li>
              <li>
                <span className="font-medium">Is it LTCG or STCG?</span>{" "}
                <span className="text-muted-foreground">{breakdown.gainCategory === "LTCG" ? "Long-term (held over the qualifying period)." : breakdown.gainCategory === "STCG" ? "Short-term (under the qualifying period)." : breakdown.gainCategory === "Slab" ? "Taxed at your slab, no long/short-term distinction." : "Fully exempt."}</span>
              </li>
              <li>
                <span className="font-medium">How is the tax computed?</span>{" "}
                <span className="text-muted-foreground">Tax = Gains × applicable rate (after exemptions).</span>
              </li>
            </ul>
          </div>
          <div className="rounded-3xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">Where your withdrawal goes</h3>
            <div className="mt-2 h-48">
              <SvgPieChart data={pieData} colors={PIE} valueFormatter={(v) => INR(v)} />
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-2 text-xs">
              {pieData.map((p, i) => (
                <span key={p.name} className="flex items-center gap-1 text-muted-foreground">
                  <span className="inline-block size-2 rounded-full" style={{ background: PIE[i % PIE.length] }} />
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Estimates only, based on tax rules under the Finance Act 2024 (FY 2025-26). Actual tax
          depends on your total income, other capital gains, set-offs, cess and surcharge. For
          regulated personal advice, consult a SEBI-registered advisor.
        </p>
      </div>
    </div>
  );
}

function Money({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-muted-foreground">₹</span>
        <Input
          type="number"
          value={value}
          min={0}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n) && n >= 0) onChange(n);
          }}
          className="rounded-full"
        />
      </div>
    </div>
  );
}

function Card({ k, v, sub, accent }: { k: string; v: string; sub?: string; accent?: boolean }) {
  return (
    <div className={"rounded-2xl border border-border p-4 " + (accent ? "bg-brand/5" : "bg-card")}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</div>
      <div className="mt-1 text-xl font-semibold">{v}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}