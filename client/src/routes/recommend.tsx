import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, CircleHelp, Info, Search } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CATEGORIES, PRODUCTS, type Category } from "@/data/products";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/recommend")({
  head: () => ({
    meta: [
      { title: "Explore Financial Options — Cash&Choices" },
      {
        name: "description",
        content:
          "Learn about common financial products, their features, costs, and trade-offs. Educational information, not personalized investment advice.",
      },
    ],
  }),
  component: ExploreOptionsPage,
});

function ExploreOptionsPage() {
  const [category, setCategory] = useState<Category>("mutual_fund");
  const [query, setQuery] = useState("");
  const activeCategory = CATEGORIES.find((item) => item.id === category);
  const options = useMemo(
    () =>
      PRODUCTS.filter((product) => product.category === category).filter((product) =>
        `${product.name} ${product.issuer} ${product.summary}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [category, query],
  );

  return (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            <BookOpen className="size-3.5" /> Financial learning library
          </div>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Explore financial options</h1>
          <p className="mt-3 text-muted-foreground">
            Browse common financial products by topic. Learn what they are, the costs and
            trade-offs to understand, and questions to ask while doing your own research.
          </p>
        </header>

        <aside
          role="note"
          className="mt-7 flex gap-3 rounded-2xl border border-brand/25 bg-gradient-brand-soft p-4 text-sm"
        >
          <Info className="mt-0.5 size-5 shrink-0 text-brand-deep" />
          <p>
            <strong>For education only.</strong> These illustrative examples are not a ranking,
            endorsement, personalized recommendation, or solicitation to buy or sell. Information
            may change; check official product documents and consider a SEBI-registered investment
            adviser for advice suited to your circumstances.
          </p>
        </aside>

        <div className="mt-8 flex flex-wrap gap-2" aria-label="Financial topics">
          {CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={category === item.id}
              onClick={() => {
                setCategory(item.id);
                setQuery("");
              }}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                category === item.id
                  ? "border-brand bg-gradient-brand text-white"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {activeCategory && (
          <section className="mt-8" aria-labelledby="topic-heading">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h2 id="topic-heading" className="text-2xl font-bold">{activeCategory.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{activeCategory.blurb}</p>
              </div>
              <label className="relative block w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <span className="sr-only">Search examples</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search examples"
                  className="w-full rounded-full border border-border bg-background py-2 pl-9 pr-4 text-sm outline-none focus:border-brand"
                />
              </label>
            </div>

            {options.length ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {options.map((option) => (
                  <article
                    key={option.id}
                    className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft"
                  >
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {option.issuer}
                    </div>
                    <h3 className="mt-1 text-lg font-semibold">{option.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {option.summary}
                    </p>

                    {option.goodIf.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground">
                          Concepts to understand
                        </h4>
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                          {option.goodIf.map((item) => <li key={item}>• {item}</li>)}
                        </ul>
                      </div>
                    )}

                    {option.avoidIf.length > 0 && (
                      <div className="mt-4 rounded-xl bg-muted/70 p-3">
                        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
                          <CircleHelp className="size-3.5" /> Trade-offs to research
                        </h4>
                        <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                          {option.avoidIf.map((item) => <li key={item}>• {item}</li>)}
                        </ul>
                      </div>
                    )}

                    {option.fees.length > 0 && (
                      <div className="mt-4 border-t border-border/70 pt-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Costs to check
                        </h4>
                        <ul className="mt-2 space-y-1 text-sm">
                          {option.fees.slice(0, 3).map((fee) => (
                            <li key={fee.label}>
                              <span className="text-muted-foreground">{fee.label}:</span>{" "}
                              <span className="font-medium">{fee.value}</span>
                              {fee.note && <span className="text-muted-foreground"> — {fee.note}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No examples match that search in this topic.
              </p>
            )}
          </section>
        )}

        <div className="mt-10 flex flex-wrap gap-3 border-t border-border/70 pt-6 text-sm">
          <Link to="/funds" className="inline-flex items-center gap-1 font-semibold text-brand-deep hover:underline">
            Browse mutual fund data <ArrowRight className="size-4" />
          </Link>
          <Link to="/charges" className="inline-flex items-center gap-1 font-semibold text-brand-deep hover:underline">
            Learn about common charges <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
