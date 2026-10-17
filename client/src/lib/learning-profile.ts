import { PRODUCTS, type Category } from "@/data/products";
import { apiFetch } from "@/lib/api";

export type LearningProfileData = {
  about: string;
  interests: Category[];
  savedOptionIds: string[];
};

export const EMPTY_LEARNING_PROFILE: LearningProfileData = {
  about: "",
  interests: [],
  savedOptionIds: [],
};

export class LearningProfileRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "LearningProfileRequestError";
  }
}

export async function getLearningProfile(token: string): Promise<LearningProfileData> {
  const response = await apiFetch("/api/user/learning-profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await response.json()) as LearningProfileData & { error?: string };
  if (!response.ok) {
    throw new LearningProfileRequestError(
      data.error || "Could not load your learning profile.",
      response.status,
    );
  }

  return {
    about: typeof data.about === "string" ? data.about : "",
    interests: Array.isArray(data.interests)
      ? data.interests.filter((item): item is Category =>
          [
            "credit_card",
            "mutual_fund",
            "insurance",
            "loan",
            "platform",
            "savings",
            "fd",
            "gold",
            "retirement",
          ].includes(item),
        )
      : [],
    savedOptionIds: Array.isArray(data.savedOptionIds)
      ? data.savedOptionIds.filter(
          (item): item is string =>
            typeof item === "string" && PRODUCTS.some((product) => product.id === item),
        )
      : [],
  };
}

export async function saveLearningProfile(
  token: string,
  profile: LearningProfileData,
): Promise<void> {
  const response = await apiFetch("/api/user/learning-profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profile),
  });
  const data = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new LearningProfileRequestError(
      data.error || "Could not save your learning profile.",
      response.status,
    );
  }
}
