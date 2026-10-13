import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, LogOut, ShieldCheck } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Account — Cash&Choices" },
      { name: "description", content: "Manage your Cash&Choices account and explore financial learning resources." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [newsletterSubscribed, setNewsletterSubscribed] = useState<boolean | null>(null);
  const [newsletterBusy, setNewsletterBusy] = useState(false);
  const [newsletterError, setNewsletterError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch("/api/newsletter/subscription", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load newsletter preferences.");
        const subscription = (await response.json()) as { subscribed: boolean };
        setNewsletterSubscribed(subscription.subscribed);
      })
      .catch((error: unknown) => {
        setNewsletterError(error instanceof Error ? error.message : "Could not load newsletter preferences.");
      });
  }, [token]);

  const updateNewsletterSubscription = async () => {
    if (!token || newsletterSubscribed === null || newsletterBusy) return;
    setNewsletterBusy(true);
    setNewsletterError(null);
    try {
      const response = await apiFetch("/api/newsletter/subscription", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscribed: !newsletterSubscribed }),
      });
      const data = (await response.json()) as { subscribed?: boolean; error?: string };
      if (!response.ok || typeof data.subscribed !== "boolean") {
        throw new Error(data.error || "Could not update newsletter preferences.");
      }
      setNewsletterSubscribed(data.subscribed);
    } catch (error) {
      setNewsletterError(error instanceof Error ? error.message : "Could not update newsletter preferences.");
    } finally {
      setNewsletterBusy(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  if (!user) {
    return (
      <SiteLayout>
        <section className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="text-2xl font-bold">Sign in to your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to manage your Cash&Choices account.
          </p>
          <Button asChild className="mt-6 rounded-full bg-gradient-brand text-white">
            <Link to="/auth">Sign In / Sign Up</Link>
          </Button>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              <ShieldCheck className="size-3.5" /> Account
            </div>
            <h1 className="mt-4 text-3xl font-bold">Your account</h1>
            <p className="mt-2 text-muted-foreground">
              Your account is for managing access to learning tools—not for generating investment advice.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={handleLogout} className="rounded-full">
            <LogOut className="mr-2 size-4" /> Sign out
          </Button>
        </header>

        <div className="mt-8 rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
          <h2 className="text-lg font-semibold">{user.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        </div>

        <section className="mt-6 rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Weekly financial-literacy email</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A weekly educational edition with an editor-reviewed summary of India market news,
            a short learning topic, and information about Cash&amp;Choices. No product picks.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">
              {newsletterSubscribed === null
                ? "Loading your preference…"
                : newsletterSubscribed
                  ? "You are subscribed"
                  : "You are unsubscribed"}
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={updateNewsletterSubscription}
              disabled={newsletterSubscribed === null || newsletterBusy}
              className="rounded-full"
            >
              {newsletterBusy ? "Saving…" : newsletterSubscribed ? "Unsubscribe" : "Subscribe"}
            </Button>
          </div>
          {newsletterError && <p role="alert" className="mt-3 text-sm text-destructive">{newsletterError}</p>}
        </section>

        <div className="mt-6 rounded-3xl border border-brand/25 bg-gradient-brand-soft p-6">
          <BookOpen className="size-6 text-brand-deep" />
          <h2 className="mt-3 text-xl font-semibold">Keep learning at your own pace</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Explore general information about financial products, compare factual details, and
            learn about common costs and risks. Options are not ranked or selected for you.
          </p>
          <Button asChild className="mt-5 rounded-full bg-gradient-brand text-white">
            <Link to="/recommend">Explore financial options</Link>
          </Button>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          Cash&Choices provides educational information only, not investment advice or personalized
          recommendations. For advice based on your circumstances, consider a SEBI-registered
          investment adviser.
        </p>
      </section>
    </SiteLayout>
  );
}
