// Curated, editorial data. Zero affiliate — for education only.
export type Category =
  | "credit_card"
  | "mutual_fund"
  | "insurance"
  | "loan"
  | "platform"
  | "savings"
  | "fd"
  | "gold"
  | "retirement";

export interface Product {
  id: string;
  name: string;
  category: Category;
  issuer: string;
  summary: string;
  bestFor: string[]; // tags matched by questionnaire
  goodIf: string[];
  avoidIf: string[];
  scores: {
    transparency: number; // 0-100
    liquidity: number;
    hiddenCost: number; // higher = fewer hidden costs
    taxEfficiency: number;
    risk: number; // higher = safer
  };
  fees: { label: string; value: string; note?: string }[];
  tags: string[];
}

export const CATEGORIES: { id: Category; label: string; blurb: string }[] = [
  { id: "credit_card", label: "Credit Cards", blurb: "Rewards, fees and lounge access without the fine print." },
  { id: "mutual_fund", label: "Mutual Funds", blurb: "Compare expense ratios, tracking error and true costs." },
  { id: "insurance", label: "Insurance", blurb: "Term, health and general — what actually matters." },
  { id: "loan", label: "Loans", blurb: "APR, processing, prepayment and the real cost of debt." },
  { id: "platform", label: "Investing Platforms", blurb: "Brokerage, DP charges, AMC and hidden fees." },
  { id: "savings", label: "Savings Accounts", blurb: "Interest, minimums and account maintenance." },
  { id: "fd", label: "Fixed Deposits", blurb: "Rates, tax, premature withdrawal penalties." },
  { id: "gold", label: "Gold", blurb: "Digital, ETF, SGB — costs and lock-ins compared." },
  { id: "retirement", label: "Retirement", blurb: "NPS, EPF, PPF — long-term, tax-friendly options." },
];

export const PRODUCTS: Product[] = [
  {
    id: "cc-lowfee-cashback",
    name: "Everyday Cashback Card",
    category: "credit_card",
    issuer: "Generic Bank",
    summary: "Flat 1.5% cashback with no category caps and a low joining fee.",
    bestFor: ["everyday", "beginner", "low_fees"],
    goodIf: ["You spend under ₹40k/month", "You want simple rewards", "You dislike annual-fee traps"],
    avoidIf: ["You want lounge access", "You spend heavily on travel"],
    scores: { transparency: 88, liquidity: 90, hiddenCost: 82, taxEfficiency: 40, risk: 70 },
    fees: [
      { label: "Joining fee", value: "₹499" },
      { label: "Annual fee", value: "₹499", note: "Waived on ₹1.5L spend" },
      { label: "Forex markup", value: "3.5%" },
      { label: "Late payment", value: "₹100 – ₹1,300" },
    ],
    tags: ["cashback", "no-lounge"],
  },
  {
    id: "cc-travel-premium",
    name: "Travel Miles Premium",
    category: "credit_card",
    issuer: "Metro Bank",
    summary: "High reward rate on travel, unlimited domestic lounge, forex markup 2%.",
    bestFor: ["travel", "high_spend"],
    goodIf: ["You spend ₹80k+/month", "You travel monthly"],
    avoidIf: ["You spend under ₹40k/month", "You dislike renewal fees"],
    scores: { transparency: 72, liquidity: 85, hiddenCost: 60, taxEfficiency: 40, risk: 65 },
    fees: [
      { label: "Joining fee", value: "₹4,999" },
      { label: "Annual fee", value: "₹4,999", note: "Waived on ₹6L spend" },
      { label: "Forex markup", value: "2%" },
      { label: "Reward redemption", value: "₹99 per redemption" },
    ],
    tags: ["travel", "lounge"],
  },
  {
    id: "mf-index-nifty50",
    name: "Nifty 50 Index Fund (Direct)",
    category: "mutual_fund",
    issuer: "Index AMC",
    summary: "Low-cost passive fund tracking the Nifty 50, tiny tracking error.",
    bestFor: ["passive", "long_term", "low_fees", "beginner"],
    goodIf: ["Horizon 5+ years", "You want market returns without stock picking"],
    avoidIf: ["You want beat-the-market returns", "Horizon under 3 years"],
    scores: { transparency: 92, liquidity: 88, hiddenCost: 90, taxEfficiency: 70, risk: 55 },
    fees: [
      { label: "Expense ratio", value: "0.20%" },
      { label: "Exit load", value: "Nil after 7 days" },
      { label: "STT/other", value: "Standard" },
    ],
    tags: ["index", "passive"],
  },
  {
    id: "mf-active-largecap",
    name: "Active Large Cap Fund (Regular)",
    category: "mutual_fund",
    issuer: "Active AMC",
    summary: "Actively managed large-cap. Higher fees; may or may not beat the index.",
    bestFor: ["active"],
    goodIf: ["You believe in this manager's edge"],
    avoidIf: ["You want lowest cost", "You prefer passive investing"],
    scores: { transparency: 65, liquidity: 85, hiddenCost: 45, taxEfficiency: 65, risk: 50 },
    fees: [
      { label: "Expense ratio", value: "1.85%" },
      { label: "Exit load", value: "1% before 1 year" },
      { label: "Distributor commission", value: "Bundled in regular plan" },
    ],
    tags: ["active", "large-cap"],
  },
  {
    id: "ins-term-plain",
    name: "Pure Term Insurance",
    category: "insurance",
    issuer: "Straightforward Life",
    summary: "Plain term cover — highest sum assured per rupee of premium.",
    bestFor: ["family_cover", "long_term", "low_fees"],
    goodIf: ["You have dependents", "You want maximum cover"],
    avoidIf: ["You want a maturity payout"],
    scores: { transparency: 95, liquidity: 20, hiddenCost: 90, taxEfficiency: 80, risk: 90 },
    fees: [
      { label: "Premium", value: "~₹10-15k/year for ₹1cr @ 30" },
      { label: "Surrender value", value: "Nil (as designed)" },
    ],
    tags: ["term", "protection"],
  },
  {
    id: "ins-ulip",
    name: "Investment-linked (ULIP)",
    category: "insurance",
    issuer: "Bundle Life",
    summary: "Bundles insurance + investment. High charges in early years; long lock-in.",
    bestFor: [],
    goodIf: ["You need a 5-year tax-locked instrument"],
    avoidIf: ["You want low fees", "You want liquidity", "You want maximum cover"],
    scores: { transparency: 40, liquidity: 15, hiddenCost: 25, taxEfficiency: 60, risk: 55 },
    fees: [
      { label: "Premium allocation", value: "up to 6%" },
      { label: "Policy admin", value: "₹500/month" },
      { label: "Fund mgmt", value: "1.35%" },
      { label: "Lock-in", value: "5 years" },
    ],
    tags: ["ulip", "bundled"],
  },
  {
    id: "loan-personal",
    name: "Personal Loan",
    category: "loan",
    issuer: "Any Bank",
    summary: "Unsecured, quick — but high APR once fees and GST are included.",
    bestFor: ["short_term_cash"],
    goodIf: ["You need <1 year bridge cash"],
    avoidIf: ["You have collateral available", "You can wait 3+ months"],
    scores: { transparency: 55, liquidity: 90, hiddenCost: 40, taxEfficiency: 20, risk: 40 },
    fees: [
      { label: "Interest rate", value: "12% – 24% p.a." },
      { label: "Processing fee", value: "1% – 3% + GST" },
      { label: "Prepayment", value: "2% – 5%" },
    ],
    tags: ["unsecured"],
  },
  {
    id: "plat-discount-broker",
    name: "Discount Broker",
    category: "platform",
    issuer: "Discount Co.",
    summary: "Flat brokerage on trades; low AMC; small DP charge per sell.",
    bestFor: ["low_fees", "self_directed"],
    goodIf: ["You trade infrequently", "You know what you want to buy"],
    avoidIf: ["You want hand-holding advisory"],
    scores: { transparency: 85, liquidity: 90, hiddenCost: 75, taxEfficiency: 60, risk: 60 },
    fees: [
      { label: "Equity delivery", value: "₹0" },
      { label: "Intraday/F&O", value: "₹20/order" },
      { label: "DP charges", value: "₹13.5 per sell" },
      { label: "Annual AMC", value: "₹300" },
    ],
    tags: ["discount", "self-directed"],
  },
  {
    id: "plat-full-service",
    name: "Full-service Broker",
    category: "platform",
    issuer: "Legacy Broker",
    summary: "Percentage-based brokerage, advisory desk, higher costs across the board.",
    bestFor: ["advisory"],
    goodIf: ["You want a dedicated RM"],
    avoidIf: ["You want lowest possible cost"],
    scores: { transparency: 50, liquidity: 88, hiddenCost: 35, taxEfficiency: 55, risk: 55 },
    fees: [
      { label: "Equity delivery", value: "0.30%" },
      { label: "Intraday", value: "0.03%" },
      { label: "AMC", value: "₹750" },
      { label: "Advisory", value: "Bundled" },
    ],
    tags: ["full-service", "advisory"],
  },
  {
    id: "fd-bank",
    name: "Bank Fixed Deposit",
    category: "fd",
    issuer: "Major Bank",
    summary: "Predictable returns, insured up to ₹5L per bank. Interest is taxable.",
    bestFor: ["safety", "short_term"],
    goodIf: ["You need capital protection", "Horizon 1-3 years"],
    avoidIf: ["You need inflation-beating returns", "You're in the highest tax slab"],
    scores: { transparency: 90, liquidity: 65, hiddenCost: 85, taxEfficiency: 30, risk: 92 },
    fees: [
      { label: "Interest rate", value: "6.5% – 7.5%" },
      { label: "Premature withdrawal", value: "0.5% – 1% penalty" },
      { label: "TDS", value: "10% above ₹40k interest" },
    ],
    tags: ["fd", "safe"],
  },
  {
    id: "gold-sgb",
    name: "Sovereign Gold Bond",
    category: "gold",
    issuer: "RBI",
    summary: "2.5% interest on top of gold price. Tax-free on maturity. 8-year lock-in.",
    bestFor: ["long_term", "gold"],
    goodIf: ["Horizon 5-8 years", "You want gold exposure"],
    avoidIf: ["You need liquidity", "Horizon under 5 years"],
    scores: { transparency: 92, liquidity: 40, hiddenCost: 95, taxEfficiency: 90, risk: 65 },
    fees: [
      { label: "Issue cost", value: "0" },
      { label: "Extra interest", value: "2.5% p.a." },
      { label: "Lock-in", value: "5 years (exit window)" },
    ],
    tags: ["gold", "sgb"],
  },
  {
    id: "ret-nps",
    name: "NPS (National Pension System)",
    category: "retirement",
    issuer: "PFRDA",
    summary: "Ultra-low-cost retirement scheme with extra ₹50k tax deduction (80CCD(1B)).",
    bestFor: ["retirement", "low_fees", "long_term"],
    goodIf: ["Horizon to retirement", "You want extra tax deduction"],
    avoidIf: ["You need pre-60 liquidity"],
    scores: { transparency: 88, liquidity: 25, hiddenCost: 95, taxEfficiency: 90, risk: 60 },
    fees: [
      { label: "Fund management", value: "0.03% – 0.09%" },
      { label: "Annual maintenance", value: "₹100" },
      { label: "Lock-in", value: "Till age 60" },
    ],
    tags: ["retirement", "nps"],
  },
];

export function scoreFor(p: Product) {
  const s = p.scores;
  return Math.round(
    s.transparency * 0.2 + s.liquidity * 0.15 + s.hiddenCost * 0.25 + s.taxEfficiency * 0.2 + s.risk * 0.2,
  );
}

export function labelFor(cat: Category) {
  return CATEGORIES.find((c) => c.id === cat)?.label ?? cat;
}
