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
  Compass,
  BookOpenCheck,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AnimatedCard } from "@/components/AnimatedCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cash&Choices — Financial literacy for everyone" },
      {
        name: "description",
        content:
          "A financial literacy platform to learn money terms, explore financial options, and compare facts for educational purposes.",
      },
      { property: "og:title", content: "Cash&Choices — Financial literacy for everyone" },
      {
        property: "og:description",
        content:
          "A financial literacy platform to learn money terms, explore financial options, and compare facts for educational purposes.",
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
    title: "Learn about financial options",
    body: "Explore how common financial products work, what they cost, and what questions to ask.",
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
    title: "Understand the trade-offs",
    body: "Read about risk, liquidity, costs, and tax considerations without scores or rankings.",
  },
  {
    icon: Percent,
    title: "Every calculator you need",
    body: "SIP, EMI, FD, RD, compound interest, retirement, tax — accurate and offline-capable.",
  },
  {
    icon: ShieldCheck,
    title: "Educational, always",
    body: "Educational information to help you build financial literacy and make your own decisions.",
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
      "The plain-English explanations helped me understand the questions to ask before comparing options.",
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
    a: "We aim to offer useful financial education and tools. We do not rank products or sell personalized recommendations.",
  },
  {
    q: "Is this financial advice?",
    a: "Cash&Choices provides general educational information only. It does not provide investment advice, personalized recommendations, or a solicitation to buy or sell securities. Consider speaking with a SEBI-registered investment adviser for advice specific to you.",
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
              Financial literacy for everyone
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Understand your money.{" "}
              <span className="text-gradient-brand">Make your own choices.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Learn financial terms, explore common options, and compare costs and trade-offs
              in plain language. No rankings, scores, or personalized investment picks.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-full bg-gradient-brand text-white shadow-glow hover:opacity-95">
                <Link to="/recommend">
                  Explore financial options <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-border/70 bg-white/70 backdrop-blur">
                <Link to="/charges">Explore hidden charges</Link>
              </Button>
            </div>
            <p className="mt-4 max-w-xl rounded-xl border border-brand/20 bg-white/70 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
              Cash&amp;Choices is a financial literacy platform. Content and comparisons are for
              education only—not investment advice, personalized recommendations, or a solicitation
              to buy or sell. We do not score or rank products.
            </p>
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
            <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-white/70 shadow-card backdrop-blur">
              <img
                src="/poster1.jpg"
                alt="A person learning about financial choices and comparing costs"
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/60 bg-white/85 p-4 shadow-soft backdrop-blur-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-deep">
                  <Wallet className="size-4" /> Learn the terms. Compare the facts.
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Explore financial concepts and understand common costs and trade-offs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DECISION PATH */}
      <section className="border-y border-border/70 bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                <Compass className="size-3.5" /> Your learning path
              </div>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Start learning at your own pace.</h2>
              <p className="mt-3 text-muted-foreground">
                Build your financial literacy one topic at a time. Explore concepts, understand
                possible trade-offs, and decide what you want to learn next.
              </p>
            </div>
            <Button asChild className="w-fit rounded-full bg-gradient-brand text-white shadow-glow">
              <Link to="/recommend">Choose a topic to learn <ArrowRight className="ml-1 size-4" /></Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                number: "01",
                icon: Sparkles,
                title: "Choose a topic",
                body: "Start with a financial concept, product type, or term you want to understand.",
              },
              {
                number: "02",
                icon: BookOpenCheck,
                title: "Learn the concepts",
                body: "Read plain-language explanations of common features, risks, costs, and trade-offs.",
              },
              {
                number: "03",
                icon: Scale,
                title: "Explore the facts",
                body: "Use calculators, compare details, and unpack charges as part of your own research.",
              },
            ].map((step, index) => (
              <AnimatedCard delay={index * 0.1} key={step.number} className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
                <div className="flex items-center justify-between">
                  <step.icon className="size-6 text-brand" />
                  <span className="text-xs font-semibold tracking-widest text-muted-foreground">{step.number}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </AnimatedCard>
            ))}
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
          {features.map((f, index) => (
            <AnimatedCard
              delay={index * 0.1}
              key={f.title}
              className="group rounded-3xl border border-border/70 bg-card p-6 shadow-soft transition-shadow hover:shadow-card"
            >
              <div className="inline-grid size-11 place-items-center rounded-2xl bg-gradient-brand-soft text-brand-deep">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </AnimatedCard>
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
            <div className="relative min-h-[22rem] overflow-hidden bg-[#fce7ef] sm:min-h-[28rem] lg:min-h-full">
              <img
                src="/poster4.jpg"
                alt="Person using a laptop privately while making financial decisions"
                className="absolute inset-0 size-full object-cover object-center"
              />
              
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
              Start anywhere. Explore a topic, compare factual details, and learn what the terms mean.
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
              title: "Explore financial options",
              body: "Browse common financial products and learn their features and trade-offs.",
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
              body: "Pick products to compare factual details, costs and trade-offs—without rankings.",
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
          {testimonials.map((t, index) => (
            <AnimatedCard
              delay={index * 0.1}
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
            </AnimatedCard>
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
