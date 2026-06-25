"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { SurveyResponse } from "@/lib/types";
import {
  downloadBlob,
  singleResponseToJson,
  timestampSlug,
} from "@/lib/export";

export function SubmittedScreen({
  response,
  onRestart,
}: {
  response: SurveyResponse;
  onRestart: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const json = singleResponseToJson(response);

  function handleDownload() {
    downloadBlob(
      json,
      `office-reform_${timestampSlug(response.submittedAt)}.json`,
      "application/json",
    );
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="animate-fade-in text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 animate-pop items-center justify-center rounded-full bg-emerald-500 text-4xl text-white shadow-lg shadow-emerald-200">
        ✓
      </div>
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
        ご回答ありがとうございました！
      </h1>
      <p className="mx-auto mt-3 max-w-md text-slate-600">
        回答はこの端末に保存されました。下のボタンから
        <strong>JSON ファイルを書き出して</strong>集計担当者へ提出してください。
      </p>

      <div className="mx-auto mt-8 flex max-w-xs flex-col gap-3">
        <Button size="lg" onClick={handleDownload}>
          ⬇️ JSON をダウンロード
        </Button>
        <Button variant="secondary" onClick={handleCopy}>
          {copied ? "✓ コピーしました" : "📋 JSON をコピー"}
        </Button>
      </div>

      <details className="mx-auto mt-6 max-w-lg text-left">
        <summary className="cursor-pointer text-sm font-medium text-slate-500 hover:text-slate-700">
          書き出される JSON を確認する
        </summary>
        <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-slate-900 p-4 text-left text-xs leading-relaxed text-slate-100">
          {json}
        </pre>
      </details>

      <div className="mt-10 flex flex-col items-center gap-3 border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={onRestart}
          className="text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          ↺ 新しい回答を始める
        </button>
        <Link
          href="/admin"
          className="text-xs text-slate-400 underline hover:text-slate-600"
        >
          管理者用集計画面を開く
        </Link>
      </div>
    </div>
  );
}
