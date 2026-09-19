import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { EyeOff, Info, HelpCircle, Calendar, Coins, Ban, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
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

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {INVESTMENT_CHARGES.map((c) => {
            const isOpen = openId === c.id;
            return (
              <div
                key={c.id}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all",
                  "hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-glow",
                  isOpen && "sm:col-span-2 xl:col-span-3 ring-2 ring-brand/40",
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : c.id)}
                  aria-expanded={isOpen}
                  aria-controls={isOpen ? `charge-details-${c.id}` : undefined}
                  className="flex min-h-40 w-full items-start justify-between gap-4 p-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset sm:min-h-44 sm:p-6"
                >
                  <span className="min-w-0">
                    <span className="mb-4 inline-flex size-9 items-center justify-center rounded-xl bg-brand/10 text-sm font-bold text-brand">
                      {String(INVESTMENT_CHARGES.indexOf(c) + 1).padStart(2, "0")}
                    </span>
                    <span className="block text-base font-semibold leading-tight sm:text-lg">{c.name}</span>
                    <span className="mt-2 block max-w-sm text-sm leading-6 text-muted-foreground">{c.short}</span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      "mt-1 size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:text-brand",
                      isOpen && "rotate-180 text-brand",
                    )}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`charge-details-${c.id}`}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="border-t border-brand/20"
                    >
                      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
                        {[
                          { Icon: HelpCircle, k: "What is this charge?", v: c.what },
                          { Icon: Info, k: "Why is it deducted?", v: c.why },
                          { Icon: Calendar, k: "When is it deducted?", v: c.when },
                          { Icon: Coins, k: "How much will it cost?", v: c.howMuch },
                          { Icon: Ban, k: "Can it be avoided?", v: c.canAvoid },
                        ].map(({ Icon, k, v }) => (
                          <div key={k} className="min-w-0 rounded-xl border border-border bg-background/70 p-4 sm:p-5">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                              <Icon className="size-4 text-brand" /> {k}
                            </div>
                            <p className="mt-1.5 text-sm text-muted-foreground">{v}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>
    </SiteLayout>
  );
}