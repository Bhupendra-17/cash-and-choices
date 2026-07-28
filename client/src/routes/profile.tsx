import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { User, LogOut, Sparkles, Calendar, CheckCircle2, ListChecks, ArrowRight, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "User Profile & Saved Answers — Cash&Choices" },
      { name: "description", content: "View your saved financial questionnaire answers and recommendations." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!user) {
    return (
      <SiteLayout>
        <section className="mx-auto max-w-md px-4 py-20 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent text-muted-foreground">
            <User className="size-8" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Please sign in to view your profile</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to access your saved financial recommendation questionnaires.
          </p>
          <div className="mt-6">
            <Button asChild className="rounded-full bg-gradient-brand text-white">
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

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
    : "Recent";

  return (
    <SiteLayout>
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        
        {/* User Info Header Card */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-full bg-gradient-brand text-xl font-bold text-white shadow-glow">
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{user.name}</h1>
                  <Badge variant="outline" className="capitalize text-[10px]">
                    {user.provider} Auth
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3.5" /> Member since {memberSince}
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="size-3.5" /> Private Account
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="rounded-full text-rose-600 dark:text-rose-400 border-border hover:bg-rose-500/10"
            >
              <LogOut className="size-4 mr-1.5" /> Log Out
            </Button>
          </div>
        </div>

        {/* Saved Questionnaires & Recommendations */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ListChecks className="size-5 text-brand" /> Saved Questionnaire Submissions
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review the exact questions you answered and your tailored product recommendations.
              </p>
            </div>
            <Button asChild size="sm" className="rounded-full bg-gradient-brand text-white">
              <Link to="/recommend">
                <Sparkles className="size-3.5 mr-1" /> New Assessment
              </Link>
            </Button>
          </div>

          {user.savedRecommendations && user.savedRecommendations.length > 0 ? (
            <div className="space-y-6">
              {user.savedRecommendations.map((rec, index) => {
                const isExpanded = expandedId === rec.id || (index === 0 && expandedId === null);
                const formattedDate = new Date(rec.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <div
                    key={rec.id}
                    className="rounded-3xl border border-border bg-card p-6 shadow-soft transition-all hover:border-brand/40"
                  >
                    {/* Header bar of recommendation item */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold text-brand uppercase tracking-wider">
                          Run on {formattedDate}
                        </div>
                        <h3 className="text-lg font-bold mt-1 text-foreground">{rec.headline}</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{rec.summary}</p>
                      </div>

                      <button
                        onClick={() => setExpandedId(isExpanded ? "none" : rec.id)}
                        className="rounded-full border border-border p-2 text-muted-foreground hover:bg-accent"
                      >
                        {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-6 pt-6 border-t border-border space-y-6">
                        
                        {/* 1. Selected Questionnaire Answers */}
                        <div>
                          <h4 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                            <CheckCircle2 className="size-3.5 text-brand" /> Your Questionnaire Choices
                          </h4>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {rec.answers && rec.answers.length > 0 ? (
                              rec.answers.map((ans, idx) => (
                                <div key={idx} className="rounded-2xl border border-border bg-background p-3.5">
                                  <div className="text-[11px] font-medium text-muted-foreground line-clamp-1">
                                    {ans.questionText}
                                  </div>
                                  <div className="mt-1 text-sm font-semibold text-brand">
                                    {ans.answerLabel}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-muted-foreground col-span-full">Standard quiz answers saved.</p>
                            )}
                          </div>
                        </div>

                        {/* 2. Tailored Product Recommendations */}
                        <div>
                          <h4 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                            <Sparkles className="size-3.5 text-brand" /> Tailored Product Recommendations
                          </h4>
                          <div className="grid gap-4 sm:grid-cols-2">
                            {rec.picks && rec.picks.map((pick) => (
                              <div key={pick.productId} className="rounded-2xl border border-border bg-accent/30 p-4">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-sm capitalize">{pick.productId.replace(/_/g, " ")}</span>
                                  <Badge className="bg-brand text-white text-[11px]">{pick.fit}% Fit</Badge>
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{pick.why}</p>
                                {pick.watchOut && (
                                  <div className="mt-2 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded-xl">
                                    ⚠️ {pick.watchOut}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border p-10 text-center">
              <Sparkles className="mx-auto size-10 text-muted-foreground" />
              <h3 className="mt-3 font-semibold">No saved questionnaires yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Answer six privacy-safe questions to get personalized financial product recommendations and save them here.
              </p>
              <div className="mt-5">
                <Button asChild className="rounded-full bg-gradient-brand text-white">
                  <Link to="/recommend">
                    Start Recommendation Engine <ArrowRight className="size-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          )}

        </div>
      </section>
    </SiteLayout>
  );
}
