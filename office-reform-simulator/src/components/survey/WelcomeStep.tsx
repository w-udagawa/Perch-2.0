"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { STEPS } from "@/lib/questions";

interface WelcomeStepProps {
  onStart: () => void;
  hasDraft: boolean;
}

export function WelcomeStep({ onStart, hasDraft }: WelcomeStepProps) {
  // welcome / review を除いた「実際に回答する」ステップ
  const answerSteps = STEPS.filter(
    (s) => s.id !== "welcome" && s.id !== "review",
  );

  return (
    <div className="animate-fade-in text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-600 text-4xl shadow-lg shadow-brand-200">
        🏢
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
        オフィス改革
        <br className="sm:hidden" />
        シミュレーター
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-slate-600">
        あなたが職場環境で<strong className="text-slate-800">何を重視し</strong>、
        <strong className="text-slate-800">どんな改革なら歓迎できる</strong>のかを、
        ゲーム感覚で教えてください。所要時間は<strong>約 5 分</strong>です。
      </p>

      <div className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
        {answerSteps.map((s) => (
          <div
            key={s.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left"
          >
            <div className="text-2xl">{s.emoji}</div>
            <div className="mt-1 text-sm font-semibold text-slate-700">
              {s.title}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center gap-3">
        <Button size="lg" onClick={onStart} className="w-full max-w-xs">
          {hasDraft ? "回答を再開する" : "はじめる"} →
        </Button>
        {hasDraft && (
          <p className="text-xs text-slate-500">
            前回の入力内容がこの端末に保存されています。
          </p>
        )}
      </div>

      <div className="mt-10 space-y-2 border-t border-slate-200 pt-6 text-xs text-slate-400">
        <p>
          🔒
          回答はこの端末のブラウザ内（localStorage）にのみ保存され、サーバーには送信されません。
          最後に JSON ファイルとして書き出して提出してください。
        </p>
        <p>
          集計担当の方は{" "}
          <Link
            href="/admin"
            className="font-medium text-brand-600 underline hover:text-brand-700"
          >
            管理者用集計画面
          </Link>{" "}
          へ。
        </p>
      </div>
    </div>
  );
}
