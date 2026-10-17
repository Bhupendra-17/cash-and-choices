import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  provider: "email" | "google" | string;
  createdAt: string;
};

type AuthContextType = {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    name: string,
    email: string,
    password: string,
    newsletterOptIn?: boolean,
  ) => Promise<void>;
  googleLogin: (options?: {
    credential?: string;
    email?: string;
    name?: string;
    newsletterOptIn?: boolean;
  }) => Promise<void>;
  requestOTP: (email: string) => Promise<{ message: string; otp?: string }>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "cash_choices_token";
const TOKEN_EXPIRY_KEY = "cash_choices_token_expires_at";
const TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) return null;

      const storedExpiry = Number(localStorage.getItem(TOKEN_EXPIRY_KEY));
      if (storedExpiry && storedExpiry <= Date.now()) {
        clearStoredAuth();
        return null;
      }

      // Give existing sessions without an expiry a single 30-day migration window.
      if (!storedExpiry) {
        localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + TOKEN_LIFETIME_MS));
      }
      return storedToken;
    }
    return null;
  });

  // Query user profile from /api/auth/me using TanStack React Query
  const { data: user = null, isLoading } = useQuery<UserProfile | null>({
    queryKey: ["auth", "me", token],
    queryFn: async () => {
      if (!token) return null;
      const res = await apiFetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        clearStoredAuth();
        setToken(null);
        return null;
      }
      if (!res.ok) throw new Error("Could not validate your sign-in session.");
      return (await res.json()) as UserProfile;
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // Cache profile for 5 mins
  });

  useEffect(() => {
    if (!token) return;

    let timeoutId: number;
    const expireOrReschedule = () => {
      const expiresAt = Number(localStorage.getItem(TOKEN_EXPIRY_KEY));
      const remaining = expiresAt - Date.now();
      if (!expiresAt || remaining <= 0) {
        clearStoredAuth();
        setToken(null);
        queryClient.removeQueries({ queryKey: ["auth"] });
        return;
      }
      timeoutId = window.setTimeout(expireOrReschedule, Math.min(remaining, 2_147_000_000));
    };

    expireOrReschedule();
    return () => window.clearTimeout(timeoutId);
  }, [queryClient, token]);

  const saveAuthResponse = (t: string, u: UserProfile) => {
    setToken(t);
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + TOKEN_LIFETIME_MS));
    queryClient.setQueryData(["auth", "me", t], u);
  };

  // Login Mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      return data as { token: string; user: UserProfile };
    },
    onSuccess: (data) => {
      saveAuthResponse(data.token, data.user);
    },
  });

  // Signup Mutation
  const signupMutation = useMutation({
    mutationFn: async ({
      name,
      email,
      password,
      newsletterOptIn,
    }: {
      name: string;
      email: string;
      password: string;
      newsletterOptIn: boolean;
    }) => {
      const res = await apiFetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, newsletterOptIn }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sign up failed");
      return data as { token: string; user: UserProfile };
    },
    onSuccess: (data) => {
      saveAuthResponse(data.token, data.user);
    },
  });

  // Google Login Mutation
  const googleLoginMutation = useMutation({
    mutationFn: async (options?: {
      credential?: string;
      email?: string;
      name?: string;
      newsletterOptIn?: boolean;
    }) => {
      const res = await apiFetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: options?.credential || "",
          email: options?.email || "",
          name: options?.name || "",
          newsletterOptIn: options?.newsletterOptIn ?? true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Google login failed");
      return data as { token: string; user: UserProfile };
    },
    onSuccess: (data) => {
      saveAuthResponse(data.token, data.user);
    },
  });

  const requestOTP = async (email: string) => {
    const res = await apiFetch("/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to send OTP");
    return data as { message: string; otp?: string };
  };

  const resetPassword = async (email: string, otp: string, newPassword: string) => {
    const res = await apiFetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to reset password");
  };

  const logout = useCallback(() => {
    setToken(null);
    clearStoredAuth();
    queryClient.removeQueries({ queryKey: ["auth"] });
  }, [queryClient]);

  const deleteAccount = async () => {
    if (!token) throw new Error("You must be signed in to delete your account.");
    const res = await apiFetch("/api/auth/me", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ confirmation: "DELETE" }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error || "Could not delete your account.");
    logout();
  };

  const login = (email: string, password: string) =>
    loginMutation.mutateAsync({ email, password }).then(() => {});
  const signup = (name: string, email: string, password: string, newsletterOptIn = true) =>
    signupMutation.mutateAsync({ name, email, password, newsletterOptIn }).then(() => {});
  const googleLogin = (options?: { credential?: string; email?: string; name?: string }) =>
    googleLoginMutation.mutateAsync(options).then(() => {});

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        signup,
        googleLogin,
        requestOTP,
        resetPassword,
        deleteAccount,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
