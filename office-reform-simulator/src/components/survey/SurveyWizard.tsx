"use client";

import { useState } from "react";
import Link from "next/link";
import { useSurvey } from "@/lib/store";
import { STEPS } from "@/lib/questions";
import type { SurveyDraft, SurveyResponse } from "@/lib/types";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StepHeader, StepNav } from "./StepChrome";
import { WelcomeStep } from "./WelcomeStep";
import { ProfileStep } from "./ProfileStep";
import { StressStep } from "./StressStep";
import { BalanceStep } from "./BalanceStep";
import { ShopStep } from "./ShopStep";
import { BattleStep } from "./BattleStep";
import { FreeTextStep } from "./FreeTextStep";
import { ReviewStep } from "./ReviewStep";
import { SubmittedScreen } from "./SubmittedScreen";

function isDraftStarted(d: SurveyDraft): boolean {
  return (
    Object.values(d.profile).some(Boolean) ||
    d.stress.length > 0 ||
    Object.keys(d.balance).length > 0 ||
    Object.keys(d.shop.round1).length > 0 ||
    Object.keys(d.shop.round2).length > 0 ||
    Boolean(d.battle.firstChoice || d.battle.avoid) ||
    d.battle.acceptable.length > 0 ||
    Boolean(
      d.freeText.topImprovement ||
        d.freeText.idealOffice ||
        d.freeText.other,
    )
  );
}

const STEP_DESCRIPTIONS: Record<string, string> = {
  profile: "あなたの働き方の前提を教えてください。集計時の属性分析に使います。",
  stress:
    "いまの職場で「ストレスだな」「もったいないな」と感じることを選んでください。",
  balance:
    "それぞれの軸で、あなたの理想はどちら寄り？ スライダーを動かしてください（0〜10）。",
  shop: "改善コインを使って、欲しいオフィス改善を“買い物”しましょう。",
  battle: "もし会社が次の改革をするなら…？ 4 案を比べて態度を表明してください。",
  freetext: "数字では拾いきれない想いを、自由に書いてください（すべて任意）。",
};

export function SurveyWizard() {
  const survey = useSurvey();
  const { hydrated, draft, stepIndex, goNext, goPrev, goTo, submit, resetAll } =
    survey;
  const [submitted, setSubmitted] = useState<SurveyResponse | null>(null);

  if (!hydrated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
        <div className="animate-pulse">読み込み中…</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <Shell>
        <SubmittedScreen
          response={submitted}
          onRestart={() => {
            resetAll();
            setSubmitted(null);
          }}
        />
      </Shell>
    );
  }

  const step = STEPS[stepIndex];

  function handleSubmit() {
    const res = submit();
    setSubmitted(res);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderBody() {
    switch (step.id) {
      case "profile":
        return <ProfileStep />;
      case "stress":
        return <StressStep />;
      case "balance":
        return <BalanceStep />;
      case "shop":
        return <ShopStep />;
      case "battle":
        return <BattleStep />;
      case "freetext":
        return <FreeTextStep />;
      default:
        return null;
    }
  }

  return (
    <Shell>
      {step.id === "welcome" ? (
        <WelcomeStep onStart={goNext} hasDraft={isDraftStarted(draft)} />
      ) : (
        <>
          <div className="mb-7">
            <ProgressBar current={stepIndex} onJump={goTo} />
          </div>

          {step.id === "review" ? (
            <ReviewStep onSubmit={handleSubmit} />
          ) : (
            <div className="animate-fade-in" key={step.id}>
              <StepHeader
                emoji={step.emoji}
                title={step.title}
                description={STEP_DESCRIPTIONS[step.id]}
              />
              {renderBody()}
              <StepNav
                onBack={goPrev}
                onNext={goNext}
                nextLabel={step.id === "freetext" ? "確認画面へ" : "次へ"}
              />
            </div>
          )}
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>
              🏢
            </span>
            <span className="text-sm font-bold text-slate-700">
              オフィス改革シミュレーター
            </span>
          </Link>
          <Link
            href="/admin"
            className="text-xs font-medium text-slate-400 hover:text-brand-600"
          >
            集計画面 →
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
          {children}
        </div>
      </main>
      <footer className="pb-10 text-center text-xs text-slate-400">
        回答データはこの端末内にのみ保存されます
      </footer>
    </div>
  );
}
