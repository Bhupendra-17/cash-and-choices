# Mutual Funds & Investment Intelligence Module

This is a large, multi-page build. I'll ship it in phases so you can review each one before I move on. Everything stays privacy-first: no PAN, no bank login, no personal financial data — only anonymous questionnaire inputs stored in-browser.

## Phase 1 — Data foundation & fund listings
- Expand `src/data/` with a rich mutual-fund dataset (30–40 funds) covering all requested categories (Index, Large/Mid/Small/Flexi/Multi Cap, ELSS, Hybrid, Debt, International, Sectoral, Thematic, Liquid, Arbitrage) with every field you listed (NAV, returns, CAGR, risk, expense ratio, AUM, manager, exit load, min SIP/lump sum, benchmark, allocation, top holdings, tracking error, Sharpe/alpha/beta/std-dev).
- Rebuild `/funds` route: filter chips by category, sort dropdown (all 10 sort modes), searchable list, and per-fund detail drawer.
- Each fund detail includes a "Know Before You Invest" block.

## Phase 2 — Smart Fund Comparison
- New `/funds/compare` route allowing category-vs-category and fund-vs-fund comparison (up to 3).
- Comparison table across every parameter you listed. Each row auto-highlights the better value and shows a one-line explanation ("Lower expense ratio → keeps more of your returns").

## Phase 3 — Hidden Charges Explorer
- New `/charges` route (extend existing charges page).
- Card grid for every charge type with the five explainer fields (What / Why / When / How much / Can it be avoided?).
- Per-fund "Total Cost of Ownership" widget on fund detail pages.

## Phase 4 — Investment Calculator Hub
- New `/calculators` index + one route per calculator (SIP, Lump Sum, FD, RD, Tax-Saver FD, IPO, Bonds, Gold, PPF, NPS, EPF, SSY, NSC).
- Shared calculator engine returns invested amount, returns, total value, interest, taxable gains, estimated tax, net withdrawal, inflation-adjusted value, effective annual return.
- Interactive charts using Recharts (already in the stack).

## Phase 5 — Personalized Suggestions (AI-assisted)
- Extend existing `/recommend` questionnaire with the investment-specific questions (income range, budget, goal, horizon, risk, emergency fund, liquidity, experience).
- Rules engine shortlists funds; Lovable AI generates the "why it fits / risks / confidence score" explanation (reusing `explainRecommendations`).

## Phase 6 — Withdrawal & Tax Calculator
- New `/tax-calculator` route.
- Inputs: investment type, date, amount, current value, withdrawal amount.
- Output: original vs gains breakdown, LTCG/STCG classification, tax rule citation, exit load, net receivable — with plain-language explanations for every line.

## Phase 7 — Transparency & UX polish
- Reusable `KnowBeforeYouInvest`, `MetricWithTooltip`, `CostBreakdownCard`, `ScenarioSimulator` components used across all investment pages.
- Site nav updated so all new sections are reachable; new pages get proper `head()` metadata for SEO.

## Technical notes
- No backend needed: fund data is static (marked as illustrative sample data with disclaimers); calculators run client-side; AI explanations use the existing Lovable AI Gateway server function.
- Live NAV would need a paid market-data API — I'll flag "live prices" as a follow-up rather than fake them. The dataset will carry a clear "sample data" disclaimer, and I'll leave a documented `fetchNav()` seam so we can wire a real feed later (e.g. AMFI daily NAV or a paid provider) without rewriting the UI.
- All tax figures cite FY 2025-26 rules with a disclaimer that they're estimates.
- Charts via Recharts, tooltips via existing shadcn Tooltip.

## What I'll do first
If you approve, I'll start with **Phase 1 (data + listings)** and check in before moving to Phase 2. Reply "go" to start, or tell me which phase to prioritize / skip.
