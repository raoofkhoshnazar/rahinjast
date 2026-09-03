"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { germanyVisas } from "@/lib/visa/countries/germany";
import { rankVisaRecommendations } from "@/lib/visa/engine";
import {
  defaultProfile,
  educationOptions,
  englishLevels,
  languageLevels,
  recognitionOptions,
  sponsorOptions,
  type UserProfile,
} from "@/types/profile";

const STORAGE_KEY = "rahinjast-profile";

const steps = [
  "Background",
  "Work & Money",
  "Language & Family",
  "Study & Alternatives",
] as const;

type StepField = keyof UserProfile;

const stepFields: StepField[][] = [
  ["age", "educationLevel", "fieldOfStudy", "recognitionStatus", "yearsOfExperience"],
  ["hasGermanJobOffer", "annualSalaryOffer", "monthlySavings", "jobFieldIsShortageOccupation"],
  ["germanLevel", "englishLevel", "maritalStatus", "dependents", "spouseInGermanyStatus", "hasChildrenUnder18"],
  [
    "wantsToStudy",
    "hasUniversityAdmission",
    "hasStudienkollegAdmission",
    "hasAusbildungContract",
    "wantsLanguageCourse",
    "wantsFreelancing",
    "hasBusinessPlan",
    "projectedFreelanceIncome",
    "hasPriorGermanyStay",
    "hasGermanWorkExperience",
    "spouseHasQualifyingProfile",
  ],
];

function toNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function labelize(level: string) {
  return level === "none" ? "None" : level;
}

function validateStep(step: number, profile: UserProfile) {
  const errors: Partial<Record<StepField, string>> = {};

  if (step === 0) {
    if (profile.age === null || profile.age < 16) errors.age = "Enter an age of at least 16.";
    if (!profile.fieldOfStudy.trim()) errors.fieldOfStudy = "Add your field of study or target profession.";
    if (profile.yearsOfExperience < 0) errors.yearsOfExperience = "Experience cannot be negative.";
  }

  if (step === 1) {
    if (profile.hasGermanJobOffer && (!profile.annualSalaryOffer || profile.annualSalaryOffer <= 0)) {
      errors.annualSalaryOffer = "Add the annual gross salary on your offer.";
    }
    if (profile.monthlySavings === null || profile.monthlySavings < 0) {
      errors.monthlySavings = "Add your accessible monthly savings or financial proof.";
    }
  }

  if (step === 2) {
    if (profile.dependents < 0) errors.dependents = "Dependents cannot be negative.";
  }

  if (step === 3) {
    if (profile.wantsFreelancing && !profile.projectedFreelanceIncome) {
      errors.projectedFreelanceIncome = "Add your projected annual freelance income.";
    }
    if (profile.wantsFreelancing && !profile.hasBusinessPlan) {
      errors.hasBusinessPlan = "A freelance pathway needs a business plan in this MVP logic.";
    }
  }

  return errors;
}

function scoreTone(score: number, eligible: boolean) {
  if (eligible && score >= 85) return "bg-emerald-500";
  if (eligible) return "bg-sky-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-zinc-400";
}

export function RahInjastApp() {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState(false);
  const resultsVisible = step >= steps.length;

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as UserProfile;
        const frame = window.requestAnimationFrame(() => {
          setProfile({ ...defaultProfile, ...parsed });
        });
        return () => window.cancelAnimationFrame(frame);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  const recommendations = useMemo(() => rankVisaRecommendations(profile, germanyVisas), [profile]);
  const topRecommendations = recommendations.filter((item) => item.category !== "permanent-residence").slice(0, 3);
  const residenceOutlook = recommendations.find((item) => item.id === "permanent-residence");
  const stepErrors = validateStep(step, profile);
  const canContinue = Object.keys(stepErrors).length === 0;

  function updateProfile<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function goNext() {
    setTouched(true);
    if (!canContinue) return;
    setStep((current) => Math.min(current + 1, steps.length));
    setTouched(false);
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 0));
    setTouched(false);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ecfeff,_#ffffff_55%)] text-slate-950">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
          <div className="grid gap-8 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-10">
            <div className="space-y-5">
              <div className="inline-flex items-center rounded-full bg-cyan-50 px-3 py-1 text-sm font-medium text-cyan-700 ring-1 ring-cyan-100">
                Germany immigration fit checker
              </div>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  RahInjast recommends the strongest German immigration path for your exact profile.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  Complete a four-step intake and compare visas using structured 2024-2025 thresholds from your Germany guide, including Blue Card salary floors, Chancenkarte funding rules, student blocked accounts, and language expectations from A1 to C1.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  "Ranked visa matches, not a generic checklist",
                  "Explains missing requirements and money gaps in euros",
                  "Keeps Germany-specific rules decoupled for future countries",
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-950 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-cyan-300">MVP coverage</p>
                  <p className="mt-2 text-2xl font-semibold">11 visa paths + PR outlook</p>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-300">Guide source</div>
                  <div className="text-lg font-semibold">2024-2025</div>
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  ["Blue Card", "€45,300 / €41,041.80"],
                  ["Chancenkarte", "6 points + €1,027/mo"],
                  ["Student", "€11,208 blocked account"],
                  ["Freelancer", "€25,000 projected income"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-white/5 px-4 py-4 ring-1 ring-white/10">
                    <div className="text-sm text-slate-300">{label}</div>
                    <div className="mt-1 text-lg font-semibold">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold">Profile intake</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Your answers save in local storage so you can come back later.
                </p>
              </div>
              <div className="text-sm font-medium text-slate-500">
                {resultsVisible ? "Review complete" : `Step ${step + 1} of ${steps.length}`}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              {steps.map((item, index) => {
                const active = index === step || (resultsVisible && index === steps.length - 1);
                const complete = index < step;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setStep(index)}
                    className={`rounded-2xl px-4 py-3 text-left text-sm transition ${
                      active
                        ? "bg-slate-950 text-white"
                        : complete
                          ? "bg-cyan-50 text-cyan-800 ring-1 ring-cyan-100"
                          : "bg-slate-50 text-slate-600 ring-1 ring-slate-200"
                    }`}
                  >
                    <div className="font-medium">{item}</div>
                    <div className="mt-1 text-xs opacity-80">{stepFields[index].length} data points</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 space-y-8">
              {step === 0 && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Age" error={touched ? stepErrors.age : undefined}>
                    <input className="field" type="number" min="16" value={profile.age ?? ""} onChange={(event) => updateProfile("age", toNumber(event.target.value))} />
                  </Field>
                  <Field label="Education level">
                    <select className="field" value={profile.educationLevel} onChange={(event) => updateProfile("educationLevel", event.target.value as UserProfile["educationLevel"])}>
                      {educationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Field of study or target profession" error={touched ? stepErrors.fieldOfStudy : undefined} className="sm:col-span-2">
                    <input className="field" value={profile.fieldOfStudy} onChange={(event) => updateProfile("fieldOfStudy", event.target.value)} placeholder="e.g. Software engineering, nursing, architecture" />
                  </Field>
                  <Field label="Recognition status in Germany">
                    <select className="field" value={profile.recognitionStatus} onChange={(event) => updateProfile("recognitionStatus", event.target.value as UserProfile["recognitionStatus"])}>
                      {recognitionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Years of relevant experience">
                    <input className="field" type="number" min="0" value={profile.yearsOfExperience} onChange={(event) => updateProfile("yearsOfExperience", Number(event.target.value))} />
                  </Field>
                </div>
              )}

              {step === 1 && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Toggle label="Do you already have a German job offer?" checked={profile.hasGermanJobOffer} onChange={(value) => updateProfile("hasGermanJobOffer", value)} />
                  <Toggle label="Is the role in a shortage occupation?" checked={profile.jobFieldIsShortageOccupation} onChange={(value) => updateProfile("jobFieldIsShortageOccupation", value)} />
                  <Field label="Offered annual gross salary (€)" error={touched ? stepErrors.annualSalaryOffer : undefined}>
                    <input className="field" type="number" min="0" value={profile.annualSalaryOffer ?? ""} onChange={(event) => updateProfile("annualSalaryOffer", toNumber(event.target.value))} placeholder="45300" disabled={!profile.hasGermanJobOffer} />
                  </Field>
                  <Field label="Accessible monthly savings / proof of funds (€)" error={touched ? stepErrors.monthlySavings : undefined}>
                    <input className="field" type="number" min="0" value={profile.monthlySavings ?? ""} onChange={(event) => updateProfile("monthlySavings", toNumber(event.target.value))} placeholder="1027" />
                  </Field>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="German level">
                    <select className="field" value={profile.germanLevel} onChange={(event) => updateProfile("germanLevel", event.target.value as UserProfile["germanLevel"])}>
                      {languageLevels.map((level) => <option key={level} value={level}>{labelize(level)}</option>)}
                    </select>
                  </Field>
                  <Field label="English level">
                    <select className="field" value={profile.englishLevel} onChange={(event) => updateProfile("englishLevel", event.target.value as UserProfile["englishLevel"])}>
                      {englishLevels.map((level) => <option key={level} value={level}>{labelize(level)}</option>)}
                    </select>
                  </Field>
                  <Field label="Marital status">
                    <select className="field" value={profile.maritalStatus} onChange={(event) => updateProfile("maritalStatus", event.target.value as UserProfile["maritalStatus"])}>
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                    </select>
                  </Field>
                  <Field label="Dependents" error={touched ? stepErrors.dependents : undefined}>
                    <input className="field" type="number" min="0" value={profile.dependents} onChange={(event) => updateProfile("dependents", Number(event.target.value))} />
                  </Field>
                  <Field label="Spouse status in Germany" error={touched ? stepErrors.spouseInGermanyStatus : undefined} className="sm:col-span-2">
                    <select className="field" value={profile.spouseInGermanyStatus} onChange={(event) => updateProfile("spouseInGermanyStatus", event.target.value as UserProfile["spouseInGermanyStatus"])}>
                      {sponsorOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </Field>
                  <Toggle label="Do you have children under 18 who may join you?" checked={profile.hasChildrenUnder18} onChange={(value) => updateProfile("hasChildrenUnder18", value)} />
                </div>
              )}

              {step === 3 && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Toggle label="Are you planning to study in Germany?" checked={profile.wantsToStudy} onChange={(value) => updateProfile("wantsToStudy", value)} />
                  <Toggle label="Do you already have a university admission letter?" checked={profile.hasUniversityAdmission} onChange={(value) => updateProfile("hasUniversityAdmission", value)} />
                  <Toggle label="Do you already have Studienkolleg admission?" checked={profile.hasStudienkollegAdmission} onChange={(value) => updateProfile("hasStudienkollegAdmission", value)} />
                  <Toggle label="Do you already have an Ausbildung contract?" checked={profile.hasAusbildungContract} onChange={(value) => updateProfile("hasAusbildungContract", value)} />
                  <Toggle label="Are you mainly considering a German language course first?" checked={profile.wantsLanguageCourse} onChange={(value) => updateProfile("wantsLanguageCourse", value)} />
                  <Toggle label="Do you want to work as a freelancer / self-employed?" checked={profile.wantsFreelancing} onChange={(value) => updateProfile("wantsFreelancing", value)} />
                  <Toggle label="Do you already have a business plan for freelancing?" checked={profile.hasBusinessPlan} onChange={(value) => updateProfile("hasBusinessPlan", value)} />
                  <Field label="Projected annual freelance income (€)" error={touched ? stepErrors.projectedFreelanceIncome : undefined}>
                    <input className="field" type="number" min="0" value={profile.projectedFreelanceIncome ?? ""} onChange={(event) => updateProfile("projectedFreelanceIncome", toNumber(event.target.value))} disabled={!profile.wantsFreelancing} placeholder="25000" />
                  </Field>
                  <Toggle label="Have you previously lived in Germany (not as a tourist)?" checked={profile.hasPriorGermanyStay} onChange={(value) => updateProfile("hasPriorGermanyStay", value)} />
                  <Toggle label="Do you already have at least 6 months of German work experience?" checked={profile.hasGermanWorkExperience} onChange={(value) => updateProfile("hasGermanWorkExperience", value)} />
                  <Toggle label="Would your spouse also bring a qualifying profile for Chancenkarte points?" checked={profile.spouseHasQualifyingProfile} onChange={(value) => updateProfile("spouseHasQualifyingProfile", value)} />
                </div>
              )}

              {resultsVisible && (
                <div className="rounded-[1.5rem] border border-cyan-100 bg-cyan-50 p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-700">
                        Recommendations ready
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                        Your profile has been scored across the full Germany ruleset.
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
                        Review the ranked pathways on the right, then jump back into any intake step to
                        improve a route by changing salary, language, savings, or family details.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(0)}
                      className="rounded-full border border-cyan-300 px-5 py-3 text-sm font-medium text-cyan-900 transition hover:border-cyan-500 hover:bg-white"
                    >
                      Edit profile again
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={goBack} className="rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950" disabled={step === 0}>
                Back
              </button>
              <div className="flex items-center gap-3">
                {step < steps.length - 1 ? (
                  <button type="button" onClick={goNext} className="rounded-full bg-slate-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800">
                    Continue
                  </button>
                ) : (
                  <button type="button" onClick={goNext} className="rounded-full bg-cyan-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-cyan-500">
                    See recommendations
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold">Best-fit pathways</h2>
                  <p className="mt-1 text-sm text-slate-600">Ranked against the guide&apos;s Germany rules and thresholds.</p>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">Live as you type</div>
              </div>

              <div className="mt-6 space-y-4">
                {topRecommendations.map((visa, index) => (
                  <article key={visa.id} className="rounded-[1.5rem] border border-slate-200 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">#{index + 1} recommendation</div>
                        <h3 className="mt-2 text-xl font-semibold text-slate-950">{visa.name}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{visa.summary}</p>
                      </div>
                      <div className="min-w-24 rounded-2xl bg-slate-950 px-4 py-3 text-center text-white">
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-300">Fit</div>
                        <div className="mt-1 text-2xl font-semibold">{visa.score}</div>
                      </div>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${scoreTone(visa.score, visa.eligible)}`} style={{ width: `${Math.min(100, visa.score)}%` }} />
                    </div>

                    <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                      <p className="font-medium text-slate-950">Why this fits</p>
                      <p className="mt-1">{visa.rationale}</p>
                    </div>

                    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Stat label="Processing time" value={visa.processingTime} />
                      <Stat label="Typical cost" value={visa.applicationCost} />
                      <Stat label="Validity" value={visa.validity} />
                      <Stat label="PR path" value={visa.residencyPath} />
                    </dl>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium text-slate-950">Key requirements</p>
                        <ul className="mt-2 space-y-2 text-sm text-slate-600">
                          {visa.keyRequirements.map((item) => <li key={item} className="rounded-xl bg-slate-50 px-3 py-2">{item}</li>)}
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-950">What you&apos;re missing</p>
                        <ul className="mt-2 space-y-2 text-sm text-slate-600">
                          {visa.missingItems.length ? visa.missingItems.map((item) => <li key={item} className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900">{item}</li>) : <li className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-900">No obvious blocker detected from the current profile.</li>}
                        </ul>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {residenceOutlook && (
              <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold">Permanent residence outlook</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{residenceOutlook.rationale}</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-300">Readiness</div>
                    <div className="mt-1 text-2xl font-semibold">{residenceOutlook.score}</div>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {residenceOutlook.keyRequirements.map((item) => (
                    <div key={item} className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-200 ring-1 ring-white/10">{item}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

type FieldProps = {
  label: string;
  children: ReactNode;
  error?: string;
  className?: string;
};

function Field({ label, children, error, className }: FieldProps) {
  return (
    <label className={className}>
      <div className="mb-2 text-sm font-medium text-slate-700">{label}</div>
      {children}
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex min-h-24 flex-col justify-between rounded-[1.4rem] border p-4 text-left transition ${
        checked ? "border-cyan-400 bg-cyan-50 text-cyan-950" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
      }`}
    >
      <div className="text-sm font-medium leading-6">{label}</div>
      <div className={`mt-4 inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${checked ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600"}`}>
        {checked ? "Yes" : "No"}
      </div>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium leading-6 text-slate-950">{value}</dd>
    </div>
  );
}
