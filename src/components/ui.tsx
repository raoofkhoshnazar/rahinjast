import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; children: ReactNode }) {
  const styles = {
    primary: "bg-navy-800 text-white hover:bg-navy-950",
    secondary: "border border-navy-800 bg-surface text-navy-800 hover:bg-off-white",
    ghost: "text-navy-800 hover:bg-off-white",
  }[variant];

  return (
    <button
      {...props}
      className={`inline-flex min-h-12 items-center justify-center rounded-2xl px-6 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-ink">{label}</div>
      {children}
      {hint ? <p className="text-sm text-muted">{hint}</p> : null}
      {error ? <p className="text-sm font-medium text-error-600">{error}</p> : null}
    </div>
  );
}

export function ChoicePair({
  question,
  value,
  onChange,
  yesLabel,
  noLabel,
}: {
  question: string;
  value: boolean;
  onChange: (value: boolean) => void;
  yesLabel: string;
  noLabel: string;
}) {
  return (
    <div className="space-y-3">
      <div className="text-base font-semibold text-ink">{question}</div>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`min-h-14 rounded-2xl border px-4 text-sm font-semibold transition ${
            value ? "border-navy-800 bg-navy-800 text-white" : "border-line bg-surface text-navy-800"
          }`}
        >
          {yesLabel}
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`min-h-14 rounded-2xl border px-4 text-sm font-semibold transition ${
            !value ? "border-navy-800 bg-navy-800 text-white" : "border-line bg-surface text-navy-800"
          }`}
        >
          {noLabel}
        </button>
      </div>
    </div>
  );
}

export function Stepper({
  steps,
  current,
  onSelect,
}: {
  steps: readonly string[];
  current: number;
  onSelect: (index: number) => void;
}) {
  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {steps.map((label, index) => {
        const active = index === current;
        const done = index < current;
        return (
          <li key={label}>
            <button
              type="button"
              onClick={() => onSelect(index)}
              className={`flex w-full items-center gap-3 rounded-full border px-3 py-2 text-right ${
                active
                  ? "border-navy-800 bg-navy-950 text-white"
                  : done
                    ? "border-amber-500 bg-amber-100 text-navy-950"
                    : "border-line bg-surface text-muted"
              }`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${active ? "bg-amber-500 text-navy-950" : done ? "bg-navy-800 text-white" : "bg-off-white text-navy-600"}`}>
                {index + 1}
              </span>
              <span className="text-sm font-semibold">{label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
