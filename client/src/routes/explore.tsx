import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  CircleHelp,
  CreditCard,
  Info,
  Landmark,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CATEGORIES, PRODUCTS, type Category, type Product } from "@/data/products";
import { useAuth } from "@/lib/auth-context";
import {
  getLearningProfile,
  saveLearningProfile,
  type LearningProfileData,
} from "@/lib/learning-profile";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore Financial Options — Cash&Choices" },
      {
        name: "description",
        content:
          "Understand common financial options in simple language: what they are, how they work, their potential benefits, and trade-offs.",
      },
    ],
  }),
  component: ExploreOptionsPage,
});

const categoryGuides: Record<
  Category,
  { what: string; how: string; benefits: string[]; considerations: string[] }
> = {
  credit_card: {
    what: "A credit card lets you borrow for purchases up to a limit set by the issuer.",
    how: "Purchases collect into a statement. Paying the full amount by the due date generally avoids purchase interest; carrying a balance can make borrowing expensive.",
    benefits: [
      "Convenient payments",
      "A defined billing cycle",
      "Possible rewards or purchase protections",
    ],
    considerations: [
      "Interest and late fees can add up quickly",
      "Rewards may have caps or exclusions",
      "Check annual, foreign-currency, and other charges",
    ],
  },
  mutual_fund: {
    what: "A mutual fund pools money from many investors and invests it according to a stated objective.",
    how: "Investors buy units. The unit value, called NAV, changes with the value of the fund's investments and its expenses.",
    benefits: [
      "A fund can hold a range of investments",
      "Different funds follow different strategies",
      "Some funds offer automated monthly investing",
    ],
    considerations: [
      "Investment value can fall as well as rise",
      "Fees, exit loads, and tax treatment vary",
      "Read the scheme documents and understand its risks",
    ],
  },
  insurance: {
    what: "Insurance is a contract that may pay a benefit when a defined event is covered by the policy.",
    how: "The policyholder pays premiums and must meet the contract's conditions. The insurer assesses a claim against the policy wording, limits, and exclusions.",
    benefits: [
      "Can help protect against specified financial losses",
      "Cover can be structured for different needs",
      "Some policies offer defined services or benefits",
    ],
    considerations: [
      "Exclusions and waiting periods matter",
      "Premiums may change or cover may have limits",
      "Bundled savings and protection features can be complex",
    ],
  },
  loan: {
    what: "A loan is money borrowed from a lender and repaid under agreed terms.",
    how: "The lender provides a principal amount. Repayments may include interest and fees; the rate, tenure, and repayment schedule shape the total cost.",
    benefits: [
      "Can provide funds before you have saved the full amount",
      "Repayment terms are agreed in advance",
      "Different loan types serve different purposes",
    ],
    considerations: [
      "Repayment is a financial obligation",
      "Compare the total cost, not only the advertised rate",
      "Check processing, late, and prepayment charges",
    ],
  },
  platform: {
    what: "An investing platform provides tools or services for viewing and placing investment transactions.",
    how: "Depending on the provider, it may route orders to an exchange or product provider and show holdings, statements, and account information.",
    benefits: [
      "Can make account information easier to access",
      "May offer research or learning tools",
      "Service models and pricing can differ",
    ],
    considerations: [
      "Understand what service is and is not included",
      "Check brokerage, account, and transaction charges",
      "Confirm the provider's registrations and grievance process",
    ],
  },
  savings: {
    what: "A savings account holds deposits with a bank and generally allows access to money under the account terms.",
    how: "The bank records deposits and withdrawals and may pay interest at a stated rate. Minimum balance and service rules depend on the account.",
    benefits: [
      "Money is generally accessible",
      "Useful for routine banking transactions",
      "May earn interest while funds are deposited",
    ],
    considerations: [
      "Interest rates and minimum-balance rules vary",
      "Fees may apply to specific services",
      "Deposit insurance has limits and conditions",
    ],
  },
  fd: {
    what: "A fixed deposit places a sum with a bank or other eligible institution for a chosen term and interest arrangement.",
    how: "The deposit earns interest according to its terms. Withdrawing before maturity may reduce interest or incur a penalty.",
    benefits: [
      "Interest terms are stated when opened",
      "Different terms and payout schedules may be available",
      "Can be simpler to understand than market-linked products",
    ],
    considerations: [
      "Early withdrawal rules can reduce returns",
      "Interest may be taxable",
      "Inflation can reduce purchasing power",
    ],
  },
  gold: {
    what: "Gold options provide exposure to gold prices in different forms, such as physical gold or financial products.",
    how: "The route determines how you own or track gold, how it is stored or held, what fees apply, and how you can sell or redeem it.",
    benefits: [
      "Offers ways to access gold-price exposure",
      "Some formats avoid personal storage",
      "Different formats have different transaction processes",
    ],
    considerations: [
      "Gold prices can move down as well as up",
      "Storage, making, trading, or management costs may apply",
      "Liquidity, tax, and exit rules differ by format",
    ],
  },
  retirement: {
    what: "Retirement options help people set aside money for later life, often over a long time horizon.",
    how: "Contributions may be invested or earn interest under specific product rules. Access, tax treatment, and payouts depend on the option.",
    benefits: [
      "Encourages long-term saving",
      "Some options offer tax features under current rules",
      "Choices can vary in investment mix and access",
    ],
    considerations: [
      "Money may be restricted until specific conditions are met",
      "Returns and tax rules differ across options",
      "Understand withdrawal and payout rules before contributing",
    ],
  },
};

const categoryIcons: Record<Category, typeof Wallet> = {
  credit_card: CreditCard,
  mutual_fund: Sparkles,
  insurance: ShieldCheck,
  loan: Wallet,
  platform: ArrowUpRight,
  savings: Landmark,
  fd: Landmark,
  gold: Sparkles,
  retirement: BookOpen,
};

type ExplorerCategory = Category | "all";

function ExploreOptionsPage() {
  const { user, token } = useAuth();
  const [category, setCategory] = useState<ExplorerCategory>("all");
  const [query, setQuery] = useState("");
  const [openOptionId, setOpenOptionId] = useState<string | null>(null);
  const [savedOptionIds, setSavedOptionIds] = useState<string[]>([]);
  const [savingOptionIds, setSavingOptionIds] = useState<string[]>([]);
  const [savedError, setSavedError] = useState<string | null>(null);
  const activeCategory =
    category === "all"
      ? {
          label: "All topics",
          blurb: "Browse every learning topic and illustrative option in one place.",
        }
      : CATEGORIES.find((item) => item.id === category);
  const guide =
    category === "all"
      ? {
          what: "Financial options are products or services people may use to save, borrow, protect against specific risks, or invest.",
          how: "Each option has its own provider, terms, costs, risks, and eligibility. Open a topic or example to learn the details to verify.",
          benefits: [
            "Build familiarity with common financial terms",
            "See different kinds of options together",
            "Learn questions to ask before researching further",
          ],
          considerations: [
            "Examples are not personalized suggestions",
            "Terms can change and vary by provider",
            "Check official documents and seek qualified advice when needed",
          ],
        }
      : categoryGuides[category];
  const CategoryIcon = category === "all" ? BookOpen : categoryIcons[category];

  const options = useMemo(
    () =>
      PRODUCTS.filter((product) => category === "all" || product.category === category).filter(
        (product) =>
          `${product.name} ${product.issuer} ${product.summary}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [category, query],
  );

  useEffect(() => {
    if (!token) {
      setSavedOptionIds([]);
      return;
    }
    let active = true;
    getLearningProfile(token)
      .then((profile) => {
        if (active) setSavedOptionIds(profile.savedOptionIds);
      })
      .catch((error: unknown) => {
        if (active) {
          setSavedError(
            error instanceof Error ? error.message : "Could not load saved learning items.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  function selectCategory(nextCategory: ExplorerCategory) {
    setCategory(nextCategory);
    setQuery("");
    setOpenOptionId(null);
  }

  async function toggleSavedOption(product: Product) {
    if (!token || savingOptionIds.length > 0) return;
    setSavingOptionIds((current) => [...current, product.id]);
    setSavedError(null);
    try {
      const current = await getLearningProfile(token);
      const alreadySaved = current.savedOptionIds.includes(product.id);
      const nextProfile: LearningProfileData = {
        ...current,
        savedOptionIds: alreadySaved
          ? current.savedOptionIds.filter((id) => id !== product.id)
          : [...current.savedOptionIds, product.id],
      };
      await saveLearningProfile(token, nextProfile);
      setSavedOptionIds(nextProfile.savedOptionIds);
    } catch (error) {
      setSavedError(
        error instanceof Error ? error.message : "Could not update saved learning items.",
      );
    } finally {
      setSavingOptionIds((current) => current.filter((id) => id !== product.id));
    }
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="relative overflow-hidden rounded-[2rem] border border-brand/15 bg-gradient-brand-soft p-6 sm:p-10">
          <div className="pointer-events-none absolute -right-12 -top-16 size-64 rounded-full bg-brand/10 blur-3xl" />
          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-background/70 px-3 py-1.5 text-xs font-semibold text-brand-deep">
              <BookOpen className="size-3.5" /> Your money, made easier to understand
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-5xl">
              Explore financial options
              <span className="mt-1 block text-gradient-brand">one simple idea at a time.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Pick a topic. See what it means, how it works, what people may find useful, and what
              deserves a closer look—without scores, rankings, or being told what to choose.
            </p>
          </div>

          <aside
            role="note"
            className="relative mt-7 flex gap-3 rounded-2xl border border-brand/20 bg-background/75 p-4 text-sm leading-relaxed"
          >
            <Info className="mt-0.5 size-5 shrink-0 text-brand-deep" />
            <p>
              <strong>Learning resource, not financial advice.</strong> Examples are illustrative,
              may not describe current offers, and are not an endorsement or recommendation to buy
              or sell. Check official documents for current terms.
            </p>
          </aside>
        </header>

        <section className="mt-8" aria-label="Choose a financial topic">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Step 1 · Choose a topic
              </p>
              <h2 className="mt-1 text-xl font-bold">What would you like to understand?</h2>
            </div>
            <span className="hidden rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground sm:inline-flex">
              {CATEGORIES.length} learning paths
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              type="button"
              aria-pressed={category === "all"}
              onClick={() => selectCategory("all")}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all",
                category === "all"
                  ? "border-brand bg-gradient-brand text-white shadow-glow"
                  : "border-border/80 bg-card text-muted-foreground hover:-translate-y-0.5 hover:border-brand/40 hover:text-foreground",
              )}
            >
              <BookOpen className="size-4" />
              All options
              {category === "all" && <Check className="size-3.5" />}
            </button>
            {CATEGORIES.map((item) => {
              const Icon = categoryIcons[item.id];
              const selected = category === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selectCategory(item.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all",
                    selected
                      ? "border-brand bg-gradient-brand text-white shadow-glow"
                      : "border-border/80 bg-card text-muted-foreground hover:-translate-y-0.5 hover:border-brand/40 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                  {selected && <Check className="size-3.5" />}
                </button>
              );
            })}
          </div>
        </section>

        {activeCategory && (
          <section className="mt-8 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]" aria-live="polite">
            <article className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-5 shadow-soft sm:p-6">
              <div className="absolute -right-8 -top-8 size-32 rounded-full bg-brand/10 blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-deep">
                  <CategoryIcon className="size-4" /> Topic guide
                </div>
                <h2 className="mt-2 text-2xl font-bold">{activeCategory.label}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {activeCategory.blurb}
                </p>
                <div className="mt-5 rounded-2xl bg-muted/70 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <CircleHelp className="size-4 text-brand" /> What is it?
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{guide.what}</p>
                </div>
                <div className="mt-3 rounded-2xl bg-muted/70 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <ArrowRight className="size-4 text-brand" /> How does it work?
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{guide.how}</p>
                </div>
              </div>
            </article>

            <div className="rounded-3xl border border-border/70 bg-surface p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Step 2 · Explore examples
                  </p>
                  <h2 className="mt-1 text-xl font-bold">
                    {category === "all" ? "All learning options" : "Options in this topic"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Open a card to explore its features and trade-offs.
                  </p>
                </div>
                <label className="relative block w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <span className="sr-only">Search examples</span>
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setOpenOptionId(null);
                    }}
                    placeholder={category === "all" ? "Search all options" : "Search this topic"}
                    className="w-full rounded-full border border-border bg-background py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                  />
                </label>
              </div>

              {options.length ? (
                <div className="mt-5 space-y-3">
                  {savedError && (
                    <p role="alert" className="text-sm text-destructive">
                      {savedError}
                    </p>
                  )}
                  {options.map((option, index) => {
                    const expanded = openOptionId === option.id;
                    const optionGuide = categoryGuides[option.category];
                    const optionCategory = CATEGORIES.find((item) => item.id === option.category);
                    return (
                      <article
                        key={option.id}
                        className={cn(
                          "overflow-hidden rounded-2xl border bg-card transition-all",
                          expanded
                            ? "border-brand/40 shadow-soft"
                            : "border-border/70 hover:border-brand/25",
                        )}
                      >
                        <div className="flex items-center gap-2 p-3 sm:p-4">
                          <button
                            type="button"
                            aria-expanded={expanded}
                            aria-controls={`option-details-${option.id}`}
                            onClick={() => setOpenOptionId(expanded ? null : option.id)}
                            className="flex min-w-0 flex-1 items-start gap-3 rounded-xl p-1 text-left sm:items-center"
                          >
                            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand/10 text-sm font-bold text-brand-deep">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                {optionCategory?.label} · {option.issuer}
                              </span>
                              <span className="mt-1 block font-semibold">{option.name}</span>
                              <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                                {option.summary}
                              </span>
                            </span>
                            <span className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-brand-deep sm:inline-flex">
                              {expanded ? "Close guide" : "Explore"}
                              <ChevronDown
                                className={cn(
                                  "size-4 transition-transform",
                                  expanded && "rotate-180",
                                )}
                              />
                            </span>
                            <ChevronDown
                              aria-hidden="true"
                              className={cn(
                                "mt-1 size-4 shrink-0 text-muted-foreground transition-transform sm:hidden",
                                expanded && "rotate-180",
                              )}
                            />
                          </button>
                          {user ? (
                            <button
                              type="button"
                              aria-label={`${savedOptionIds.includes(option.id) ? "Remove" : "Save"} ${option.name}`}
                              aria-pressed={savedOptionIds.includes(option.id)}
                              disabled={savingOptionIds.length > 0}
                              onClick={() => void toggleSavedOption(option)}
                              className={cn(
                                "grid size-10 shrink-0 place-items-center rounded-full transition",
                                savedOptionIds.includes(option.id)
                                  ? "bg-brand/10 text-brand-deep"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                              )}
                            >
                              {savedOptionIds.includes(option.id) ? (
                                <BookmarkCheck className="size-5" />
                              ) : (
                                <Bookmark className="size-5" />
                              )}
                            </button>
                          ) : (
                            <Link
                              to="/auth"
                              aria-label={`Sign in to save ${option.name}`}
                              className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            >
                              <Bookmark className="size-5" />
                            </Link>
                          )}
                        </div>

                        {expanded && (
                          <div
                            id={`option-details-${option.id}`}
                            className="grid gap-3 border-t border-border/70 bg-background/60 p-4 sm:grid-cols-2 sm:p-5"
                          >
                            <InfoPanel
                              icon={CircleHelp}
                              title="What is it?"
                              body={option.summary}
                              tone="brand"
                            />
                            <InfoPanel
                              icon={ArrowRight}
                              title="How can it work?"
                              body={optionGuide.how}
                              tone="neutral"
                            />
                            <ListPanel
                              icon={Check}
                              title="Potential benefits"
                              items={optionGuide.benefits}
                              tone="positive"
                            />
                            <ListPanel
                              icon={AlertTriangle}
                              title="Things to consider"
                              items={[...optionGuide.considerations, ...option.avoidIf]}
                              tone="caution"
                            />
                            {option.fees.length > 0 && (
                              <div className="rounded-2xl border border-border/70 bg-card p-4 sm:col-span-2">
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Details and costs to verify
                                </h3>
                                <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                                  {option.fees.map((fee) => (
                                    <li key={fee.label} className="rounded-xl bg-muted/60 p-3">
                                      <span className="font-semibold">{fee.label}:</span>{" "}
                                      {fee.value}
                                      {fee.note && (
                                        <span className="text-muted-foreground"> — {fee.note}</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <p className="text-xs leading-relaxed text-muted-foreground sm:col-span-2">
                              This is a general learning overview, not a statement that this option
                              is right for you. Terms and availability can change; verify details
                              with the official provider documents.
                            </p>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-5 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No examples match that search. Try a different word or topic.
                </p>
              )}
            </div>
          </section>
        )}

        <section className="mt-8 grid gap-4 rounded-3xl border border-border/70 bg-card p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
          <div>
            <h2 className="font-semibold">Keep exploring at your own pace</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Compare facts or learn about charges—no scores, winners, or product picks.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/compare"
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold transition hover:border-brand/40 hover:bg-accent"
            >
              Compare facts <ArrowUpRight className="size-4" />
            </Link>
            <Link
              to="/charges"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Explore charges <ArrowDown className="size-4" />
            </Link>
          </div>
        </section>
      </section>
    </SiteLayout>
  );
}

function InfoPanel({
  icon: Icon,
  title,
  body,
  tone,
}: {
  icon: typeof CircleHelp;
  title: string;
  body: string;
  tone: "brand" | "neutral";
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <h3
        className={cn(
          "flex items-center gap-2 text-sm font-semibold",
          tone === "brand" && "text-brand-deep",
        )}
      >
        <Icon className="size-4" /> {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function ListPanel({
  icon: Icon,
  title,
  items,
  tone,
}: {
  icon: typeof Check;
  title: string;
  items: string[];
  tone: "positive" | "caution";
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <h3
        className={cn(
          "flex items-center gap-2 text-sm font-semibold",
          tone === "positive"
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-amber-700 dark:text-amber-400",
        )}
      >
        <Icon className="size-4" /> {title}
      </h3>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-current" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
