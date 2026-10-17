import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Bookmark,
  BookOpen,
  Check,
  ChevronDown,
  CircleUserRound,
  LogOut,
  Mail,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { CATEGORIES, PRODUCTS, type Category } from "@/data/products";
import {
  EMPTY_LEARNING_PROFILE,
  getLearningProfile,
  LearningProfileRequestError,
  saveLearningProfile as persistLearningProfile,
  type LearningProfileData,
} from "@/lib/learning-profile";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Learning Profile — Cash&Choices" },
      {
        name: "description",
        content: "Manage your learning interests, saved topics, and account settings.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, token, logout, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [learningProfile, setLearningProfile] = useState(EMPTY_LEARNING_PROFILE);
  const [aboutDraft, setAboutDraft] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState<boolean | null>(null);
  const [newsletterBusy, setNewsletterBusy] = useState(false);
  const [newsletterError, setNewsletterError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    getLearningProfile(token)
      .then((profile) => {
        if (!active) return;
        setLearningProfile(profile);
        setAboutDraft(profile.about);
      })
      .catch((error: unknown) => {
        if (active) {
          if (error instanceof LearningProfileRequestError && error.status === 401) {
            logout();
            return;
          }
          setProfileError(
            "We couldn't load your saved profile. Select your topics and save to refresh it.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [logout, token]);

  useEffect(() => {
    if (!token) return;
    apiFetch("/api/newsletter/subscription", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          if (response.status === 401) {
            logout();
            return;
          }
          throw new Error(data.error || "Could not load newsletter preferences.");
        }
        const subscription = (await response.json()) as { subscribed: boolean };
        setNewsletterSubscribed(subscription.subscribed);
      })
      .catch((error: unknown) => {
        setNewsletterError(
          error instanceof Error ? error.message : "Could not load newsletter preferences.",
        );
      });
  }, [logout, token]);

  const savedOptions = useMemo(
    () => PRODUCTS.filter((product) => learningProfile.savedOptionIds.includes(product.id)),
    [learningProfile.savedOptionIds],
  );

  const toggleInterest = (interest: Category) => {
    setLearningProfile((current) => ({
      ...current,
      interests: current.interests.includes(interest)
        ? current.interests.filter((item) => item !== interest)
        : [...current.interests, interest],
    }));
    setProfileMessage(null);
  };

  const saveLearningProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || profileBusy) return;
    const nextProfile = { ...learningProfile, about: aboutDraft.trim() };
    setProfileBusy(true);
    setProfileError(null);
    setProfileMessage(null);
    try {
      await persistLearningProfile(token, nextProfile);
      setLearningProfile(nextProfile);
      setProfileMessage("Your learning profile is saved to your account.");
    } catch (error) {
      if (error instanceof LearningProfileRequestError && error.status === 401) {
        logout();
        return;
      }
      setProfileError("We couldn't save your profile. Please try again.");
    } finally {
      setProfileBusy(false);
    }
  };

  const removeSavedOption = async (optionId: string) => {
    if (!token || profileBusy) return;
    const nextProfile = {
      ...learningProfile,
      savedOptionIds: learningProfile.savedOptionIds.filter((id) => id !== optionId),
    };
    setProfileBusy(true);
    setProfileError(null);
    try {
      await persistLearningProfile(token, nextProfile);
      setLearningProfile(nextProfile);
    } catch (error) {
      if (error instanceof LearningProfileRequestError && error.status === 401) {
        logout();
        return;
      }
      setProfileError("We couldn't update your saved items. Please try again.");
    } finally {
      setProfileBusy(false);
    }
  };

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
      if (response.status === 401) {
        logout();
        return;
      }
      if (!response.ok || typeof data.subscribed !== "boolean") {
        throw new Error(data.error || "Could not update newsletter preferences.");
      }
      setNewsletterSubscribed(data.subscribed);
    } catch (error) {
      setNewsletterError(
        error instanceof Error ? error.message : "Could not update newsletter preferences.",
      );
    } finally {
      setNewsletterBusy(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmation !== "DELETE" || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      navigate({ to: "/" });
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Could not delete your account.");
      setDeleteBusy(false);
    }
  };

  if (!user) {
    return (
      <SiteLayout>
        <section className="mx-auto max-w-md px-4 py-24 text-center">
          <CircleUserRound className="mx-auto size-12 text-brand" />
          <h1 className="mt-4 text-2xl font-bold">Your learning space awaits</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to keep your learning interests and saved topics together.
          </p>
          <Button asChild className="mt-6 rounded-full bg-gradient-brand text-white">
            <Link to="/auth">Sign In / Sign Up</Link>
          </Button>
        </section>
      </SiteLayout>
    );
  }

  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="relative overflow-hidden rounded-[2rem] border border-brand/15 bg-gradient-brand-soft p-6 sm:p-9">
          <div className="pointer-events-none absolute -right-12 -top-16 size-64 rounded-full bg-brand/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <div
              aria-label={`${user.name}'s profile avatar`}
              className="grid size-20 shrink-0 place-items-center rounded-[1.7rem] border-4 border-background bg-gradient-brand text-2xl font-bold text-white shadow-glow"
            >
              {initials || <UserRound className="size-8" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-background/70 px-3 py-1 text-xs font-semibold text-brand-deep">
                <ShieldCheck className="size-3.5" /> Your learning profile
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{user.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                A personal space for the money topics you want to understand.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              className="rounded-full bg-background/80"
            >
              <LogOut className="mr-2 size-4" /> Sign out
            </Button>
          </div>
        </header>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft sm:p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-brand/10 text-brand-deep">
                <Sparkles className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold">A little about your learning journey</h2>
                <p className="text-xs text-muted-foreground">Saved privately with your account.</p>
              </div>
            </div>
            <form onSubmit={saveLearningProfile}>
              <label htmlFor="profile-about" className="mt-5 block text-sm font-medium">
                About me
              </label>
              <textarea
                id="profile-about"
                value={aboutDraft}
                onChange={(event) => setAboutDraft(event.target.value.slice(0, 240))}
                maxLength={240}
                rows={3}
                placeholder="What are you hoping to learn about money?"
                className="mt-2 w-full resize-y rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
              <div className="mt-1 text-right text-xs text-muted-foreground">
                {aboutDraft.length}/240
              </div>

              <fieldset className="mt-5">
                <legend className="text-sm font-medium">Topics I’m curious about</legend>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose any topics that interest you.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CATEGORIES.map((item) => {
                    const selected = learningProfile.interests.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleInterest(item.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                          selected
                            ? "border-brand bg-brand/10 text-brand-deep"
                            : "border-border bg-background text-muted-foreground hover:border-brand/40 hover:text-foreground",
                        )}
                      >
                        {selected && <Check className="size-3" />}
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  disabled={profileBusy}
                  className="rounded-full bg-gradient-brand text-white"
                >
                  {profileBusy ? "Saving…" : "Save learning profile"}
                </Button>
                {profileMessage && (
                  <p role="status" className="text-sm text-muted-foreground">
                    {profileMessage}
                  </p>
                )}
              </div>
              {profileError && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {profileError}
                </p>
              )}
            </form>
          </section>

          <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft sm:p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-accent text-accent-foreground">
                <Bookmark className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold">Your saved learning</h2>
                <p className="text-xs text-muted-foreground">
                  {savedOptions.length} saved {savedOptions.length === 1 ? "topic" : "topics"}
                </p>
              </div>
            </div>
            {savedOptions.length ? (
              <ul className="mt-4 space-y-2">
                {savedOptions.map((option) => (
                  <li
                    key={option.id}
                    className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background p-3"
                  >
                    <BookOpen className="mt-0.5 size-4 shrink-0 text-brand-deep" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{option.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{option.summary}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeSavedOption(option.id)}
                      disabled={profileBusy}
                      aria-label={`Remove ${option.name} from saved learning`}
                      className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-border p-5 text-center">
                <Bookmark className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">Your learning shelf is ready</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Save an option from Explore and it’ll be waiting for you here.
                </p>
              </div>
            )}
            <Button asChild variant="outline" className="mt-4 w-full rounded-full">
              <Link to="/explore">Explore learning topics</Link>
            </Button>
          </section>
        </div>

        <section className="mt-5 rounded-3xl border border-border/70 bg-card p-5 shadow-soft sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-muted">
                <Mail className="size-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-semibold">Weekly financial-literacy email</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  India market news, a short lesson, and an educational footer.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium">
                {newsletterSubscribed === null
                  ? "Loading preference…"
                  : newsletterSubscribed
                    ? "Subscribed"
                    : "Unsubscribed"}
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
          </div>
          {newsletterError && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {newsletterError}
            </p>
          )}
        </section>

        <section className="mt-5 overflow-hidden rounded-3xl border border-border/70 bg-card">
          <button
            type="button"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-3 p-5 text-left sm:p-6"
          >
            <span className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-muted">
                <Settings2 className="size-5" />
              </span>
              <span>
                <span className="block font-semibold">Account settings</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  Privacy and account controls
                </span>
              </span>
            </span>
            <ChevronDown
              className={cn(
                "size-5 text-muted-foreground transition-transform",
                settingsOpen && "rotate-180",
              )}
            />
          </button>
          {settingsOpen && (
            <div className="border-t border-border/70 p-5 sm:p-6">
              <div>
                <h3 className="text-sm font-semibold">Your account details</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {user.name} · {user.provider === "google" ? "Google account" : "Email account"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your email is used for sign-in and account services and is not shown on this
                  profile.
                </p>
              </div>
              <div className="mt-5 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-destructive">Delete account</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      This permanently deletes your account, saved learning items, profile
                      interests, newsletter preference, and account-linked records. You’ll be signed
                      out. This action can’t be undone.
                    </p>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteConfirmation("");
                        setDeleteOpen(true);
                      }}
                      className="mt-3 rounded-full"
                    >
                      <Trash2 className="mr-2 size-4" /> Delete my account
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {deleteOpen && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
            role="presentation"
          >
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-account-title"
              aria-describedby="delete-account-description"
              className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl"
            >
              <div className="grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
                <Trash2 className="size-5" />
              </div>
              <h2 id="delete-account-title" className="mt-4 text-xl font-bold">
                Delete your account?
              </h2>
              <p
                id="delete-account-description"
                className="mt-2 text-sm leading-relaxed text-muted-foreground"
              >
                Your account and associated server data—including saved learning items, interests,
                and newsletter preference—will be permanently removed. You cannot undo this.
              </p>
              <label htmlFor="delete-confirmation" className="mt-5 block text-sm font-medium">
                Type <span className="font-bold">DELETE</span> to confirm
              </label>
              <input
                id="delete-confirmation"
                autoComplete="off"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/15"
              />
              {deleteError && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {deleteError}
                </p>
              )}
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={deleteBusy}
                  onClick={() => setDeleteOpen(false)}
                  className="rounded-full"
                >
                  Keep account
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleteConfirmation !== "DELETE" || deleteBusy}
                  onClick={() => void handleDeleteAccount()}
                  className="rounded-full"
                >
                  {deleteBusy ? "Deleting…" : "Permanently delete"}
                </Button>
              </div>
            </section>
          </div>
        )}

        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          Cash&amp;Choices provides educational information only, not investment advice or
          personalized recommendations.
        </p>
      </section>
    </SiteLayout>
  );
}
