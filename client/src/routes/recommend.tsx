import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Loader2, RotateCcw, Sparkles, CheckCircle2 } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
      { title: "Recommendation Engine — Cash&Choices" },
      {
        name: "description",
        content:
          "Answer six privacy-safe questions and get zero-affiliate financial product recommendations with plain-English reasons.",
      },
      { property: "og:title", content: "Recommendation Engine — Cash&Choices" },
      {
        property: "og:description",
        content: "Zero-affiliate recommendations for cards, funds, insurance and more.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecommendPage,
});

export type Answers = {
  goal: string;
  horizon: string;
  risk: string;
  monthly: string;
  priority: string;
  interest: string;
  income: string;
  savings: string;
  investments: string;
};

export const QUESTIONS: {
  id: keyof Answers;
  title: string;
  hint?: string;
  options: { value: string; label: string; tags?: string[] }[];
}[] = [
    {
      id: "goal",
      title: "What are you trying to solve today?",
      options: [
        { value: "grow", label: "Grow my money over time", tags: ["long_term", "passive"] },
        { value: "protect", label: "Protect my family / income", tags: ["family_cover"] },
        { value: "spend", label: "Choose a better everyday product", tags: ["everyday"] },
        { value: "retire", label: "Plan for retirement", tags: ["retirement", "long_term"] },
      ],
    },
    {
      id: "horizon",
      title: "How long can you leave the money alone?",
      options: [
        { value: "s", label: "Under 2 years", tags: ["short_term"] },
        { value: "m", label: "2 – 5 years" },
        { value: "l", label: "5 – 10 years", tags: ["long_term"] },
        { value: "xl", label: "10+ years", tags: ["long_term", "retirement"] },
      ],
    },
    {
      id: "risk",
      title: "How would you feel if this dropped 20% in a bad year?",
      options: [
        { value: "cant", label: "I can't lose capital", tags: ["safety"] },
        { value: "wobble", label: "Uncomfortable but okay" },
        { value: "fine", label: "Fine — I'll stay invested", tags: ["long_term"] },
        { value: "add", label: "I'd buy more", tags: ["long_term"] },
      ],
    },
    {
      id: "monthly",
      title: "Roughly how much can you put toward this each month?",
      hint: "We don't store this. It only shapes suggestions.",
      options: [
        { value: "lt5", label: "Under ₹5,000", tags: ["beginner", "low_fees"] },
        { value: "5to20", label: "₹5,000 – ₹20,000", tags: ["low_fees"] },
        { value: "20to50", label: "₹20,000 – ₹50,000" },
        { value: "50plus", label: "₹50,000+", tags: ["high_spend"] },
      ],
    },
    {
      id: "priority",
      title: "What matters most to you?",
      options: [
        { value: "fees", label: "Lowest possible fees", tags: ["low_fees"] },
        { value: "simple", label: "Simple to understand", tags: ["beginner", "passive"] },
        { value: "returns", label: "Chase highest returns", tags: ["active"] },
        { value: "safety", label: "Peace of mind", tags: ["safety"] },
      ],
    },
    {
      id: "interest",
      title: "Which of these are you curious about?",
      options: [
        { value: "mf", label: "Mutual funds", tags: ["passive", "active"] },
        { value: "cc", label: "Credit cards", tags: ["everyday", "travel"] },
        { value: "ins", label: "Insurance", tags: ["family_cover"] },
        { value: "gold", label: "Gold", tags: ["gold"] },
      ],
    },
    {
      id: "income",
      title: "What's your rough monthly take-home?",
      hint: "Used only in-browser to shape suggestions.",
      options: [
        { value: "lt30", label: "Under ₹30,000" },
        { value: "30to75", label: "₹30,000 – ₹75,000" },
        { value: "75to200", label: "₹75,000 – ₹2L" },
        { value: "200plus", label: "₹2L+", tags: ["high_spend"] },
      ],
    },
    {
      id: "savings",
      title: "How much emergency savings do you have?",
      options: [
        { value: "none", label: "Almost none", tags: ["safety", "beginner"] },
        { value: "1to3", label: "1 – 3 months of expenses" },
        { value: "3to6", label: "3 – 6 months" },
        { value: "6plus", label: "6+ months", tags: ["long_term"] },
      ],
    },
    {
      id: "investments",
      title: "What have you invested in before?",
      options: [
        { value: "none", label: "Nothing yet", tags: ["beginner", "passive"] },
        { value: "fd", label: "FDs / savings only", tags: ["safety"] },
        { value: "mf", label: "Mutual funds / SIPs" },
        { value: "stocks", label: "Stocks / advanced", tags: ["active"] },
      ],
    },
  ];

function tagsFrom(a: Partial<Answers>) {
  const set = new Set<string>();
  QUESTIONS.forEach((q) => {
    const v = a[q.id];
    if (!v) return;
    q.options.find((o) => o.value === v)?.tags?.forEach((t) => set.add(t));
  });
  return set;
}

export function recommend(a: Partial<Answers>) {
  const tags = tagsFrom(a);
  const scored = PRODUCTS.map((p) => {
    let match = 0;
    p.bestFor.forEach((t) => tags.has(t) && (match += 3));
    p.tags.forEach((t) => tags.has(t) && (match += 1));
    if (a.priority === "fees" && p.bestFor.includes("low_fees")) match += 2;
    if (a.risk === "cant" && p.scores.risk >= 85) match += 3;
    if (a.horizon === "xl" && p.bestFor.includes("long_term")) match += 2;
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
  if (a.risk === "cant" && p.scores.risk >= 85)
    reasons.push("Capital-safe profile suited to a low-risk investor.");
  if (a.horizon === "xl" && p.bestFor.includes("long_term"))
    reasons.push("Designed for long horizons where compounding does the work.");
  if (a.goal === "retire" && p.bestFor.includes("retirement"))
    reasons.push("Built for retirement outcomes with tax breaks.");
  if (!reasons.length) reasons.push("Fits your questionnaire tags overall.");
  return reasons;
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
        headline: aiData?.headline || "Tailored Recommendation Run",
        summary: aiData?.summary || "Custom questionnaire evaluation.",
        answers: formattedAnswers,
        picks: aiData?.picks || results.map((r) => ({
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

  // Auto-save when AI data completes if user is logged in
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              Zero-affiliate engine
            </div>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Recommendation Engine</h1>
            <p className="mt-2 text-muted-foreground">
              Just some questions.
            </p>
          </div>
        </div>

        <Progress value={done ? 100 : progress} className="h-2 bg-muted [&>div]:bg-gradient-brand" />

        {!done ? (
          <div className="mt-8 rounded-3xl border border-border/70 bg-card p-6 shadow-card sm:p-8">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Question {step + 1} of {QUESTIONS.length}
            </div>
            <h2 className="mt-2 text-2xl font-semibold">{q.title}</h2>
            {q.hint && <p className="mt-1 text-sm text-muted-foreground">{q.hint}</p>}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {q.options.map((o) => {
                const selected = answers[q.id] === o.value;
                return (
                  <button
                    key={o.value}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.value }))}
                    className={cn(
                      "group flex items-center justify-between rounded-2xl border p-4 text-left text-sm font-medium transition-all",
                      selected
                        ? "border-brand bg-gradient-brand-soft text-brand-deep shadow-soft"
                        : "border-border hover:border-brand/60 hover:bg-accent",
                    )}
                  >
                    <span>{o.label}</span>
                    <span
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-full border",
                        selected ? "border-brand bg-brand text-white" : "border-border",
                      )}
                    >
                      {selected && <CheckCircle2 className="size-4" />}
                    </span>
                  </button>
                );
              })}
            </div>
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
                className="rounded-full bg-gradient-brand text-white shadow-glow"
                disabled={!answers[q.id]}
                onClick={() => setStep((s) => s + 1)}
              >
                {step === QUESTIONS.length - 1 ? "See results" : "Next"}
                <ArrowRight className="ml-1 size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Your top picks</h2>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  setAnswers({});
                  setStep(0);
                }}
              >
                <RotateCcw className="mr-1 size-3.5" /> Restart
              </Button>
            </div>

            <AIInsightCard state={ai} />


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
                      <div className="text-[10px] uppercase tracking-wide text-brand-deep">Score</div>
                      <div className="text-2xl font-bold text-brand-deep">{overall}</div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl bg-accent/60 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-brand-deep">
                      Why this fits you
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
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Good if
                      </div>
                      <ul className="mt-1 space-y-1 text-sm text-foreground">
                        {p.goodIf.map((g) => <li key={g}>• {g}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Avoid if
                      </div>
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

type AIState = {
  data?: AIRecommendation;
  isPending: boolean;
  isError: boolean;
};

function AIInsightCard({ state }: { state: AIState }) {
  if (state.isPending) {
    return (
      <div className="flex items-center gap-2 rounded-3xl border border-border/70 bg-card p-6 text-sm text-muted-foreground shadow-soft">
        <Loader2 className="size-4 animate-spin text-brand" />
        AI is reading your answers and shortlist…
      </div>
    );
  }
  if (state.isError) {
    return (
      <div className="rounded-3xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive shadow-soft">
        Couldn't reach the AI right now. Your rules-based picks below are still valid.
      </div>
    );
  }
  if (!state.data) return null;
  const d = state.data;
  return (
    <div className="rounded-3xl border border-brand/30 bg-gradient-brand-soft p-6 shadow-card">
      <div className="flex items-center gap-2 text-brand-deep">
        <Sparkles className="size-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">AI insight</span>
      </div>
      <h3 className="mt-2 text-lg font-semibold text-brand-deep">{d.headline}</h3>
      <p className="mt-2 text-sm text-foreground">{d.summary}</p>
      {d.nextSteps?.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-deep">
            Next steps
          </div>
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
                <p className="mt-1 text-xs text-destructive">Watch out: {p.watchOut}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
