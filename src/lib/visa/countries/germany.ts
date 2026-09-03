import type { UserProfile } from "@/types/profile";
import {
  formatCurrency,
  getMonthlySavings,
  hasAcademicDegree,
  hasPostSecondaryQualification,
  hasVocationalQualification,
  meetsEnglishLevel,
  meetsGermanLevel,
} from "../engine";
import type { EvaluationContext, RequirementCheck, VisaDefinition } from "../types";

function summarize(checks: RequirementCheck[], missingItems: string[], fallback: string) {
  if (!missingItems.length) {
    return fallback;
  }

  return `Main gaps: ${missingItems.slice(0, 2).join("; ")}${missingItems.length > 2 ? "; more checks below." : "."}`;
}

function byRequirements(checks: RequirementCheck[], baseScore = 40) {
  const metCount = checks.filter((check) => check.met).length;
  return Math.round(baseScore + (metCount / checks.length) * 60);
}

function shortageThreshold(profile: UserProfile, context: EvaluationContext) {
  return profile.jobFieldIsShortageOccupation
    ? context.blueCardShortageSalary
    : context.blueCardGeneralSalary;
}

function chancenkartePoints(profile: UserProfile) {
  let points = 0;

  if (hasPostSecondaryQualification(profile) && ["partial", "full"].includes(profile.recognitionStatus)) points += 4;
  if (profile.germanLevel === "B2") points += 1;
  if (profile.germanLevel === "A2") points += 0.5;
  if (meetsEnglishLevel(profile.englishLevel, "C1")) points += 1;
  if (profile.age !== null && profile.age < 35) points += 1;
  else if (profile.age !== null && profile.age <= 40) points += 0.5;
  if (profile.hasGermanWorkExperience) points += 1;
  if (profile.hasPriorGermanyStay) points += 0.5;
  if (profile.spouseHasQualifyingProfile) points += 1;
  if (profile.jobFieldIsShortageOccupation) points += 1;

  return points;
}

export const germanyVisas: VisaDefinition[] = [
  {
    id: "eu-blue-card",
    countryCode: "DE",
    name: "EU Blue Card",
    shortLabel: "Blue Card",
    category: "work",
    summary: "Best for academic professionals with a German job offer and a qualifying salary.",
    processingTime: "4-12 weeks",
    applicationCost: "€75 visa fee + €100-€147 residence permit issuance",
    residencyPath: "Permanent residence after 21 months with B1 German or 33 months without B1.",
    validity: "Typically up to 4 years",
    keyRequirements: [
      "Bachelor's degree or higher",
      "Recognized degree via anabin/KMK",
      "German job offer in a degree-related role",
      `Salary threshold of ${formatCurrency(45300)} or ${formatCurrency(41041.8)} for shortage occupations`,
    ],
    caveats: ["Spouse gets immediate unrestricted work rights", "German is not required for the visa itself"],
    evaluate: (profile, context) => {
      const threshold = shortageThreshold(profile, context);
      const salary = profile.annualSalaryOffer ?? 0;
      const missingSalary = Math.max(0, threshold - salary);
      const checks: RequirementCheck[] = [
        {
          label: "Academic degree",
          met: hasAcademicDegree(profile),
          detail: "Blue Card requires a bachelor's degree or higher.",
        },
        {
          label: "Recognition",
          met: profile.recognitionStatus === "full",
          detail: "Your degree should be fully recognized via anabin/KMK.",
        },
        {
          label: "German job offer",
          met: profile.hasGermanJobOffer,
          detail: "A signed German employment contract is mandatory.",
        },
        {
          label: "Salary threshold",
          met: salary >= threshold,
          detail:
            missingSalary > 0
              ? `You are ${formatCurrency(missingSalary)} below the ${profile.jobFieldIsShortageOccupation ? "shortage occupation" : "general"} threshold.`
              : `Salary meets the ${formatCurrency(threshold)} threshold.`,
        },
      ];
      const missingItems = checks.filter((check) => !check.met).map((check) => check.detail);
      const fitHighlights = [];
      if (profile.jobFieldIsShortageOccupation) fitHighlights.push("Your field appears to qualify for the lower shortage-occupation Blue Card threshold.");
      if (meetsGermanLevel(profile.germanLevel, "B1")) fitHighlights.push("You are positioned for the accelerated 21-month permanent residence route.");
      return {
        eligible: missingItems.length === 0,
        score: byRequirements(checks, 55),
        rationale: summarize(checks, missingItems, "You meet the core Blue Card conditions and this is likely your fastest route to permanent residence."),
        missingItems,
        requirementChecks: checks,
        fitHighlights,
      };
    },
  },
  {
    id: "skilled-worker-academic",
    countryCode: "DE",
    name: "Skilled Worker Visa (Academic)",
    shortLabel: "Skilled Worker Academic",
    category: "work",
    summary: "For degree holders with a German job offer whose salary is below Blue Card or who prefer a broader work route.",
    processingTime: "6-16 weeks",
    applicationCost: "€75 visa fee + €100-€147 residence permit issuance",
    residencyPath: "Permanent residence after 4 years of work with B1 German.",
    validity: "Usually up to 4 years",
    keyRequirements: [
      "Bachelor's degree or higher",
      "Recognized degree",
      "German job offer related to the degree",
      "At least the legal minimum wage in Germany",
    ],
    evaluate: (profile) => {
      const checks: RequirementCheck[] = [
        { label: "Academic degree", met: hasAcademicDegree(profile), detail: "This path is for university graduates." },
        { label: "Recognition", met: profile.recognitionStatus === "full", detail: "Your degree should be fully recognized." },
        { label: "German job offer", met: profile.hasGermanJobOffer, detail: "A German job offer is required." },
        {
          label: "Language readiness",
          met: meetsGermanLevel(profile.germanLevel, "B1") || meetsEnglishLevel(profile.englishLevel, "B2"),
          detail: "B1 German is recommended; some technical roles can proceed in English.",
        },
      ];
      const missingItems = checks.filter((check) => !check.met).map((check) => check.detail);
      return {
        eligible: checks[0].met && checks[1].met && checks[2].met,
        score: byRequirements(checks, 48),
        rationale: summarize(checks, missingItems, "You fit the broader academic skilled-worker route and could later upgrade to a Blue Card if salary rises."),
        missingItems,
        requirementChecks: checks,
        fitHighlights: ["No special salary floor beyond legal wage rules.", "Broader option when Blue Card pay thresholds are not met."],
      };
    },
  },
  {
    id: "skilled-worker-vocational",
    countryCode: "DE",
    name: "Skilled Worker Visa (Vocational)",
    shortLabel: "Skilled Worker Vocational",
    category: "work",
    summary: "For recognized vocational professionals with a German job offer and relevant work experience.",
    processingTime: "6-16 weeks",
    applicationCost: "€75 visa fee + €100-€147 residence permit issuance",
    residencyPath: "Permanent residence after 4 years of work with B1 German.",
    validity: "Usually up to 4 years",
    keyRequirements: [
      "Recognized vocational qualification",
      "German job offer in the same profession",
      "At least 2 years of relevant experience",
      "B1 German minimum, B2 recommended",
    ],
    evaluate: (profile) => {
      const checks: RequirementCheck[] = [
        { label: "Vocational qualification", met: hasVocationalQualification(profile), detail: "A vocational pathway or comparable qualification is needed." },
        { label: "Recognition", met: profile.recognitionStatus === "full", detail: "Vocational recognition is the critical approval step." },
        { label: "German job offer", met: profile.hasGermanJobOffer, detail: "A German job offer is required." },
        { label: "Experience", met: profile.yearsOfExperience >= 2, detail: "At least 2 years of documented relevant experience is expected." },
        { label: "German level", met: meetsGermanLevel(profile.germanLevel, "B1"), detail: "You need at least B1 German, and some fields need B2." },
      ];
      const missingItems = checks.filter((check) => !check.met).map((check) => check.detail);
      return {
        eligible: missingItems.length === 0,
        score: byRequirements(checks, 45),
        rationale: summarize(checks, missingItems, "You match the vocational skilled-worker route if your qualification is recognized for the target profession."),
        missingItems,
        requirementChecks: checks,
        fitHighlights: ["Relevant for trades, care roles, and other technical professions.", "Recognition partnership can ease the move before full recognition is complete."],
      };
    },
  },
  {
    id: "chancenkarte",
    countryCode: "DE",
    name: "Opportunity Card (Chancenkarte)",
    shortLabel: "Chancenkarte",
    category: "job-search",
    summary: "Points-based route for candidates who want to move first and job-search from inside Germany.",
    processingTime: "4-10 weeks",
    applicationCost: "€75",
    residencyPath: "Convert to Blue Card or Skilled Worker after landing a job, then follow that route to PR.",
    validity: "1 year, extendable once",
    keyRequirements: [
      "At least 6 points in the points system",
      `Funds of ${formatCurrency(1027, "month")} or ${formatCurrency(12324)}`,
      "Recognized or partially recognized academic/vocational qualification",
      "Health insurance and clean record",
    ],
    caveats: ["Allows up to 20 hours/week of work", "Usually not a strong route for bringing family immediately"],
    evaluate: (profile, context) => {
      const points = chancenkartePoints(profile);
      const monthlyFunds = getMonthlySavings(profile);
      const checks: RequirementCheck[] = [
        {
          label: "Qualification base",
          met: hasPostSecondaryQualification(profile) && ["partial", "full"].includes(profile.recognitionStatus),
          detail: "You need a recognized or in-progress academic/vocational qualification for the core 4 points.",
        },
        {
          label: "Points threshold",
          met: points >= 6,
          detail: points >= 6 ? `You currently score ${points} points.` : `You currently score ${points} points and need at least 6.`,
        },
        {
          label: "Monthly funds",
          met: monthlyFunds >= context.chancenkarteMonthlyFunds,
          detail:
            monthlyFunds >= context.chancenkarteMonthlyFunds
              ? `Your reported funds meet the ${formatCurrency(context.chancenkarteMonthlyFunds, "month")} benchmark.`
              : `You need about ${formatCurrency(context.chancenkarteMonthlyFunds - monthlyFunds, "month")} more per month in accessible funds.`,
        },
      ];
      const missingItems = checks.filter((check) => !check.met).map((check) => check.detail);
      const fitHighlights = [
        `${points} / 6 points based on your age, language, recognition, Germany ties, and shortage occupation status.`,
        "Lets you work up to 20 hours per week while job searching in Germany.",
      ];
      return {
        eligible: missingItems.length === 0,
        score: Math.min(99, Math.round(35 + points * 8 + (checks[2].met ? 12 : 0))),
        rationale: summarize(checks, missingItems, "You clear the Opportunity Card baseline and have a credible route to enter Germany first, then convert into a work permit."),
        missingItems,
        requirementChecks: checks,
        fitHighlights,
      };
    },
  },
  {
    id: "job-seeker",
    countryCode: "DE",
    name: "Job Seeker Visa",
    shortLabel: "Job Seeker",
    category: "job-search",
    summary: "Legacy job-search visa for fully recognized degree holders with strong experience and language ability.",
    processingTime: "4-10 weeks",
    applicationCost: "€75",
    residencyPath: "Convert to Blue Card or Skilled Worker after securing employment.",
    validity: "6 months, not extendable",
    keyRequirements: [
      "Bachelor's degree or higher",
      "Full recognition",
      "At least 5 years of relevant work experience",
      `Funds of ${formatCurrency(1027, "month")}`,
      "At least B1 German or B1 English",
    ],
    caveats: ["No work is allowed on this visa", "Chancenkarte is often more flexible"],
    evaluate: (profile, context) => {
      const monthlyFunds = getMonthlySavings(profile);
      const checks: RequirementCheck[] = [
        { label: "Academic degree", met: hasAcademicDegree(profile), detail: "A university degree is required." },
        { label: "Full recognition", met: profile.recognitionStatus === "full", detail: "This route requires complete recognition, not partial recognition." },
        { label: "Experience", met: profile.yearsOfExperience >= 5, detail: "At least 5 years of relevant work experience is required." },
        {
          label: "Funds",
          met: monthlyFunds >= context.chancenkarteMonthlyFunds,
          detail:
            monthlyFunds >= context.chancenkarteMonthlyFunds
              ? `Your funds meet the ${formatCurrency(context.chancenkarteMonthlyFunds, "month")} threshold.`
              : `You need about ${formatCurrency(context.chancenkarteMonthlyFunds - monthlyFunds, "month")} more per month in accessible funds.`,
        },
        {
          label: "Language",
          met: meetsGermanLevel(profile.germanLevel, "B1") || meetsEnglishLevel(profile.englishLevel, "B1"),
          detail: "You need at least B1 proficiency in German or English.",
        },
      ];
      const missingItems = checks.filter((check) => !check.met).map((check) => check.detail);
      return {
        eligible: missingItems.length === 0,
        score: byRequirements(checks, 38),
        rationale: summarize(checks, missingItems, "You satisfy the stricter legacy job-seeker route, although Chancenkarte may still offer more flexibility."),
        missingItems,
        requirementChecks: checks,
        fitHighlights: ["No work permitted during the visa.", "Useful when your degree is fully recognized but points-based routes are weaker."],
      };
    },
  },
  {
    id: "ausbildung",
    countryCode: "DE",
    name: "Ausbildung Visa",
    shortLabel: "Ausbildung",
    category: "training",
    summary: "For candidates who already secured a German apprenticeship contract.",
    processingTime: "4-12 weeks",
    applicationCost: "€75",
    residencyPath: "Move into a skilled-worker permit after completing training, then permanent residence after 4-5 years total with B1.",
    validity: "Duration of the training program (usually 3-3.5 years)",
    keyRequirements: [
      "Signed Ausbildung contract",
      "At least a high school diploma",
      "B1 German minimum, B2 recommended",
      "Usually strongest under age 35",
    ],
    evaluate: (profile) => {
      const checks: RequirementCheck[] = [
        { label: "Training contract", met: profile.hasAusbildungContract, detail: "A signed Ausbildung contract is mandatory." },
        { label: "Education", met: ["high-school", "vocational", "bachelor", "master", "phd"].includes(profile.educationLevel), detail: "At least a secondary-school completion credential is expected." },
        { label: "German level", met: meetsGermanLevel(profile.germanLevel, "B1"), detail: "You need B1 German at minimum, and some care fields require B2." },
        { label: "Age fit", met: profile.age !== null && profile.age < 35, detail: "This path is most commonly approved for applicants under 35, though some employers accept older candidates." },
      ];
      const missingItems = checks.filter((check) => !check.met).map((check) => check.detail);
      return {
        eligible: checks[0].met && checks[1].met && checks[2].met,
        score: byRequirements(checks, 42),
        rationale: summarize(checks, missingItems, "You have the building blocks for a stable apprenticeship-led immigration route if the contract is in place."),
        missingItems,
        requirementChecks: checks,
        fitHighlights: ["Training salary and insurance usually begin from day one.", "Common monthly apprentice pay ranges from about €649 to €1,300 depending on the field."],
      };
    },
  },
  {
    id: "student",
    countryCode: "DE",
    name: "Student Visa",
    shortLabel: "Student",
    category: "study",
    summary: "For admitted students pursuing a degree in Germany.",
    processingTime: "4-12 weeks",
    applicationCost: "€75",
    residencyPath: "18-month job-search permit after graduation, then switch to Skilled Worker/Blue Card; PR after 2 years of post-graduation work with B1.",
    validity: "Length of study program",
    keyRequirements: [
      "University admission letter",
      `Blocked account of ${formatCurrency(11208)} (${formatCurrency(934, "month")})`,
      "B2-C1 German for German-taught programs or IELTS 6.5+/TOEFL 90+ for English-taught programs",
    ],
    evaluate: (profile, context) => {
      const annualFunds = (profile.monthlySavings ?? 0) * 12;
      const checks: RequirementCheck[] = [
        { label: "Study intent", met: profile.wantsToStudy, detail: "This route only fits if you intend to study in Germany." },
        { label: "Admission", met: profile.hasUniversityAdmission, detail: "You need a university admission letter before applying." },
        {
          label: "Blocked account funds",
          met: annualFunds >= context.studentBlockedAnnual,
          detail:
            annualFunds >= context.studentBlockedAnnual
              ? `Your reported funds cover the ${formatCurrency(context.studentBlockedAnnual)} blocked-account benchmark.`
              : `You are ${formatCurrency(context.studentBlockedAnnual - annualFunds)} short of the current student blocked-account benchmark.`,
        },
        {
          label: "Language readiness",
          met: meetsGermanLevel(profile.germanLevel, "B2") || meetsEnglishLevel(profile.englishLevel, "B2"),
          detail: "You typically need B2+ German for German-taught programs or strong English for English-taught programs.",
        },
      ];
      const missingItems = checks.filter((check) => !check.met).map((check) => check.detail);
      return {
        eligible: missingItems.length === 0,
        score: byRequirements(checks, 44),
        rationale: summarize(checks, missingItems, "You line up with the student route and would keep a strong path into post-study work and later permanent residence."),
        missingItems,
        requirementChecks: checks,
        fitHighlights: ["Public universities are largely tuition-free in Germany.", "Students can work 120 full days or 240 half days per year."],
      };
    },
  },
  {
    id: "studienkolleg",
    countryCode: "DE",
    name: "Studienkolleg Visa",
    shortLabel: "Studienkolleg",
    category: "study",
    summary: "Bridge route for applicants whose school diploma is not directly equivalent to the German Abitur.",
    processingTime: "4-10 weeks",
    applicationCost: "€75",
    residencyPath: "Complete Studienkolleg, pass FSP, then convert to Student Visa and continue to work-based residency later.",
    validity: "Usually 1 year",
    keyRequirements: [
      "Studienkolleg admission",
      "B2 German minimum",
      `Blocked account of ${formatCurrency(11208)}`,
      "Usually best for applicants under 30",
    ],
    evaluate: (profile, context) => {
      const annualFunds = (profile.monthlySavings ?? 0) * 12;
      const checks: RequirementCheck[] = [
        { label: "Admission", met: profile.hasStudienkollegAdmission, detail: "You need admission to a Studienkolleg program." },
        { label: "German level", met: meetsGermanLevel(profile.germanLevel, "B2"), detail: "Most Studienkolleg routes expect at least B2 German." },
        {
          label: "Blocked account funds",
          met: annualFunds >= context.studentBlockedAnnual,
          detail:
            annualFunds >= context.studentBlockedAnnual
              ? `Your reported funds cover the ${formatCurrency(context.studentBlockedAnnual)} requirement.`
              : `You are ${formatCurrency(context.studentBlockedAnnual - annualFunds)} short of the current blocked-account requirement.`,
        },
        { label: "Age fit", met: profile.age !== null && profile.age < 30, detail: "This route is most common for applicants under 30." },
      ];
      const missingItems = checks.filter((check) => !check.met).map((check) => check.detail);
      return {
        eligible: checks[0].met && checks[1].met && checks[2].met,
        score: byRequirements(checks, 36),
        rationale: summarize(checks, missingItems, "You can use Studienkolleg as the academic bridge if direct university entry is not yet available."),
        missingItems,
        requirementChecks: checks,
        fitHighlights: ["Leads into Student Visa after passing the Feststellungsprufung (FSP)."],
      };
    },
  },
  {
    id: "language-course",
    countryCode: "DE",
    name: "Language Course Visa",
    shortLabel: "Language Course",
    category: "language",
    summary: "Short-term route for intensive German study before pursuing another long-term path.",
    processingTime: "2-6 weeks",
    applicationCost: "€75",
    residencyPath: "No direct PR route; you normally return home and reapply for a study or work visa later.",
    validity: "Up to 12 months",
    keyRequirements: [
      "Enrollment in a recognized language school",
      `About ${formatCurrency(1000, "month")} in funds`,
      "Used as a stepping stone, not a direct settlement path",
    ],
    caveats: ["No work allowed", "Cannot normally switch to work or study from inside Germany"],
    evaluate: (profile, context) => {
      const monthlyFunds = getMonthlySavings(profile);
      const checks: RequirementCheck[] = [
        { label: "Language study intent", met: profile.wantsLanguageCourse, detail: "This only fits if you specifically want an intensive language course in Germany." },
        {
          label: "Monthly funds",
          met: monthlyFunds >= context.languageCourseMonthlyFunds,
          detail:
            monthlyFunds >= context.languageCourseMonthlyFunds
              ? `Your funds meet the ${formatCurrency(context.languageCourseMonthlyFunds, "month")} expectation.`
              : `You need about ${formatCurrency(context.languageCourseMonthlyFunds - monthlyFunds, "month")} more per month in funds.`,
        },
      ];
      const missingItems = checks.filter((check) => !check.met).map((check) => check.detail);
      return {
        eligible: missingItems.length === 0,
        score: byRequirements(checks, 22),
        rationale: summarize(checks, missingItems, "This works as a language-upgrade bridge if your immediate goal is to strengthen German before applying through another route."),
        missingItems,
        requirementChecks: checks,
        fitHighlights: ["Useful when language is your main blocker.", "Expect to apply for your long-term route from outside Germany afterward."],
      };
    },
  },
  {
    id: "freelancer",
    countryCode: "DE",
    name: "Freelancer / Self-Employment Visa",
    shortLabel: "Freelancer",
    category: "business",
    summary: "For independent professionals with a viable plan and enough financial runway.",
    processingTime: "8-24 weeks",
    applicationCost: "€75 visa fee + €100-€200 residence permit issuance",
    residencyPath: "Permanent residence after 5 years of successful self-employment with B1 German.",
    validity: "Usually 3 years initially",
    keyRequirements: [
      "Business plan",
      `At least ${formatCurrency(1200, "month")} in monthly funds for setup`,
      `Projected income of at least ${formatCurrency(25000)}`,
      "Health insurance and any required professional licensing",
    ],
    evaluate: (profile, context) => {
      const monthlyFunds = getMonthlySavings(profile);
      const projectedIncome = profile.projectedFreelanceIncome ?? 0;
      const checks: RequirementCheck[] = [
        { label: "Freelance intent", met: profile.wantsFreelancing, detail: "This route only fits if you intend to work independently in Germany." },
        { label: "Business plan", met: profile.hasBusinessPlan, detail: "A credible business plan is mandatory." },
        {
          label: "Monthly funds",
          met: monthlyFunds >= context.freelancerMonthlyFunds,
          detail:
            monthlyFunds >= context.freelancerMonthlyFunds
              ? `Your funds meet the ${formatCurrency(context.freelancerMonthlyFunds, "month")} setup benchmark.`
              : `You need about ${formatCurrency(context.freelancerMonthlyFunds - monthlyFunds, "month")} more per month to match the usual setup benchmark.`,
        },
        {
          label: "Projected annual income",
          met: projectedIncome >= 25000,
          detail:
            projectedIncome >= 25000
              ? `Your projected income clears the ${formatCurrency(25000)} baseline.`
              : `Your business case should project at least ${formatCurrency(25000)} annually; you are currently ${formatCurrency(25000 - projectedIncome)} short.`,
        },
      ];
      const missingItems = checks.filter((check) => !check.met).map((check) => check.detail);
      return {
        eligible: missingItems.length === 0,
        score: byRequirements(checks, 33),
        rationale: summarize(checks, missingItems, "You have the shape of a freelancer application if your business plan can show local economic value and sustainable income."),
        missingItems,
        requirementChecks: checks,
        fitHighlights: ["Berlin is generally viewed as the most freelancer-friendly city.", "Strong local demand evidence materially improves this case."],
      };
    },
  },
  {
    id: "family-reunification",
    countryCode: "DE",
    name: "Family Reunification Visa",
    shortLabel: "Family Reunion",
    category: "family",
    summary: "For spouses and children joining a close family member who already has lawful residence in Germany.",
    processingTime: "6-20 weeks",
    applicationCost: "€75",
    residencyPath: "Varies by sponsor: 3 years with a German-citizen spouse, 21/33 months with a Blue Card spouse, 5 years with a permanent-resident sponsor.",
    validity: "Aligned to sponsor's residence status",
    keyRequirements: [
      "Qualifying spouse/family sponsor in Germany",
      "A1 German for most spouses except Blue Card family members",
      "Marriage certificate and standard family documents",
    ],
    evaluate: (profile) => {
      const sponsor = profile.spouseInGermanyStatus;
      const languageNeeded = sponsor !== "blue-card";
      const checks: RequirementCheck[] = [
        { label: "Sponsor in Germany", met: sponsor !== "none", detail: "You need a spouse or close family sponsor who already has lawful status in Germany." },
        {
          label: "Language for spouse route",
          met: !languageNeeded || meetsGermanLevel(profile.germanLevel, "A1"),
          detail: languageNeeded ? "Most spouse routes require at least A1 German." : "Blue Card spouses do not need German for the visa.",
        },
        {
          label: "Dependent child logic",
          met: !profile.hasChildrenUnder18 || profile.dependents > 0,
          detail: "Children under 18 can typically accompany a qualifying family application.",
        },
      ];
      const missingItems = checks.filter((check) => !check.met).map((check) => check.detail);
      const fitHighlights = [];
      if (sponsor === "blue-card") fitHighlights.push("A Blue Card spouse route is especially strong because work authorization is immediate and German is not required.");
      if (profile.hasChildrenUnder18) fitHighlights.push("Minor children can usually be included in the family case.");
      return {
        eligible: missingItems.length === 0,
        score: byRequirements(checks, sponsor === "blue-card" ? 58 : 40),
        rationale: summarize(checks, missingItems, "Your family profile suggests reunion may be the most direct path if the sponsor's status in Germany is solid."),
        missingItems,
        requirementChecks: checks,
        fitHighlights,
      };
    },
  },
  {
    id: "permanent-residence",
    countryCode: "DE",
    name: "Permanent Residence Outlook",
    shortLabel: "Permanent Residence",
    category: "permanent-residence",
    summary: "Not an entry visa, but an estimate of which route gives you the fastest path to settle permanently in Germany.",
    processingTime: "4-16 weeks once eligible",
    applicationCost: "€113",
    residencyPath: "Requires lawful residence history plus B1 German, financial independence, pension contributions, and a clean record.",
    validity: "Permanent",
    keyRequirements: [
      "B1 German for most routes",
      "Financial independence",
      "Pension contributions during legal stay",
      "Best timelines: Blue Card 21/33 months, post-study work 2 years, skilled worker 4 years",
    ],
    evaluate: (profile, context) => {
      const blueThreshold = shortageThreshold(profile, context);
      const canBlueCard = hasAcademicDegree(profile) && profile.recognitionStatus === "full" && profile.hasGermanJobOffer && (profile.annualSalaryOffer ?? 0) >= blueThreshold;
      const postStudyPotential = profile.hasUniversityAdmission || profile.wantsToStudy;
      const checks: RequirementCheck[] = [
        { label: "B1 German", met: meetsGermanLevel(profile.germanLevel, "B1"), detail: "Most permanent residence tracks require B1 German." },
        { label: "Financial independence", met: (profile.monthlySavings ?? 0) >= 934 || profile.hasGermanJobOffer || profile.wantsFreelancing, detail: "You will need to stay financially independent and avoid relying on social assistance." },
        { label: "Fastest qualifying base route", met: canBlueCard || postStudyPotential || profile.hasAusbildungContract || profile.hasGermanJobOffer, detail: "You need a qualifying underlying residence route before permanent residence becomes possible." },
      ];
      const missingItems = checks.filter((check) => !check.met).map((check) => check.detail);
      let headline = "Your permanent-residence timeline will depend on the route you enter with.";
      if (canBlueCard && meetsGermanLevel(profile.germanLevel, "B1")) headline = "If you enter on a Blue Card, you are aligned with the fastest 21-month permanent-residence timeline in the guide.";
      else if (canBlueCard) headline = "If you enter on a Blue Card, you could target permanent residence after 33 months, or faster at 21 months once you reach B1 German.";
      else if (postStudyPotential) headline = "A study-led route can still become permanent residence after graduation plus 2 years of work, provided you reach B1 German.";
      return {
        eligible: missingItems.length === 0,
        score: byRequirements(checks, 30),
        rationale: headline,
        missingItems,
        requirementChecks: checks,
        fitHighlights: ["Blue Card is the fastest path in the guide.", "Student-to-work is one of the strongest long-term routes when you do not already hold a job offer."],
      };
    },
  },
];
