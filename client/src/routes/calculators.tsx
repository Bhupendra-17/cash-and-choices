import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Calculator, TrendingUp, PiggyBank, Banknote, Landmark, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calculators")({
  head: () => ({
    meta: [
      { title: "Investment Calculators Hub — Cash&Choices" },
      {
        name: "description",
        content:
          "SIP, lump sum, FD, RD, PPF, gold — every investment calculator with tax, inflation and effective return breakdowns.",
      },
      { property: "og:title", content: "Investment Calculators Hub — Cash&Choices" },
      {
        property: "og:description",
        content:
          "Estimate invested amount, returns, taxable gains, estimated tax, net withdrawal and inflation-adjusted value.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalculatorsLayout,
});

export const CALCULATORS = [
  { slug: "sip", label: "SIP", icon: TrendingUp, blurb: "Monthly investing power over time." },
  { slug: "lumpsum", label: "Lump Sum", icon: PiggyBank, blurb: "One-time investment growth." },
  { slug: "fd", label: "Fixed Deposit", icon: Landmark, blurb: "Quarterly-compounded FD returns." },
  { slug: "rd", label: "Recurring Deposit", icon: Banknote, blurb: "Monthly RD maturity." },
  { slug: "ppf", label: "PPF", icon: Coins, blurb: "15-year tax-free EEE growth." },
  { slug: "gold", label: "Gold", icon: Coins, blurb: "Digital / physical gold with LTCG rules." },
  { slug: "withdrawal-tax", label: "Withdrawal Tax", icon: Calculator, blurb: "Capital gains tax estimator for withdrawals." },
] as const;

function CalculatorsLayout() {
  const { pathname } = useLocation();
  const isHub = pathname === "/calculators" || pathname === "/calculators/";

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-accent/40 px-3 py-1 text-xs font-medium">
              <Calculator className="size-3.5" /> Investment Calculators
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Estimate returns, taxes and real value.
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Every calculator runs on your device — nothing is sent to us. Results include
              inflation-adjusted value, estimated tax and effective annual return.
            </p>
          </div>
        </div>

        <nav className="mt-6 flex flex-wrap gap-2">
          {CALCULATORS.map((c) => {
            const active = pathname.endsWith(`/calculators/${c.slug}`);
            return (
              <Link
                key={c.slug}
                to="/calculators/$type"
                params={{ type: c.slug }}
                className={cn(
                  "rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "bg-background text-muted-foreground hover:bg-accent",
                )}
              >
                {c.label}
              </Link>
            );
          })}
        </nav>

        {isHub ? (
          <>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {CALCULATORS.map((c) => (
                <Link
                  key={c.slug}
                  to="/calculators/$type"
                  params={{ type: c.slug }}
                  className="group rounded-3xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-glow"
                >
                  <c.icon className="size-6 text-brand" />
                  <h3 className="mt-3 font-semibold group-hover:text-brand">{c.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{c.blurb}</p>
                </Link>
              ))}
            </div>
            <p className="mt-8 text-xs text-muted-foreground">
              More calculators (Tax Saver FD, IPO, Bonds, NPS, EPF, Sukanya Samriddhi, NSC) coming
              next — same engine, different rule sets.
            </p>
          </>
        ) : (
          <div className="mt-8">
            <Outlet />
          </div>
        )}
      </section>
    </SiteLayout>
  );
}