import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, Info, Mail, ShieldCheck } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/admin/newsletter")({
  head: () => ({
    meta: [
      { title: "Newsletter Admin — Cash&Choices" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NewsletterAdminPage,
});

type NewsletterContent = {
  subject: string;
  preheader: string;
  marketSummary: string;
  lessonTitle: string;
  lessonBody: string;
  marketSources: string;
  footer: string;
};

type NewsletterEdition = NewsletterContent & {
  id: string;
  weekStart: string;
  status: "draft" | "validated";
  createdAt: string;
  validatedAt?: string;
};

const EMPTY_CONTENT: NewsletterContent = {
  subject: "",
  preheader: "",
  marketSummary: "",
  lessonTitle: "",
  lessonBody: "",
  marketSources: "",
  footer: "",
};

function NewsletterAdminPage() {
  const { user, token } = useAuth();
  const [edition, setEdition] = useState<NewsletterEdition | null>(null);
  const [content, setContent] = useState<NewsletterContent>(EMPTY_CONTENT);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [marketSources, setMarketSources] = useState("");
  const [lessonTopic, setLessonTopic] = useState("");
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadCurrentEdition = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch("/api/newsletter/admin/current", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await response.json()) as {
        edition?: NewsletterEdition | null;
        subscriberCount?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Could not load the newsletter admin page.");
      setEdition(data.edition ?? null);
      setSubscriberCount(data.subscriberCount ?? null);
      setContent(data.edition ?? EMPTY_CONTENT);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load the newsletter admin page.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) void loadCurrentEdition();
    else setLoading(false);
  }, [token]);

  const generateDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || busy || edition) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await apiFetch("/api/newsletter/admin/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ marketSources, lessonTopic }),
      });
      const data = (await response.json()) as NewsletterEdition & { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not generate this week's newsletter.");
      setEdition(data);
      setContent(data);
      setMessage("Draft generated. Review sources and wording before validating it.");
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Could not generate this week's newsletter.");
    } finally {
      setBusy(false);
    }
  };

  const validateDraft = async () => {
    if (!token || !edition || busy || edition.status === "validated") return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await apiFetch("/api/newsletter/admin/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: edition.id, ...content, reviewConfirmed }),
      });
      const data = (await response.json()) as NewsletterEdition & { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not validate the newsletter.");
      setEdition(data);
      setContent(data);
      setMessage("This week's edition is marked reviewed. It has not been emailed to subscribers.");
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : "Could not validate the newsletter.");
    } finally {
      setBusy(false);
    }
  };

  const updateContent = (field: keyof NewsletterContent, value: string) => {
    setContent((previous) => ({ ...previous, [field]: value }));
  };

  if (!user) {
    return (
      <SiteLayout>
        <section className="mx-auto max-w-lg px-4 py-20 text-center">
          <ShieldCheck className="mx-auto size-10 text-brand" />
          <h1 className="mt-4 text-2xl font-bold">Admin sign-in required</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in using an account on the server-configured newsletter admin allowlist.</p>
          <Button asChild className="mt-5 rounded-full bg-gradient-brand text-white"><Link to="/auth">Sign in</Link></Button>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Home
        </Link>
        <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              <Mail className="size-3.5" /> Admin · Weekly edition
            </div>
            <h1 className="mt-3 text-3xl font-bold">Newsletter draft &amp; review</h1>
            <p className="mt-2 text-sm text-muted-foreground">Generate one preview per week, fact-check it, then mark it reviewed. Sending and scheduling are disabled in this testing version.</p>
          </div>
          {subscriberCount !== null && (
            <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm">
              <span className="font-semibold">{subscriberCount}</span>
              <span className="ml-1 text-muted-foreground">subscribers</span>
            </div>
          )}
        </header>

        <aside role="note" className="mt-6 flex gap-3 rounded-2xl border border-brand/25 bg-gradient-brand-soft p-4 text-sm">
          <Info className="mt-0.5 size-5 shrink-0 text-brand-deep" />
          <p>Provide source notes and links for the market section. AI drafts a short summary from those notes only. Verify every claim and link before marking the email reviewed. No email is sent from this page.</p>
        </aside>

        {error && <p role="alert" className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
        {message && <p role="status" className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}

        {loading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading this week's edition…</p>
        ) : !edition ? (
          <form onSubmit={generateDraft} className="mt-8 space-y-5 rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
            <div>
              <label htmlFor="market-sources" className="text-sm font-semibold">India market news notes and source links</label>
              <textarea
                id="market-sources"
                required
                minLength={20}
                maxLength={8000}
                value={marketSources}
                onChange={(event) => setMarketSources(event.target.value)}
                placeholder={"Paste verified headline notes and URLs, one per line.\nExample: Headline — short factual notes — https://source.example/article"}
                className="mt-2 min-h-36 w-full rounded-2xl border border-border bg-background p-3 text-sm outline-none focus:border-brand"
              />
              <p className="mt-1 text-xs text-muted-foreground">The AI will not fetch live news; source material must be provided here.</p>
            </div>
            <div>
              <label htmlFor="lesson-topic" className="text-sm font-semibold">Learning topic</label>
              <input
                id="lesson-topic"
                required
                maxLength={180}
                value={lessonTopic}
                onChange={(event) => setLessonTopic(event.target.value)}
                placeholder="For example: how expense ratios affect mutual fund costs"
                className="mt-2 w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand"
              />
            </div>
            <Button type="submit" disabled={busy} className="rounded-full bg-gradient-brand text-white">
              {busy ? "Generating draft…" : "Generate this week's preview"}
            </Button>
          </form>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <section className="space-y-4 rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Edit and review content</h2>
                <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold capitalize text-accent-foreground">{edition.status}</span>
              </div>
              <TextField label="Subject" value={content.subject} maxLength={90} onChange={(value) => updateContent("subject", value)} />
              <TextField label="Preheader" value={content.preheader} maxLength={130} onChange={(value) => updateContent("preheader", value)} />
              <TextField label="India market summary" value={content.marketSummary} maxLength={500} multiline onChange={(value) => updateContent("marketSummary", value)} />
              <TextField label="Learning section title" value={content.lessonTitle} maxLength={100} onChange={(value) => updateContent("lessonTitle", value)} />
              <TextField label="Learning section" value={content.lessonBody} maxLength={700} multiline onChange={(value) => updateContent("lessonBody", value)} />
              <TextField label="Market sources (preserved for review)" value={content.marketSources} maxLength={8000} multiline onChange={(value) => updateContent("marketSources", value)} />
              <div className="rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
                <strong>Fixed footer disclaimer:</strong> {content.footer}
              </div>
              {edition.status === "draft" && (
                <>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={reviewConfirmed} onChange={(event) => setReviewConfirmed(event.target.checked)} className="mt-1 accent-brand" />
                    <span>I verified the market summary against its sources and reviewed the learning text for accuracy and educational tone.</span>
                  </label>
                  <Button type="button" disabled={busy || !reviewConfirmed} onClick={validateDraft} className="rounded-full bg-gradient-brand text-white">
                    {busy ? "Saving review…" : "Mark this edition reviewed"}
                  </Button>
                </>
              )}
              {edition.status === "validated" && (
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="size-4" /> Reviewed; not sent
                </p>
              )}
            </section>
            <EmailPreview content={content} weekStart={edition.weekStart} />
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

function TextField({
  label,
  value,
  maxLength,
  multiline = false,
  onChange,
}: {
  label: string;
  value: string;
  maxLength: number;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  const className = "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand";
  return (
    <label className="block text-sm font-medium">
      {label} <span className="text-xs font-normal text-muted-foreground">{value.length}/{maxLength}</span>
      {multiline ? (
        <textarea maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} className={`${className} min-h-24`} />
      ) : (
        <input maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} className={className} />
      )}
    </label>
  );
}

function EmailPreview({ content, weekStart }: { content: NewsletterContent; weekStart: string }) {
  return (
    <article className="h-fit overflow-hidden rounded-3xl border border-border bg-white text-slate-800 shadow-card">
      <div className="bg-gradient-brand p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest">Cash&amp;Choices · Weekly learning</p>
        <h2 className="mt-3 text-2xl font-bold">{content.subject || "Weekly financial literacy"}</h2>
        <p className="mt-2 text-sm text-white/85">{content.preheader}</p>
        <p className="mt-3 text-xs text-white/75">Week of {weekStart}</p>
      </div>
      <div className="space-y-6 p-6">
        <section>
          <p className="text-xs font-bold uppercase tracking-wider text-fuchsia-800">India market watch</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{content.marketSummary}</p>
          {content.marketSources && (
            <div className="mt-3 border-t border-slate-200 pt-3">
              <p className="text-xs font-semibold">Sources for this summary</p>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-500">{content.marketSources}</p>
            </div>
          )}
        </section>
        <section className="border-t border-slate-200 pt-5">
          <p className="text-xs font-bold uppercase tracking-wider text-fuchsia-800">One thing to learn</p>
          <h3 className="mt-2 text-lg font-semibold">{content.lessonTitle}</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{content.lessonBody}</p>
        </section>
        <footer className="border-t border-slate-200 pt-5 text-xs leading-relaxed text-slate-500">
          <p className="whitespace-pre-wrap">{content.footer}</p>
        </footer>
      </div>
    </article>
  );
}
