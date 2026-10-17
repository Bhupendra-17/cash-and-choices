import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, Info, Mail, Send, ShieldCheck } from "lucide-react";
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

type MoneyTerm = {
  name: string;
  category: string;
  definition: string;
  whenCharged: string;
  example: string;
  howToAvoid: string[];
  officialUrl: string;
};

type NewsletterStory = {
  category: string;
  title: string;
  summary: string;
  whyItMatters: string;
  sourceName: string;
  sourceUrl: string;
};

type NewsletterContent = {
  subject: string;
  preheader: string;
  term: MoneyTerm;
  stories: NewsletterStory[];
  actionOfTheWeek: string;
  marketSources: string;
  footer: string;
};

type NewsletterEdition = NewsletterContent & {
  id: string;
  weekStart: string;
  status: "draft" | "validated" | "sending" | "sent" | "send_failed";
  createdAt: string;
  validatedAt?: string;
};

type DeliveryCounts = { sent: number; failed: number };

const EMPTY_CONTENT: NewsletterContent = {
  subject: "",
  preheader: "",
  term: {
    name: "",
    category: "",
    definition: "",
    whenCharged: "",
    example: "",
    howToAvoid: [""],
    officialUrl: "",
  },
  stories: Array.from({ length: 3 }, () => ({
    category: "",
    title: "",
    summary: "",
    whyItMatters: "",
    sourceName: "",
    sourceUrl: "",
  })),
  actionOfTheWeek: "",
  marketSources: "",
  footer: "",
};

function NewsletterAdminPage() {
  const { user, token } = useAuth();
  const [edition, setEdition] = useState<NewsletterEdition | null>(null);
  const [content, setContent] = useState<NewsletterContent>(EMPTY_CONTENT);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [deliveryCounts, setDeliveryCounts] = useState<DeliveryCounts>({ sent: 0, failed: 0 });
  const [marketSources, setMarketSources] = useState("");
  const [lessonTopic, setLessonTopic] = useState("");
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [sendConfirmed, setSendConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadCurrentEdition = useCallback(async () => {
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
        delivery?: DeliveryCounts;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Could not load the newsletter admin page.");
      setEdition(data.edition ?? null);
      setSubscriberCount(data.subscriberCount ?? null);
      setDeliveryCounts(data.delivery ?? { sent: 0, failed: 0 });
      setContent(data.edition ?? EMPTY_CONTENT);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load the newsletter admin page.",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) void loadCurrentEdition();
    else setLoading(false);
  }, [loadCurrentEdition, token]);

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
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Could not generate this week's newsletter.",
      );
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
      setError(
        validationError instanceof Error
          ? validationError.message
          : "Could not validate the newsletter.",
      );
    } finally {
      setBusy(false);
    }
  };

  const sendEdition = async () => {
    if (!token || !edition || busy || !sendConfirmed) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await apiFetch("/api/newsletter/admin/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ id: edition.id, sendConfirmed }),
      });
      const data = (await response.json()) as {
        status?: NewsletterEdition["status"];
        sent?: number;
        failed?: number;
        message?: string;
        error?: string;
      };
      if (!response.ok && response.status !== 207) {
        throw new Error(data.error || "Could not send this newsletter.");
      }
      const sentCount = data.sent || 0;
      const failedCount = data.failed || 0;
      setEdition({ ...edition, status: data.status ?? "sent" });
      setSendConfirmed(false);
      setMessage(
        data.message || "Sent to " + sentCount + "; " + failedCount + " deliveries failed.",
      );
      await loadCurrentEdition();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send this newsletter.");
    } finally {
      setBusy(false);
    }
  };

  const updateContent = (field: keyof NewsletterContent, value: string) => {
    setContent((previous) => ({ ...previous, [field]: value }));
  };

  const updateTerm = (field: keyof MoneyTerm, value: string | string[]) => {
    setContent((previous) => ({ ...previous, term: { ...previous.term, [field]: value } }));
  };

  const updateStory = (index: number, field: keyof NewsletterStory, value: string) => {
    setContent((previous) => ({
      ...previous,
      stories: previous.stories.map((story, storyIndex) =>
        storyIndex === index ? { ...story, [field]: value } : story,
      ),
    }));
  };

  if (!user) {
    return (
      <SiteLayout>
        <section className="mx-auto max-w-lg px-4 py-20 text-center">
          <ShieldCheck className="mx-auto size-10 text-brand" />
          <h1 className="mt-4 text-2xl font-bold">Admin sign-in required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in using an account on the server-configured newsletter admin allowlist.
          </p>
          <Button asChild className="mt-5 rounded-full bg-gradient-brand text-white">
            <Link to="/auth">Sign in</Link>
          </Button>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Home
        </Link>
        <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              <Mail className="size-3.5" /> Admin · Weekly edition
            </div>
            <h1 className="mt-3 text-3xl font-bold">Newsletter draft &amp; review</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Generate one edition per week, review every claim and source, then manually send it to
              active subscribers. Nothing is scheduled.
            </p>
          </div>
          {subscriberCount !== null && (
            <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm">
              <span className="font-semibold">{subscriberCount}</span>
              <span className="ml-1 text-muted-foreground">subscribers</span>
            </div>
          )}
        </header>

        <aside
          role="note"
          className="mt-6 flex gap-3 rounded-2xl border border-brand/25 bg-gradient-brand-soft p-4 text-sm"
        >
          <Info className="mt-0.5 size-5 shrink-0 text-brand-deep" />
          <p>
            Provide verified source notes and links. AI drafts the Money Byte content using those
            notes only. Check every claim and link before review. Sending requires a separate
            confirmation and goes only to currently active subscribers.
          </p>
        </aside>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-300"
          >
            {message}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading this week's edition…</p>
        ) : !edition ? (
          <form
            onSubmit={generateDraft}
            className="mt-8 space-y-5 rounded-3xl border border-border/70 bg-card p-6 shadow-soft"
          >
            <div>
              <label htmlFor="market-sources" className="text-sm font-semibold">
                India market news notes and source links
              </label>
              <textarea
                id="market-sources"
                required
                minLength={20}
                maxLength={8000}
                value={marketSources}
                onChange={(event) => setMarketSources(event.target.value)}
                placeholder={
                  "Paste verified headline notes and URLs, one per line.\nExample: Headline — short factual notes — https://source.example/article"
                }
                className="mt-2 min-h-36 w-full rounded-2xl border border-border bg-background p-3 text-sm outline-none focus:border-brand"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                The AI will not fetch live news; source material must be provided here.
              </p>
            </div>
            <div>
              <label htmlFor="lesson-topic" className="text-sm font-semibold">
                Learning topic
              </label>
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
            <Button
              type="submit"
              disabled={busy}
              className="rounded-full bg-gradient-brand text-white"
            >
              {busy ? "Generating draft…" : "Generate this week's preview"}
            </Button>
          </form>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <section className="space-y-4 rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Edit and review content</h2>
                <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold capitalize text-accent-foreground">
                  {edition.status}
                </span>
              </div>
              {(deliveryCounts.sent > 0 || deliveryCounts.failed > 0) && (
                <p className="rounded-xl bg-muted/60 p-3 text-sm">
                  Delivery status: {deliveryCounts.sent} sent · {deliveryCounts.failed} failed
                </p>
              )}
              <fieldset disabled={edition.status !== "draft"} className="space-y-4">
                <TextField
                  label="Subject"
                  value={content.subject}
                  maxLength={90}
                  onChange={(value) => updateContent("subject", value)}
                />
                <TextField
                  label="Preheader"
                  value={content.preheader}
                  maxLength={130}
                  onChange={(value) => updateContent("preheader", value)}
                />
                <div className="space-y-4 rounded-2xl border border-border p-4">
                  <h3 className="font-semibold">Money term of the week</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField
                      label="Term"
                      value={content.term.name}
                      maxLength={100}
                      onChange={(value) => updateTerm("name", value)}
                    />
                    <TextField
                      label="Category"
                      value={content.term.category}
                      maxLength={80}
                      onChange={(value) => updateTerm("category", value)}
                    />
                  </div>
                  <TextField
                    label="Definition"
                    value={content.term.definition}
                    maxLength={1200}
                    multiline
                    onChange={(value) => updateTerm("definition", value)}
                  />
                  <TextField
                    label="When is it charged or deducted?"
                    value={content.term.whenCharged}
                    maxLength={700}
                    multiline
                    onChange={(value) => updateTerm("whenCharged", value)}
                  />
                  <TextField
                    label="A simple example"
                    value={content.term.example}
                    maxLength={700}
                    multiline
                    onChange={(value) => updateTerm("example", value)}
                  />
                  <TextField
                    label="Tips to reduce or avoid it (one per line)"
                    value={content.term.howToAvoid.join("\n")}
                    maxLength={1200}
                    multiline
                    onChange={(value) =>
                      updateTerm(
                        "howToAvoid",
                        value
                          .split("\n")
                          .map((tip) => tip.trim())
                          .filter(Boolean),
                      )
                    }
                  />
                  <TextField
                    label="Official source URL (HTTPS)"
                    value={content.term.officialUrl}
                    maxLength={500}
                    onChange={(value) => updateTerm("officialUrl", value)}
                  />
                </div>
                <div className="space-y-4 rounded-2xl border border-border p-4">
                  <h3 className="font-semibold">Three stories this week</h3>
                  {content.stories.map((story, index) => (
                    <div key={index} className="space-y-3 rounded-xl bg-muted/40 p-3">
                      <h4 className="text-sm font-semibold">Story {index + 1}</h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <TextField
                          label="Category"
                          value={story.category}
                          maxLength={60}
                          onChange={(value) => updateStory(index, "category", value)}
                        />
                        <TextField
                          label="Headline"
                          value={story.title}
                          maxLength={160}
                          onChange={(value) => updateStory(index, "title", value)}
                        />
                      </div>
                      <TextField
                        label="Summary"
                        value={story.summary}
                        maxLength={800}
                        multiline
                        onChange={(value) => updateStory(index, "summary", value)}
                      />
                      <TextField
                        label="Why it matters"
                        value={story.whyItMatters}
                        maxLength={500}
                        multiline
                        onChange={(value) => updateStory(index, "whyItMatters", value)}
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <TextField
                          label="Source name"
                          value={story.sourceName}
                          maxLength={120}
                          onChange={(value) => updateStory(index, "sourceName", value)}
                        />
                        <TextField
                          label="Source URL (HTTPS)"
                          value={story.sourceUrl}
                          maxLength={500}
                          onChange={(value) => updateStory(index, "sourceUrl", value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <TextField
                  label="Your 60-second money check"
                  value={content.actionOfTheWeek}
                  maxLength={500}
                  multiline
                  onChange={(value) => updateContent("actionOfTheWeek", value)}
                />
                <TextField
                  label="Market sources (preserved for review)"
                  value={content.marketSources}
                  maxLength={8000}
                  multiline
                  onChange={(value) => updateContent("marketSources", value)}
                />
                <div className="rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
                  <strong>Fixed footer disclaimer:</strong> {content.footer}
                </div>
              </fieldset>
              {edition.status === "draft" && (
                <>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={reviewConfirmed}
                      onChange={(event) => setReviewConfirmed(event.target.checked)}
                      className="mt-1 accent-brand"
                    />
                    <span>
                      I verified the market summary against its sources and reviewed the learning
                      text for accuracy and educational tone.
                    </span>
                  </label>
                  <Button
                    type="button"
                    disabled={busy || !reviewConfirmed}
                    onClick={validateDraft}
                    className="rounded-full bg-gradient-brand text-white"
                  >
                    {busy ? "Saving review…" : "Mark this edition reviewed"}
                  </Button>
                </>
              )}
              {edition.status === "validated" && (
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="size-4" /> Reviewed; not sent
                </p>
              )}
              {(edition.status === "validated" || edition.status === "send_failed") && (
                <div className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={sendConfirmed}
                      onChange={(event) => setSendConfirmed(event.target.checked)}
                      className="mt-1 accent-brand"
                    />
                    <span>
                      I reviewed this exact edition and confirm sending it now to all currently
                      active subscribers.
                    </span>
                  </label>
                  <Button
                    type="button"
                    disabled={busy || !sendConfirmed}
                    onClick={sendEdition}
                    className="rounded-full bg-gradient-brand text-white"
                  >
                    <Send className="mr-2 size-4" />
                    {busy
                      ? "Sending…"
                      : edition.status === "send_failed"
                        ? "Retry failed deliveries"
                        : "Send to subscribers"}
                  </Button>
                </div>
              )}
              {(edition.status === "sending" || edition.status === "sent") && (
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="size-4" />{" "}
                  {edition.status === "sent"
                    ? "Sent to active subscribers"
                    : "A send is in progress"}
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
  const className =
    "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand";
  return (
    <label className="block text-sm font-medium">
      {label}{" "}
      <span className="text-xs font-normal text-muted-foreground">
        {value.length}/{maxLength}
      </span>
      {multiline ? (
        <textarea
          maxLength={maxLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${className} min-h-24`}
        />
      ) : (
        <input
          maxLength={maxLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={className}
        />
      )}
    </label>
  );
}

function EmailPreview({ content, weekStart }: { content: NewsletterContent; weekStart: string }) {
  return (
    <article className="h-fit overflow-hidden rounded-3xl border border-border bg-white text-slate-800 shadow-card">
      <div className="bg-gradient-brand p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest">
          Cash&amp;Choices · Weekly learning
        </p>
        <h2 className="mt-3 text-2xl font-bold">
          {content.subject || "Weekly financial literacy"}
        </h2>
        <p className="mt-2 text-sm text-white/85">{content.preheader}</p>
        <p className="mt-3 text-xs text-white/75">Week of {weekStart}</p>
      </div>
      <div className="space-y-6 p-6">
        <section>
          <p className="text-xs font-bold uppercase tracking-wider text-fuchsia-800">
            01 / Money term of the week
          </p>
          <p className="mt-1 text-xs font-semibold text-purple-700">{content.term.category}</p>
          <h3 className="mt-2 text-lg font-semibold">{content.term.name}</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {content.term.definition}
          </p>
          <p className="mt-2 text-sm">
            <strong>When charged:</strong> {content.term.whenCharged}
          </p>
          <p className="mt-2 text-sm">
            <strong>Example:</strong> {content.term.example}
          </p>
          <p className="mt-2 text-sm font-semibold">How to reduce or avoid it</p>
          <ul className="list-inside list-disc text-sm">
            {content.term.howToAvoid.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
          {content.term.officialUrl && (
            <a
              className="mt-2 inline-block text-sm text-purple-700 underline"
              href={content.term.officialUrl}
            >
              Verify the details
            </a>
          )}
        </section>
        <section className="border-t border-slate-200 pt-5">
          <p className="text-xs font-bold uppercase tracking-wider text-fuchsia-800">
            02 / This week in money
          </p>
          <h3 className="mt-2 text-lg font-semibold">The stories worth your attention</h3>
          {content.stories.map((story, index) => (
            <div key={index} className="border-b border-slate-200 py-3 last:border-0">
              <p className="text-xs font-semibold uppercase text-purple-700">{story.category}</p>
              <h4 className="mt-1 font-semibold">{story.title}</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{story.summary}</p>
              <p className="mt-2 text-sm">
                <strong>Why it matters:</strong> {story.whyItMatters}
              </p>
              {story.sourceUrl && (
                <a
                  className="mt-1 inline-block text-xs text-purple-700 underline"
                  href={story.sourceUrl}
                >
                  Source: {story.sourceName || story.sourceUrl}
                </a>
              )}
            </div>
          ))}
        </section>
        <section className="rounded-xl bg-purple-50 p-4">
          <h3 className="font-semibold">Your 60-second money check</h3>
          <p className="mt-2 text-sm leading-relaxed">{content.actionOfTheWeek}</p>
        </section>
        <footer className="border-t border-slate-200 pt-5 text-xs leading-relaxed text-slate-500">
          <p className="whitespace-pre-wrap">{content.footer}</p>
        </footer>
      </div>
    </article>
  );
}
