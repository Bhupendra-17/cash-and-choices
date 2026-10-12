import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Info, Scale } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CATEGORIES, PRODUCTS, type Category, type Product } from "@/data/products";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare Financial Products — Cash&Choices" },
      {
        name: "description",
        content:
          "Compare product features, costs, and trade-offs side by side for educational purposes. No scores or rankings.",
      },
      { property: "og:title", content: "Compare Financial Products — Cash&Choices" },
      {
        property: "og:description",
        content: "Side-by-side educational comparison of product features, costs, and trade-offs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  const [category, setCategory] = useState<Category>("mutual_fund");
  const options = useMemo(
    () => PRODUCTS.filter((product) => product.category === category),
    [category],
  );
  const [firstId, setFirstId] = useState<string>(options[0]?.id ?? "");
  const [secondId, setSecondId] = useState<string>(options[1]?.id ?? "");
  const first = options.find((product) => product.id === firstId) ?? options[0];
  const second = options.find((product) => product.id === secondId) ?? options[1];

  function onCategoryChange(nextCategory: Category) {
    const nextOptions = PRODUCTS.filter((product) => product.category === nextCategory);
    setCategory(nextCategory);
    setFirstId(nextOptions[0]?.id ?? "");
    setSecondId(nextOptions[1]?.id ?? "");
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <header className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            <Scale className="size-3.5" /> Side by side
          </div>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Compare product details</h1>
          <p className="mt-2 text-muted-foreground">
            Explore the features, costs, and trade-offs of two products you select. There are no
            scores, winners, or rankings.
          </p>
        </header>

        <aside role="note" className="mt-6 flex gap-3 rounded-2xl border border-brand/25 bg-gradient-brand-soft p-4 text-sm">
          <Info className="mt-0.5 size-5 shrink-0 text-brand-deep" />
          <p>
            <strong>Educational comparison only.</strong> Information is general and may change.
            It is not personalized investment advice, an endorsement, or a recommendation to buy or
            sell. Check current official documents before making decisions.
          </p>
        </aside>

        <div className="mt-7 flex flex-wrap gap-2">
          {CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={category === item.id}
              onClick={() => onCategoryChange(item.id)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                category === item.id
                  ? "border-brand bg-gradient-brand text-white shadow-glow"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {!first || !second ? (
          <div className="mt-10 rounded-3xl border border-dashed border-border p-10 text-center text-muted-foreground">
            There are not yet two examples in this topic to compare. Try another category.
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                { label: "Option A", id: firstId, set: setFirstId },
                { label: "Option B", id: secondId, set: setSecondId },
              ].map((slot) => (
                <div key={slot.label} className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
                  <label htmlFor={`select-${slot.label}`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {slot.label}
                  </label>
                  <select
                    id={`select-${slot.label}`}
                    value={slot.id}
                    onChange={(event) => slot.set(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium outline-none focus:border-brand"
                  >
                    {options.map((product) => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="mt-6 overflow-x-auto rounded-3xl border border-border/70 bg-card shadow-soft">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-accent/50 text-left">
                  <tr>
                    <th scope="col" className="p-4 font-semibold">Details to explore</th>
                    <th scope="col" className="p-4 font-semibold">{first.name}</th>
                    <th scope="col" className="p-4 font-semibold">{second.name}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  <ComparisonRow label="Provider" first={first} second={second} value={(product) => product.issuer} />
                  <ComparisonRow label="Overview" first={first} second={second} value={(product) => product.summary} />
                  <ComparisonRow label="Concepts to understand" first={first} second={second} value={(product) => product.goodIf.join("; ")} />
                  <ComparisonRow label="Trade-offs to research" first={first} second={second} value={(product) => product.avoidIf.join("; ")} />
                  <ComparisonRow
                    label="Costs to check"
                    first={first}
                    second={second}
                    value={(product) => product.fees.map((fee) => `${fee.label}: ${fee.value}`).join("; ")}
                  />
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </SiteLayout>
  );
}

function ComparisonRow({
  label,
  first,
  second,
  value,
}: {
  label: string;
  first: Product;
  second: Product;
  value: (product: Product) => string;
}) {
  return (
    <tr>
      <th scope="row" className="w-48 p-4 align-top font-medium text-muted-foreground">{label}</th>
      <td className="max-w-sm p-4 align-top">{value(first) || "Not listed"}</td>
      <td className="max-w-sm p-4 align-top">{value(second) || "Not listed"}</td>
    </tr>
  );
}
