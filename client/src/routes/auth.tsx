import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { Sparkles, Shield, ArrowRight, KeyRound, Mail, Lock, User, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In / Sign Up — Cash&Choices" },
      { name: "description", content: "Access your Cash&Choices account and financial learning tools." },
    ],
  }),
  component: AuthPage,
});

type AuthMode = "login" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const { login, signup, googleLogin, requestOTP, resetPassword, user } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleRetryable, setGoogleRetryable] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const oauthCallbackHandled = useRef(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);

  // OTP flow state
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);

  // Helper to parse base64 JWT payload from Google ID Token
  function parseJwtPayload(token: string): { email?: string; name?: string } | null {
    try {
      const base64Url = token.split(".")[1];
      if (!base64Url) return null;
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  // Handle Google OAuth 2.0 callback when redirected back from accounts.google.com
  useEffect(() => {
    async function checkOAuthCallback() {
      const hash = window.location.hash;
      const query = window.location.search;

      if (!hash && !query) return;

      const params = new URLSearchParams(hash ? hash.substring(1) : query);
      const idToken = params.get("id_token");
      const providerError = params.get("error");

      if (oauthCallbackHandled.current) return;

      if (providerError) {
        oauthCallbackHandled.current = true;
        window.history.replaceState(null, "", window.location.pathname);
        setGoogleError("Google sign-in didn't complete. Please try again.");
        setGoogleRetryable(true);
        setLoading(false);
        return;
      }

      if (idToken) {
        oauthCallbackHandled.current = true;
        setLoading(true);
        setError(null);
        setGoogleError(null);
        setGoogleRetryable(false);
        try {
          let email = "";
          let name = "";

          const payload = parseJwtPayload(idToken);
          if (payload) {
            email = payload.email || "";
            name = payload.name || "";
          }

          await googleLogin({
            credential: idToken,
            email,
            name,
            newsletterOptIn: sessionStorage.getItem("cash_choices_newsletter_opt_in") !== "false",
          });
          sessionStorage.removeItem("cash_choices_newsletter_opt_in");

          // Clean URL parameters from browser address bar
          window.history.replaceState(null, "", window.location.pathname);
          navigate({ to: "/profile" });
        } catch (err) {
          window.history.replaceState(null, "", window.location.pathname);
          const message = err instanceof Error ? err.message : "";
          if (message === "Google sign-in is not configured") {
            setGoogleError(
              "Google sign-in is not configured on the server. Check that GOOGLE_CLIENT_ID matches VITE_GOOGLE_CLIENT_ID.",
            );
          } else if (
            message === "Google sign-in credential is invalid or expired" ||
            message === "Google sign-in credential is missing"
          ) {
            setGoogleError(
              "Google couldn't verify this sign-in. Please try again. If it keeps happening, check that GOOGLE_CLIENT_ID matches VITE_GOOGLE_CLIENT_ID.",
            );
          } else {
            setGoogleError("Google sign-in failed. Please try again.");
          }
          setGoogleRetryable(true);
        } finally {
          setLoading(false);
        }
      }
    }
    checkOAuthCallback();
  }, [googleLogin, navigate]);

  // If already logged in, redirect or display quick session status
  if (user) {
    return (
      <SiteLayout>
        <section className="mx-auto max-w-md px-4 py-20 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="size-8" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">You are already signed in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Signed in as <span className="font-semibold text-foreground">{user.email}</span> ({user.name})
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild variant="default" className="rounded-full bg-gradient-brand text-white">
              <Link to="/profile">View Profile &amp; Saved Answers</Link>
            </Button>
          </div>
        </section>
      </SiteLayout>
    );
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate({ to: "/profile" });
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signup(name, email, password, newsletterOptIn);
      navigate({ to: "/profile" });
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSubmit = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setGoogleError("Google sign-in is temporarily unavailable. Please try again later.");
      setGoogleRetryable(false);
      return;
    }

    setError(null);
    setGoogleError(null);
    setGoogleRetryable(false);
    setLoading(true);
    sessionStorage.setItem("cash_choices_newsletter_opt_in", String(newsletterOptIn));
    const redirectUri = window.location.origin + "/auth";
    const nonce = Math.random().toString(36).substring(2);
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=id_token` +
      `&scope=${encodeURIComponent("openid email profile")}` +
      `&nonce=${nonce}` +
      `&prompt=select_account`;

    window.location.href = authUrl;
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await requestOTP(email);
      setSuccessMsg(res.message);
      if (res.otp) {
        setDemoOtpHint(res.otp);
      }
      setOtpStep("verify");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await resetPassword(email, otpCode, newPassword);
      setSuccessMsg("Password reset successfully! Please log in with your new password.");
      setMode("login");
      setOtpStep("request");
      setDemoOtpHint(null);
      setPassword("");
    } catch (err: any) {
      setError(err.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteLayout>
      <section className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-accent/40 px-3 py-1 text-xs font-medium">
            <Shield className="size-3.5 text-brand" /> Privacy-First Auth
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Account Access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in or create an account to access financial learning tools.
          </p>
        </div>

        {/* Unified Card Container */}
        <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
          
          {/* Mode Switcher Tabs (Login vs Sign Up) */}
          {mode !== "forgot" && (
            <div className="mb-6 grid grid-cols-2 rounded-2xl bg-muted p-1 text-sm font-medium">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={cn(
                  "rounded-xl py-2.5 transition-all",
                  mode === "login"
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={cn(
                  "rounded-xl py-2.5 transition-all",
                  mode === "signup"
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Social Google Login Button (shown in login & signup modes) */}
          {mode !== "forgot" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSubmit}
                disabled={loading}
                className="w-full rounded-2xl py-5 border-border hover:bg-accent flex items-center justify-center gap-3 font-medium text-sm"
              >
                <svg className="size-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Continue with Google
              </Button>
              <p className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">
                {mode === "login"
                  ? "Signing in adds you to the weekly financial-literacy email if you are not already subscribed. You can unsubscribe from your account."
                  : "New accounts can choose whether to subscribe to the weekly financial-literacy email below."}
              </p>

              {googleError && (
                <div
                  role="alert"
                  className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400"
                >
                  <span className="flex items-center gap-2">
                    <AlertCircle className="size-4 shrink-0" />
                    {googleError}
                  </span>
                  {googleRetryable && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGoogleSubmit}
                      disabled={loading}
                      className="shrink-0 rounded-full"
                    >
                      <RefreshCw className="mr-1 size-3" />
                      Try again
                    </Button>
                  )}
                </div>
              )}

              <div className="relative my-6 text-center text-xs uppercase tracking-wider text-muted-foreground">
                <span className="relative z-10 bg-card px-3">or continue with email</span>
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
              </div>
            </>
          )}

          {/* Feedback Banners */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* MODE 1: LOGIN */}
          {mode === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Email Address</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="rounded-full pl-9"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Password</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs text-brand hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="rounded-full pl-9"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-gradient-brand text-white shadow-glow py-5 mt-2"
              >
                {loading ? "Signing in..." : "Log In"}
                {!loading && <ArrowRight className="size-4 ml-1" />}
              </Button>


            </form>
          )}

          {/* MODE 2: SIGN UP */}
          {mode === "signup" && (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Full Name</Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ananya Sharma"
                    className="rounded-full pl-9"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Email Address</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="rounded-full pl-9"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Create Password</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="rounded-full pl-9"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <input
                  type="checkbox"
                  checked={newsletterOptIn}
                  onChange={(event) => setNewsletterOptIn(event.target.checked)}
                  className="mt-0.5 accent-brand"
                />
                <span>
                  Subscribe me to the weekly financial-literacy email. It is educational, not
                  investment advice; I can unsubscribe from my account.
                </span>
              </label>

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-gradient-brand text-white shadow-glow py-5 mt-2"
              >
                {loading ? "Creating Account..." : "Create Account"}
                {!loading && <Sparkles className="size-4 ml-1" />}
              </Button>
            </form>
          )}

          {/* MODE 3: FORGOT PASSWORD / OTP */}
          {mode === "forgot" && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <KeyRound className="size-5 text-brand" /> Password Reset via OTP
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter your email address to receive a 6-digit OTP code.
                </p>
              </div>

              {otpStep === "request" ? (
                <form onSubmit={handleRequestOTP} className="space-y-4">
                  <div>
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Your Email Address</Label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="rounded-full pl-9"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-full bg-gradient-brand text-white py-5"
                  >
                    {loading ? "Sending OTP..." : "Request OTP Code"}
                  </Button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      ← Back to Log In
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  {demoOtpHint && (
                    <div className="rounded-2xl border border-brand/30 bg-brand/5 p-3 text-center">
                      <div className="text-xs font-medium text-brand">Demo OTP Code Generated:</div>
                      <div className="text-xl font-bold tracking-widest text-foreground mt-0.5">{demoOtpHint}</div>
                      <button
                        type="button"
                        onClick={() => setOtpCode(demoOtpHint)}
                        className="text-[11px] underline text-brand mt-1"
                      >
                        Auto-fill OTP
                      </button>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Enter 6-Digit OTP</Label>
                    <Input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.trim())}
                      placeholder="123456"
                      className="rounded-full text-center text-lg font-mono tracking-widest"
                    />
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">New Password</Label>
                    <div className="relative mt-1.5">
                      <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="password"
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password (min 6 chars)"
                        className="rounded-full pl-9"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-full bg-gradient-brand text-white py-5"
                  >
                    {loading ? "Verifying & Updating..." : "Verify OTP & Reset Password"}
                  </Button>

                  <div className="flex justify-between items-center text-xs text-muted-foreground pt-2">
                    <button
                      type="button"
                      onClick={() => setOtpStep("request")}
                      className="hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="size-3" /> Resend OTP
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setOtpStep("request");
                        setError(null);
                      }}
                      className="hover:underline"
                    >
                      Back to Log In
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>
      </section>
    </SiteLayout>
  );
}
