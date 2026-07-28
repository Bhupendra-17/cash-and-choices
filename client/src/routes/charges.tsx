import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { EyeOff, Info, HelpCircle, Calendar, Coins, Ban } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { INVESTMENT_CHARGES } from "@/data/investmentCharges";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/charges")({
  head: () => ({
    meta: [
      { title: "Hidden Charges Explorer — Cash&Choices" },
      {
        name: "description",
        content:
          "Every investment charge — expense ratio, brokerage, GST, STT, stamp duty, exit load, forex markup — explained in plain English.",
      },
      { property: "og:title", content: "Hidden Charges Explorer — Cash&Choices" },
      {
        property: "og:description",
        content:
          "What each charge is, why it's deducted, when it hits, how much it costs and whether you can avoid it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChargesPage,
});

function ChargesPage() {
  const [openId, setOpenId] = useState<string | null>(INVESTMENT_CHARGES[0].id);
  const open = openId ? INVESTMENT_CHARGES.find((c) => c.id === openId) : null;

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-accent/40 px-3 py-1 text-xs font-medium">
            <EyeOff className="size-3.5" /> Every charge explained
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Hidden charges, uncovered.
          </h1>
          <p className="mt-2 text-muted-foreground">
            For every investment charge we answer the five questions that matter: what it is, why
            it's deducted, when it hits your money, how much it typically costs, and whether you can
            avoid it.
          </p>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {INVESTMENT_CHARGES.map((c) => {
            const isOpen = openId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setOpenId(isOpen ? null : c.id)}
                className={cn(
                  "text-left rounded-3xl border border-border bg-card p-5 shadow-soft transition-all",
                  "hover:-translate-y-0.5 hover:shadow-glow",
                  isOpen && "ring-2 ring-brand/40",
                )}
              >
                <h3 className="font-semibold">{c.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{c.short}</p>
                <div className="mt-3 text-xs font-medium text-brand">
                  {isOpen ? "Hide details" : "See details →"}
                </div>
              </button>
            );
          })}
        </div>

        {open && (
          <div className="mt-6 rounded-3xl border border-brand/30 bg-brand/5 p-6">
            <h2 className="text-xl font-semibold">{open.name}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { Icon: HelpCircle, k: "What is this charge?", v: open.what },
                { Icon: Info, k: "Why is it deducted?", v: open.why },
                { Icon: Calendar, k: "When is it deducted?", v: open.when },
                { Icon: Coins, k: "How much will it cost?", v: open.howMuch },
                { Icon: Ban, k: "Can it be avoided?", v: open.canAvoid },
              ].map(({ Icon, k, v }) => (
                <div key={k} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Icon className="size-4 text-brand" /> {k}
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{v}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}