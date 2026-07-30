import React, { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "./api";

export type QuestionAnswer = {
  questionId: string;
  questionText: string;
  answerValue: string;
  answerLabel: string;
};

export type PickItem = {
  productId: string;
  fit: number;
  why: string;
  watchOut: string;
};

export type SavedRecommendation = {
  id: string;
  date: string;
  headline: string;
  summary: string;
  answers: QuestionAnswer[];
  picks: PickItem[];
  nextSteps: string[];
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  provider: "email" | "google" | string;
  createdAt: string;
  savedAnswers?: QuestionAnswer[];
  savedRecommendations: SavedRecommendation[];
};

type AuthContextType = {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  googleLogin: (email?: string, name?: string) => Promise<void>;
  requestOTP: (email: string) => Promise<{ message: string; otp?: string }>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
  saveRecommendation: (payload: {
    headline: string;
    summary: string;
    answers: QuestionAnswer[];
    picks: PickItem[];
    nextSteps: string[];
  }) => Promise<SavedRecommendation>;
  updateSavedAnswers: (answers: QuestionAnswer[]) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "cash_choices_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load user profile on initial render if token exists
  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      try {
        const res = await apiFetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const u = (await res.json()) as UserProfile;
          setUser(u);
        } else {
          // Token invalid or expired
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error("Failed to load auth me profile:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const saveAuthResponse = (t: string, u: UserProfile) => {
    setToken(t);
    setUser(u);
    localStorage.setItem(TOKEN_KEY, t);
  };

  const login = async (email: string, password: string) => {
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }
    saveAuthResponse(data.token, data.user);
  };

  const signup = async (name: string, email: string, password: string) => {
    const res = await apiFetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Sign up failed");
    }
    saveAuthResponse(data.token, data.user);
  };

  const googleLogin = async (email?: string, name?: string) => {
    const res = await apiFetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email || "google.user@cashchoices.in", name: name || "Google User" }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Google login failed");
    }
    saveAuthResponse(data.token, data.user);
  };

  const requestOTP = async (email: string) => {
    const res = await apiFetch("/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to send OTP");
    }
    return data as { message: string; otp?: string };
  };

  const resetPassword = async (email: string, otp: string, newPassword: string) => {
    const res = await apiFetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to reset password");
    }
  };

  const saveRecommendation = async (payload: {
    headline: string;
    summary: string;
    answers: QuestionAnswer[];
    picks: PickItem[];
    nextSteps: string[];
  }) => {
    if (!token) throw new Error("Must be logged in to save recommendations");
    const res = await apiFetch("/api/user/recommendations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to save recommendation");
    }
    const savedRec = data as SavedRecommendation;
    // Update local user state
    setUser((prev) =>
      prev
        ? {
            ...prev,
            savedAnswers: payload.answers,
            savedRecommendations: [savedRec, ...(prev.savedRecommendations || [])],
          }
        : null
    );
    return savedRec;
  };

  const updateSavedAnswers = async (answers: QuestionAnswer[]) => {
    if (!token) throw new Error("Must be logged in to update answers");
    const res = await apiFetch("/api/user/answers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(answers),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to update answers");
    }
    const updatedProfile = data as UserProfile;
    setUser(updatedProfile);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
  };

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
        saveRecommendation,
        updateSavedAnswers,
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
