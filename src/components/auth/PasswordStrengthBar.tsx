import { useMemo } from "react";

interface StrengthResult {
  score: number; // 0-4
  label: string;
  color: string;
  feedback: string[];
}

const REQUIREMENTS = [
  { test: (pw: string) => pw.length >= 6, label: "At least 6 characters" },
  { test: (pw: string) => pw.length >= 8, label: "8+ characters recommended" },
  { test: (pw: string) => /[A-Z]/.test(pw), label: "Uppercase letter" },
  { test: (pw: string) => /[0-9]/.test(pw), label: "Number" },
  { test: (pw: string) => /[^A-Za-z0-9]/.test(pw), label: "Special character" },
];

export function usePasswordStrength(password: string): StrengthResult {
  return useMemo(() => {
    if (!password) return { score: 0, label: "", color: "", feedback: [] };

    const passed = REQUIREMENTS.filter((r) => r.test(password));
    const missing = REQUIREMENTS.filter((r) => !r.test(password)).map((r) => r.label);
    const score = Math.min(4, passed.length);

    const map: Record<number, { label: string; color: string }> = {
      0: { label: "", color: "" },
      1: { label: "Weak", color: "bg-destructive" },
      2: { label: "Fair", color: "bg-orange-500" },
      3: { label: "Good", color: "bg-yellow-500" },
      4: { label: "Strong", color: "bg-green-500" },
    };

    return { score, label: map[score].label, color: map[score].color, feedback: missing };
  }, [password]);
}

export function PasswordStrengthBar({ password }: { password: string }) {
  const { score, label, color, feedback } = usePasswordStrength(password);

  if (!password) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= score ? color : "bg-muted"
              }`}
            />
          ))}
        </div>
        <span className={`text-[10px] font-medium ${
          score <= 1 ? "text-destructive" : score <= 2 ? "text-orange-500" : score <= 3 ? "text-yellow-600" : "text-green-600"
        }`}>
          {label}
        </span>
      </div>
      {feedback.length > 0 && score < 4 && (
        <p className="text-[10px] text-muted-foreground">
          Add: {feedback.slice(0, 2).join(", ")}
        </p>
      )}
    </div>
  );
}
