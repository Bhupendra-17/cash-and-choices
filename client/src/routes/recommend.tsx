import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  Brain,
  AlertTriangle,
  Lightbulb,
  HeartPulse,
  Target,
  Info,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ExplainHint } from "@/components/ui/ExplainHint";
import { PRODUCTS, labelFor, scoreFor, type Product } from "@/data/products";
import { cn } from "@/lib/utils";

export type AIRecommendation = {
  headline: string;
  summary: string;
  picks: {
    productId: string;
    fit: number;
    why: string;
    watchOut: string;
  }[];
  nextSteps: string[];
};

import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/recommend")({
  head: () => ({
    meta: [
      { title: "Financial Decision Engine — Cash&Choices" },
      {
        name: "description",
        content:
          "Know before you invest. Answer 11 privacy-safe questions and receive a personalised financial profile analysis, investor persona, and zero-affiliate product guidance.",
      },
      { property: "og:title", content: "Financial Decision Engine — Cash&Choices" },
      {
        property: "og:description",
        content:
          "Zero-PII Financial Decision Engine: Understand your investor profile and compare options before committing a single rupee.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecommendPage,
});

// ─── Answer Shape ──────────────────────────────────────────────────────────────
export type Answers = {
  goal: string;
  horizon: string;
  risk: string;
  monthly: string;
  income: string;
  taxBracket: string;
  savings: string;
  withdrawalNeeds: string;
  investments: string;
  priority: string;
  interest: string;
};

// ─── Questions ─────────────────────────────────────────────────────────────────
export const QUESTIONS: {
  id: keyof Answers;
  title: string;
  subtitle: string;
  educationalNote: string;
  options: {
    value: string;
    label: string;
    sublabel: string;
    tags?: string[];
  }[];
}[] = [
  {
    id: "goal",
    title: "What's your #1 financial priority right now?",
    subtitle: "This shapes everything — your product type, horizon, and risk profile.",
    educationalNote:
      "Different goals need completely different strategies. Retirement needs long-term compounding; family protection needs insurance; short-term goals need liquidity.",
    options: [
      {
        value: "grow",
        label: "Build long-term wealth",
        sublabel: "Grow money through compounding over 5+ years",
        tags: ["long_term", "passive"],
      },
      {
        value: "protect",
        label: "Protect my family",
        sublabel: "Life cover, health cover, income replacement",
        tags: ["family_cover"],
      },
      {
        value: "retire",
        label: "Plan for retirement",
        sublabel: "Build a corpus for financial independence",
        tags: ["retirement", "long_term"],
      },
      {
        value: "liquid",
        label: "Keep money safe & accessible",
        sublabel: "Park surplus without locking it away",
        tags: ["safety", "short_term"],
      },
    ],
  },
  {
    id: "horizon",
    title: "How long can you stay invested without touching this money?",
    subtitle: "Time in the market is your biggest advantage. Longer horizon = more growth potential.",
    educationalNote:
      "Equity markets can be volatile short-term but have historically delivered 12–15% CAGR over 10+ years. Short horizons demand safer, liquid options.",
    options: [
      {
        value: "s",
        label: "Less than 2 years",
        sublabel: "Short-term — keep liquidity high",
        tags: ["short_term"],
      },
      {
        value: "m",
        label: "2 – 5 years",
        sublabel: "Medium-term — some growth possible with managed risk",
        tags: [],
      },
      {
        value: "l",
        label: "5 – 10 years",
        sublabel: "Long-term — compounding really kicks in here",
        tags: ["long_term"],
      },
      {
        value: "xl",
        label: "10+ years",
        sublabel: "Very long-term — ideal for equity & retirement corpus",
        tags: ["long_term", "retirement"],
      },
    ],
  },
  {
    id: "risk",
    title: "Markets crash 25% in 6 months. What do you actually do?",
    subtitle: "Be honest — your gut reaction defines your real risk tolerance, not what you think it should be.",
    educationalNote:
      "Market corrections are normal. The Sensex has crashed 40%+ four times since 2000 — and recovered to new highs every time. Your reaction here determines your ideal asset allocation.",
    options: [
      {
        value: "cant",
        label: "I exit immediately",
        sublabel: "Capital safety is non-negotiable for me",
        tags: ["safety"],
      },
      {
        value: "wobble",
        label: "I'm stressed but I'll hold",
        sublabel: "Uncomfortable, but I'll trust the process",
        tags: [],
      },
      {
        value: "fine",
        label: "It's a normal market cycle",
        sublabel: "I accept volatility for long-term gains",
        tags: ["long_term"],
      },
      {
        value: "add",
        label: "I'd invest more at lower prices",
        sublabel: "I see it as a buying opportunity",
        tags: ["long_term", "active"],
      },
    ],
  },
  {
    id: "monthly",
    title: "How much can you comfortably invest each month?",
    subtitle: "This is used only in-browser to shape your strategy. We store nothing.",
    educationalNote:
      "Consistency beats amount. A ₹1,000/month SIP started at 25 can grow to ₹3.5 Cr by age 60 at 12% CAGR. Time is your biggest asset.",
    options: [
      {
        value: "lt5",
        label: "Under ₹5,000",
        sublabel: "SIP from ₹500 is possible — start small, stay consistent",
        tags: ["beginner", "low_fees"],
      },
      {
        value: "5to20",
        label: "₹5,000 – ₹20,000",
        sublabel: "Good range for diversified 2–3 fund SIPs",
        tags: ["low_fees"],
      },
      {
        value: "20to50",
        label: "₹20,000 – ₹50,000",
        sublabel: "Can build a multi-fund portfolio with rebalancing",
        tags: [],
      },
      {
        value: "50plus",
        label: "₹50,000+",
        sublabel: "Multi-asset strategies, direct equity & PMS possible",
        tags: ["high_spend"],
      },
    ],
  },
  {
    id: "income",
    title: "What's your approximate monthly take-home income?",
    subtitle: "Helps calibrate your investment-to-income ratio and suitable product types.",
    educationalNote:
      "A common rule: invest at least 20% of take-home income. Higher income means tax efficiency matters more. We recommend the 50-30-20 split (needs / wants / savings).",
    options: [
      {
        value: "lt30",
        label: "Under ₹30,000",
        sublabel: "Early-career or part-time — build emergency fund first",
        tags: [],
      },
      {
        value: "30to75",
        label: "₹30,000 – ₹75,000",
        sublabel: "Mid-range salaried — good scope for SIPs & insurance",
        tags: [],
      },
      {
        value: "75to200",
        label: "₹75,000 – ₹2L",
        sublabel: "Upper-mid income — tax planning becomes very important",
        tags: [],
      },
      {
        value: "200plus",
        label: "₹2L+",
        sublabel: "High income — tax efficiency & advanced strategies matter",
        tags: ["high_spend"],
      },
    ],
  },
  {
    id: "taxBracket",
    title: "Which income tax slab applies to you?",
    subtitle: "Your tax bracket dramatically changes which investment is actually better after-tax.",
    educationalNote:
      "At 30% tax bracket, a debt mutual fund held 3+ years often beats an FD after tax and indexation benefit. At lower brackets, FDs can be fine. Knowing your slab is critical.",
    options: [
      {
        value: "nil",
        label: "No tax / Below exemption",
        sublabel: "Income under ₹3L — new tax regime",
        tags: [],
      },
      {
        value: "10",
        label: "5% – 10% slab",
        sublabel: "Income ₹3L – ₹7L — tax impact is low",
        tags: [],
      },
      {
        value: "20",
        label: "15% – 20% slab",
        sublabel: "Income ₹7L – ₹12L — tax efficiency starts to matter",
        tags: [],
      },
      {
        value: "30",
        label: "30% slab",
        sublabel: "Income ₹12L+ — tax efficiency is critical for returns",
        tags: [],
      },
    ],
  },
  {
    id: "savings",
    title: "How strong is your financial safety net right now?",
    subtitle: "An emergency fund is the foundation of every investment strategy.",
    educationalNote:
      "Rule of thumb: Keep 3–6 months of expenses in a liquid fund or savings account before investing aggressively. This prevents forced selling during market downturns.",
    options: [
      {
        value: "none",
        label: "Almost nothing",
        sublabel: "Less than 1 month — build this first",
        tags: ["safety", "beginner"],
      },
      {
        value: "1to3",
        label: "1 – 3 months of expenses",
        sublabel: "Partial safety net — consider topping up before investing",
        tags: [],
      },
      {
        value: "3to6",
        label: "3 – 6 months of expenses",
        sublabel: "Healthy buffer — ready to invest more confidently",
        tags: [],
      },
      {
        value: "6plus",
        label: "6+ months of expenses",
        sublabel: "Strong safety net — full investing mode",
        tags: ["long_term"],
      },
    ],
  },
  {
    id: "withdrawalNeeds",
    title: "How likely are you to need this invested money early?",
    subtitle: "Liquidity preference determines whether lock-in products are suitable for you.",
    educationalNote:
      "ELSS funds have a 3-year lock-in. NPS locks until 60. But they give significant tax benefits. If you might need early access, liquid funds are better even if returns are lower.",
    options: [
      {
        value: "very_likely",
        label: "Very likely — could need it anytime",
        sublabel: "Prefer high-liquidity options only",
        tags: ["safety", "short_term"],
      },
      {
        value: "possible",
        label: "Possible in 1–2 years",
        sublabel: "Avoid products with long lock-in or exit loads",
        tags: [],
      },
      {
        value: "unlikely",
        label: "Unlikely — I'm disciplined",
        sublabel: "Can consider some exit loads for better returns",
        tags: ["long_term"],
      },
      {
        value: "never",
        label: "Never — strictly long-term",
        sublabel: "Lock-in products like ELSS, NPS, PPF are perfectly fine",
        tags: ["long_term", "retirement"],
      },
    ],
  },
  {
    id: "investments",
    title: "What financial products have you actually used before?",
    subtitle: "Honest answer helps us skip beginner explanations if you're already experienced.",
    educationalNote:
      "No prior experience doesn't mean starting small. It means starting smart — with simple, low-cost index funds rather than complex active strategies.",
    options: [
      {
        value: "none",
        label: "Nothing yet — I'm starting fresh",
        sublabel: "First-time investor — beginner-friendly options first",
        tags: ["beginner", "passive"],
      },
      {
        value: "fd",
        label: "FDs and savings accounts only",
        sublabel: "Conservative base — ready to explore market-linked options",
        tags: ["safety"],
      },
      {
        value: "mf",
        label: "Mutual Funds / SIPs",
        sublabel: "Comfortable with NAV-based market-linked products",
        tags: [],
      },
      {
        value: "stocks",
        label: "Stocks, ETFs, or advanced instruments",
        sublabel: "Experienced — open to sophisticated multi-asset strategies",
        tags: ["active"],
      },
    ],
  },
  {
    id: "priority",
    title: "What matters most to you in an investment?",
    subtitle: "No right or wrong answer — this defines your core financial philosophy.",
    educationalNote:
      "A 1% difference in expense ratio costs you ₹5.3L more over 20 years on a ₹10,000/month SIP. Fees compound just like returns do.",
    options: [
      {
        value: "fees",
        label: "Minimal fees & charges",
        sublabel: "Every 0.5% saved in fees means lakhs more over 10 years",
        tags: ["low_fees"],
      },
      {
        value: "simple",
        label: "Easy to understand & manage",
        sublabel: "Clear, no-jargon options I can explain to anyone",
        tags: ["beginner", "passive"],
      },
      {
        value: "returns",
        label: "Maximum possible returns",
        sublabel: "I accept higher volatility and risk for higher reward",
        tags: ["active"],
      },
      {
        value: "tax",
        label: "Tax savings & efficiency",
        sublabel: "I want to minimize what I lose to taxes every year",
        tags: ["low_fees"],
      },
    ],
  },
  {
    id: "interest",
    title: "Which investment category are you most keen to explore?",
    subtitle: "We'll give you deeper insights about your chosen category in the analysis.",
    educationalNote:
      "Diversification across categories reduces overall portfolio risk. Don't concentrate everything in one place — but start with what you understand best.",
    options: [
      {
        value: "mf",
        label: "Mutual Funds / SIPs",
        sublabel: "Diversified, professionally managed, flexible amounts",
        tags: ["passive", "active"],
      },
      {
        value: "fd_bonds",
        label: "FDs, Bonds & Debt Instruments",
        sublabel: "Predictable, low-risk fixed income",
        tags: ["safety"],
      },
      {
        value: "gold",
        label: "Gold & Commodities",
        sublabel: "Inflation hedge, portfolio diversifier",
        tags: ["gold"],
      },
      {
        value: "insurance",
        label: "Insurance & Protection",
        sublabel: "Life cover, health & income protection products",
        tags: ["family_cover"],
      },
    ],
  },
];

// ─── Tag Extraction ─────────────────────────────────────────────────────────────
function tagsFrom(a: Partial<Answers>) {
  const set = new Set<string>();
  QUESTIONS.forEach((q) => {
    const v = a[q.id];
    if (!v) return;
    q.options.find((o) => o.value === v)?.tags?.forEach((t) => set.add(t));
  });
  return set;
}

// ─── Scoring ────────────────────────────────────────────────────────────────────
export function recommend(a: Partial<Answers>) {
  const tags = tagsFrom(a);
  const scored = PRODUCTS.map((p) => {
    let match = 0;
    p.bestFor.forEach((t) => tags.has(t) && (match += 3));
    p.tags.forEach((t) => tags.has(t) && (match += 1));
    if (a.priority === "fees" && p.bestFor.includes("low_fees")) match += 2;
    if ((a.priority === "tax") && p.bestFor.includes("low_fees")) match += 2;
    if (a.risk === "cant" && p.scores.risk >= 85) match += 3;
    if (a.horizon === "xl" && p.bestFor.includes("long_term")) match += 2;
    if (a.withdrawalNeeds === "never" && p.bestFor.includes("retirement")) match += 2;
    if (a.withdrawalNeeds === "very_likely" && p.scores.liquidity >= 85) match += 2;
    return { p, match, overall: scoreFor(p) };
  })
    .filter((r) => r.match > 0)
    .sort((x, y) => y.match * 10 + y.overall - (x.match * 10 + x.overall))
    .slice(0, 5);
  return scored;
}

export function whyMatches(p: Product, a: Partial<Answers>) {
  const reasons: string[] = [];
  if (a.priority === "fees" && p.bestFor.includes("low_fees"))
    reasons.push("Prioritises low fees — matches your top priority.");
  if (a.priority === "tax" && p.bestFor.includes("low_fees"))
    reasons.push("Strong tax efficiency — aligns with your goal of maximising post-tax returns.");
  if (a.risk === "cant" && p.scores.risk >= 85)
    reasons.push("Capital-safe profile — suited to your low-risk investor style.");
  if (a.horizon === "xl" && p.bestFor.includes("long_term"))
    reasons.push("Designed for long horizons where compounding does the heavy lifting.");
  if (a.goal === "retire" && p.bestFor.includes("retirement"))
    reasons.push("Built specifically for retirement outcomes with associated tax benefits.");
  if (a.withdrawalNeeds === "never" && p.bestFor.includes("retirement"))
    reasons.push("Lock-in suits your confirmed long-term commitment.");
  if (a.withdrawalNeeds === "very_likely" && p.scores.liquidity >= 85)
    reasons.push("High liquidity — you can access your money quickly if needed.");
  if (!reasons.length) reasons.push("Fits your questionnaire profile across multiple dimensions.");
  return reasons;
}

// ─── Financial Profile Analysis ─────────────────────────────────────────────────
type Persona = {
  name: string;
  gradient: string;
  description: string;
};

type ProfileInsight = {
  type: "warning" | "tip" | "info" | "success";
  text: string;
};

type FinancialProfile = {
  persona: Persona;
  healthScore: number;
  healthLabel: string;
  insights: ProfileInsight[];
};

function computeFinancialProfile(a: Partial<Answers>): FinancialProfile {
  // ── Investor Persona ──────────────────────────────────────────────
  const getPersona = (): Persona => {
    const { risk, horizon, investments } = a;
    const isExperienced = investments === "stocks" || investments === "mf";
    if (risk === "add" && (horizon === "l" || horizon === "xl")) {
      return {
        name: "Aggressive Wealth Creator",
        gradient: "from-orange-500/20 to-red-500/20 border-orange-500/40",
        description:
          "High risk tolerance and a long horizon make you the ideal equity investor. You can weather short-term storms for exceptional long-term compounding.",
      };
    }
    if (risk === "fine" && (horizon === "l" || horizon === "xl")) {
      return {
        name: "Balanced Growth Investor",
        gradient: "from-blue-500/20 to-indigo-500/20 border-blue-500/40",
        description:
          "You seek steady growth with manageable risk. A blended equity-debt portfolio suits you — capturing upside while protecting against crashes.",
      };
    }
    if ((risk === "cant" || risk === "wobble") && isExperienced) {
      return {
        name: "Conservative Strategist",
        gradient: "from-green-500/20 to-teal-500/20 border-green-500/40",
        description:
          "Experienced but risk-averse. You prefer debt instruments, hybrid funds, and capital-protected strategies with predictable outcomes.",
      };
    }
    if (risk === "wobble" || risk === "fine") {
      return {
        name: "Cautious Explorer",
        gradient: "from-purple-500/20 to-violet-500/20 border-purple-500/40",
        description:
          "Still finding your investing style. Start with simple index funds, build conviction, then gradually increase equity allocation as you grow comfortable.",
      };
    }
    return {
      name: "Safety-First Builder",
      gradient: "from-slate-500/20 to-gray-500/20 border-slate-500/40",
      description:
        "Capital preservation is your priority. FDs, debt funds, and liquid instruments form the core of your strategy — stability over maximising returns.",
    };
  };

  // ── Financial Health Score ────────────────────────────────────────
  const getHealthScore = () => {
    let score = 40;
    // Emergency fund
    if (a.savings === "6plus") score += 25;
    else if (a.savings === "3to6") score += 18;
    else if (a.savings === "1to3") score += 8;
    else if (a.savings === "none") score -= 10;
    // Investment experience
    if (a.investments === "stocks") score += 15;
    else if (a.investments === "mf") score += 10;
    else if (a.investments === "fd") score += 5;
    // Withdrawal discipline
    if (a.withdrawalNeeds === "never") score += 12;
    else if (a.withdrawalNeeds === "unlikely") score += 7;
    else if (a.withdrawalNeeds === "very_likely") score -= 8;
    // Income stability signal
    if (a.income === "200plus") score += 8;
    else if (a.income === "75to200") score += 5;
    return Math.max(15, Math.min(95, score));
  };

  const healthScore = getHealthScore();
  const healthLabel =
    healthScore >= 80 ? "Excellent" :
    healthScore >= 65 ? "Strong" :
    healthScore >= 50 ? "Moderate" :
    healthScore >= 35 ? "Developing" : "Needs Attention";

  // ── Key Insights ──────────────────────────────────────────────────
  const getInsights = (): ProfileInsight[] => {
    const out: ProfileInsight[] = [];

    if (a.taxBracket === "30") {
      out.push({
        type: "tip",
        text: "At the 30% tax bracket, debt mutual funds held 3+ years historically beat FDs after indexation. The difference can be 2–3% post-tax annually.",
      });
    }
    if (a.taxBracket === "30" && a.horizon === "xl" && a.goal !== "protect") {
      out.push({
        type: "tip",
        text: "ELSS funds save you ₹46,800/year in taxes (₹1.5L deduction at 31.2% effective rate) and also deliver equity growth over their 3-year lock-in.",
      });
    }
    if (a.savings === "none" || a.savings === "1to3") {
      out.push({
        type: "warning",
        text: "Emergency fund gap detected. Build 3–6 months of expenses in a liquid fund before aggressive investing — one unexpected event can force you to sell at a loss.",
      });
    }
    if (a.horizon === "s" && (a.risk === "add" || a.risk === "fine")) {
      out.push({
        type: "warning",
        text: "Short horizon with high risk tolerance is a mismatch. Equity markets can fall 40%+ and take 2–3 years to recover. Short-duration debt or liquid funds are safer here.",
      });
    }
    if (a.goal === "retire" && a.horizon === "xl") {
      out.push({
        type: "info",
        text: "NPS gives an additional ₹50,000 tax deduction under 80CCD(1B) beyond the ₹1.5L 80C limit — an exclusive benefit for retirement-focused investors.",
      });
    }
    if (a.withdrawalNeeds === "very_likely" && (a.interest === "mf" || a.interest === "fd_bonds")) {
      out.push({
        type: "warning",
        text: "Since you may need money early, avoid ELSS (3-year lock-in) and equity funds with exit loads. Liquid or overnight funds allow withdrawal in 1 business day.",
      });
    }
    if (a.priority === "fees") {
      out.push({
        type: "tip",
        text: "Direct plan mutual funds have 0.5–1.5% lower expense ratio than regular plans. On a ₹10,000/month SIP over 20 years at 12% CAGR, that gap equals ₹15–30L extra.",
      });
    }
    if (a.monthly === "lt5" && a.investments === "none") {
      out.push({
        type: "info",
        text: "Starting with ₹500/month in a Nifty 50 Index Fund is a solid first step. Consistency over 10 years matters far more than starting with a large amount.",
      });
    }
    if (a.interest === "gold") {
      out.push({
        type: "info",
        text: "Sovereign Gold Bonds (SGBs) are the most tax-efficient gold option — 2.5% annual interest plus capital gains are tax-free if held to maturity (8 years).",
      });
    }
    if (a.risk === "cant" && a.horizon === "xl") {
      out.push({
        type: "tip",
        text: "Very long horizon but very low risk tolerance? Conservative hybrid funds hold 75–90% debt while adding enough equity to beat inflation without extreme volatility.",
      });
    }

    return out.slice(0, 4);
  };

  return {
    persona: getPersona(),
    healthScore,
    healthLabel,
    insights: getInsights(),
  };
}

import { apiFetch } from "@/lib/api";

function RecommendPage() {
  const { user, saveRecommendation } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const done = step >= QUESTIONS.length;

  const results = useMemo(
    () => (done ? recommend(answers as Answers) : []),
    [done, answers],
  );

  const profile = useMemo(
    () => (done ? computeFinancialProfile(answers) : null),
    [done, answers],
  );

  const ai = useMutation({
    mutationFn: async (payload: { answers: Record<string, string>; candidateIds: string[] }) => {
      const res = await apiFetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to fetch recommendation");
      return res.json() as Promise<AIRecommendation>;
    },
  });

  const handleSaveToProfile = async (aiData?: AIRecommendation) => {
    if (!user || savedSuccess || saving) return;
    setSaving(true);
    try {
      const formattedAnswers = Object.entries(answers).map(([key, val]) => {
        const question = QUESTIONS.find((q) => q.id === key);
        const opt = question?.options.find((o) => o.value === val);
        return {
          questionId: key,
          questionText: question?.title || key,
          answerValue: val as string,
          answerLabel: opt?.label || (val as string),
        };
      });

      await saveRecommendation({
        headline: aiData?.headline || "Financial Decision Engine Analysis",
        summary: aiData?.summary || "Personalised financial profile evaluation.",
        answers: formattedAnswers,
        picks:
          aiData?.picks ||
          results.map((r) => ({
            productId: r.p.id,
            fit: Math.round(r.match * 10),
            why: whyMatches(r.p, answers as Answers).join(" "),
            watchOut: r.p.avoidIf[0] || "",
          })),
        nextSteps: aiData?.nextSteps || ["Review product details", "Compare options"],
      });
      setSavedSuccess(true);
    } catch (err) {
      console.error("Save recommendation error:", err);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (done && results.length > 0 && !ai.data && !ai.isPending) {
      ai.mutate({
        answers: answers as Record<string, string>,
        candidateIds: results.map((r) => r.p.id),
      });
    }
  }, [done, results.length]);

  useEffect(() => {
    if (done && ai.data && user && !savedSuccess && !saving) {
      handleSaveToProfile(ai.data);
    }
  }, [done, ai.data, user]);

  const q = QUESTIONS[step];
  const progress = Math.round((step / QUESTIONS.length) * 100);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              <ShieldCheck className="size-3.5 text-brand" />
              Zero-PII · Privacy-First
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-gradient-brand-soft px-3 py-1 text-xs font-semibold text-brand-deep">
              <Brain className="size-3.5" />
              Financial Decision Engine
            </div>
          </div>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
            Know Before You Invest.
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Answer {QUESTIONS.length} privacy-safe questions. Get a personalised investor profile, financial health analysis, and zero-affiliate product guidance — no bank account, no PAN, no Aadhaar needed.
          </p>
        </div>

        {/* ── Progress ── */}
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{done ? "Analysis complete" : `Question ${step + 1} of ${QUESTIONS.length}`}</span>
          <span>{done ? "100" : progress}%</span>
        </div>
        <Progress value={done ? 100 : progress} className="h-2 bg-muted [&>div]:bg-gradient-brand" />

        {!done ? (
          /* ─── Question Card ─── */
          <div className="mt-8 rounded-3xl border border-border/70 bg-card p-6 shadow-card sm:p-8">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Step {step + 1} / {QUESTIONS.length}
            </div>
            <h2 className="mt-3 text-xl font-bold leading-snug sm:text-2xl">{q.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{q.subtitle}</p>

            <div className="mt-4 flex items-center gap-2 rounded-xl bg-accent/70 px-4 py-2.5 text-xs text-muted-foreground">
              <Info className="size-3.5 shrink-0 text-brand" />
              <span>This answer helps us choose the right path for you.</span>
              <ExplainHint> {q.educationalNote} </ExplainHint>
            </div>

            {/* Options Grid */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {q.options.map((o) => {
                const selected = answers[q.id] === o.value;
                return (
                  <button
                    key={o.value}
                    id={`option-${q.id}-${o.value}`}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.value }))}
                    className={cn(
                      "group flex items-start gap-3 rounded-2xl border p-4 text-left text-sm transition-all duration-200",
                      selected
                        ? "border-brand bg-gradient-brand-soft shadow-soft"
                        : "border-border hover:border-brand/60 hover:bg-accent",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={cn("font-semibold", selected ? "text-brand-deep" : "text-foreground")}>
                        {o.label}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{o.sublabel}</div>
                    </div>
                    <span
                      className={cn(
                        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-all",
                        selected ? "border-brand bg-brand text-white" : "border-border",
                      )}
                    >
                      {selected && <CheckCircle2 className="size-3.5" />}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between">
              <Button
                variant="ghost"
                className="rounded-full"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
              >
                <ArrowLeft className="mr-1 size-4" /> Back
              </Button>
              <Button
                id="next-question-btn"
                className="rounded-full bg-gradient-brand text-white shadow-glow"
                disabled={!answers[q.id]}
                onClick={() => setStep((s) => s + 1)}
              >
                {step === QUESTIONS.length - 1 ? "Analyse my profile" : "Next"}
                <ArrowRight className="ml-1 size-4" />
              </Button>
            </div>
          </div>
        ) : (
          /* ─── Results ─── */
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Your Financial Analysis</h2>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                id="restart-fde-btn"
                onClick={() => {
                  setAnswers({});
                  setStep(0);
                }}
              >
                <RotateCcw className="mr-1 size-3.5" /> Restart
              </Button>
            </div>

            {/* ── Financial Profile Analysis ── */}
            {profile && <FinancialProfileAnalysis profile={profile} />}

            {/* ── AI Mentor Insight ── */}
            <AIInsightCard state={ai} />

            {/* ── Product Picks Heading ── */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Matched Products
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {results.length === 0 && (
              <div className="rounded-3xl border border-border/70 bg-card p-8 text-center text-muted-foreground shadow-soft">
                No strong matches. Try adjusting your answers to see more options.
              </div>
            )}

            {results.map(({ p, overall }) => {
              const reasons = whyMatches(p, answers as Answers);
              return (
                <article
                  key={p.id}
                  className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft transition-shadow hover:shadow-card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        {labelFor(p.category)} · {p.issuer}
                      </div>
                      <h3 className="mt-1 text-xl font-semibold">{p.name}</h3>
                      <p className="mt-1 max-w-xl text-sm text-muted-foreground">{p.summary}</p>
                    </div>
                    <div className="rounded-2xl bg-gradient-brand-soft px-4 py-3 text-center">
                      <div className="text-[10px] uppercase tracking-wide text-brand-deep">FDE Score</div>
                      <div className="text-2xl font-bold text-brand-deep">{overall}</div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-accent/60 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-brand-deep">
                      Why this fits your profile
                    </div>
                    <ul className="mt-2 space-y-1 text-sm text-foreground">
                      {reasons.map((r) => (
                        <li key={r} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Good if</div>
                      <ul className="mt-1 space-y-1 text-sm text-foreground">
                        {p.goodIf.map((g) => <li key={g}>• {g}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Avoid if</div>
                      <ul className="mt-1 space-y-1 text-sm text-foreground">
                        {p.avoidIf.map((g) => <li key={g}>• {g}</li>)}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {p.fees.slice(0, 3).map((f) => (
                      <span
                        key={f.label}
                        className="rounded-full border border-border bg-surface px-2.5 py-1 text-muted-foreground"
                      >
                        <span className="font-medium text-foreground">{f.label}:</span> {f.value}
                      </span>
                    ))}
                    <Link
                      to="/charges"
                      className="rounded-full border border-brand/40 bg-white px-2.5 py-1 text-brand-deep hover:bg-accent"
                    >
                      See all fees →
                    </Link>
                  </div>
                </article>
              );
            })}

            <div className="rounded-3xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Want to compare two of these head-to-head?{" "}
              <Link to="/compare" className="font-medium text-brand-deep underline-offset-4 hover:underline">
                Open Compare →
              </Link>
            </div>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

// ─── Financial Profile Analysis Component ──────────────────────────────────────
function FinancialProfileAnalysis({ profile }: { profile: FinancialProfile }) {
  const { persona, healthScore, healthLabel, insights } = profile;

  const scoreColor =
    healthScore >= 80 ? "text-emerald-500" :
    healthScore >= 65 ? "text-blue-500" :
    healthScore >= 50 ? "text-yellow-500" :
    healthScore >= 35 ? "text-orange-500" : "text-red-500";

  const scoreBg =
    healthScore >= 80 ? "bg-emerald-500" :
    healthScore >= 65 ? "bg-blue-500" :
    healthScore >= 50 ? "bg-yellow-500" :
    healthScore >= 35 ? "bg-orange-500" : "bg-red-500";

  const insightIcon = (type: ProfileInsight["type"]) => {
    if (type === "warning") return <AlertTriangle className="mt-0.5 size-4 shrink-0 text-orange-500" />;
    if (type === "tip") return <Lightbulb className="mt-0.5 size-4 shrink-0 text-brand" />;
    if (type === "success") return <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />;
    return <Info className="mt-0.5 size-4 shrink-0 text-blue-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Persona + Health Score Row */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Investor Persona */}
        <div className={cn("rounded-3xl border bg-linear-to-br p-6 shadow-soft", persona.gradient)}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Target className="size-3.5" />
            Your Investor Persona
          </div>
          <h3 className="mt-3 text-lg font-bold">{persona.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{persona.description}</p>
        </div>

        {/* Financial Health Score */}
        <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <HeartPulse className="size-3.5" />
            Financial Health Score
          </div>
          <div className={cn("mt-3 text-6xl font-bold tabular-nums", scoreColor)}>
            {healthScore}
          </div>
          <div className={cn("mt-1 text-sm font-semibold", scoreColor)}>{healthLabel}</div>
          {/* Mini progress bar */}
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all duration-700", scoreBg)}
              style={{ width: `${healthScore}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Based on your emergency fund, investment experience, and financial discipline.
          </p>
        </div>
      </div>

      {/* Key Insights */}
      {insights.length > 0 && (
        <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <TrendingUp className="size-3.5" />
            Personalised Financial Insights
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Based on your specific answers — not generic advice.</p>
          <ul className="mt-4 space-y-3">
            {insights.map((ins, i) => (
              <li
                key={i}
                className={cn(
                  "flex items-start gap-3 rounded-xl p-3 text-sm",
                  ins.type === "warning" ? "bg-orange-500/10 text-orange-900 dark:text-orange-300" :
                  ins.type === "tip" ? "bg-brand/10 text-foreground" :
                  ins.type === "success" ? "bg-emerald-500/10 text-emerald-900 dark:text-emerald-300" :
                  "bg-blue-500/10 text-foreground"
                )}
              >
                {insightIcon(ins.type)}
                <span className="leading-relaxed">{ins.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── AI Insight Card ───────────────────────────────────────────────────────────
type AIState = {
  data?: AIRecommendation;
  isPending: boolean;
  isError: boolean;
};

function AIInsightCard({ state }: { state: AIState }) {
  if (state.isPending) {
    return (
      <div className="flex items-center gap-3 rounded-3xl border border-border/70 bg-card p-6 text-sm text-muted-foreground shadow-soft">
        <Loader2 className="size-5 animate-spin text-brand" />
        <div>
          <div className="font-medium text-foreground">AI Financial Mentor is analysing your profile…</div>
          <div className="mt-0.5 text-xs">Generating personalised insights based on your 11 answers.</div>
        </div>
      </div>
    );
  }
  if (state.isError) {
    return (
      <div className="rounded-3xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive shadow-soft">
        Couldn't reach the AI right now. Your rules-based analysis above is still fully valid.
      </div>
    );
  }
  if (!state.data) return null;
  const d = state.data;
  return (
    <div className="rounded-3xl border border-brand/30 bg-gradient-brand-soft p-6 shadow-card">
      <div className="flex items-center gap-2 text-brand-deep">
        <Sparkles className="size-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">AI Financial Mentor</span>
      </div>
      <h3 className="mt-2 text-lg font-semibold text-brand-deep">{d.headline}</h3>
      <p className="mt-2 text-sm text-foreground">{d.summary}</p>
      {d.nextSteps?.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-deep">Your Action Plan</div>
          <ul className="mt-2 space-y-1 text-sm text-foreground">
            {d.nextSteps.map((s) => (
              <li key={s} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" /> {s}
              </li>
            ))}
          </ul>
        </div>
      )}
      {d.picks?.length > 0 && (
        <div className="mt-5 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-deep">AI Pick Analysis</div>
          {d.picks.map((p) => {
            const product = PRODUCTS.find((x) => x.id === p.productId);
            if (!product) return null;
            return (
              <div key={p.productId} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{product.name}</div>
                  <div className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                    Fit {p.fit}/100
                  </div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{p.why}</p>
                <p className="mt-1 text-xs text-destructive">⚠ Watch out: {p.watchOut}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
