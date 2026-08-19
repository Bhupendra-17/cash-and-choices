import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { useAuth, type QuestionAnswer } from "@/lib/auth-context";
import { QUESTIONS, recommend, whyMatches, type Answers } from "./recommend";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  History,
  Loader2,
  LogOut,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ExplainHint } from "@/components/ui/ExplainHint";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "User Profile & Investment Strategy — Cash&Choices" },
      { name: "description", content: "Manage your financial questionnaire answers and view personalized investment strategies." },
    ],
  }),
  component: ProfilePage,
});

type PickResult = {
  productId: string;
  fit: number;
  why: string;
  watchOut: string;
};

type AIResult = {
  headline: string;
  summary: string;
  picks: PickResult[];
  nextSteps: string[];
};

function ProfilePage() {
  const { user, logout, updateSavedAnswers, saveRecommendation } = useAuth();
  const navigate = useNavigate();

  const [profileAnswers, setProfileAnswers] = useState<Partial<Answers>>({
    goal: "grow",
    horizon: "l",
    risk: "wobble",
    monthly: "20to50",
    priority: "fees",
    interest: "mf",
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingAnswers, setIsSavingAnswers] = useState(false);
  const [currentRecResult, setCurrentRecResult] = useState<AIResult | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [historyQuery, setHistoryQuery] = useState("");

  useEffect(() => {
    if (user?.savedAnswers && user.savedAnswers.length > 0) {
      const initialMap: Partial<Answers> = {};
      user.savedAnswers.forEach((ans) => {
        (initialMap as any)[ans.questionId] = ans.answerValue;
      });
      setProfileAnswers(initialMap);
    }
  }, [user]);

  if (!user) {
    return (
      <SiteLayout>
        <section className="mx-auto max-w-md px-4 py-24 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-lg font-bold text-neutral-600 dark:text-neutral-300">
            ?
          </div>
          <h1 className="mt-5 text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Sign in to your account
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Manage your financial profile and receive personalized investment strategies.
          </p>
          <div className="mt-6">
            <Button asChild className="rounded-xl px-6 bg-brand hover:bg-brand/90 text-white font-medium shadow-sm transition-all duration-150">
              <Link to="/auth">Sign In / Sign Up</Link>
            </Button>
          </div>
        </section>
      </SiteLayout>
    );
  }

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  const handleOptionSelect = (qId: keyof Answers, val: string) => {
    setProfileAnswers((prev) => ({ ...prev, [qId]: val }));
    setSaveSuccessMsg(null);
  };

  const formattedQuestionAnswers = (): QuestionAnswer[] => {
    return Object.entries(profileAnswers).map(([key, val]) => {
      const question = QUESTIONS.find((q) => q.id === key);
      const opt = question?.options.find((o) => o.value === val);
      return {
        questionId: key,
        questionText: question?.title || key,
        answerValue: val as string,
        answerLabel: opt?.label || (val as string),
      };
    });
  };

  const handleSaveAnswersOnly = async () => {
    setIsSavingAnswers(true);
    setSaveSuccessMsg(null);
    try {
      await updateSavedAnswers(formattedQuestionAnswers());
      setSaveSuccessMsg("Profile answers saved successfully.");
    } catch (err: any) {
      console.error("Save answers failed:", err);
    } finally {
      setIsSavingAnswers(false);
    }
  };

  const handleSuggestRecommendations = async () => {
    setIsGenerating(true);
    setSaveSuccessMsg(null);
    try {
      const rulesPicks = recommend(profileAnswers);
      const formattedAnswers = formattedQuestionAnswers();

      let aiData: AIResult | null = null;
      try {
        const res = await apiFetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: profileAnswers as Record<string, string>,
            candidateIds: rulesPicks.map((r) => r.p.id),
          }),
        });

        if (res.ok) {
          aiData = (await res.json()) as AIResult;
        }
      } catch (e) {
        console.warn("Recommendation API fallback to local rules engine:", e);
      }

      if (!aiData) {
        aiData = {
          headline: "Tailored Wealth Accumulator Strategy",
          summary: "Based on your updated profile choices, here are the top investment avenues suited for your horizon and risk tolerance.",
          picks: rulesPicks.map((r) => ({
            productId: r.p.id,
            fit: Math.round(r.match * 10),
            why: whyMatches(r.p, profileAnswers).join(" "),
            watchOut: r.p.avoidIf[0] || "Subject to market conditions.",
          })),
          nextSteps: ["Review asset allocation", "Set up monthly automated SIP", "Review emergency fund safety"],
        };
      }

      setCurrentRecResult(aiData);

      await saveRecommendation({
        headline: aiData.headline,
        summary: aiData.summary,
        answers: formattedAnswers,
        picks: aiData.picks,
        nextSteps: aiData.nextSteps,
      });

      setSaveSuccessMsg("Strategy generated & saved to your history.");
    } catch (err: any) {
      console.error("Failed to generate recommendations:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
    : "Recent";
  const answeredCount = Object.values(profileAnswers).filter(Boolean).length;
  const profileProgress = Math.round((answeredCount / QUESTIONS.length) * 100);
  const savedRecommendations = user.savedRecommendations || [];
  const latestRecommendation = savedRecommendations[0];
  const filteredRecommendations = savedRecommendations.filter((rec) =>
    `${rec.headline} ${rec.summary}`.toLowerCase().includes(historyQuery.toLowerCase().trim()),
  );

  return (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">

        {/* User Account Header */}
        <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-card">
          <div className="bg-gradient-hero p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-foreground text-xl font-bold text-background shadow-sm">
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                    {user.name}
                  </h1>
                  {/* <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-accent-foreground capitalize">
                    {user.provider}
                  </span> */}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                  {user.email}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Member since {memberSince}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="self-start rounded-xl border-border text-xs text-muted-foreground hover:bg-accent hover:text-foreground sm:self-auto"
            >
              <LogOut className="size-3.5" /> Log out
            </Button>
          </div>
          </div>

          <div className="grid divide-y border-t border-border/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <ClipboardCheck className="size-3.5 text-brand" /> Profile readiness
                <ExplainHint>Answering more questions helps us make the recommendation more relevant. You can still generate a plan with partial answers.</ExplainHint>
              </div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <span className="text-2xl font-bold">{profileProgress}%</span>
                <span className="text-xs text-muted-foreground">{answeredCount}/{QUESTIONS.length} answered</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${profileProgress}%` }} />
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <History className="size-3.5 text-brand" /> Saved plans
              </div>
              <div className="mt-2 text-2xl font-bold">{savedRecommendations.length}</div>
              <p className="mt-1 text-xs text-muted-foreground">Your previous decision snapshots.</p>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <ShieldCheck className="size-3.5 text-brand" /> Data promise
              </div>
              <div className="mt-2 text-sm font-semibold">Private by default</div>
              <p className="mt-1 text-xs text-muted-foreground">Your answers are used to build your plan.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl border border-brand/25 bg-gradient-brand-soft p-6 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-deep">
                  <Sparkles className="size-3.5" /> Your next best step
                </div>
                <h2 className="mt-3 text-xl font-bold">{latestRecommendation ? "Review your latest plan" : "Build your first investment path"}</h2>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                  {latestRecommendation
                    ? latestRecommendation.headline
                    : "Answer a few questions and get a clear starting point, with reasons and watch-outs."}
                </p>
              </div>
              <BarChart3 className="hidden size-8 text-brand sm:block" />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => document.getElementById("profile-questionnaire")?.scrollIntoView({ behavior: "smooth" })} className="rounded-full bg-gradient-brand text-white">
                {latestRecommendation ? "Update my answers" : "Complete my profile"} <ArrowRight className="size-4" />
              </Button>
              {latestRecommendation && (
                <Button variant="outline" onClick={() => setExpandedId(latestRecommendation.id)} className="rounded-full border-brand/30">
                  View latest plan
                </Button>
              )}
            </div>
          </div>
          <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <CalendarDays className="size-3.5 text-brand" /> Plan rhythm
            </div>
            <h2 className="mt-3 text-lg font-bold">Review, don’t react.</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Use your plan as a checkpoint when your goal, time horizon, or comfort with risk changes.</p>
            <Button asChild variant="ghost" className="mt-4 rounded-full px-0 text-brand-deep hover:bg-transparent hover:underline">
              <Link to="/recommend">Retake the decision check <ArrowRight className="size-4" /></Link>
            </Button>
          </div>
        </div>

        {/* Profile Questionnaire Section */}
        <div id="profile-questionnaire" className="mt-8 rounded-3xl border border-border/70 bg-card p-6 shadow-card sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <span className="text-[11px] font-semibold tracking-wider text-brand uppercase">
                Investor Questionnaire
              </span>
              <h2 className="mt-1 text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                Your Financial Profile
              </h2>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Adjust your preferences anytime to get real-time investment avenue recommendations.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveAnswersOnly}
              disabled={isSavingAnswers}
              className="self-start sm:self-auto rounded-xl text-xs border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {isSavingAnswers ? <Loader2 className="size-3 animate-spin mr-1.5" /> : null}
              Save Answers
            </Button>
          </div>

          {saveSuccessMsg && (
            <div className="mt-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 p-3 text-xs font-medium text-emerald-800 dark:text-emerald-300 transition-all">
              {saveSuccessMsg}
            </div>
          )}

          {/* Questionnaire Cards */}
          <div className="mt-6 space-y-6">
            {QUESTIONS.map((q) => {
              const currentVal = profileAnswers[q.id];
              return (
                <div
                  key={q.id}
                  className="rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-950/40 p-4 sm:p-5 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {q.title}
                    </h3>
                    {currentVal && (
                      <span className="text-[10px] font-semibold text-brand bg-brand/10 dark:bg-brand/20 px-2.5 py-0.5 rounded-md">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{q.subtitle}</p>

                  <div className="mt-3.5 flex flex-wrap gap-2">
                    {q.options.map((opt) => {
                      const isSelected = currentVal === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleOptionSelect(q.id, opt.value)}
                          className={cn(
                            "rounded-xl border px-3.5 py-2 text-xs font-medium transition-all duration-150 text-left active:scale-[0.99]",
                            isSelected
                              ? "border-brand bg-brand text-white shadow-sm font-semibold"
                              : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-850"
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Generate Strategy
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Computes asset allocation and candidate picks tailored to your inputs.
              </div>
            </div>

            <Button
              type="button"
              onClick={handleSuggestRecommendations}
              disabled={isGenerating}
              className="w-full sm:w-auto rounded-xl bg-brand hover:bg-brand/90 text-white py-5 px-6 text-xs sm:text-sm font-medium shadow-sm transition-all duration-150"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Generating Strategy...
                </>
              ) : (
                "Suggest Investment Recommendations"
              )}
            </Button>
          </div>
        </div>

        {/* Current Recommendation Results */}
        {currentRecResult && (
          <div className="mt-8 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 shadow-sm transition-all duration-300">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand">
              Generated Recommendation
            </span>
            <h3 className="mt-1 text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
              {currentRecResult.headline}
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {currentRecResult.summary}
            </p>

            {currentRecResult.picks && currentRecResult.picks.length > 0 && (
              <div className="mt-6">
                <h4 className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-3">
                  Recommended Investment Avenues
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {currentRecResult.picks.map((p) => (
                    <div
                      key={p.productId}
                      className="rounded-xl border border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 capitalize">
                          {p.productId.replace(/_/g, " ")}
                        </span>
                        <span className="rounded-md bg-neutral-900 dark:bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-white dark:text-neutral-900">
                          {p.fit}% Fit
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {p.why}
                      </p>
                      {p.watchOut && (
                        <div className="mt-2.5 text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 p-2 rounded-lg">
                          Watch Out: {p.watchOut}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentRecResult.nextSteps && currentRecResult.nextSteps.length > 0 && (
              <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-800">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">
                  Actionable Steps
                </div>
                <ul className="grid gap-2 text-xs text-neutral-700 dark:text-neutral-300 sm:grid-cols-2">
                  {currentRecResult.nextSteps.map((step, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950/60 p-2.5 border border-neutral-200/60 dark:border-neutral-800"
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 dark:bg-neutral-100 text-[10px] font-bold text-white dark:text-neutral-900">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Saved Recommendation History */}
        <div className="mt-10">
          <div className="mb-6 flex flex-col justify-between gap-4 border-b border-border/70 pb-4 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight sm:text-xl">Decision history</h2>
                <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">{savedRecommendations.length}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Keep an audit trail of how your thinking changes over time.
              </p>
            </div>
            {savedRecommendations.length > 0 && (
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={historyQuery}
                  onChange={(event) => setHistoryQuery(event.target.value)}
                  placeholder="Search saved plans"
                  className="h-9 w-full rounded-full border border-border bg-background pl-9 pr-3 text-xs outline-none transition-colors placeholder:text-muted-foreground focus:border-brand"
                />
              </div>
            )}
          </div>

          {savedRecommendations.length > 0 ? (
            <div className="space-y-4">
              {filteredRecommendations.map((rec) => {
                const isExpanded = expandedId === rec.id;
                const formattedDate = new Date(rec.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <div
                    key={rec.id}
                    className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 sm:p-6 shadow-sm transition-all hover:border-neutral-300 dark:hover:border-neutral-700"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                          Run on {formattedDate}
                        </span>
                        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                          {rec.headline}
                        </h3>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-2xl">
                          {rec.summary}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                        className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-2 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 shrink-0 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-5 pt-5 border-t border-neutral-100 dark:border-neutral-800 space-y-5">
                        <div>
                          <h4 className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500 mb-2.5">
                            Profile Answers Used
                          </h4>
                          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                            {rec.answers &&
                              rec.answers.map((ans, idx) => (
                                <div
                                  key={idx}
                                  className="rounded-xl border border-neutral-200/60 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/40 p-3"
                                >
                                  <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 truncate">
                                    {ans.questionText}
                                  </div>
                                  <div className="mt-1 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                                    {ans.answerLabel}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500 mb-2.5">
                            Suggested Avenues
                          </h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {rec.picks &&
                              rec.picks.map((pick) => (
                                <div
                                  key={pick.productId}
                                  className="rounded-xl border border-neutral-200/60 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/40 p-3.5"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 capitalize">
                                      {pick.productId.replace(/_/g, " ")}
                                    </span>
                                    <span className="rounded-md bg-brand text-white px-2 py-0.5 text-[10px] font-semibold">
                                      {pick.fit}% Fit
                                    </span>
                                  </div>
                                  <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                    {pick.why}
                                  </p>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredRecommendations.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No saved plans match “{historyQuery}”.
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 p-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
              No previous strategy runs saved yet. Click <strong>Suggest Investment Recommendations</strong> above to save your first strategy.
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
