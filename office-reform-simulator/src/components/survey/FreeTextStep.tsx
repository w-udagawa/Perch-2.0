"use client";

import { useSurvey } from "@/lib/store";

const FIELDS: {
  key: "topImprovement" | "idealOffice" | "other";
  label: string;
  placeholder: string;
}[] = [
  {
    key: "topImprovement",
    label: "今、一番改善してほしいことは？",
    placeholder: "例）午後の会議が多くて集中作業の時間が取れない…",
  },
  {
    key: "idealOffice",
    label: "あなたにとって理想の働き方・オフィスは？",
    placeholder: "例）週2出社で、出社日はチームでまとめて議論できると嬉しい",
  },
  {
    key: "other",
    label: "その他、自由にどうぞ（任意）",
    placeholder: "気づいたこと・アイデアなど何でも",
  },
];

export function FreeTextStep() {
  const { draft, setFreeText } = useSurvey();

  return (
    <div className="space-y-5">
      {FIELDS.map((f) => (
        <div key={f.key}>
          <label
            htmlFor={`ft-${f.key}`}
            className="mb-2 block font-semibold text-slate-700"
          >
            {f.label}
          </label>
          <textarea
            id={`ft-${f.key}`}
            rows={4}
            value={draft.freeText[f.key] ?? ""}
            onChange={(e) => setFreeText({ [f.key]: e.target.value })}
            placeholder={f.placeholder}
            className="w-full resize-y rounded-2xl border border-slate-300 bg-white p-3.5 text-sm text-slate-800 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
      ))}
      <p className="text-xs text-slate-400">
        自由記述はすべて任意です。空欄のままでも送信できます。
      </p>
    </div>
  );
}
