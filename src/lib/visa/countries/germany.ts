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

function summarize(missingItems: string[], fallback: string) {
  if (!missingItems.length) return fallback;
  return `شکاف‌های اصلی: ${missingItems.slice(0, 2).join("؛ ")}${missingItems.length > 2 ? "؛ جزئیات بیشتر در ادامه." : "."}`;
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
  if (meetsGermanLevel(profile.germanLevel, "B2")) points += 1;
  else if (meetsGermanLevel(profile.germanLevel, "A2")) points += 0.5;
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
    summary: "برای متخصصان دانشگاهی با پیشنهاد شغلی آلمانی و حقوق بالای آستانه.",
    processingTime: "۴ تا ۱۲ هفته",
    applicationCost: "€75 هزینه ویزا + €100 تا €147 صدور کارت اقامت",
    residencyPath: "اقامت دائم پس از ۲۱ ماه با آلمانی B1 یا ۳۳ ماه بدون B1.",
    validity: "معمولاً تا ۴ سال",
    keyRequirements: [
      "حداقل کارشناسی",
      "تأیید مدرک در anabin/KMK",
      "پیشنهاد شغلی مرتبط از کارفرمای آلمانی",
      `سقف حقوق ${formatCurrency(45300)} یا ${formatCurrency(41041.8)} برای مشاغل کمبود نیرو`,
    ],
    evaluate: (profile, context) => {
      const threshold = shortageThreshold(profile, context);
      const salary = profile.annualSalaryOffer ?? 0;
      const missingSalary = Math.max(0, threshold - salary);
      const checks: RequirementCheck[] = [
        { label: "مدرک دانشگاهی", met: hasAcademicDegree(profile), detail: "بلوکارت به کارشناسی یا بالاتر نیاز دارد." },
        { label: "تأیید مدرک", met: profile.recognitionStatus === "full", detail: "مدرک باید به‌طور کامل از طریق anabin/KMK تأیید شود." },
        { label: "پیشنهاد شغلی", met: profile.hasGermanJobOffer, detail: "قرارداد کاری امضاشده از کارفرمای آلمانی الزامی است." },
        {
          label: "سقف حقوق",
          met: salary >= threshold,
          detail: missingSalary > 0
            ? `شما ${formatCurrency(missingSalary)} کمتر از سقف ${profile.jobFieldIsShortageOccupation ? "مشاغل کمبود نیرو" : "عمومی"} هستید.`
            : `حقوق به سقف ${formatCurrency(threshold)} می‌رسد.`,
        },
      ];
      const missingItems = checks.filter((check) => !check.met).map((check) => check.detail);
      const fitHighlights = [];
      if (profile.jobFieldIsShortageOccupation) fitHighlights.push("رشتهٔ شما می‌تواند از سقف پایین‌تر بلوکارت برای مشاغل کمبود نیرو استفاده کند.");
      if (meetsGermanLevel(profile.germanLevel, "B1")) fitHighlights.push("با آلمانی B1 در مسیر ۲۱ ماههٔ اقامت دائم قرار می‌گیرید.");
      return {
        eligible: missingItems.length === 0,
        score: byRequirements(checks, 55),
        rationale: summarize(missingItems, "شرایط اصلی بلوکارت را دارید و این معمولاً سریع‌ترین مسیر به اقامت دائم است."),
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
    summary: "برای فارغ‌التحصیلان دانشگاهی با پیشنهاد شغلی که حقوق‌شان زیر سقف بلوکارت است.",
    processingTime: "۶ تا ۱۶ هفته",
    applicationCost: "€75 هزینه ویزا + €100 تا €147 صدور کارت اقامت",
    residencyPath: "اقامت دائم پس از ۴ سال کار با آلمانی B1.",
    validity: "معمولاً تا ۴ سال",
    keyRequirements: ["حداقل کارشناسی", "مدرک تأییدشده", "پیشنهاد شغلی مرتبط", "حداقل دستمزد قانونی آلمان"],
    evaluate: (profile) => {
      const checks: RequirementCheck[] = [
        { label: "مدرک دانشگاهی", met: hasAcademicDegree(profile), detail: "این مسیر برای فارغ‌التحصیلان دانشگاه است." },
        { label: "تأیید مدرک", met: profile.recognitionStatus === "full", detail: "مدرک باید کاملاً تأیید شده باشد." },
        { label: "پیشنهاد شغلی", met: profile.hasGermanJobOffer, detail: "پیشنهاد شغلی آلمانی لازم است." },
        {
          label: "آمادگی زبانی",
          met: meetsGermanLevel(profile.germanLevel, "B1") || meetsEnglishLevel(profile.englishLevel, "B2"),
          detail: "آلمانی B1 توصیه می‌شود؛ بعضی مشاغل فنی با انگلیسی هم پیش می‌روند.",
        },
      ];
      const missingItems = checks.filter((check) => !check.met).map((check) => check.detail);
      return {
        eligible: checks[0].met && checks[1].met && checks[2].met,
        score: byRequirements(checks, 48),
        rationale: summarize(missingItems, "مسیر گسترده‌تر نیروی متخصص دانشگاهی برای شما مناسب است و بعداً با افزایش حقوق می‌توان به بلوکارت ارتقا داد."),
        missingItems,
        requirementChecks: checks,
        fitHighlights: ["سقف حقوق خاصی فراتر از حداقل قانونی ندارد.", "گزینهٔ مناسب وقتی حقوق به بلوکارت نمی‌رسد."],
      };
    },
  },
  {
    id: "skilled-worker-vocational",
    countryCode: "DE",
    name: "Skilled Worker Visa (Vocational)",
    shortLabel: "Skilled Worker Vocational",
    category: "work",
    summary: "برای دارندگان مدرک حرفه‌ای تأییدشده با پیشنهاد شغلی و سابقهٔ مرتبط.",
    processingTime: "۶ تا ۱۶ هفته",
    applicationCost: "€75 هزینه ویزا + €100 تا €147 صدور کارت اقامت",
    residencyPath: "اقامت دائم پس از ۴ سال کار با آلمانی B1.",
    validity: "معمولاً تا ۴ سال",
    keyRequirements: ["مدرک حرفه‌ای تأییدشده", "پیشنهاد شغلی در همان حرفه", "حداقل ۲ سال سابقه", "حداقل آلمانی B1"],
    evaluate: (profile) => {
      const checks: RequirementCheck[] = [
        { label: "مدرک حرفه‌ای", met: hasVocationalQualification(profile), detail: "این مسیر به آموزش حرفه‌ای معتبر نیاز دارد." },
        { label: "تأیید مدرک", met: profile.recognitionStatus === "full", detail: "تأیید حرفه‌ای مهم‌ترین مرحله است." },
        { label: "پیشنهاد شغلی", met: profile.hasGermanJobOffer, detail: "پیشنهاد شغلی آلمانی لازم است." },
        { label: "سابقه", met: profile.yearsOfExperience >= 2, detail: "حداقل ۲ سال سابقهٔ مستند مرتبط انتظار می‌رود." },
        { label: "آلمانی", met: meetsGermanLevel(profile.germanLevel, "B1"), detail: "حداقل B1 لازم است و در بعضی حوزه‌ها B2 اجباری است." },
      ];
      const missingItems = checks.filter((check) => !check.met).map((check) => check.detail);
      return {
        eligible: missingItems.length === 0,
        score: byRequirements(checks, 45),
        rationale: summarize(missingItems, "اگر مدرک حرفه‌ای‌تان برای شغل هدف تأیید شود، مسیر نیروی متخصص حرفه‌ای برایتان مناسب است."),
        missingItems,
        requirementChecks: checks,
        fitHighlights: ["مناسب مشاغل فنی، مراقبتی و حرفه‌ای.", "شراکت تأیید می‌تواند ورود را قبل از تکمیل کامل Anerkennung ممکن کند."],
      };
    },
  },
  {
    id: "chancenkarte",
    countryCode: "DE",
    name: "Opportunity Card (Chancenkarte)",
    shortLabel: "Chancenkarte",
    category: "job-search",
    summary: "مسیر امتیازی برای ورود به آلمان و جستجوی کار از داخل کشور.",
    processingTime: "۴ تا ۱۰ هفته",
    applicationCost: "€75",
    residencyPath: "پس از یافتن شغل به بلوکارت یا ویزای نیروی متخصص تبدیل می‌شود.",
    validity: "۱ سال، یک‌بار قابل تمدید",
    keyRequirements: [
      "حداقل ۶ امتیاز",
      `تمکن ${formatCurrency(1027, "month")} یا ${formatCurrency(12324)}`,
      "مدرک دانشگاهی یا حرفه‌ای تأییدشده یا در حال تأیید",
    ],
    evaluate: (profile, context) => {
      const points = chancenkartePoints(profile);
      const monthlyFunds = getMonthlySavings(profile);
      const checks: RequirementCheck[] = [
        {
          label: "پایهٔ مدرک",
          met: hasPostSecondaryQualification(profile) && ["partial", "full"].includes(profile.recognitionStatus),
          detail: "برای ۴ امتیاز پایه، مدرک دانشگاهی یا حرفه‌ای تأییدشده یا در حال تأیید لازم است.",
        },
        {
          label: "آستانهٔ امتیاز",
          met: points >= 6,
          detail: points >= 6 ? `الان ${points} امتیاز دارید.` : `الان ${points} امتیاز دارید و حداقل ۶ امتیاز لازم است.`,
        },
        {
          label: "تمکن ماهانه",
          met: monthlyFunds >= context.chancenkarteMonthlyFunds,
          detail: monthlyFunds >= context.chancenkarteMonthlyFunds
            ? `تمکن شما به معیار ${formatCurrency(context.chancenkarteMonthlyFunds, "month")} می‌رسد.`
            : `حدود ${formatCurrency(context.chancenkarteMonthlyFunds - monthlyFunds, "month")} تمکن ماهانه کم دارید.`,
        },
      ];
      const missingItems = checks.filter((check) => !check.met).map((check) => check.detail);
      return {
        eligible: missingItems.length === 0,
        score: Math.min(99, Math.round(35 + points * 8 + (checks[2].met ? 12 : 0))),
        rationale: summarize(missingItems, "آستانهٔ کارت شانس را رد می‌کنید و می‌توانید ابتدا وارد آلمان شوید و بعد ویزا را به مسیر کاری تبدیل کنید."),
        missingItems,
        requirementChecks: checks,
        fitHighlights: [`${points} از ۶ امتیاز بر اساس سن، زبان، تأیید مدرک و پیوند با آلمان.`, "تا ۲۰ ساعت در هفته اجازهٔ کار حین جستجوی شغل دارید."],
      };
    },
  },
  {
    id: "job-seeker",
    countryCode: "DE",
    name: "Job Seeker Visa",
    shortLabel: "Job Seeker",
    category: "job-search",
    summary: "ویزای قدیمی جستجوی کار برای دارندگان مدرک کاملاً تأییدشده و سابقهٔ قوی.",
    processingTime: "۴ تا ۱۰ هفته",
    applicationCost: "€75",
    residencyPath: "پس از یافتن شغل به بلوکارت یا نیروی متخصص تبدیل می‌شود.",
    validity: "۶ ماه، غیرقابل تمدید",
    keyRequirements: ["حداقل کارشناسی", "تأیید کامل مدرک", "حداقل ۵ سال سابقه", `تمکن ${formatCurrency(1027, "month")}`, "حداقل B1 آلمانی یا انگلیسی"],
    evaluate: (profile, context) => {
      const monthlyFunds = getMonthlySavings(profile);
      const checks: RequirementCheck[] = [
        { label: "مدرک دانشگاهی", met: hasAcademicDegree(profile), detail: "مدرک دانشگاهی لازم است." },
        { label: "تأیید کامل", met: profile.recognitionStatus === "full", detail: "این مسیر تأیید کامل می‌خواهد، نه تأیید جزئی." },
        { label: "سابقه", met: profile.yearsOfExperience >= 5, detail: "حداقل ۵ سال سابقهٔ مرتبط لازم است." },
        {
          label: "تمکن",
          met: monthlyFunds >= context.chancenkarteMonthlyFunds,
          detail: monthlyFunds >= context.chancenkarteMonthlyFunds
            ? `تمکن شما به ${formatCurrency(context.chancenkarteMonthlyFunds, "month")} می‌رسد.`
            : `حدود ${formatCurrency(context.chancenkarteMonthlyFunds - monthlyFunds, "month")} تمکن ماهانه کم دارید.`,
        },
        {
          label: "زبان",
          met: meetsGermanLevel(profile.germanLevel, "B1") || meetsEnglishLevel(profile.englishLevel, "B1"),
          detail: "حداقل B1 آلمانی یا انگلیسی لازم است.",
        },
      ];
      const missingItems = checks.filter((check) => !check.met).map((check) => check.detail);
      return {
        eligible: missingItems.length === 0,
        score: byRequirements(checks, 38),
        rationale: summarize(missingItems, "شرایط سخت‌گیرانهٔ جاب‌سیکر را دارید، هرچند کارت شانس معمولاً منعطف‌تر است."),
        missingItems,
        requirementChecks: checks,
        fitHighlights: ["در طول این ویزا کار مجاز نیست.", "وقتی مدرک کاملاً تأیید شده اما امتیاز کارت شانس ضعیف است، گزینه می‌ماند."],
      };
    },
  },
  {
    id: "ausbildung",
    countryCode: "DE",
    name: "Ausbildung Visa",
    shortLabel: "Ausbildung",
    category: "training",
    summary: "برای کسانی که قرارداد آموزش حرفه‌ای با شرکت آلمانی دارند.",
    processingTime: "۴ تا ۱۲ هفته",
    applicationCost: "€75",
    residencyPath: "پس از فارغ‌التحصیلی به ویزای نیروی متخصص و سپس اقامت دائم با B1.",
    validity: "مدت دوره، معمولاً ۳ تا ۳٫۵ سال",
    keyRequirements: ["قرارداد Ausbildung", "حداقل دیپلم", "حداقل آلمانی B1", "معمولاً زیر ۳۵ سال"],
    evaluate: (profile) => {
      const checks: RequirementCheck[] = [
        { label: "قرارداد آموزشی", met: profile.hasAusbildungContract, detail: "قرارداد امضاشدهٔ آزبیلدونگ الزامی است." },
        { label: "تحصیلات", met: ["high-school", "vocational", "bachelor", "master", "phd"].includes(profile.educationLevel), detail: "حداقل دیپلم انتظار می‌رود." },
        { label: "آلمانی", met: meetsGermanLevel(profile.germanLevel, "B1"), detail: "حداقل B1 لازم است و در مراقبت B2 رایج است." },
        { label: "سن", met: profile.age !== null && profile.age < 35, detail: "این مسیر معمولاً برای زیر ۳۵ سال قوی‌تر است، هرچند بعضی کارفرماها تا ۴۵ سال هم می‌پذیرند." },
      ];
      const missingItems = checks.filter((check) => !check.met).map((check) => check.detail);
      return {
        eligible: checks[0].met && checks[1].met && checks[2].met,
        score: byRequirements(checks, 42),
        rationale: summarize(missingItems, "اگر قرارداد آموزشی آماده باشد، آزبیلدونگ یکی از پایدارترین مسیرهای ورود است."),
        missingItems,
        requirementChecks: checks,
        fitHighlights: ["حقوق آموزشی و بیمه معمولاً از روز اول شروع می‌شود.", "حقوق ماهانهٔ تقریبی از حدود €649 تا €1,300 بسته به رشته."],
      };
    },
  },
  {
    id: "student",
    countryCode: "DE",
    name: "Student Visa",
    shortLabel: "Student",
    category: "study",
    summary: "برای پذیرفته‌شدگان دانشگاه‌های آلمان.",
    processingTime: "۴ تا ۱۲ هفته",
    applicationCost: "€75",
    residencyPath: "۱۸ ماه جستجوی کار پس از فارغ‌التحصیلی، سپس نیروی متخصص یا بلوکارت؛ اقامت دائم پس از ۲ سال کار با B1.",
    validity: "مدت تحصیل",
    keyRequirements: ["نامهٔ پذیرش", `حساب بلوکه ${formatCurrency(11208)} (${formatCurrency(934, "month")})`, "آلمانی B2-C1 یا انگلیسی قوی"],
    evaluate: (profile, context) => {
      const annualFunds = (profile.monthlySavings ?? 0) * 12;
      const checks: RequirementCheck[] = [
        { label: "قصد تحصیل", met: profile.wantsToStudy, detail: "این مسیر فقط اگر قصد تحصیل داشته باشید معنا دارد." },
        { label: "پذیرش", met: profile.hasUniversityAdmission, detail: "نامهٔ پذیرش دانشگاه قبل از درخواست ویزا لازم است." },
        {
          label: "حساب بلوکه",
          met: annualFunds >= context.studentBlockedAnnual,
          detail: annualFunds >= context.studentBlockedAnnual
            ? `تمکن شما معیار ${formatCurrency(context.studentBlockedAnnual)} را پوشش می‌دهد.`
            : `شما ${formatCurrency(context.studentBlockedAnnual - annualFunds)} کمتر از معیار حساب بلوکه هستید.`,
        },
        {
          label: "زبان",
          met: meetsGermanLevel(profile.germanLevel, "B2") || meetsEnglishLevel(profile.englishLevel, "B2"),
          detail: "برای دوره‌های آلمانی معمولاً B2+ و برای دوره‌های انگلیسی مدرک زبان قوی لازم است.",
        },
      ];
      const missingItems = checks.filter((check) => !check.met).map((check) => check.detail);
      return {
        eligible: missingItems.length === 0,
        score: byRequirements(checks, 44),
        rationale: summarize(missingItems, "با مسیر دانشجویی می‌توانید بعد از تحصیل وارد کار و سپس اقامت دائم شوید."),
        missingItems,
        requirementChecks: checks,
        fitHighlights: ["دانشگاه‌های دولتی عمدتاً شهریه ندارند.", "کار دانشجویی ۱۲۰ روز کامل یا ۲۴۰ نیم‌روز در سال مجاز است."],
      };
    },
  },
  {
    id: "studienkolleg",
    countryCode: "DE",
    name: "Studienkolleg Visa",
    shortLabel: "Studienkolleg",
    category: "study",
    summary: "پل ورود به دانشگاه اگر دیپلم معادل آبیتور نباشد.",
    processingTime: "۴ تا ۱۰ هفته",
    applicationCost: "€75",
    residencyPath: "پس از قبولی در FSP به ویزای دانشجویی تبدیل می‌شود.",
    validity: "معمولاً ۱ سال",
    keyRequirements: ["پذیرش اشتودین‌کولگ", "حداقل آلمانی B2", `حساب بلوکه ${formatCurrency(11208)}`, "معمولاً زیر ۳۰ سال"],
    evaluate: (profile, context) => {
      const annualFunds = (profile.monthlySavings ?? 0) * 12;
      const checks: RequirementCheck[] = [
        { label: "پذیرش", met: profile.hasStudienkollegAdmission, detail: "پذیرش اشتودین‌کولگ لازم است." },
        { label: "آلمانی", met: meetsGermanLevel(profile.germanLevel, "B2"), detail: "بیشتر مسیرها حداقل B2 می‌خواهند." },
        {
          label: "حساب بلوکه",
          met: annualFunds >= context.studentBlockedAnnual,
          detail: annualFunds >= context.studentBlockedAnnual
            ? `تمکن شما معیار ${formatCurrency(context.studentBlockedAnnual)} را پوشش می‌دهد.`
            : `شما ${formatCurrency(context.studentBlockedAnnual - annualFunds)} کمتر از معیار حساب بلوکه هستید.`,
        },
        { label: "سن", met: profile.age !== null && profile.age < 30, detail: "این مسیر معمولاً برای زیر ۳۰ سال رایج‌تر است." },
      ];
      const missingItems = checks.filter((check) => !check.met).map((check) => check.detail);
      return {
        eligible: checks[0].met && checks[1].met && checks[2].met,
        score: byRequirements(checks, 36),
        rationale: summarize(missingItems, "اگر ورود مستقیم به دانشگاه ممکن نیست، اشتودین‌کولگ پل تحصیلی مناسب است."),
        missingItems,
        requirementChecks: checks,
        fitHighlights: ["پس از قبولی در آزمون FSP به ویزای دانشجویی تبدیل می‌شود."],
      };
    },
  },
  {
    id: "language-course",
    countryCode: "DE",
    name: "Language Course Visa",
    shortLabel: "Language Course",
    category: "language",
    summary: "مسیر کوتاه‌مدت برای تقویت آلمانی قبل از مسیر اصلی.",
    processingTime: "۲ تا ۶ هفته",
    applicationCost: "€75",
    residencyPath: "مسیر مستقیم به اقامت دائم ندارد؛ معمولاً باید برگردید و از نو اقدام کنید.",
    validity: "حداکثر ۱۲ ماه",
    keyRequirements: ["ثبت‌نام در مدرسهٔ زبان معتبر", `حدود ${formatCurrency(1000, "month")} تمکن`, "پله است، مقصد نیست"],
    evaluate: (profile, context) => {
      const monthlyFunds = getMonthlySavings(profile);
      const checks: RequirementCheck[] = [
        { label: "قصد دورهٔ زبان", met: profile.wantsLanguageCourse, detail: "این مسیر فقط برای دورهٔ فشردهٔ زبان مناسب است." },
        {
          label: "تمکن ماهانه",
          met: monthlyFunds >= context.languageCourseMonthlyFunds,
          detail: monthlyFunds >= context.languageCourseMonthlyFunds
            ? `تمکن شما به ${formatCurrency(context.languageCourseMonthlyFunds, "month")} می‌رسد.`
            : `حدود ${formatCurrency(context.languageCourseMonthlyFunds - monthlyFunds, "month")} تمکن ماهانه کم دارید.`,
        },
      ];
      const missingItems = checks.filter((check) => !check.met).map((check) => check.detail);
      return {
        eligible: missingItems.length === 0,
        score: byRequirements(checks, 22),
        rationale: summarize(missingItems, "اگر هدف فوری تقویت زبان است، این مسیر پل کوتاهی است نه مسیر استقرار."),
        missingItems,
        requirementChecks: checks,
        fitHighlights: ["وقتی زبان مانع اصلی است مفید است.", "تبدیل از داخل آلمان معمولاً ممکن نیست."],
      };
    },
  },
  {
    id: "freelancer",
    countryCode: "DE",
    name: "Freelancer / Self-Employment Visa",
    shortLabel: "Freelancer",
    category: "business",
    summary: "برای متخصصان مستقل با طرح کسب‌وکار و درآمد قابل دفاع.",
    processingTime: "۸ تا ۲۴ هفته",
    applicationCost: "€75 هزینه ویزا + €100 تا €200 صدور کارت اقامت",
    residencyPath: "اقامت دائم پس از ۵ سال فعالیت موفق با آلمانی B1.",
    validity: "معمولاً ۳ سال در ابتدا",
    keyRequirements: ["طرح کسب‌وکار", `حداقل ${formatCurrency(1200, "month")} برای راه‌اندازی`, `درآمد پیش‌بینی‌شده حداقل ${formatCurrency(25000)}`],
    evaluate: (profile, context) => {
      const monthlyFunds = getMonthlySavings(profile);
      const projectedIncome = profile.projectedFreelanceIncome ?? 0;
      const checks: RequirementCheck[] = [
        { label: "قصد فریلنسری", met: profile.wantsFreelancing, detail: "این مسیر فقط برای کار مستقل معنا دارد." },
        { label: "طرح کسب‌وکار", met: profile.hasBusinessPlan, detail: "طرح کسب‌وکار معتبر الزامی است." },
        {
          label: "تمکن ماهانه",
          met: monthlyFunds >= context.freelancerMonthlyFunds,
          detail: monthlyFunds >= context.freelancerMonthlyFunds
            ? `تمکن شما به معیار ${formatCurrency(context.freelancerMonthlyFunds, "month")} می‌رسد.`
            : `حدود ${formatCurrency(context.freelancerMonthlyFunds - monthlyFunds, "month")} برای معیار راه‌اندازی کم دارید.`,
        },
        {
          label: "درآمد پیش‌بینی‌شده",
          met: projectedIncome >= 25000,
          detail: projectedIncome >= 25000
            ? `درآمد پیش‌بینی‌شده از ${formatCurrency(25000)} عبور می‌کند.`
            : `باید حداقل ${formatCurrency(25000)} در سال پیش‌بینی شود؛ الان ${formatCurrency(25000 - projectedIncome)} کم دارید.`,
        },
      ];
      const missingItems = checks.filter((check) => !check.met).map((check) => check.detail);
      return {
        eligible: missingItems.length === 0,
        score: byRequirements(checks, 33),
        rationale: summarize(missingItems, "اگر طرح کسب‌وکار ارزش اقتصادی محلی را نشان دهد، مسیر فریلنسری قابل بررسی است."),
        missingItems,
        requirementChecks: checks,
        fitHighlights: ["برلین معمولاً بازترین رویکرد را برای فریلنسرها دارد.", "تقاضای محلی قوی پرونده را محکم می‌کند."],
      };
    },
  },
  {
    id: "family-reunification",
    countryCode: "DE",
    name: "Family Reunification Visa",
    shortLabel: "Family Reunion",
    category: "family",
    summary: "برای همسر و فرزندان فردی که اقامت قانونی در آلمان دارد.",
    processingTime: "۶ تا ۲۰ هفته",
    applicationCost: "€75",
    residencyPath: "۳ سال با همسر شهروند آلمان، ۲۱/۳۳ ماه با همسر بلوکارت، ۵ سال با همسر دارای اقامت دائم.",
    validity: "متناسب با وضعیت اسپانسر",
    keyRequirements: ["اسپانسر واجد شرایط در آلمان", "آلمانی A1 برای اکثر همسران، به‌جز همسر بلوکارت", "مدارک ازدواج و خانواده"],
    evaluate: (profile) => {
      const sponsor = profile.spouseInGermanyStatus;
      const languageNeeded = sponsor !== "blue-card";
      const checks: RequirementCheck[] = [
        { label: "اسپانسر در آلمان", met: sponsor !== "none", detail: "همسر یا عضو خانواده با اقامت قانونی در آلمان لازم است." },
        {
          label: "زبان مسیر همسر",
          met: !languageNeeded || meetsGermanLevel(profile.germanLevel, "A1"),
          detail: languageNeeded ? "بیشتر مسیرهای همسر حداقل A1 می‌خواهند." : "همسر دارندهٔ بلوکارت برای ویزا به آلمانی نیاز ندارد.",
        },
        {
          label: "فرزندان",
          met: !profile.hasChildrenUnder18 || profile.dependents > 0,
          detail: "فرزندان زیر ۱۸ سال معمولاً می‌توانند همراه باشند.",
        },
      ];
      const missingItems = checks.filter((check) => !check.met).map((check) => check.detail);
      const fitHighlights = [];
      if (sponsor === "blue-card") fitHighlights.push("مسیر همسر بلوکارت قوی است چون اجازهٔ کار فوری است و آلمانی الزامی نیست.");
      if (profile.hasChildrenUnder18) fitHighlights.push("فرزندان صغیر معمولاً در پروندهٔ خانواده قابل افزودن هستند.");
      return {
        eligible: missingItems.length === 0,
        score: byRequirements(checks, sponsor === "blue-card" ? 58 : 40),
        rationale: summarize(missingItems, "اگر وضعیت اسپانسر در آلمان محکم باشد، اجتماع خانواده می‌تواند مستقیم‌ترین مسیر باشد."),
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
    summary: "ویزای ورود نیست؛ برآوردی از سریع‌ترین مسیر شما تا اقامت دائم است.",
    processingTime: "۴ تا ۱۶ هفته پس از احراز شرایط",
    applicationCost: "€113",
    residencyPath: "سابقهٔ اقامت قانونی، آلمانی B1، استقلال مالی و پرداخت بیمهٔ بازنشستگی.",
    validity: "دائمی",
    keyRequirements: ["آلمانی B1 در بیشتر مسیرها", "استقلال مالی", "سریع‌ترین زمان‌ها: بلوکارت ۲۱/۳۳ ماه، تحصیل‌به‌کار ۲ سال، نیروی متخصص ۴ سال"],
    evaluate: (profile, context) => {
      const blueThreshold = shortageThreshold(profile, context);
      const canBlueCard = hasAcademicDegree(profile) && profile.recognitionStatus === "full" && profile.hasGermanJobOffer && (profile.annualSalaryOffer ?? 0) >= blueThreshold;
      const postStudyPotential = profile.hasUniversityAdmission || profile.wantsToStudy;
      const checks: RequirementCheck[] = [
        { label: "آلمانی B1", met: meetsGermanLevel(profile.germanLevel, "B1"), detail: "بیشتر مسیرهای اقامت دائم B1 می‌خواهند." },
        { label: "استقلال مالی", met: (profile.monthlySavings ?? 0) >= 934 || profile.hasGermanJobOffer || profile.wantsFreelancing, detail: "باید از نظر مالی مستقل بمانید و به کمک اجتماعی وابسته نباشید." },
        { label: "مسیر پایه", met: canBlueCard || postStudyPotential || profile.hasAusbildungContract || profile.hasGermanJobOffer, detail: "قبل از اقامت دائم باید یک مسیر ورود واجد شرایط داشته باشید." },
      ];
      const missingItems = checks.filter((check) => !check.met).map((check) => check.detail);
      let headline = "زمان رسیدن به اقامت دائم به مسیری بستگی دارد که با آن وارد می‌شوید.";
      if (canBlueCard && meetsGermanLevel(profile.germanLevel, "B1")) headline = "اگر با بلوکارت وارد شوید، با آلمانی B1 در سریع‌ترین زمان راهنما یعنی ۲۱ ماه قرار می‌گیرید.";
      else if (canBlueCard) headline = "با بلوکارت می‌توان پس از ۳۳ ماه برای اقامت دائم اقدام کرد؛ با رسیدن به B1 این زمان به ۲۱ ماه کاهش می‌یابد.";
      else if (postStudyPotential) headline = "مسیر تحصیلی پس از فارغ‌التحصیلی و ۲ سال کار، با شرط B1، به اقامت دائم می‌رسد.";
      return {
        eligible: missingItems.length === 0,
        score: byRequirements(checks, 30),
        rationale: headline,
        missingItems,
        requirementChecks: checks,
        fitHighlights: ["بلوکارت سریع‌ترین مسیر راهنماست.", "تحصیل‌به‌کار وقتی پیشنهاد شغلی ندارید از قوی‌ترین مسیرهای بلندمدت است."],
      };
    },
  },
];
