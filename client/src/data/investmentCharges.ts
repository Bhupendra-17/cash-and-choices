// Comprehensive investment-charges catalog.
// Every charge answers the five explainer questions.

export interface InvestmentCharge {
  id: string;
  name: string;
  short: string;
  what: string;
  why: string;
  when: string;
  howMuch: string;
  canAvoid: string;
  appliesTo: string[]; // instrument tags
}

export const INVESTMENT_CHARGES: InvestmentCharge[] = [
  {
    id: "expense_ratio",
    name: "Expense Ratio",
    short: "AMC's annual fee for running the fund.",
    what: "The percentage of a fund's assets that the AMC keeps every year to cover management, admin and operating costs.",
    why: "It pays the fund manager, research team, custodian, registrar and marketing costs.",
    when: "Deducted daily from the fund's NAV — not billed to you separately, but it shrinks your returns silently.",
    howMuch: "0.1–0.3% for index funds. 1.0–1.8% for active equity funds. 0.3–1.0% for debt funds. On ₹10 lakh at 1.5% that's ₹15,000 a year.",
    canAvoid: "Yes — pick direct plans over regular plans (saves ~0.5–1%) and prefer index funds when appropriate.",
    appliesTo: ["mutual_fund", "etf"],
  },
  {
    id: "exit_load",
    name: "Exit Load",
    short: "Penalty for redeeming too soon.",
    what: "A one-time charge deducted from your redemption if you exit before a minimum holding period.",
    why: "Discourages short-term churn that hurts other investors.",
    when: "At redemption, if you're within the load period (commonly 7 days for index/liquid, 1 year for equity).",
    howMuch: "Usually 0.25–1% of the redemption amount. Zero after the load period.",
    canAvoid: "Yes — hold beyond the exit-load window before redeeming.",
    appliesTo: ["mutual_fund"],
  },
  {
    id: "gst",
    name: "GST",
    short: "18% tax on financial services.",
    what: "Goods & Services Tax charged on the service fee component (brokerage, transaction charges, some fund fees).",
    why: "Statutory tax on services in India.",
    when: "Every transaction that has a service fee.",
    howMuch: "18% on the fee — not on your capital. On ₹20 brokerage, ₹3.6 GST.",
    canAvoid: "No — statutory. But lower base fees mean lower GST.",
    appliesTo: ["equity", "mutual_fund", "loan"],
  },
  {
    id: "stt",
    name: "Securities Transaction Tax (STT)",
    short: "Tax on equity trades and equity fund redemptions.",
    what: "A tax on the value of specified equity/equity-fund transactions.",
    why: "Government revenue on securities transactions.",
    when: "On every equity buy/sell (delivery/intraday/F&O) and on redemption of equity mutual funds.",
    howMuch: "0.1% on delivery equity buy & sell. 0.025% on intraday sell. 0.001% on equity MF redemption.",
    canAvoid: "No — statutory.",
    appliesTo: ["equity", "mutual_fund"],
  },
  {
    id: "brokerage",
    name: "Brokerage",
    short: "Broker's fee per trade.",
    what: "The commission your broker charges to execute an order.",
    why: "Compensates the broker for order routing, tech and support.",
    when: "On every buy and sell order.",
    howMuch: "₹0 for equity delivery at discount brokers. ₹20/order for intraday/F&O. 0.30% at full-service brokers.",
    canAvoid: "Yes — use a discount broker. Direct mutual funds have no brokerage.",
    appliesTo: ["equity"],
  },
  {
    id: "platform_fee",
    name: "Platform / DP Charges",
    short: "Depository fees for holding & selling securities.",
    what: "Charge levied by the depository (NSDL/CDSL) through your DP for holding your demat units and every sell debit.",
    why: "Depository infrastructure and record-keeping.",
    when: "Per sell transaction (DP charge), plus annual AMC.",
    howMuch: "₹13.5 + GST per sell script. AMC ₹0–₹750/year depending on broker.",
    canAvoid: "Partly — no DP charge on mutual funds. AMC can be avoided with a Basic Services Demat Account.",
    appliesTo: ["equity"],
  },
  {
    id: "amc",
    name: "Annual Maintenance Charges (AMC)",
    short: "Yearly fee for keeping your demat account open.",
    what: "Recurring maintenance fee your broker/DP charges each year.",
    why: "Covers account servicing, statements, KYC upkeep.",
    when: "Annually, typically on account anniversary.",
    howMuch: "₹0–₹750/year. Lifetime AMC plans exist for a one-time fee.",
    canAvoid: "Yes — opt for a Basic Services Demat Account (BSDA) if your holdings are under ₹4 lakh.",
    appliesTo: ["equity", "platform"],
  },
  {
    id: "stamp_duty",
    name: "Stamp Duty",
    short: "State duty on securities purchase.",
    what: "A one-time duty on the buy leg of every securities transaction (uniform across India since 2020).",
    why: "State government revenue on securities transfers.",
    when: "On every buy — equity delivery, intraday, F&O and mutual fund units.",
    howMuch: "0.015% on equity delivery, 0.003% on intraday, 0.005% on mutual funds.",
    canAvoid: "No — statutory.",
    appliesTo: ["equity", "mutual_fund"],
  },
  {
    id: "sebi_charges",
    name: "SEBI Turnover Charges",
    short: "Regulator's fee.",
    what: "SEBI's turnover charge on all securities transactions.",
    why: "Funds the market regulator.",
    when: "Per transaction.",
    howMuch: "₹10 per ₹1 crore of turnover (0.0001%).",
    canAvoid: "No — statutory.",
    appliesTo: ["equity"],
  },
  {
    id: "transaction_charges",
    name: "Exchange Transaction Charges",
    short: "NSE/BSE turnover fee.",
    what: "The exchange's charge for executing your order.",
    why: "Covers exchange infrastructure.",
    when: "Per trade.",
    howMuch: "NSE ~0.00325%, BSE ~0.00375% of turnover.",
    canAvoid: "No — exchange rule.",
    appliesTo: ["equity"],
  },
  {
    id: "forex_markup",
    name: "Forex Markup",
    short: "Extra spread on foreign-currency transactions.",
    what: "The spread added on top of the interbank rate when you spend or invest in a foreign currency.",
    why: "Bank/card issuer's cost + margin on FX conversion.",
    when: "Every foreign-currency transaction (credit card abroad, international investing, remittance).",
    howMuch: "1.5–3.5% on credit cards. 0.5–1% on remittance platforms.",
    canAvoid: "Yes — use a zero-forex-markup card or a low-cost remittance platform.",
    appliesTo: ["credit_card", "international"],
  },
  {
    id: "tds",
    name: "TDS",
    short: "Tax deducted at source on interest and gains.",
    what: "Tax withheld by the payer (bank/AMC/broker) and deposited with the government.",
    why: "Statutory pre-collection of income tax.",
    when: "Bank FD interest above ₹40k/yr (₹50k for seniors); NRI redemptions; select dividends.",
    howMuch: "10% for residents (20% without PAN). Higher rates for NRIs.",
    canAvoid: "Sometimes — submit Form 15G/15H if eligible, or claim credit in your ITR.",
    appliesTo: ["fd", "savings", "mutual_fund"],
  },
];

export function chargeById(id: string) {
  return INVESTMENT_CHARGES.find((c) => c.id === id);
}