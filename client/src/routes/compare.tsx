import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SvgRadarChart } from "@/components/ui/svg-charts";
import { CheckCircle2, Scale, XCircle } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CATEGORIES, PRODUCTS, labelFor, scoreFor, type Category } from "@/data/products";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare Everything — Cash&Choices" },
      {
        name: "description",
        content:
          "Pick any two financial products and compare fees, decision scores, and trade-offs side by side.",
      },
      { property: "og:title", content: "Compare Everything — Cash&Choices" },
      {
        property: "og:description",
        content: "Side-by-side product comparison with a decision score radar chart.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComparePage,
});

const AXES: { key: keyof (typeof PRODUCTS)[number]["scores"]; label: string }[] = [
  { key: "transparency", label: "Transparency" },
  { key: "liquidity", label: "Liquidity" },
  { key: "hiddenCost", label: "Low hidden cost" },
  { key: "taxEfficiency", label: "Tax efficient" },
  { key: "risk", label: "Safety" },
];

function ComparePage() {
  const [cat, setCat] = useState<Category>("mutual_fund");
  const options = useMemo(() => PRODUCTS.filter((p) => p.category === cat), [cat]);
  const [aId, setAId] = useState<string>(options[0]?.id ?? "");
  const [bId, setBId] = useState<string>(options[1]?.id ?? "");

  const a = options.find((p) => p.id === aId) ?? options[0];
  const b = options.find((p) => p.id === bId) ?? options[1];

  const radarData = useMemo(
    () =>
      a && b
        ? AXES.map((ax) => ({
            axis: ax.label,
            [a.name]: a.scores[ax.key],
            [b.name]: b.scores[ax.key],
          }))
        : [],
    [a, b],
  );

  function onCatChange(c: Category) {
    setCat(c);
    const list = PRODUCTS.filter((p) => p.category === c);
    setAId(list[0]?.id ?? "");
    setBId(list[1]?.id ?? "");
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            <Scale className="size-3.5" /> Side by side
          </div>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Compare Everything</h1>
          <p className="mt-2 text-muted-foreground">
            Pick any two products in a category. See the fees, the scores and the honest trade-offs.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => onCatChange(c.id)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                cat === c.id
                  ? "border-brand bg-gradient-brand text-white shadow-glow"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {!a || !b ? (
          <div className="mt-10 rounded-3xl border border-dashed border-border p-10 text-center text-muted-foreground">
            Need at least two {labelFor(cat)} to compare. Try another category.
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                { side: "A", id: aId, set: setAId, tint: "from-brand to-brand-deep" },
                { side: "B", id: bId, set: setBId, tint: "from-brand-soft to-brand" },
              ].map((slot) => (
                <div key={slot.side} className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Product {slot.side}
                  </label>
                  <select
                    value={slot.id}
                    onChange={(e) => slot.set(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium outline-none focus:border-brand"
                  >
                    {options.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3 rounded-3xl border border-border/70 bg-card p-6 shadow-card">
                <h2 className="text-lg font-semibold">Decision score radar</h2>
                <p className="text-sm text-muted-foreground">Higher is better on every axis.</p>
                <div className="mt-4 h-80">
                  <SvgRadarChart
                    data={radarData}
                    series={[
                      { name: a.name, key: a.name, stroke: "#C13E8A", fill: "#C13E8A" },
                      { name: b.name, key: b.name, stroke: "#F05AA8", fill: "#FF8BC6" },
                    ]}
                  />
                </div>
              </div>
              <div className="lg:col-span-2 grid gap-4">
                {[a, b].map((p) => (
                  <div key={p.id} className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          {p.issuer}
                        </div>
                        <div className="text-lg font-semibold">{p.name}</div>
                      </div>
                      <div className="rounded-2xl bg-gradient-brand-soft px-3 py-2 text-center">
                        <div className="text-[10px] uppercase tracking-wide text-brand-deep">Score</div>
                        <div className="text-xl font-bold text-brand-deep">{scoreFor(p)}</div>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{p.summary}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft">
              <table className="w-full text-sm">
                <thead className="bg-accent/50 text-left">
                  <tr>
                    <th className="p-4 font-semibold">Feature</th>
                    <th className="p-4 font-semibold">{a.name}</th>
                    <th className="p-4 font-semibold">{b.name}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {AXES.map((ax) => (
                    <tr key={ax.key}>
                      <td className="p-4 text-muted-foreground">{ax.label}</td>
                      <td className="p-4 font-medium">{a.scores[ax.key]}/100</td>
                      <td className="p-4 font-medium">{b.scores[ax.key]}/100</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="p-4 align-top text-muted-foreground">Good if</td>
                    {[a, b].map((p) => (
                      <td key={p.id} className="p-4">
                        <ul className="space-y-1">
                          {p.goodIf.map((g) => (
                            <li key={g} className="flex items-start gap-2">
                              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" /> {g}
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 align-top text-muted-foreground">Avoid if</td>
                    {[a, b].map((p) => (
                      <td key={p.id} className="p-4">
                        <ul className="space-y-1">
                          {p.avoidIf.map((g) => (
                            <li key={g} className="flex items-start gap-2">
                              <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" /> {g}
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 align-top text-muted-foreground">Fees</td>
                    {[a, b].map((p) => (
                      <td key={p.id} className="p-4">
                        <ul className="space-y-1">
                          {p.fees.map((f) => (
                            <li key={f.label}>
                              <span className="text-muted-foreground">{f.label}:</span>{" "}
                              <span className="font-medium">{f.value}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </SiteLayout>
  );
}
