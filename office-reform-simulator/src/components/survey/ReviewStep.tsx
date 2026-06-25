"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { useSurvey } from "@/lib/store";
import {
  BALANCE_SLIDERS,
  PROFILE_QUESTIONS,
  SHOP_ROUNDS,
  labelForProfile,
  labelForShopItem,
  labelForStress,
  reformPlan,
} from "@/lib/questions";

function Section({
  title,
  emoji,
  onEdit,
  done,
  children,
}: {
  title: string;
  emoji: string;
  onEdit: () => void;
  done: boolean;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-bold text-slate-800">
          <span aria-hidden>{emoji}</span>
          {title}
          <span
            className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              done
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {done ? "入力済み" : "未入力あり"}
          </span>
        </h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-semibold text-brand-600 hover:text-brand-700"
        >
          編集
        </button>
      </div>
      <div className="text-sm text-slate-600">{children}</div>
    </section>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

export function ReviewStep({ onSubmit }: { onSubmit: () => void }) {
  const { draft, goTo } = useSurvey();

  const profileDone = Object.values(draft.profile).some(Boolean);
  const balanceDone = BALANCE_SLIDERS.every(
    (s) => typeof draft.balance[s.id] === "number",
  );
  const r1 = Object.values(draft.shop.round1).reduce((a, b) => a + b, 0);
  const r2 = Object.values(draft.shop.round2).reduce((a, b) => a + b, 0);
  const battleDone = Boolean(draft.battle.firstChoice);

  const topAlloc = (round: "round1" | "round2") =>
    Object.entries(draft.shop[round])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, n]) => `${labelForShopItem(id)} ${n}`)
      .join(" / ") || "—";

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
        入力内容を確認し、問題なければ送信してください。送信すると回答が
        この端末に保存され、JSON ファイルとして書き出せます。
      </p>

      <Section
        title="働き方プロフィール"
        emoji="🪪"
        done={profileDone}
        onEdit={() => goTo(1)}
      >
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {PROFILE_QUESTIONS.map((q) => (
            <div key={q.key} className="flex justify-between gap-2">
              <dt className="text-slate-400">{q.title}</dt>
              <dd className="text-right font-medium text-slate-700">
                {labelForProfile(q.key, draft.profile[q.key])}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section
        title="現状ストレス診断"
        emoji="🩺"
        done={draft.stress.length > 0}
        onEdit={() => goTo(2)}
      >
        {draft.stress.length ? (
          <div className="flex flex-wrap gap-1.5">
            {draft.stress.map((id) => (
              <Chip key={id}>{labelForStress(id)}</Chip>
            ))}
          </div>
        ) : (
          <span className="text-slate-400">選択なし</span>
        )}
      </Section>

      <Section
        title="働き方バランスバー"
        emoji="⚖️"
        done={balanceDone}
        onEdit={() => goTo(3)}
      >
        <div className="flex flex-wrap gap-1.5">
          {BALANCE_SLIDERS.map((s) => (
            <Chip key={s.id}>
              {s.title}:{" "}
              {typeof draft.balance[s.id] === "number"
                ? draft.balance[s.id]
                : "–"}
            </Chip>
          ))}
        </div>
      </Section>

      <Section
        title="オフィス改善ショップ"
        emoji="🛒"
        done={r1 > 0 && r2 > 0}
        onEdit={() => goTo(4)}
      >
        {SHOP_ROUNDS.map((round) => (
          <p key={round.key} className="mb-1">
            <span className="font-semibold text-slate-700">
              {round.title}（{round.key === "round1" ? r1 : r2}/{round.coins}枚）
            </span>{" "}
            <span className="text-slate-500">{topAlloc(round.key)}</span>
          </p>
        ))}
      </Section>

      <Section
        title="改革案バトル"
        emoji="⚔️"
        done={battleDone}
        onEdit={() => goTo(5)}
      >
        <div className="space-y-1">
          <p>
            <span className="text-slate-400">第一希望：</span>
            <span className="font-semibold text-brand-700">
              {reformPlan(draft.battle.firstChoice)?.name ?? "未選択"}
            </span>
          </p>
          <p>
            <span className="text-slate-400">許容できる：</span>
            <span className="text-emerald-700">
              {draft.battle.acceptable.length
                ? draft.battle.acceptable
                    .map((id) => reformPlan(id)?.name ?? id)
                    .join("、 ")
                : "—"}
            </span>
          </p>
          <p>
            <span className="text-slate-400">避けたい：</span>
            <span className="text-red-600">
              {reformPlan(draft.battle.avoid)?.name ?? "—"}
            </span>
          </p>
        </div>
      </Section>

      <Section
        title="自由記述"
        emoji="✍️"
        done={Boolean(
          draft.freeText.topImprovement ||
            draft.freeText.idealOffice ||
            draft.freeText.other,
        )}
        onEdit={() => goTo(6)}
      >
        {draft.freeText.topImprovement ||
        draft.freeText.idealOffice ||
        draft.freeText.other ? (
          <ul className="list-inside list-disc space-y-1 text-slate-600">
            {draft.freeText.topImprovement && (
              <li className="truncate">{draft.freeText.topImprovement}</li>
            )}
            {draft.freeText.idealOffice && (
              <li className="truncate">{draft.freeText.idealOffice}</li>
            )}
            {draft.freeText.other && (
              <li className="truncate">{draft.freeText.other}</li>
            )}
          </ul>
        ) : (
          <span className="text-slate-400">記入なし（任意）</span>
        )}
      </Section>

      <div className="sticky bottom-3 z-10 mt-6 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <Button size="lg" className="w-full" onClick={onSubmit}>
          回答を送信する 🚀
        </Button>
      </div>
    </div>
  );
}
