// Illustrative mutual-fund sample data for Cash&Choices.
// NOT live market data. Figures are representative of Indian mutual funds
// (SEBI-regulated schemes) as of FY 2025-26 and are meant for education and
// comparison UX only. Wire a real feed (AMFI daily NAV or a paid provider)
// through fetchLiveNav() when a data source is available.

export type FundCategory =
  | "index"
  | "large_cap"
  | "mid_cap"
  | "small_cap"
  | "flexi_cap"
  | "multi_cap"
  | "elss"
  | "hybrid"
  | "debt"
  | "international"
  | "sectoral"
  | "thematic"
  | "liquid"
  | "arbitrage";

export type RiskLevel = "Low" | "Low-Moderate" | "Moderate" | "Moderately High" | "High" | "Very High";

export interface MutualFund {
  id: string;
  name: string;
  amc: string;
  category: FundCategory;
  planType: "Direct" | "Regular";
  active: boolean; // false = index/passive
  nav: number; // ₹ per unit (sample)
  navAsOf: string; // YYYY-MM-DD
  returns: {
    m1: number;
    m3: number;
    m6: number;
    y1: number;
    y3: number; // CAGR
    y5: number; // CAGR
  };
  cagrSinceInception: number;
  risk: RiskLevel;
  expenseRatio: number; // %
  aumCrore: number; // ₹ Cr
  fundManager: string;
  exitLoad: string;
  minSip: number;
  minLumpSum: number;
  benchmark: string;
  trackingError?: number; // % — only meaningful for index funds
  lockInMonths: number; // 0 for open-ended
  volatilityStdDev: number; // % annualised
  sharpe: number;
  alpha: number;
  beta: number;
  taxCategory: "Equity" | "Debt" | "Hybrid-Equity" | "Hybrid-Debt";
  allocation: { equity: number; debt: number; cash: number; gold?: number };
  sectorAllocation: { sector: string; pct: number }[];
  topHoldings: { name: string; pct: number }[];
  goodIf: string[];
  avoidIf: string[];
  bestFor: string[]; // tags for questionnaire matching
}

export const FUND_CATEGORIES: { id: FundCategory; label: string; blurb: string }[] = [
  { id: "index", label: "Index Funds", blurb: "Passively track an index. Very low cost." },
  { id: "large_cap", label: "Large Cap", blurb: "Top 100 companies by market cap. Steady." },
  { id: "mid_cap", label: "Mid Cap", blurb: "Ranks 101–250. Higher growth, higher risk." },
  { id: "small_cap", label: "Small Cap", blurb: "Beyond 250. Highest growth potential, highest risk." },
  { id: "flexi_cap", label: "Flexi Cap", blurb: "Manager can invest across all market caps." },
  { id: "multi_cap", label: "Multi Cap", blurb: "Minimum 25% each in large/mid/small cap (SEBI rule)." },
  { id: "elss", label: "ELSS (Tax Saver)", blurb: "3-year lock-in. Section 80C deduction up to ₹1.5L." },
  { id: "hybrid", label: "Hybrid", blurb: "Mix of equity and debt for balanced risk." },
  { id: "debt", label: "Debt", blurb: "Bonds and fixed income. Lower risk, lower returns." },
  { id: "international", label: "International", blurb: "Global equity — US, Europe, emerging markets." },
  { id: "sectoral", label: "Sectoral", blurb: "Concentrated in one sector (banking, IT, pharma…)." },
  { id: "thematic", label: "Thematic", blurb: "Themes like ESG, consumption, digital." },
  { id: "liquid", label: "Liquid", blurb: "Very short-term debt. Emergency-fund friendly." },
  { id: "arbitrage", label: "Arbitrage", blurb: "Cash-futures arbitrage. Equity taxation, low risk." },
];

export function fundCategoryLabel(id: FundCategory) {
  return FUND_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

// Placeholder for future live NAV fetching. Never called today.
export async function fetchLiveNav(_schemeCode: number): Promise<number | null> {
  return null;
}

const T = (equity: number, debt: number, cash: number, gold = 0) => ({
  equity,
  debt,
  cash,
  gold,
});

export const MUTUAL_FUNDS: MutualFund[] = [
  {
    id: "mf-nifty50-index",
    name: "Nifty 50 Index Fund",
    amc: "Prudent AMC",
    category: "index",
    planType: "Direct",
    active: false,
    nav: 218.45,
    navAsOf: "2026-07-24",
    returns: { m1: 1.8, m3: 4.2, m6: 8.5, y1: 14.6, y3: 15.1, y5: 14.8 },
    cagrSinceInception: 12.9,
    risk: "Moderately High",
    expenseRatio: 0.2,
    aumCrore: 18420,
    fundManager: "R. Iyer",
    exitLoad: "Nil after 7 days",
    minSip: 500,
    minLumpSum: 1000,
    benchmark: "Nifty 50 TRI",
    trackingError: 0.12,
    lockInMonths: 0,
    volatilityStdDev: 14.2,
    sharpe: 0.86,
    alpha: -0.1,
    beta: 1.0,
    taxCategory: "Equity",
    allocation: T(99, 0, 1),
    sectorAllocation: [
      { sector: "Financials", pct: 34 },
      { sector: "IT", pct: 15 },
      { sector: "Energy", pct: 11 },
      { sector: "FMCG", pct: 9 },
      { sector: "Auto", pct: 7 },
      { sector: "Others", pct: 24 },
    ],
    topHoldings: [
      { name: "HDFC Bank", pct: 12.4 },
      { name: "Reliance", pct: 10.1 },
      { name: "ICICI Bank", pct: 8.7 },
      { name: "Infosys", pct: 6.2 },
      { name: "TCS", pct: 4.9 },
    ],
    goodIf: ["Horizon 5+ years", "You want market returns with lowest cost", "You're new to investing"],
    avoidIf: ["Horizon under 3 years", "You want beat-the-market returns"],
    bestFor: ["passive", "beginner", "low_fees", "long_term"],
  },
  {
    id: "mf-nifty-next50-index",
    name: "Nifty Next 50 Index Fund",
    amc: "Prudent AMC",
    category: "index",
    planType: "Direct",
    active: false,
    nav: 62.18,
    navAsOf: "2026-07-24",
    returns: { m1: 2.4, m3: 5.9, m6: 11.2, y1: 22.8, y3: 18.6, y5: 16.2 },
    cagrSinceInception: 13.4,
    risk: "High",
    expenseRatio: 0.28,
    aumCrore: 4210,
    fundManager: "R. Iyer",
    exitLoad: "Nil after 7 days",
    minSip: 500,
    minLumpSum: 1000,
    benchmark: "Nifty Next 50 TRI",
    trackingError: 0.18,
    lockInMonths: 0,
    volatilityStdDev: 18.9,
    sharpe: 0.92,
    alpha: 0.1,
    beta: 1.05,
    taxCategory: "Equity",
    allocation: T(98, 0, 2),
    sectorAllocation: [
      { sector: "Financials", pct: 22 },
      { sector: "Consumer", pct: 18 },
      { sector: "Capital Goods", pct: 14 },
      { sector: "Chemicals", pct: 10 },
      { sector: "Others", pct: 36 },
    ],
    topHoldings: [
      { name: "DLF", pct: 3.4 },
      { name: "Adani Green", pct: 3.1 },
      { name: "Hindustan Aeronautics", pct: 3.0 },
      { name: "TVS Motor", pct: 2.8 },
      { name: "Vedanta", pct: 2.6 },
    ],
    goodIf: ["Horizon 7+ years", "You accept higher volatility for growth"],
    avoidIf: ["Horizon under 5 years", "You panic in 20% drawdowns"],
    bestFor: ["passive", "long_term", "growth"],
  },
  {
    id: "mf-nifty500-index",
    name: "Nifty 500 Index Fund",
    amc: "Broad Index Co.",
    category: "index",
    planType: "Direct",
    active: false,
    nav: 34.62,
    navAsOf: "2026-07-24",
    returns: { m1: 2.0, m3: 4.8, m6: 9.4, y1: 17.1, y3: 16.2, y5: 15.4 },
    cagrSinceInception: 13.1,
    risk: "Moderately High",
    expenseRatio: 0.25,
    aumCrore: 3120,
    fundManager: "S. Kapoor",
    exitLoad: "Nil",
    minSip: 500,
    minLumpSum: 1000,
    benchmark: "Nifty 500 TRI",
    trackingError: 0.22,
    lockInMonths: 0,
    volatilityStdDev: 15.4,
    sharpe: 0.88,
    alpha: -0.05,
    beta: 1.0,
    taxCategory: "Equity",
    allocation: T(99, 0, 1),
    sectorAllocation: [
      { sector: "Financials", pct: 30 },
      { sector: "IT", pct: 13 },
      { sector: "Energy", pct: 10 },
      { sector: "Auto", pct: 8 },
      { sector: "Others", pct: 39 },
    ],
    topHoldings: [
      { name: "HDFC Bank", pct: 8.1 },
      { name: "Reliance", pct: 6.6 },
      { name: "ICICI Bank", pct: 5.7 },
      { name: "Infosys", pct: 4.1 },
      { name: "L&T", pct: 3.0 },
    ],
    goodIf: ["You want the entire Indian market", "Horizon 5+ years"],
    avoidIf: ["You want targeted exposure"],
    bestFor: ["passive", "diversification", "long_term"],
  },
  {
    id: "mf-largecap-active",
    name: "Bluechip Large Cap Fund",
    amc: "Trust AMC",
    category: "large_cap",
    planType: "Direct",
    active: true,
    nav: 74.9,
    navAsOf: "2026-07-24",
    returns: { m1: 1.6, m3: 3.9, m6: 8.1, y1: 15.4, y3: 15.8, y5: 15.1 },
    cagrSinceInception: 13.7,
    risk: "Moderately High",
    expenseRatio: 1.05,
    aumCrore: 34500,
    fundManager: "Neha Bhatia",
    exitLoad: "1% if redeemed within 1 year",
    minSip: 500,
    minLumpSum: 5000,
    benchmark: "Nifty 100 TRI",
    lockInMonths: 0,
    volatilityStdDev: 14.0,
    sharpe: 0.92,
    alpha: 0.4,
    beta: 0.96,
    taxCategory: "Equity",
    allocation: T(97, 0, 3),
    sectorAllocation: [
      { sector: "Financials", pct: 32 },
      { sector: "IT", pct: 14 },
      { sector: "Consumer", pct: 12 },
      { sector: "Energy", pct: 10 },
      { sector: "Others", pct: 32 },
    ],
    topHoldings: [
      { name: "HDFC Bank", pct: 9.2 },
      { name: "ICICI Bank", pct: 8.5 },
      { name: "Infosys", pct: 6.0 },
      { name: "L&T", pct: 4.5 },
      { name: "Bajaj Finance", pct: 4.1 },
    ],
    goodIf: ["You trust an active manager", "Horizon 5+ years"],
    avoidIf: ["You want the lowest possible expense ratio"],
    bestFor: ["active", "long_term"],
  },
  {
    id: "mf-midcap-active",
    name: "Emerging Companies Mid Cap Fund",
    amc: "Trust AMC",
    category: "mid_cap",
    planType: "Direct",
    active: true,
    nav: 118.4,
    navAsOf: "2026-07-24",
    returns: { m1: 3.1, m3: 6.8, m6: 12.9, y1: 24.6, y3: 22.4, y5: 20.1 },
    cagrSinceInception: 17.2,
    risk: "High",
    expenseRatio: 1.35,
    aumCrore: 19800,
    fundManager: "Vikas Menon",
    exitLoad: "1% if redeemed within 1 year",
    minSip: 500,
    minLumpSum: 5000,
    benchmark: "Nifty Midcap 150 TRI",
    lockInMonths: 0,
    volatilityStdDev: 19.6,
    sharpe: 1.02,
    alpha: 1.2,
    beta: 0.92,
    taxCategory: "Equity",
    allocation: T(96, 0, 4),
    sectorAllocation: [
      { sector: "Capital Goods", pct: 20 },
      { sector: "Financials", pct: 18 },
      { sector: "Auto", pct: 12 },
      { sector: "Consumer", pct: 11 },
      { sector: "Others", pct: 39 },
    ],
    topHoldings: [
      { name: "Cummins India", pct: 4.1 },
      { name: "Persistent Systems", pct: 3.8 },
      { name: "Trent", pct: 3.5 },
      { name: "Federal Bank", pct: 3.2 },
      { name: "Voltas", pct: 2.9 },
    ],
    goodIf: ["Horizon 7+ years", "You can stomach 25%+ drawdowns"],
    avoidIf: ["Horizon under 5 years", "You need stable returns"],
    bestFor: ["active", "growth", "long_term"],
  },
  {
    id: "mf-smallcap-active",
    name: "Discovery Small Cap Fund",
    amc: "Alpha AMC",
    category: "small_cap",
    planType: "Direct",
    active: true,
    nav: 165.2,
    navAsOf: "2026-07-24",
    returns: { m1: 3.9, m3: 8.4, m6: 15.2, y1: 28.1, y3: 26.8, y5: 23.4 },
    cagrSinceInception: 19.4,
    risk: "Very High",
    expenseRatio: 1.55,
    aumCrore: 12400,
    fundManager: "Aarti Rao",
    exitLoad: "1% if redeemed within 1 year",
    minSip: 500,
    minLumpSum: 5000,
    benchmark: "Nifty Smallcap 250 TRI",
    lockInMonths: 0,
    volatilityStdDev: 24.8,
    sharpe: 1.05,
    alpha: 2.1,
    beta: 0.88,
    taxCategory: "Equity",
    allocation: T(93, 0, 7),
    sectorAllocation: [
      { sector: "Capital Goods", pct: 22 },
      { sector: "Chemicals", pct: 14 },
      { sector: "Financials", pct: 12 },
      { sector: "Consumer", pct: 11 },
      { sector: "Others", pct: 41 },
    ],
    topHoldings: [
      { name: "KEI Industries", pct: 3.6 },
      { name: "Cyient", pct: 3.2 },
      { name: "Redington", pct: 3.0 },
      { name: "Blue Star", pct: 2.8 },
      { name: "Radico Khaitan", pct: 2.6 },
    ],
    goodIf: ["Horizon 10+ years", "You accept 30%+ drawdowns"],
    avoidIf: ["Horizon under 7 years", "Emergency-fund money"],
    bestFor: ["active", "aggressive_growth", "long_term"],
  },
  {
    id: "mf-flexicap",
    name: "All Weather Flexi Cap Fund",
    amc: "Trust AMC",
    category: "flexi_cap",
    planType: "Direct",
    active: true,
    nav: 89.1,
    navAsOf: "2026-07-24",
    returns: { m1: 2.2, m3: 5.1, m6: 10.4, y1: 19.2, y3: 18.4, y5: 17.1 },
    cagrSinceInception: 15.6,
    risk: "Moderately High",
    expenseRatio: 1.15,
    aumCrore: 28400,
    fundManager: "Shreya Iyer",
    exitLoad: "1% if redeemed within 1 year",
    minSip: 500,
    minLumpSum: 5000,
    benchmark: "Nifty 500 TRI",
    lockInMonths: 0,
    volatilityStdDev: 15.9,
    sharpe: 1.0,
    alpha: 0.8,
    beta: 0.94,
    taxCategory: "Equity",
    allocation: T(96, 0, 4),
    sectorAllocation: [
      { sector: "Financials", pct: 26 },
      { sector: "IT", pct: 12 },
      { sector: "Capital Goods", pct: 12 },
      { sector: "Consumer", pct: 10 },
      { sector: "Others", pct: 40 },
    ],
    topHoldings: [
      { name: "HDFC Bank", pct: 6.8 },
      { name: "ICICI Bank", pct: 6.1 },
      { name: "Infosys", pct: 4.4 },
      { name: "Cummins India", pct: 3.2 },
      { name: "L&T", pct: 3.0 },
    ],
    goodIf: ["You want one fund across market caps", "Horizon 5+ years"],
    avoidIf: ["You want lowest cost"],
    bestFor: ["active", "one_fund", "long_term"],
  },
  {
    id: "mf-multicap",
    name: "Multi Cap Growth Fund",
    amc: "Broad Index Co.",
    category: "multi_cap",
    planType: "Direct",
    active: true,
    nav: 71.3,
    navAsOf: "2026-07-24",
    returns: { m1: 2.6, m3: 5.9, m6: 11.6, y1: 21.4, y3: 20.1, y5: 18.5 },
    cagrSinceInception: 16.2,
    risk: "High",
    expenseRatio: 1.28,
    aumCrore: 15200,
    fundManager: "Karan Shah",
    exitLoad: "1% if redeemed within 1 year",
    minSip: 500,
    minLumpSum: 5000,
    benchmark: "Nifty 500 Multicap 50:25:25 TRI",
    lockInMonths: 0,
    volatilityStdDev: 17.2,
    sharpe: 1.01,
    alpha: 0.9,
    beta: 0.98,
    taxCategory: "Equity",
    allocation: T(97, 0, 3),
    sectorAllocation: [
      { sector: "Financials", pct: 24 },
      { sector: "Capital Goods", pct: 16 },
      { sector: "IT", pct: 12 },
      { sector: "Consumer", pct: 11 },
      { sector: "Others", pct: 37 },
    ],
    topHoldings: [
      { name: "ICICI Bank", pct: 5.4 },
      { name: "HDFC Bank", pct: 5.1 },
      { name: "Infosys", pct: 4.0 },
      { name: "Cummins India", pct: 3.4 },
      { name: "KEI Industries", pct: 2.9 },
    ],
    goodIf: ["SEBI-mandated diversification (25% each cap)"],
    avoidIf: ["Horizon under 5 years"],
    bestFor: ["active", "long_term", "diversification"],
  },
  {
    id: "mf-elss",
    name: "Tax Saver ELSS Fund",
    amc: "Trust AMC",
    category: "elss",
    planType: "Direct",
    active: true,
    nav: 94.6,
    navAsOf: "2026-07-24",
    returns: { m1: 2.1, m3: 5.0, m6: 10.2, y1: 18.6, y3: 17.9, y5: 16.8 },
    cagrSinceInception: 14.9,
    risk: "Moderately High",
    expenseRatio: 1.1,
    aumCrore: 21300,
    fundManager: "Meera Nair",
    exitLoad: "Nil (3-year lock-in)",
    minSip: 500,
    minLumpSum: 500,
    benchmark: "Nifty 500 TRI",
    lockInMonths: 36,
    volatilityStdDev: 15.4,
    sharpe: 0.98,
    alpha: 0.6,
    beta: 0.95,
    taxCategory: "Equity",
    allocation: T(97, 0, 3),
    sectorAllocation: [
      { sector: "Financials", pct: 28 },
      { sector: "IT", pct: 14 },
      { sector: "Consumer", pct: 11 },
      { sector: "Auto", pct: 9 },
      { sector: "Others", pct: 38 },
    ],
    topHoldings: [
      { name: "HDFC Bank", pct: 7.1 },
      { name: "ICICI Bank", pct: 6.4 },
      { name: "Infosys", pct: 4.9 },
      { name: "L&T", pct: 3.6 },
      { name: "M&M", pct: 3.1 },
    ],
    goodIf: ["You want 80C tax deduction", "Horizon 5+ years"],
    avoidIf: ["You need money within 3 years", "You're on the new tax regime and don't claim 80C"],
    bestFor: ["tax_saving", "long_term"],
  },
  {
    id: "mf-hybrid-aggressive",
    name: "Balanced Advantage Fund",
    amc: "Balance Co.",
    category: "hybrid",
    planType: "Direct",
    active: true,
    nav: 46.2,
    navAsOf: "2026-07-24",
    returns: { m1: 1.4, m3: 3.3, m6: 6.6, y1: 12.4, y3: 12.1, y5: 11.5 },
    cagrSinceInception: 11.2,
    risk: "Moderate",
    expenseRatio: 0.85,
    aumCrore: 42300,
    fundManager: "P. Krishnan",
    exitLoad: "1% if redeemed within 1 year",
    minSip: 500,
    minLumpSum: 5000,
    benchmark: "CRISIL Hybrid 50+50 Aggressive Index",
    lockInMonths: 0,
    volatilityStdDev: 9.2,
    sharpe: 1.05,
    alpha: 0.3,
    beta: 0.62,
    taxCategory: "Hybrid-Equity",
    allocation: T(65, 30, 5),
    sectorAllocation: [
      { sector: "Financials", pct: 22 },
      { sector: "IT", pct: 10 },
      { sector: "Consumer", pct: 8 },
      { sector: "Debt/G-Sec", pct: 30 },
      { sector: "Others", pct: 30 },
    ],
    topHoldings: [
      { name: "HDFC Bank", pct: 5.2 },
      { name: "GOI 7.10 2034", pct: 6.4 },
      { name: "Infosys", pct: 3.8 },
      { name: "ICICI Bank", pct: 3.6 },
      { name: "GOI 7.26 2033", pct: 3.4 },
    ],
    goodIf: ["You want smoother returns", "Horizon 3+ years"],
    avoidIf: ["You want pure equity upside"],
    bestFor: ["moderate_risk", "one_fund"],
  },
  {
    id: "mf-debt-shortterm",
    name: "Short Duration Debt Fund",
    amc: "Balance Co.",
    category: "debt",
    planType: "Direct",
    active: true,
    nav: 32.4,
    navAsOf: "2026-07-24",
    returns: { m1: 0.6, m3: 1.8, m6: 3.6, y1: 7.2, y3: 6.4, y5: 6.2 },
    cagrSinceInception: 6.8,
    risk: "Low-Moderate",
    expenseRatio: 0.35,
    aumCrore: 8600,
    fundManager: "R. Suresh",
    exitLoad: "Nil",
    minSip: 500,
    minLumpSum: 5000,
    benchmark: "CRISIL Short Duration Debt Index",
    lockInMonths: 0,
    volatilityStdDev: 1.8,
    sharpe: 0.42,
    alpha: 0.1,
    beta: 0.1,
    taxCategory: "Debt",
    allocation: T(0, 96, 4),
    sectorAllocation: [
      { sector: "AAA Corporate", pct: 46 },
      { sector: "G-Sec", pct: 32 },
      { sector: "SDL", pct: 12 },
      { sector: "Cash", pct: 10 },
    ],
    topHoldings: [
      { name: "GOI 7.10 2029", pct: 8.4 },
      { name: "HDFC Ltd NCD", pct: 5.2 },
      { name: "Power Finance NCD", pct: 4.9 },
      { name: "REC NCD", pct: 4.2 },
      { name: "GOI 6.99 2026", pct: 3.6 },
    ],
    goodIf: ["Horizon 1-3 years", "You want better-than-savings returns"],
    avoidIf: ["You need equity-like growth", "You're on the highest tax slab and want tax efficiency"],
    bestFor: ["safety", "short_term"],
  },
  {
    id: "mf-liquid",
    name: "Overnight Liquid Fund",
    amc: "Cash Co.",
    category: "liquid",
    planType: "Direct",
    active: true,
    nav: 3210.4,
    navAsOf: "2026-07-24",
    returns: { m1: 0.55, m3: 1.65, m6: 3.3, y1: 6.8, y3: 5.9, y5: 5.2 },
    cagrSinceInception: 6.2,
    risk: "Low",
    expenseRatio: 0.16,
    aumCrore: 46200,
    fundManager: "R. Suresh",
    exitLoad: "Graded exit load if redeemed within 7 days",
    minSip: 500,
    minLumpSum: 500,
    benchmark: "CRISIL Liquid Fund Index",
    lockInMonths: 0,
    volatilityStdDev: 0.3,
    sharpe: 0.05,
    alpha: 0.0,
    beta: 0.02,
    taxCategory: "Debt",
    allocation: T(0, 98, 2),
    sectorAllocation: [
      { sector: "T-Bill", pct: 62 },
      { sector: "AAA CP/CD", pct: 30 },
      { sector: "Cash", pct: 8 },
    ],
    topHoldings: [
      { name: "91-day T-Bill", pct: 22 },
      { name: "182-day T-Bill", pct: 18 },
      { name: "HDFC Bank CD", pct: 6 },
      { name: "Kotak CD", pct: 5 },
      { name: "Reliance CP", pct: 4 },
    ],
    goodIf: ["Emergency fund", "Parking money for weeks/months"],
    avoidIf: ["You need growth over years"],
    bestFor: ["emergency_fund", "safety", "liquidity"],
  },
  {
    id: "mf-arbitrage",
    name: "Cash Futures Arbitrage Fund",
    amc: "Alpha AMC",
    category: "arbitrage",
    planType: "Direct",
    active: true,
    nav: 34.6,
    navAsOf: "2026-07-24",
    returns: { m1: 0.55, m3: 1.7, m6: 3.5, y1: 7.1, y3: 6.5, y5: 5.9 },
    cagrSinceInception: 6.4,
    risk: "Low",
    expenseRatio: 0.32,
    aumCrore: 18400,
    fundManager: "Aarti Rao",
    exitLoad: "0.25% if redeemed within 30 days",
    minSip: 500,
    minLumpSum: 5000,
    benchmark: "Nifty 50 Arbitrage Index",
    lockInMonths: 0,
    volatilityStdDev: 0.9,
    sharpe: 0.4,
    alpha: 0.0,
    beta: 0.03,
    taxCategory: "Equity",
    allocation: T(70, 30, 0),
    sectorAllocation: [
      { sector: "Hedged Equity", pct: 70 },
      { sector: "Money Market", pct: 25 },
      { sector: "Cash", pct: 5 },
    ],
    topHoldings: [
      { name: "Reliance (hedged)", pct: 6.4 },
      { name: "HDFC Bank (hedged)", pct: 5.8 },
      { name: "ICICI Bank (hedged)", pct: 4.2 },
      { name: "Infosys (hedged)", pct: 3.6 },
      { name: "TCS (hedged)", pct: 3.1 },
    ],
    goodIf: ["Parking money 1-6 months", "You want equity taxation on short-term cash"],
    avoidIf: ["You want capital growth"],
    bestFor: ["safety", "short_term", "tax_efficient_cash"],
  },
  {
    id: "mf-international-us",
    name: "US Equity Feeder Fund",
    amc: "Global Feeder",
    category: "international",
    planType: "Direct",
    active: false,
    nav: 22.4,
    navAsOf: "2026-07-24",
    returns: { m1: 1.9, m3: 4.6, m6: 9.8, y1: 16.8, y3: 14.6, y5: 15.2 },
    cagrSinceInception: 13.5,
    risk: "High",
    expenseRatio: 0.65,
    aumCrore: 4200,
    fundManager: "David Chen",
    exitLoad: "1% if redeemed within 90 days",
    minSip: 1000,
    minLumpSum: 5000,
    benchmark: "S&P 500 (INR)",
    trackingError: 0.6,
    lockInMonths: 0,
    volatilityStdDev: 16.8,
    sharpe: 0.88,
    alpha: 0.0,
    beta: 0.9,
    taxCategory: "Debt",
    allocation: T(98, 0, 2),
    sectorAllocation: [
      { sector: "IT", pct: 30 },
      { sector: "Communication", pct: 12 },
      { sector: "Healthcare", pct: 12 },
      { sector: "Financials", pct: 11 },
      { sector: "Others", pct: 35 },
    ],
    topHoldings: [
      { name: "Apple", pct: 7.2 },
      { name: "Microsoft", pct: 6.8 },
      { name: "NVIDIA", pct: 5.6 },
      { name: "Amazon", pct: 3.6 },
      { name: "Alphabet", pct: 3.2 },
    ],
    goodIf: ["You want global diversification", "Horizon 7+ years"],
    avoidIf: ["You dislike currency risk", "You want equity tax treatment (it's debt taxed)"],
    bestFor: ["diversification", "long_term", "global"],
  },
  {
    id: "mf-sectoral-banking",
    name: "Banking & Financial Services Fund",
    amc: "Alpha AMC",
    category: "sectoral",
    planType: "Direct",
    active: true,
    nav: 58.1,
    navAsOf: "2026-07-24",
    returns: { m1: 2.4, m3: 6.1, m6: 12.8, y1: 20.4, y3: 18.2, y5: 16.4 },
    cagrSinceInception: 15.1,
    risk: "Very High",
    expenseRatio: 1.45,
    aumCrore: 6800,
    fundManager: "Neha Bhatia",
    exitLoad: "1% if redeemed within 1 year",
    minSip: 500,
    minLumpSum: 5000,
    benchmark: "Nifty Financial Services TRI",
    lockInMonths: 0,
    volatilityStdDev: 21.4,
    sharpe: 0.86,
    alpha: 0.4,
    beta: 1.1,
    taxCategory: "Equity",
    allocation: T(96, 0, 4),
    sectorAllocation: [
      { sector: "Private Banks", pct: 52 },
      { sector: "PSU Banks", pct: 14 },
      { sector: "NBFC", pct: 20 },
      { sector: "Insurance", pct: 10 },
      { sector: "Others", pct: 4 },
    ],
    topHoldings: [
      { name: "HDFC Bank", pct: 22 },
      { name: "ICICI Bank", pct: 18 },
      { name: "SBI", pct: 8 },
      { name: "Axis Bank", pct: 7 },
      { name: "Bajaj Finance", pct: 6 },
    ],
    goodIf: ["Tactical bet on a sector", "Horizon 5+ years"],
    avoidIf: ["You want diversification", "Core portfolio"],
    bestFor: ["tactical", "sectoral"],
  },
  {
    id: "mf-thematic-consumption",
    name: "India Consumption Thematic Fund",
    amc: "Broad Index Co.",
    category: "thematic",
    planType: "Direct",
    active: true,
    nav: 41.2,
    navAsOf: "2026-07-24",
    returns: { m1: 1.5, m3: 3.7, m6: 8.6, y1: 15.9, y3: 15.2, y5: 14.4 },
    cagrSinceInception: 13.6,
    risk: "High",
    expenseRatio: 1.4,
    aumCrore: 3200,
    fundManager: "Karan Shah",
    exitLoad: "1% if redeemed within 1 year",
    minSip: 500,
    minLumpSum: 5000,
    benchmark: "Nifty India Consumption TRI",
    lockInMonths: 0,
    volatilityStdDev: 18.2,
    sharpe: 0.82,
    alpha: 0.2,
    beta: 1.02,
    taxCategory: "Equity",
    allocation: T(96, 0, 4),
    sectorAllocation: [
      { sector: "FMCG", pct: 28 },
      { sector: "Auto", pct: 22 },
      { sector: "Consumer Durables", pct: 16 },
      { sector: "Retail", pct: 14 },
      { sector: "Others", pct: 20 },
    ],
    topHoldings: [
      { name: "HUL", pct: 6.8 },
      { name: "ITC", pct: 6.1 },
      { name: "M&M", pct: 4.8 },
      { name: "Titan", pct: 4.4 },
      { name: "Nestle", pct: 3.2 },
    ],
    goodIf: ["You have a view on Indian consumption story", "Horizon 5+ years"],
    avoidIf: ["You want broad-market exposure"],
    bestFor: ["thematic", "long_term"],
  },
];

// Sort options exposed in UI. Each returns a comparator.
export type SortKey =
  | "returns_high"
  | "expense_low"
  | "risk_low"
  | "aum_high"
  | "risk_adjusted"
  | "beginner"
  | "long_term"
  | "sip"
  | "lump_sum"
  | "tax_saving";

const riskScore: Record<RiskLevel, number> = {
  Low: 1,
  "Low-Moderate": 2,
  Moderate: 3,
  "Moderately High": 4,
  High: 5,
  "Very High": 6,
};

export function sortFunds(list: MutualFund[], key: SortKey): MutualFund[] {
  const copy = [...list];
  switch (key) {
    case "returns_high":
      return copy.sort((a, b) => b.returns.y3 - a.returns.y3);
    case "expense_low":
      return copy.sort((a, b) => a.expenseRatio - b.expenseRatio);
    case "risk_low":
      return copy.sort((a, b) => riskScore[a.risk] - riskScore[b.risk]);
    case "aum_high":
      return copy.sort((a, b) => b.aumCrore - a.aumCrore);
    case "risk_adjusted":
      return copy.sort((a, b) => b.sharpe - a.sharpe);
    case "beginner":
      return copy.sort(
        (a, b) =>
          (a.expenseRatio + riskScore[a.risk]) - (b.expenseRatio + riskScore[b.risk]),
      );
    case "long_term":
      return copy.sort((a, b) => b.returns.y5 - a.returns.y5);
    case "sip":
      return copy.sort((a, b) => a.minSip - b.minSip || b.sharpe - a.sharpe);
    case "lump_sum":
      return copy.sort((a, b) => b.aumCrore - a.aumCrore || b.sharpe - a.sharpe);
    case "tax_saving":
      return copy.sort((a, b) => (a.category === "elss" ? -1 : 1) - (b.category === "elss" ? -1 : 1));
  }
}

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "returns_high", label: "Highest 3Y Returns" },
  { key: "expense_low", label: "Lowest Expense Ratio" },
  { key: "risk_low", label: "Lowest Risk" },
  { key: "aum_high", label: "Highest AUM" },
  { key: "risk_adjusted", label: "Best Risk-Adjusted (Sharpe)" },
  { key: "beginner", label: "Best for Beginners" },
  { key: "long_term", label: "Best for Long-Term" },
  { key: "sip", label: "Best for SIP" },
  { key: "lump_sum", label: "Best for Lump Sum" },
  { key: "tax_saving", label: "Tax Saving (ELSS)" },
];