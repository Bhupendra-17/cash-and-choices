import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Lock, ShieldCheck, XCircle } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Center — Cash&Choices" },
      {
        name: "description",
        content:
          "Privacy is our biggest feature. See what we will never ask for, how we store data, and why we don't take affiliate money.",
      },
      { property: "og:title", content: "Privacy Center — Cash&Choices" },
      {
        property: "og:description",
        content: "No bank login. No PAN. No affiliate bias. Everything private by default.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyPage,
});

const promises = [
  { title: "No bank connections", body: "We do not integrate with account aggregators, banks, brokers or UPI." },
  { title: "No financial tracking", body: "We don't ingest statements, holdings, portfolios or transactions." },
  { title: "No selling user data", body: "We will never sell, rent or share user data with third-parties." },
  { title: "Questionnaire-based", body: "Recommendations are driven by your explicit answers, not surveillance." },
  { title: "Local-first storage", body: "Saved calculations and comparisons live in your browser by default." },
  { title: "Zero affiliate bias", body: "We take no referral commissions. Rankings are ours, not the highest bidder's." },
];

function PrivacyPage() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            <ShieldCheck className="size-3.5" /> Privacy Center
          </div>
          <h1 className="mt-4 text-4xl font-bold sm:text-5xl">Privacy is our biggest feature.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Cash&amp;Choices is not another finance tracker. We help you decide — without asking for
            your financial secrets.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-destructive">We will never ask for</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {[
                "Bank login",
                "UPI PIN",
                "Account number",
                "Card details",
                "PAN",
                "Aadhaar",
                "Net worth",
                "Exact salary",
                "Portfolio uploads",
              ].map((i) => (
                <li key={i} className="flex items-start gap-2 text-muted-foreground">
                  <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" /> {i}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-brand-deep">What we do instead</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {[
                "Short, skippable questionnaires",
                "Plain-English recommendations",
                "Honest fee & charge breakdowns",
                "Side-by-side product comparisons",
                "Local-first calculators",
                "Zero affiliate commissions",
              ].map((i) => (
                <li key={i} className="flex items-start gap-2 text-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" /> {i}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {promises.map((p) => (
            <div key={p.title} className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
              <Lock className="size-5 text-brand" />
              <h3 className="mt-3 font-semibold">{p.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl bg-gradient-brand p-8 text-center text-white shadow-glow">
          <h2 className="text-2xl font-bold">Ready to try it?</h2>
          <p className="mt-2 text-white/85">
            No signup required. Everything you need is one click away.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button asChild className="rounded-full bg-white text-brand-deep hover:bg-white/95">
              <Link to="/recommend">Get recommendations</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10">
              <Link to="/charges">Explore hidden charges</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
