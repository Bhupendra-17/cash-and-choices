import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Sparkles,
  Scale,
  Wallet,
  Lock,
  EyeOff,
  Percent,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cash&Choices — Smarter financial decisions. Privately." },
      {
        name: "description",
        content:
          "Questionnaires, calculators and honest comparisons no bank login, no PAN, no financial secrets. Privacy is the feature without any commissions from third-party.",
      },
      { property: "og:title", content: "Cash&Choices — Smarter financial decisions. Privately." },
      {
        property: "og:description",
        content:
          "Questionnaires, calculators and honest comparisons no bank login, no PAN, no financial secrets. Privacy is the feature without any commissions from third-party.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    icon: Sparkles,
    title: "Zero-affiliate recommendations",
    body: "Answer a short questionnaire. Get products that fit — with a plain-English reason for every pick.",
  },
  {
    icon: EyeOff,
    title: "Hidden charges, uncovered",
    body: "Brokerage, GST, expense ratios, forex, penalties. See the true cost before you commit.",
  },
  {
    icon: Scale,
    title: "Compare everything",
    body: "Credit cards, mutual funds, loans, platforms — side by side, no fine print buried.",
  },
  {
    icon: BarChart3,
    title: "Decision scores",
    body: "Risk, liquidity, transparency, tax efficiency and hidden-cost scores at a glance.",
  },
  {
    icon: Percent,
    title: "Every calculator you need",
    body: "SIP, EMI, FD, RD, compound interest, retirement, tax — accurate and offline-capable.",
  },
  {
    icon: ShieldCheck,
    title: "Educational, always",
    body: "Not advice. Just clarity. We explain the ‘why’ so you can decide with confidence.",
  },
];

const doDont = {
  never: [
    "Bank login or UPI PIN",
    "Account number or card details",
    "PAN or Aadhaar",
    "Exact salary or net worth",
    "Portfolio uploads",
  ],
  always: [
    "Questionnaires you can skip",
    "Local-first storage on your device",
    "Plain-English explanations",
    "Fees, penalties and lock-ins upfront",
    "No affiliate links or paid placements",
  ],
};

const testimonials = [
  {
    quote:
      "Finally a finance tool that doesn't ask me to hand over my bank login. The hidden-charges breakdown alone paid for itself.",
    name: "Ananya R.",
    role: "Product Designer",
  },
  {
    quote:
      "I compared my portfolio's expense ratios in ten minutes and switched to direct plans. Simple, fast, honest.",
    name: "Vikram S.",
    role: "Engineer",
  },
  {
    quote:
      "The decision score made the trade-offs obvious. No more spreadsheet weekends.",
    name: "Priya N.",
    role: "Founder",
  },
];

const faqs = [
  {
    q: "Do you connect to my bank or broker?",
    a: "No. Cash&Choices never asks for a bank login, UPI PIN, PAN, Aadhaar, account number or card details. Everything you enter (like a monthly budget) stays on your device.",
  },
  {
    q: "How do you make money without affiliate links?",
    a: "We plan to launch a small optional Pro tier for advanced calculators and unlimited comparisons. Recommendations will never be influenced by payouts.",
  },
  {
    q: "Is this financial advice?",
    a: "No — this is educational content and decision tooling. For personalised regulated advice, consult a SEBI-registered advisor.",
  },
  {
    q: "Where is my data stored?",
    a: "Public content is served from our servers. Anything personal — saved comparisons, calculator inputs — lives in your browser's local storage by default.",
  },
];

function LandingPage() {
  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-16 sm:px-6 md:pb-28 md:pt-24 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-3 py-1 text-xs font-medium text-brand-deep shadow-soft backdrop-blur">
              <ShieldCheck className="size-3.5" />
              Privacy is the feature
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Make smarter financial decisions.{" "}
              <span className="text-gradient-brand">Privately.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              No bank logins. No PAN. No portfolio uploads. Just honest questionnaires,
              zero-affiliate recommendations and calculators that respect your data.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-full bg-gradient-brand text-white shadow-glow hover:opacity-95">
                <Link to="/recommend">
                  Get my recommendations <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-border/70 bg-white/70 backdrop-blur">
                <Link to="/charges">Explore hidden charges</Link>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 text-sm">
              {[
                ["0", "Data points required"],
                ["100%", "Local-first calculators"],
                ["Zero", "Affiliate links"],
              ].map(([k, v]) => (
                <div key={v}>
                  <dt className="text-2xl font-semibold text-gradient-brand">{k}</dt>
                  <dd className="text-muted-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Hero visual */}
          <div className="lg:col-span-5">
            <div className="relative">
              <div className="absolute -inset-8 bg-gradient-brand opacity-20 blur-3xl" aria-hidden />
              <div className="relative rounded-3xl border border-border/60 bg-white/80 p-6 shadow-card backdrop-blur">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Wallet className="size-4 text-brand" />
                    Decision score
                  </div>
                  <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                    Live preview
                  </span>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {[
                    { label: "Transparency", v: 92 },
                    { label: "Hidden cost", v: 90 },
                    { label: "Tax efficient", v: 70 },
                    { label: "Liquidity", v: 88 },
                  ].map((r) => (
                    <div key={r.label} className="rounded-2xl border border-border/70 p-3">
                      <div className="text-xs text-muted-foreground">{r.label}</div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-2xl font-semibold">{r.v}</span>
                        <span className="text-xs text-muted-foreground">/100</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-brand"
                          style={{ width: `${r.v}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between rounded-2xl bg-gradient-brand-soft p-4">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-brand-deep">
                      Nifty 50 Index Fund
                    </div>
                    <div className="text-lg font-semibold">Overall score 85/100</div>
                  </div>
                  <div className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-brand-deep shadow-soft">
                    A+
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Everything you need. Nothing you don't.</h2>
          <p className="mt-3 text-muted-foreground">
            Built for people who want clarity, not another dashboard demanding their financial life.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-3xl border border-border/70 bg-card p-6 shadow-soft transition-shadow hover:shadow-card"
            >
              <div className="inline-grid size-11 place-items-center rounded-2xl bg-gradient-brand-soft text-brand-deep">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRIVACY */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-card">
          <div className="grid lg:grid-cols-2">
            <div className="p-8 sm:p-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                <Lock className="size-3.5" />
                Privacy by design
              </div>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                We built the finance app we wished existed.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Traditional apps trade your data for convenience. We refuse. Here's the
                short list of what we will never ask for — and what you get instead.
              </p>
              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-destructive">We will never ask for</h4>
                  <ul className="space-y-2 text-sm">
                    {doDont.never.map((i) => (
                      <li key={i} className="flex items-start gap-2 text-muted-foreground">
                        <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" /> {i}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-brand-deep">What you'll always get</h4>
                  <ul className="space-y-2 text-sm">
                    {doDont.always.map((i) => (
                      <li key={i} className="flex items-start gap-2 text-foreground">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" /> {i}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="mt-8">
                <Button asChild variant="outline" className="rounded-full">
                  <Link to="/privacy">
                    Read our Privacy Center <ArrowRight className="ml-1 size-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="relative overflow-hidden bg-gradient-brand p-8 sm:p-12">
              <div className="absolute inset-0 opacity-30" aria-hidden style={{ backgroundImage: "radial-gradient(circle at 30% 20%, white, transparent 40%)" }} />
              <div className="relative flex h-full flex-col justify-between text-white">
                <ShieldCheck className="size-10" />
                <div>
                  <p className="text-2xl font-semibold leading-snug">
                    "You shouldn't have to hand over your bank login to compare a mutual fund."
                  </p>
                  <p className="mt-4 text-white/80">— The reason we exist.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TOOLS PREVIEW */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">Tools that respect your time</h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Start anywhere. Everything is interconnected — recommendations link to comparisons,
              comparisons to hidden charges, hidden charges to explanations.
            </p>
          </div>
          <Button asChild variant="ghost" className="w-fit rounded-full">
            <Link to="/recommend">See all tools <ArrowRight className="ml-1 size-4" /></Link>
          </Button>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              to: "/recommend",
              badge: "Questionnaire",
              title: "Recommendation Engine",
              body: "Answer 6 quick questions. Get zero-affiliate picks with reasons.",
              icon: Sparkles,
            },
            {
              to: "/charges",
              badge: "Explorer",
              title: "Hidden Charges",
              body: "See brokerage, expense ratios, forex, penalties — visualised.",
              icon: EyeOff,
            },
            {
              to: "/compare",
              badge: "Side by side",
              title: "Compare",
              body: "Pick any two products. See fees, scores and trade-offs.",
              icon: Scale,
            },
          ].map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="group relative overflow-hidden rounded-3xl border border-border/70 bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
            >
              <div className="absolute -right-16 -top-16 size-40 rounded-full bg-gradient-brand opacity-10 blur-2xl transition-opacity group-hover:opacity-20" />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                <c.icon className="size-3.5" /> {c.badge}
              </span>
              <h3 className="mt-4 text-xl font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
              <div className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-brand-deep">
                Open <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">Loved by people who hate fine print</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft"
            >
              <blockquote className="text-sm leading-relaxed text-foreground">"{t.quote}"</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <span
                  aria-hidden
                  className="grid size-10 place-items-center rounded-full bg-gradient-brand text-sm font-semibold text-white"
                >
                  {t.name[0]}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{t.name}</span>
                  <span className="block text-xs text-muted-foreground">{t.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">Frequently asked</h2>
        <p className="mt-2 text-center text-muted-foreground">Short answers to the questions we get most.</p>
        <div className="mt-10 rounded-3xl border border-border/70 bg-card p-2 shadow-soft">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={f.q} value={`i-${i}`} className="border-border/70 px-4">
                <AccordionTrigger className="text-left text-base font-medium">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA / NEWSLETTER */}
      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-brand p-10 text-white shadow-glow sm:p-16">
          <div className="absolute -right-20 -top-20 size-80 rounded-full bg-white/10 blur-3xl" aria-hidden />
          <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-3xl font-bold sm:text-4xl">Get the monthly clarity brief.</h2>
              <p className="mt-3 text-white/85">
                One email a month. Fee changes, quiet policy updates and the traps to avoid. No spam, ever.
              </p>
            </div>
            <form
              className="flex w-full flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                (e.currentTarget as HTMLFormElement).reset();
                alert("Thanks — we'll be in touch when the newsletter launches.");
              }}
            >
              <input
                required
                type="email"
                placeholder="you@example.com"
                aria-label="Email address"
                className="h-12 flex-1 rounded-full border border-white/20 bg-white/15 px-5 text-sm text-white placeholder:text-white/70 outline-none backdrop-blur focus:border-white/60"
              />
              <Button type="submit" size="lg" className="h-12 rounded-full bg-white px-6 text-brand-deep hover:bg-white/95">
                Subscribe
              </Button>
            </form>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
