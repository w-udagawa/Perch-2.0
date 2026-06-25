"use client";

import { SelectCard } from "@/components/ui/SelectCard";
import { PROFILE_QUESTIONS } from "@/lib/questions";
import { useSurvey } from "@/lib/store";

export function ProfileStep() {
  const { draft, setProfile } = useSurvey();

  return (
    <div className="space-y-7">
      {PROFILE_QUESTIONS.map((q) => (
        <fieldset key={q.key}>
          <legend className="mb-3 font-semibold text-slate-700">
            {q.title}
          </legend>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {q.options.map((opt) => (
              <SelectCard
                key={opt.id}
                emoji={opt.emoji}
                label={opt.label}
                selected={draft.profile[q.key] === opt.id}
                onClick={() => setProfile({ [q.key]: opt.id })}
              />
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
