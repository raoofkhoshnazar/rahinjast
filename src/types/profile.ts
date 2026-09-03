export const languageLevels = ["none", "A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const englishLevels = ["none", "B1", "B2", "C1", "C2"] as const;

export type GermanLevel = (typeof languageLevels)[number];
export type EnglishLevel = (typeof englishLevels)[number];

export type EducationLevel =
  | "secondary"
  | "high-school"
  | "vocational"
  | "bachelor"
  | "master"
  | "phd";

export type RecognitionStatus = "none" | "partial" | "full";
export type MaritalStatus = "single" | "married";
export type SponsorStatus = "none" | "german-citizen" | "blue-card" | "permanent-resident";

export type UserProfile = {
  age: number | null;
  maritalStatus: MaritalStatus;
  dependents: number;
  educationLevel: EducationLevel;
  fieldOfStudy: string;
  recognitionStatus: RecognitionStatus;
  yearsOfExperience: number;
  hasGermanJobOffer: boolean;
  annualSalaryOffer: number | null;
  monthlySavings: number | null;
  germanLevel: GermanLevel;
  englishLevel: EnglishLevel;
  wantsToStudy: boolean;
  hasUniversityAdmission: boolean;
  hasStudienkollegAdmission: boolean;
  hasAusbildungContract: boolean;
  wantsLanguageCourse: boolean;
  wantsFreelancing: boolean;
  hasBusinessPlan: boolean;
  projectedFreelanceIncome: number | null;
  spouseInGermanyStatus: SponsorStatus;
  hasChildrenUnder18: boolean;
  hasPriorGermanyStay: boolean;
  hasGermanWorkExperience: boolean;
  jobFieldIsShortageOccupation: boolean;
  spouseHasQualifyingProfile: boolean;
};

export const defaultProfile: UserProfile = {
  age: null,
  maritalStatus: "single",
  dependents: 0,
  educationLevel: "bachelor",
  fieldOfStudy: "",
  recognitionStatus: "none",
  yearsOfExperience: 0,
  hasGermanJobOffer: false,
  annualSalaryOffer: null,
  monthlySavings: null,
  germanLevel: "none",
  englishLevel: "B2",
  wantsToStudy: false,
  hasUniversityAdmission: false,
  hasStudienkollegAdmission: false,
  hasAusbildungContract: false,
  wantsLanguageCourse: false,
  wantsFreelancing: false,
  hasBusinessPlan: false,
  projectedFreelanceIncome: null,
  spouseInGermanyStatus: "none",
  hasChildrenUnder18: false,
  hasPriorGermanyStay: false,
  hasGermanWorkExperience: false,
  jobFieldIsShortageOccupation: false,
  spouseHasQualifyingProfile: false,
};

export const educationOptions: { value: EducationLevel; label: string }[] = [
  { value: "secondary", label: "Secondary school" },
  { value: "high-school", label: "High school diploma" },
  { value: "vocational", label: "Vocational qualification" },
  { value: "bachelor", label: "Bachelor's degree" },
  { value: "master", label: "Master's degree" },
  { value: "phd", label: "PhD / doctorate" },
];

export const recognitionOptions: { value: RecognitionStatus; label: string }[] = [
  { value: "none", label: "Not recognized yet" },
  { value: "partial", label: "Partially recognized / in progress" },
  { value: "full", label: "Fully recognized" },
];

export const sponsorOptions: { value: SponsorStatus; label: string }[] = [
  { value: "none", label: "No spouse/partner sponsor in Germany" },
  { value: "german-citizen", label: "Spouse is a German citizen" },
  { value: "blue-card", label: "Spouse holds an EU Blue Card" },
  { value: "permanent-resident", label: "Spouse holds permanent residence" },
];
