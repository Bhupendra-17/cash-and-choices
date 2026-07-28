// Client-side investment calculators. Zero network calls. FY 2025-26 rules.

export interface CalcResult {
  invested: number;
  totalValue: number;
  gains: number;
  taxableGain: number;
  estimatedTax: number;
  netWithdrawal: number;
  inflationAdjusted: number;
  effectiveAnnualReturn: number;
  yearly?: { year: number; invested: number; value: number }[];
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

// Long-term inflation assumption used to convert nominal → real values.
// User-configurable at call sites where relevant.
export const DEFAULT_INFLATION = 6;

function inflationAdjust(value: number, years: number, inflation: number) {
  return value / Math.pow(1 + inflation / 100, years);
}

function effectiveRate(invested: number, finalValue: number, years: number) {
  if (invested <= 0 || years <= 0) return 0;
  return (Math.pow(finalValue / invested, 1 / years) - 1) * 100;
}

// --- SIP ---
export function sip(opts: {
  monthly: number;
  years: number;
  ratePct: number;
  inflation?: number;
  taxRate?: number; // LTCG effective rate
}): CalcResult {
  const monthlyRate = opts.ratePct / 100 / 12;
  const n = opts.years * 12;
  const invested = opts.monthly * n;
  const futureValue =
    opts.monthly *
    ((Math.pow(1 + monthlyRate, n) - 1) / (monthlyRate || 1e-9)) *
    (1 + monthlyRate);
  const gains = futureValue - invested;
  const taxableGain = Math.max(0, gains - 125000); // ₹1.25L LTCG exemption on equity (FY25-26)
  const tax = taxableGain * ((opts.taxRate ?? 12.5) / 100);

  const yearly: CalcResult["yearly"] = [];
  for (let y = 1; y <= opts.years; y++) {
    const m = y * 12;
    const inv = opts.monthly * m;
    const val =
      opts.monthly *
      ((Math.pow(1 + monthlyRate, m) - 1) / (monthlyRate || 1e-9)) *
      (1 + monthlyRate);
    yearly.push({ year: y, invested: round2(inv), value: round2(val) });
  }

  return {
    invested: round2(invested),
    totalValue: round2(futureValue),
    gains: round2(gains),
    taxableGain: round2(taxableGain),
    estimatedTax: round2(tax),
    netWithdrawal: round2(futureValue - tax),
    inflationAdjusted: round2(inflationAdjust(futureValue, opts.years, opts.inflation ?? DEFAULT_INFLATION)),
    effectiveAnnualReturn: round2(effectiveRate(invested, futureValue, opts.years)),
    yearly,
  };
}

// --- Lump Sum ---
export function lumpSum(opts: {
  amount: number;
  years: number;
  ratePct: number;
  inflation?: number;
  taxRate?: number;
  exemption?: number;
}): CalcResult {
  const fv = opts.amount * Math.pow(1 + opts.ratePct / 100, opts.years);
  const gains = fv - opts.amount;
  const exemption = opts.exemption ?? 125000;
  const taxable = Math.max(0, gains - exemption);
  const tax = taxable * ((opts.taxRate ?? 12.5) / 100);

  const yearly: CalcResult["yearly"] = [];
  for (let y = 1; y <= opts.years; y++) {
    yearly.push({
      year: y,
      invested: opts.amount,
      value: round2(opts.amount * Math.pow(1 + opts.ratePct / 100, y)),
    });
  }

  return {
    invested: round2(opts.amount),
    totalValue: round2(fv),
    gains: round2(gains),
    taxableGain: round2(taxable),
    estimatedTax: round2(tax),
    netWithdrawal: round2(fv - tax),
    inflationAdjusted: round2(inflationAdjust(fv, opts.years, opts.inflation ?? DEFAULT_INFLATION)),
    effectiveAnnualReturn: round2(effectiveRate(opts.amount, fv, opts.years)),
    yearly,
  };
}

// --- FD (compounded quarterly) ---
export function fd(opts: {
  amount: number;
  years: number;
  ratePct: number;
  slabPct?: number; // your income-tax slab
  taxSaver?: boolean; // 5Y lock-in Tax Saver FD
  inflation?: number;
}): CalcResult {
  const n = 4; // quarterly compounding
  const fv = opts.amount * Math.pow(1 + opts.ratePct / 100 / n, n * opts.years);
  const gains = fv - opts.amount;
  const slab = opts.slabPct ?? 30;
  const tax = gains * (slab / 100);

  const yearly: CalcResult["yearly"] = [];
  for (let y = 1; y <= opts.years; y++) {
    yearly.push({
      year: y,
      invested: opts.amount,
      value: round2(opts.amount * Math.pow(1 + opts.ratePct / 100 / n, n * y)),
    });
  }

  return {
    invested: round2(opts.amount),
    totalValue: round2(fv),
    gains: round2(gains),
    taxableGain: round2(gains),
    estimatedTax: round2(tax),
    netWithdrawal: round2(fv - tax),
    inflationAdjusted: round2(inflationAdjust(fv, opts.years, opts.inflation ?? DEFAULT_INFLATION)),
    effectiveAnnualReturn: round2(effectiveRate(opts.amount, fv, opts.years)),
    yearly,
  };
}

// --- RD (monthly deposits, quarterly compounding approximated) ---
export function rd(opts: {
  monthly: number;
  years: number;
  ratePct: number;
  slabPct?: number;
  inflation?: number;
}): CalcResult {
  const r = opts.ratePct / 100 / 4;
  const n = opts.years * 12;
  const invested = opts.monthly * n;
  // Standard RD maturity formula (quarterly compounding approximation)
  let fv = 0;
  for (let i = 1; i <= n; i++) {
    const monthsLeft = n - i + 1;
    fv += opts.monthly * Math.pow(1 + r, monthsLeft / 3);
  }
  const gains = fv - invested;
  const tax = gains * ((opts.slabPct ?? 30) / 100);

  return {
    invested: round2(invested),
    totalValue: round2(fv),
    gains: round2(gains),
    taxableGain: round2(gains),
    estimatedTax: round2(tax),
    netWithdrawal: round2(fv - tax),
    inflationAdjusted: round2(inflationAdjust(fv, opts.years, opts.inflation ?? DEFAULT_INFLATION)),
    effectiveAnnualReturn: round2(effectiveRate(invested, fv, opts.years)),
  };
}

// --- PPF (15Y, tax-free) ---
export function ppf(opts: { yearly: number; years?: number; ratePct?: number }): CalcResult {
  const years = opts.years ?? 15;
  const rate = opts.ratePct ?? 7.1;
  let balance = 0;
  const yearly: CalcResult["yearly"] = [];
  for (let y = 1; y <= years; y++) {
    balance = (balance + opts.yearly) * (1 + rate / 100);
    yearly.push({ year: y, invested: opts.yearly * y, value: round2(balance) });
  }
  const invested = opts.yearly * years;
  return {
    invested: round2(invested),
    totalValue: round2(balance),
    gains: round2(balance - invested),
    taxableGain: 0, // EEE
    estimatedTax: 0,
    netWithdrawal: round2(balance),
    inflationAdjusted: round2(inflationAdjust(balance, years, DEFAULT_INFLATION)),
    effectiveAnnualReturn: round2(effectiveRate(invested, balance, years)),
    yearly,
  };
}

// --- Gold (annual compounded price appreciation) ---
export function gold(opts: {
  amount: number;
  years: number;
  appreciationPct?: number;
  slabPct?: number;
}): CalcResult {
  const rate = opts.appreciationPct ?? 8;
  const fv = opts.amount * Math.pow(1 + rate / 100, opts.years);
  const gains = fv - opts.amount;
  // Physical/digital gold: taxed as per slab if <24 months, else 12.5% LTCG (no indexation post-Jul-2024)
  const isLong = opts.years >= 2;
  const tax = isLong ? gains * 0.125 : gains * ((opts.slabPct ?? 30) / 100);
  return {
    invested: round2(opts.amount),
    totalValue: round2(fv),
    gains: round2(gains),
    taxableGain: round2(gains),
    estimatedTax: round2(tax),
    netWithdrawal: round2(fv - tax),
    inflationAdjusted: round2(inflationAdjust(fv, opts.years, DEFAULT_INFLATION)),
    effectiveAnnualReturn: round2(effectiveRate(opts.amount, fv, opts.years)),
  };
}

// --- Withdrawal & Tax Estimator ---

export type InvestmentKind =
  | "equity_mf"
  | "debt_mf"
  | "hybrid_equity_mf"
  | "hybrid_debt_mf"
  | "listed_equity"
  | "elss"
  | "fd"
  | "ppf"
  | "sgb"
  | "gold_physical";

export interface WithdrawalInput {
  kind: InvestmentKind;
  investmentDate: string; // YYYY-MM-DD
  investedAmount: number;
  currentValue: number;
  withdrawalAmount: number;
  slabPct?: number;
  exitLoadPct?: number;
}

export interface WithdrawalBreakdown {
  originalInvestment: number;
  gains: number;
  taxableGain: number;
  estimatedTax: number;
  exitLoad: number;
  otherCharges: number;
  netReceived: number;
  holdingDays: number;
  gainCategory: "STCG" | "LTCG" | "Slab" | "Exempt";
  rule: string;
  ruleExplainer: string;
}

export function estimateWithdrawal(input: WithdrawalInput): WithdrawalBreakdown {
  const invested = clamp(input.investedAmount, 0, Infinity);
  const current = clamp(input.currentValue, 0, Infinity);
  const w = clamp(input.withdrawalAmount, 0, current);
  const proportion = current > 0 ? w / current : 0;
  const originalPortion = invested * proportion;
  const gains = w - originalPortion;

  const holdingMs = Date.now() - new Date(input.investmentDate).getTime();
  const holdingDays = Math.max(0, Math.floor(holdingMs / (1000 * 60 * 60 * 24)));
  const holdingYears = holdingDays / 365.25;

  const slab = input.slabPct ?? 30;
  let tax = 0;
  let category: WithdrawalBreakdown["gainCategory"] = "STCG";
  let rule = "";
  let explainer = "";

  switch (input.kind) {
    case "equity_mf":
    case "elss":
    case "listed_equity":
    case "hybrid_equity_mf": {
      if (holdingYears >= 1) {
        category = "LTCG";
        const exemption = 125000;
        const taxable = Math.max(0, gains - exemption);
        tax = taxable * 0.125;
        rule = "LTCG on equity: 12.5% above ₹1.25L exemption per year (Finance Act 2024).";
        explainer =
          "Tax is charged only on your gains, not on the amount you originally invested. Because you held for over 12 months, this qualifies as Long-Term Capital Gain and gets the ₹1.25 lakh yearly exemption before the flat 12.5% rate kicks in.";
      } else {
        category = "STCG";
        tax = gains * 0.2;
        rule = "STCG on equity: 20% flat (Finance Act 2024).";
        explainer =
          "You held for less than 12 months, so gains are Short-Term Capital Gains taxed at a flat 20%. The original investment is never taxed — only the profit portion is.";
      }
      break;
    }
    case "debt_mf":
    case "hybrid_debt_mf": {
      category = "Slab";
      tax = gains * (slab / 100);
      rule = "Debt MFs bought after 1 Apr 2023: all gains taxed at your slab rate — no indexation.";
      explainer =
        "For debt funds bought after 1 April 2023, gains are added to your income and taxed at your slab rate regardless of how long you held. Only the profit is taxed — your capital comes back tax-free.";
      break;
    }
    case "fd": {
      category = "Slab";
      tax = gains * (slab / 100);
      rule = "FD interest is added to income and taxed at your slab. TDS 10% above ₹40k interest/year.";
      explainer =
        "FDs are treated as interest income, taxed at your slab rate. The bank deducts TDS at 10% if annual interest crosses ₹40,000 (₹50,000 for seniors); you settle the balance in your ITR.";
      break;
    }
    case "ppf": {
      category = "Exempt";
      tax = 0;
      rule = "PPF is EEE — Exempt at contribution, growth and withdrawal.";
      explainer = "PPF enjoys full tax exemption: your contribution qualifies for 80C, and both interest and maturity proceeds are tax-free.";
      break;
    }
    case "sgb": {
      if (holdingYears >= 8) {
        category = "Exempt";
        tax = 0;
        rule = "SGB held to maturity: capital gains fully exempt.";
        explainer = "Sovereign Gold Bonds redeemed at maturity are fully tax-exempt on capital gains. The 2.5% annual interest, however, is taxed as income at your slab.";
      } else if (holdingYears >= 1) {
        category = "LTCG";
        tax = gains * 0.125;
        rule = "SGB sold on exchange after 12 months: 12.5% LTCG.";
        explainer = "Selling SGBs on the exchange after 12 months qualifies as long-term; a flat 12.5% is applied to the gains.";
      } else {
        category = "STCG";
        tax = gains * (slab / 100);
        rule = "SGB sold within 12 months: taxed at your slab.";
        explainer = "Sold within 12 months, so gains are short-term and added to your income at your slab.";
      }
      break;
    }
    case "gold_physical": {
      if (holdingYears >= 2) {
        category = "LTCG";
        tax = gains * 0.125;
        rule = "Physical/digital gold held over 24 months: 12.5% LTCG (no indexation post Jul-2024).";
        explainer =
          "Gold held for more than 24 months is long-term and taxed at 12.5%. Indexation benefit was removed for transfers after 23 July 2024.";
      } else {
        category = "Slab";
        tax = gains * (slab / 100);
        rule = "Physical/digital gold sold within 24 months: taxed at slab.";
        explainer = "Sold within 24 months, so the gain is added to your income at your slab rate.";
      }
      break;
    }
  }

  const exitLoad = w * ((input.exitLoadPct ?? 0) / 100);
  const otherCharges = 0; // hook for STT/GST — depends on instrument; keep 0 here
  const net = Math.max(0, w - tax - exitLoad - otherCharges);

  return {
    originalInvestment: round2(originalPortion),
    gains: round2(gains),
    taxableGain: round2(Math.max(0, gains)),
    estimatedTax: round2(Math.max(0, tax)),
    exitLoad: round2(exitLoad),
    otherCharges: round2(otherCharges),
    netReceived: round2(net),
    holdingDays,
    gainCategory: category,
    rule,
    ruleExplainer: explainer,
  };
}

export const INVESTMENT_KINDS: { id: InvestmentKind; label: string }[] = [
  { id: "equity_mf", label: "Equity Mutual Fund" },
  { id: "elss", label: "ELSS (Tax Saver)" },
  { id: "hybrid_equity_mf", label: "Hybrid Equity MF (>65% equity)" },
  { id: "listed_equity", label: "Listed Equity Shares" },
  { id: "debt_mf", label: "Debt Mutual Fund" },
  { id: "hybrid_debt_mf", label: "Hybrid Debt MF" },
  { id: "fd", label: "Fixed Deposit" },
  { id: "ppf", label: "PPF" },
  { id: "sgb", label: "Sovereign Gold Bond" },
  { id: "gold_physical", label: "Physical / Digital Gold" },
];