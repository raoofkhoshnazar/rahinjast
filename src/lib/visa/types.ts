import type { UserProfile } from "@/types/profile";

export type RequirementCheck = {
  label: string;
  met: boolean;
  detail: string;
};

export type EvaluationContext = {
  blueCardGeneralSalary: number;
  blueCardShortageSalary: number;
  chancenkarteMonthlyFunds: number;
  studentBlockedAnnual: number;
  languageCourseMonthlyFunds: number;
  freelancerMonthlyFunds: number;
};

export type VisaCategory =
  | "work"
  | "job-search"
  | "training"
  | "study"
  | "language"
  | "business"
  | "family"
  | "permanent-residence";

export type VisaDefinition = {
  id: string;
  countryCode: string;
  name: string;
  shortLabel: string;
  category: VisaCategory;
  summary: string;
  processingTime: string;
  applicationCost: string;
  residencyPath: string;
  validity: string;
  keyRequirements: string[];
  caveats?: string[];
  sources?: string[];
  evaluate: (profile: UserProfile, context: EvaluationContext) => VisaEvaluation;
};

export type VisaEvaluation = {
  eligible: boolean;
  score: number;
  rationale: string;
  missingItems: string[];
  requirementChecks: RequirementCheck[];
  fitHighlights: string[];
};

export type RecommendationResult = VisaDefinition & VisaEvaluation;
