import type { UserProfile } from "@/types/profile";
import type { EvaluationContext, RecommendationResult, VisaDefinition } from "./types";

export const germanyContext: EvaluationContext = {
  blueCardGeneralSalary: 45300,
  blueCardShortageSalary: 41041.8,
  chancenkarteMonthlyFunds: 1027,
  studentBlockedAnnual: 11208,
  languageCourseMonthlyFunds: 1000,
  freelancerMonthlyFunds: 1200,
};

export function formatCurrency(amount: number, frequency: "year" | "month" = "year") {
  return new Intl.NumberFormat("en-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount) + (frequency === "year" ? "/year" : "/month");
}

export function getMonthlySavings(profile: UserProfile) {
  return profile.monthlySavings ?? 0;
}

export function meetsGermanLevel(current: UserProfile["germanLevel"], minimum: UserProfile["germanLevel"]) {
  const order = ["none", "A1", "A2", "B1", "B2", "C1", "C2"] as const;
  return order.indexOf(current) >= order.indexOf(minimum);
}

export function meetsEnglishLevel(current: UserProfile["englishLevel"], minimum: UserProfile["englishLevel"]) {
  const order = ["none", "B1", "B2", "C1", "C2"] as const;
  return order.indexOf(current) >= order.indexOf(minimum);
}

export function hasAcademicDegree(profile: UserProfile) {
  return ["bachelor", "master", "phd"].includes(profile.educationLevel);
}

export function hasVocationalQualification(profile: UserProfile) {
  return profile.educationLevel === "vocational";
}

export function hasPostSecondaryQualification(profile: UserProfile) {
  return hasAcademicDegree(profile) || hasVocationalQualification(profile);
}

export function rankVisaRecommendations(
  profile: UserProfile,
  visas: VisaDefinition[],
  context: EvaluationContext = germanyContext,
): RecommendationResult[] {
  return visas
    .map((visa) => {
      const result = visa.evaluate(profile, context);
      return { ...visa, ...result };
    })
    .sort((a, b) => {
      if (a.eligible !== b.eligible) {
        return a.eligible ? -1 : 1;
      }
      return b.score - a.score;
    });
}
