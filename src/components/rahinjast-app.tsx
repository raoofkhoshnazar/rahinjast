"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { Button, ChoicePair, Field, Stepper } from "@/components/ui";
import { fa } from "@/lib/copy/fa";
import { germanyVisas } from "@/lib/visa/countries/germany";
import { rankVisaRecommendations } from "@/lib/visa/engine";
import {
  defaultProfile,
  englishLevels,
  languageLevels,
  type EducationLevel,
  type RecognitionStatus,
  type SponsorStatus,
  type UserProfile,
} from "@/types/profile";
import type { RecommendationResult } from "@/lib/visa/types";

const STORAGE_KEY = "rahinjast-session-fa";
const LEGACY_KEYS = ["rahinjast-session", "rahinjast-profile"];

type AppView = "home" | "form" | "results";
type StoredSession = { profile: UserProfile; step: number; view: AppView };

function toNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function languageLabel(level: string) {
  return level === "none" ? fa.options.languageNone : level;
}

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function parseHash(hash = typeof window === "undefined" ? "" : window.location.hash): { view: AppView; step: number } {
  const value = hash.replace(/^#/, "");
  if (value.startsWith("results")) return { view: "results", step: 3 };
  const formMatch = value.match(/^form\/(\d)/);
  if (formMatch) return { view: "form", step: Math.min(3, Number(formMatch[1])) };
  if (value === "form") return { view: "form", step: 0 };
  return { view: "home", step: 0 };
}

function readStoredProfile(): UserProfile {
  if (typeof window === "undefined") return defaultProfile;
  const raw = window.localStorage.getItem(STORAGE_KEY) ?? LEGACY_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean);
  if (!raw) return defaultProfile;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession> & Partial<UserProfile>;
    return parsed.profile ? { ...defaultProfile, ...parsed.profile } : { ...defaultProfile, ...parsed };
  } catch {
    return defaultProfile;
  }
}

function validateStep(step: number, profile: UserProfile) {
  const errors: Partial<Record<keyof UserProfile, string>> = {};
  if (step === 0) {
    if (profile.age === null || profile.age < 16) errors.age = fa.errors.age;
    if (!profile.fieldOfStudy.trim()) errors.fieldOfStudy = fa.errors.field;
    if (profile.yearsOfExperience < 0) errors.yearsOfExperience = fa.errors.experience;
  }
  if (step === 1) {
    if (profile.hasGermanJobOffer && (!profile.annualSalaryOffer || profile.annualSalaryOffer <= 0)) {
      errors.annualSalaryOffer = fa.errors.salary;
    }
    if (profile.monthlySavings === null || profile.monthlySavings < 0) errors.monthlySavings = fa.errors.savings;
  }
  if (step === 2 && profile.dependents < 0) errors.dependents = fa.errors.dependents;
  if (step === 3) {
    if (profile.wantsFreelancing && !profile.projectedFreelanceIncome) errors.projectedFreelanceIncome = fa.errors.freelanceIncome;
    if (profile.wantsFreelancing && !profile.hasBusinessPlan) errors.hasBusinessPlan = fa.errors.businessPlan;
  }
  return errors;
}

export function RahInjastApp() {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");
  const { view, step } = parseHash(hash);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profileReady = useRef(false);

  function navigate(nextView: AppView, nextStep = step) {
    const nextHash = nextView === "home" ? "" : nextView === "results" ? "results" : `form/${nextStep}`;
    if (!nextHash) {
      if (window.location.hash) {
        window.history.pushState(null, "", `${window.location.pathname}${window.location.search}`);
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }
      return;
    }
    window.location.hash = nextHash;
  }

  useEffect(() => {
    const stored = readStoredProfile();
    const timer = window.setTimeout(() => {
      if (!profileReady.current) {
        setProfile(stored);
      }
      profileReady.current = true;
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!profileReady.current) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, step, view }));
    LEGACY_KEYS.forEach((key) => window.localStorage.removeItem(key));
  }, [profile, step, view]);

  const recommendations = useMemo(() => rankVisaRecommendations(profile, germanyVisas), [profile]);
  const ranked = recommendations.filter((item) => item.category !== "permanent-residence");
  const top = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const residence = recommendations.find((item) => item.id === "permanent-residence");
  const stepErrors = validateStep(step, profile);
  const canContinue = Object.keys(stepErrors).length === 0;

  function updateProfile<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    profileReady.current = true;
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function startAssessment() {
    setTouched(false);
    setError(null);
    navigate("form", 0);
  }

  function goNext() {
    setTouched(true);
    if (!canContinue) return;
    if (step < fa.steps.length - 1) {
      setTouched(false);
      navigate("form", step + 1);
      return;
    }
    setError(null);
    setLoading(true);
    navigate("results");
    window.setTimeout(() => setLoading(false), 650);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    goNext();
  }

  return (
    <div className="min-h-screen bg-off-white text-ink">
      <header className="border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <button type="button" onClick={() => navigate("home")} className="text-right">
            <div className="text-lg font-bold text-navy-950">{fa.brand}</div>
            <div className="text-xs tracking-[0.18em] text-navy-600">{fa.brandLatin}</div>
          </button>
          {view !== "form" ? (
            <a
              href="#form/0"
              onClick={(event) => {
                event.preventDefault();
                startAssessment();
              }}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-navy-800 px-6 text-sm font-semibold text-white transition hover:bg-navy-950"
            >
              {fa.navStart}
            </a>
          ) : (
            <div className="text-sm text-muted">مرحله {step + 1} از {fa.steps.length}</div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:py-12">
        {view === "home" && <HomeHero onStart={startAssessment} />}
        {view === "form" && (
          <form className="mx-auto max-w-4xl" onSubmit={handleSubmit}>
            <div className="rounded-[24px] border border-line bg-surface p-6 card-shadow sm:p-8">
              <Stepper steps={fa.steps} current={step} onSelect={(index) => { setTouched(false); navigate("form", index); }} />
              <div className="mt-8 space-y-2">
                <p className="text-sm font-semibold text-amber-500">{fa.steps[step]}</p>
                <h1 className="text-3xl font-bold text-navy-950 sm:text-4xl">{fa.stepMeta[step as 0 | 1 | 2 | 3].title}</h1>
                <p className="max-w-2xl text-base text-muted">{fa.stepMeta[step as 0 | 1 | 2 | 3].body}</p>
              </div>

              <div className="mt-8">
                {step === 0 && <BackgroundStep profile={profile} updateProfile={updateProfile} errors={touched ? stepErrors : {}} />}
                {step === 1 && <WorkStep profile={profile} updateProfile={updateProfile} errors={touched ? stepErrors : {}} />}
                {step === 2 && <FamilyStep profile={profile} updateProfile={updateProfile} errors={touched ? stepErrors : {}} />}
                {step === 3 && <StudyStep profile={profile} updateProfile={updateProfile} errors={touched ? stepErrors : {}} />}
              </div>

              {error ? (
                <div className="mt-6 rounded-2xl bg-error-100 px-4 py-3 text-sm text-error-600">
                  {fa.results.error}
                </div>
              ) : null}

              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="secondary" onClick={() => (step === 0 ? navigate("home") : navigate("form", step - 1))}>
                  {fa.buttons.back}
                </Button>
                <Button type="submit">
                  {step < fa.steps.length - 1 ? fa.buttons.continue : fa.buttons.seeResults}
                </Button>
              </div>
            </div>
          </form>
        )}
        {view === "results" && (
          <ResultsView
            loading={loading}
            top={top}
            rest={rest}
            residence={residence}
            onRestart={() => {
              setProfile(defaultProfile);
              setTouched(false);
              navigate("home", 0);
            }}
            onEdit={() => navigate("form", 0)}
          />
        )}
      </main>
      <footer className="px-5 pb-10 text-center text-sm text-muted">{fa.footer}</footer>
    </div>
  );
}

function HomeHero({ onStart }: { onStart: () => void }) {
  return (
    <section className="space-y-12">
      <div className="grid items-stretch gap-0 overflow-hidden rounded-[24px] border border-line bg-surface card-shadow lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative z-10 space-y-6 p-6 sm:p-10 lg:p-12">
          <p className="text-sm font-semibold text-amber-500">{fa.brand}</p>
          <h1 className="text-4xl font-bold leading-tight text-navy-950 sm:text-5xl">{fa.heroTitle}</h1>
          <p className="max-w-xl text-lg text-muted">{fa.heroBody}</p>
          <a
            href="#form/0"
            onClick={(event) => {
              event.preventDefault();
              onStart();
            }}
            className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-navy-800 px-8 text-base font-semibold text-white transition hover:bg-navy-950"
          >
            {fa.ctaStart}
          </a>
          <div className="grid gap-4 pt-2 sm:grid-cols-3">
            {fa.trust.map((item) => (
              <div key={item.title} className="rounded-2xl bg-off-white px-4 py-4">
                <div className="text-sm font-bold text-navy-950">{item.title}</div>
                <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative isolate min-h-72 overflow-hidden bg-navy-950 lg:min-h-[28rem]">
          <Image src="/hero-berlin.svg" alt="" fill className="pointer-events-none object-cover" unoptimized />
        </div>
      </div>
    </section>
  );
}

function BackgroundStep({
  profile,
  updateProfile,
  errors,
}: {
  profile: UserProfile;
  updateProfile: <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => void;
  errors: Partial<Record<keyof UserProfile, string>>;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Field label={fa.fields.age} error={errors.age}>
        <input className={`field money-field ${errors.age ? "field-error" : ""}`} type="number" min={16} value={profile.age ?? ""} onChange={(event) => updateProfile("age", toNumber(event.target.value))} />
      </Field>
      <Field label={fa.fields.education}>
        <select className="field" value={profile.educationLevel} onChange={(event) => updateProfile("educationLevel", event.target.value as EducationLevel)}>
          {Object.entries(fa.options.education).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label={fa.fields.field} error={errors.fieldOfStudy}>
          <input className={`field ${errors.fieldOfStudy ? "field-error" : ""}`} value={profile.fieldOfStudy} onChange={(event) => updateProfile("fieldOfStudy", event.target.value)} placeholder={fa.fields.fieldPlaceholder} />
        </Field>
      </div>
      <Field label={fa.fields.recognition}>
        <select className="field" value={profile.recognitionStatus} onChange={(event) => updateProfile("recognitionStatus", event.target.value as RecognitionStatus)}>
          {Object.entries(fa.options.recognition).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
      <Field label={fa.fields.experience} error={errors.yearsOfExperience}>
        <input className={`field money-field ${errors.yearsOfExperience ? "field-error" : ""}`} type="number" min={0} value={profile.yearsOfExperience} onChange={(event) => updateProfile("yearsOfExperience", Number(event.target.value))} />
      </Field>
    </div>
  );
}

function WorkStep({
  profile,
  updateProfile,
  errors,
}: {
  profile: UserProfile;
  updateProfile: <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => void;
  errors: Partial<Record<keyof UserProfile, string>>;
}) {
  return (
    <div className="space-y-6">
      <ChoicePair question={fa.stepMeta[1].question} value={profile.hasGermanJobOffer} onChange={(value) => updateProfile("hasGermanJobOffer", value)} yesLabel={fa.stepMeta[1].yes} noLabel={fa.stepMeta[1].no} />
      <ChoicePair question={fa.stepMeta[1].shortage} value={profile.jobFieldIsShortageOccupation} onChange={(value) => updateProfile("jobFieldIsShortageOccupation", value)} yesLabel={fa.stepMeta[1].yes} noLabel={fa.stepMeta[1].no} />
      <Field label={fa.stepMeta[1].salaryLabel} hint={fa.stepMeta[1].salaryHint} error={errors.annualSalaryOffer}>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-navy-600">€</span>
          <input className={`field money-field pr-4 pl-10 ${errors.annualSalaryOffer ? "field-error" : ""}`} type="number" min={0} placeholder="45300" value={profile.annualSalaryOffer ?? ""} disabled={!profile.hasGermanJobOffer} onChange={(event) => updateProfile("annualSalaryOffer", toNumber(event.target.value))} />
        </div>
      </Field>
      <p className="rounded-2xl bg-amber-100 px-4 py-3 text-sm text-navy-950">{fa.stepMeta[1].salaryNote}</p>
      <Field label={fa.stepMeta[1].savingsLabel} hint={fa.stepMeta[1].savingsHint} error={errors.monthlySavings}>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-navy-600">€</span>
          <input className={`field money-field pr-4 pl-10 ${errors.monthlySavings ? "field-error" : ""}`} type="number" min={0} placeholder="1027" value={profile.monthlySavings ?? ""} onChange={(event) => updateProfile("monthlySavings", toNumber(event.target.value))} />
        </div>
      </Field>
    </div>
  );
}

function FamilyStep({
  profile,
  updateProfile,
  errors,
}: {
  profile: UserProfile;
  updateProfile: <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => void;
  errors: Partial<Record<keyof UserProfile, string>>;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Field label={fa.fields.german}>
        <select className="field" value={profile.germanLevel} onChange={(event) => updateProfile("germanLevel", event.target.value as UserProfile["germanLevel"])}>
          {languageLevels.map((level) => <option key={level} value={level}>{languageLabel(level)}</option>)}
        </select>
      </Field>
      <Field label={fa.fields.english}>
        <select className="field" value={profile.englishLevel} onChange={(event) => updateProfile("englishLevel", event.target.value as UserProfile["englishLevel"])}>
          {englishLevels.map((level) => <option key={level} value={level}>{languageLabel(level)}</option>)}
        </select>
      </Field>
      <Field label={fa.fields.marital}>
        <select className="field" value={profile.maritalStatus} onChange={(event) => updateProfile("maritalStatus", event.target.value as UserProfile["maritalStatus"])}>
          <option value="single">{fa.options.marital.single}</option>
          <option value="married">{fa.options.marital.married}</option>
        </select>
      </Field>
      <Field label={fa.fields.dependents} error={errors.dependents}>
        <input className="field money-field" type="number" min={0} value={profile.dependents} onChange={(event) => updateProfile("dependents", Number(event.target.value))} />
      </Field>
      <div className="sm:col-span-2">
        <Field label={fa.fields.spouse}>
          <select className="field" value={profile.spouseInGermanyStatus} onChange={(event) => updateProfile("spouseInGermanyStatus", event.target.value as SponsorStatus)}>
            {Object.entries(fa.options.sponsor).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
      </div>
      <div className="sm:col-span-2">
        <ChoicePair question={fa.fields.children} value={profile.hasChildrenUnder18} onChange={(value) => updateProfile("hasChildrenUnder18", value)} yesLabel={fa.stepMeta[1].yes} noLabel={fa.stepMeta[1].no} />
      </div>
    </div>
  );
}

function StudyStep({
  profile,
  updateProfile,
  errors,
}: {
  profile: UserProfile;
  updateProfile: <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => void;
  errors: Partial<Record<keyof UserProfile, string>>;
}) {
  return (
    <div className="space-y-6">
      <ChoicePair question={fa.fields.study} value={profile.wantsToStudy} onChange={(value) => updateProfile("wantsToStudy", value)} yesLabel={fa.stepMeta[1].yes} noLabel={fa.stepMeta[1].no} />
      <ChoicePair question={fa.fields.uniAdmission} value={profile.hasUniversityAdmission} onChange={(value) => updateProfile("hasUniversityAdmission", value)} yesLabel={fa.stepMeta[1].yes} noLabel={fa.stepMeta[1].no} />
      <ChoicePair question={fa.fields.kollegAdmission} value={profile.hasStudienkollegAdmission} onChange={(value) => updateProfile("hasStudienkollegAdmission", value)} yesLabel={fa.stepMeta[1].yes} noLabel={fa.stepMeta[1].no} />
      <ChoicePair question={fa.fields.ausbildung} value={profile.hasAusbildungContract} onChange={(value) => updateProfile("hasAusbildungContract", value)} yesLabel={fa.stepMeta[1].yes} noLabel={fa.stepMeta[1].no} />
      <ChoicePair question={fa.fields.languageCourse} value={profile.wantsLanguageCourse} onChange={(value) => updateProfile("wantsLanguageCourse", value)} yesLabel={fa.stepMeta[1].yes} noLabel={fa.stepMeta[1].no} />
      <ChoicePair question={fa.fields.freelance} value={profile.wantsFreelancing} onChange={(value) => updateProfile("wantsFreelancing", value)} yesLabel={fa.stepMeta[1].yes} noLabel={fa.stepMeta[1].no} />
      <ChoicePair question={fa.fields.businessPlan} value={profile.hasBusinessPlan} onChange={(value) => updateProfile("hasBusinessPlan", value)} yesLabel={fa.stepMeta[1].yes} noLabel={fa.stepMeta[1].no} />
      <Field label={fa.fields.freelanceIncome} error={errors.projectedFreelanceIncome}>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-navy-600">€</span>
          <input className={`field money-field pr-4 pl-10 ${errors.projectedFreelanceIncome ? "field-error" : ""}`} type="number" min={0} placeholder="25000" disabled={!profile.wantsFreelancing} value={profile.projectedFreelanceIncome ?? ""} onChange={(event) => updateProfile("projectedFreelanceIncome", toNumber(event.target.value))} />
        </div>
      </Field>
      {errors.hasBusinessPlan ? <p className="text-sm font-medium text-error-600">{errors.hasBusinessPlan}</p> : null}
      <ChoicePair question={fa.fields.priorStay} value={profile.hasPriorGermanyStay} onChange={(value) => updateProfile("hasPriorGermanyStay", value)} yesLabel={fa.stepMeta[1].yes} noLabel={fa.stepMeta[1].no} />
      <ChoicePair question={fa.fields.germanWork} value={profile.hasGermanWorkExperience} onChange={(value) => updateProfile("hasGermanWorkExperience", value)} yesLabel={fa.stepMeta[1].yes} noLabel={fa.stepMeta[1].no} />
      <ChoicePair question={fa.fields.spousePoints} value={profile.spouseHasQualifyingProfile} onChange={(value) => updateProfile("spouseHasQualifyingProfile", value)} yesLabel={fa.stepMeta[1].yes} noLabel={fa.stepMeta[1].no} />
    </div>
  );
}

function ResultsView({
  loading,
  top,
  rest,
  residence,
  onRestart,
  onEdit,
}: {
  loading: boolean;
  top: RecommendationResult[];
  rest: RecommendationResult[];
  residence?: RecommendationResult;
  onRestart: () => void;
  onEdit: () => void;
}) {
  if (loading) {
    return (
      <div className="rounded-[24px] border border-line bg-surface p-8 card-shadow">
        <div className="h-4 w-40 animate-pulse rounded-full bg-amber-100" />
        <div className="mt-4 h-10 w-2/3 animate-pulse rounded-2xl bg-off-white" />
        <p className="mt-6 text-muted">{fa.results.loading}</p>
      </div>
    );
  }

  if (!top.length) {
    return (
      <div className="rounded-[24px] border border-line bg-surface p-8 text-center card-shadow">
        <p className="text-lg text-muted">{fa.results.empty}</p>
        <Button type="button" className="mt-6" onClick={onRestart}>{fa.ctaStart}</Button>
      </div>
    );
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-500">{fa.results.kicker}</p>
          <h1 className="mt-2 text-3xl font-bold text-navy-950 sm:text-4xl">{fa.results.title}</h1>
          <p className="mt-3 max-w-2xl text-muted">{fa.results.body}</p>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onEdit}>{fa.buttons.editProfile}</Button>
          <Button type="button" variant="ghost" onClick={onRestart}>{fa.buttons.restart}</Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {top.map((visa, index) => (
          <VisaCard key={visa.id} visa={visa} rank={index + 1} featured={index === 0} />
        ))}
      </div>

      {rest.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-bold text-navy-950">{fa.results.other}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {rest.map((visa, index) => (
              <article key={visa.id} className="rounded-[24px] border border-line bg-surface p-5 card-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted">{fa.results.rank} {index + 4}</p>
                    <h3 className="mt-1 text-lg font-bold text-navy-950">{visa.name}</h3>
                  </div>
                  <span className="rounded-full bg-off-white px-3 py-1 text-sm font-bold text-navy-800 latin-nums">{visa.score}%</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{visa.rationale}</p>
              </article>
            ))}
          </div>
        </div>
      )}

      {residence && (
        <article className="rounded-[24px] bg-navy-950 p-6 text-white sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">{fa.results.prTitle}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/80">{residence.rationale}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
              <div className="text-xs text-white/70">{fa.results.fitScore}</div>
              <div className="mt-1 text-2xl font-bold latin-nums">{residence.score}%</div>
            </div>
          </div>
        </article>
      )}
    </section>
  );
}

function VisaCard({ visa, rank, featured }: { visa: RecommendationResult; rank: number; featured: boolean }) {
  return (
    <article className={`rounded-[24px] border bg-surface p-6 card-shadow ${featured ? "border-amber-500" : "border-line"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-off-white px-3 py-1 text-xs font-semibold text-navy-600">{fa.results.rank} {rank}</span>
            {featured ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-500">{fa.results.bestFit}</span> : null}
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${visa.eligible ? "bg-success-100 text-success-600" : "bg-warning-100 text-warning-600"}`}>
              {visa.eligible ? fa.results.eligible : fa.results.gaps}
            </span>
          </div>
          <h3 className="mt-3 text-xl font-bold text-navy-950">{visa.name}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{visa.summary}</p>
        </div>
        <div className="rounded-2xl bg-navy-950 px-3 py-2 text-center text-white">
          <div className="text-[10px] uppercase tracking-[0.16em] text-white/70">{fa.results.fitScore}</div>
          <div className="text-2xl font-bold latin-nums">{visa.score}%</div>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <ResultBlock title={fa.results.why} body={visa.rationale} tone="success" />
        <ResultBlock title={fa.results.missing} body={visa.missingItems[0] ?? fa.results.noneMissing} tone={visa.missingItems.length ? "warning" : "success"} />
      </div>

      <dl className="mt-5 grid gap-3">
        <MiniStat label={fa.results.processing} value={visa.processingTime} />
        <MiniStat label={fa.results.cost} value={visa.applicationCost} />
        <MiniStat label={fa.results.pr} value={visa.residencyPath} />
      </dl>
    </article>
  );
}

function ResultBlock({ title, body, tone }: { title: string; body: string; tone: "success" | "warning" }) {
  return (
    <div className={`rounded-2xl px-4 py-3 ${tone === "success" ? "bg-success-100 text-success-600" : "bg-warning-100 text-warning-600"}`}>
      <div className="text-sm font-bold">{title}</div>
      <p className="mt-1 text-sm leading-6">{body}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-off-white px-4 py-3">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-medium leading-6 text-navy-950">{value}</dd>
    </div>
  );
}
