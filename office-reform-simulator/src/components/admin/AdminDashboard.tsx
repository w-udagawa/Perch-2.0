"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { SurveyResponse } from "@/lib/types";
import { overview } from "@/lib/analytics";
import { loadResponses, saveResponses } from "@/lib/storage";
import {
  downloadBlob,
  mergeUnique,
  parseResponsesText,
  responsesToCsv,
  responsesToJson,
  timestampSlug,
} from "@/lib/export";
import { generateSampleResponses } from "@/lib/sampleData";
import { labelForProfile } from "@/lib/questions";
import { Button } from "@/components/ui/Button";
import { EmptyHint, StatCard, num, pct } from "./primitives";
import {
  BalancePanel,
  BattlePanel,
  ShopPanel,
  StressPanel,
} from "./Panels";
import { CrossTabPanel } from "./CrossTabPanel";

export function AdminDashboard() {
  const [hydrated, setHydrated] = useState(false);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setResponses(loadResponses());
    setHydrated(true);
  }, []);

  function persist(next: SurveyResponse[]) {
    setResponses(next);
    saveResponses(next);
  }

  async function handleImport(files: FileList | null) {
    if (!files || files.length === 0) return;
    let merged = responses;
    const errors: string[] = [];
    let added = 0;
    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        const { responses: parsed, errors: errs } = parseResponsesText(
          text,
          file.name,
        );
        errors.push(...errs);
        const before = merged.length;
        merged = mergeUnique(merged, parsed);
        added += merged.length - before;
      } catch {
        errors.push(`${file.name}: 読み込みに失敗しました`);
      }
    }
    persist(merged);
    const parts = [`${added} 件の新規回答を取り込みました`];
    if (errors.length) parts.push(`（${errors.length} 件の警告）`);
    setMessage(parts.join("") + (errors.length ? "\n" + errors.join("\n") : ""));
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleExportJson() {
    const iso = new Date().toISOString();
    downloadBlob(
      responsesToJson(responses, iso),
      `office-reform_all_${timestampSlug(iso)}.json`,
      "application/json",
    );
  }

  function handleExportCsv() {
    const iso = new Date().toISOString();
    downloadBlob(
      responsesToCsv(responses),
      `office-reform_all_${timestampSlug(iso)}.csv`,
      "text/csv;charset=utf-8",
    );
  }

  function handleSample() {
    const next = mergeUnique(responses, generateSampleResponses(24, Date.now()));
    persist(next);
    setMessage("デモ用サンプルを 24 件追加しました。");
  }

  function handleClearAll() {
    if (
      !window.confirm(
        "保存されているすべての回答データを削除します。よろしいですか？",
      )
    )
      return;
    persist([]);
    setMessage("すべての回答データを削除しました。");
  }

  function handleDeleteOne(id: string) {
    persist(responses.filter((r) => r.id !== id));
  }

  const ov = useMemo(() => overview(responses), [responses]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
        <span className="animate-pulse">読み込み中…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold text-slate-800">
              📊 管理者用集計画面
            </h1>
            <p className="text-xs text-slate-500">
              オフィス改革シミュレーター — 回答の集計・分析
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            ← アンケートに戻る
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {/* ツールバー */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              multiple
              className="hidden"
              onChange={(e) => handleImport(e.target.files)}
            />
            <Button onClick={() => fileRef.current?.click()}>
              📥 JSON を読み込む
            </Button>
            <Button
              variant="secondary"
              onClick={handleExportJson}
              disabled={responses.length === 0}
            >
              ⬇️ JSON 書き出し
            </Button>
            <Button
              variant="secondary"
              onClick={handleExportCsv}
              disabled={responses.length === 0}
            >
              ⬇️ CSV 書き出し
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleSample}>
                🎲 デモデータ
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleClearAll}
                disabled={responses.length === 0}
              >
                全削除
              </Button>
            </div>
          </div>
          {message && (
            <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              {message}
            </pre>
          )}
          <p className="mt-2 text-xs text-slate-400">
            各回答者から提出された JSON
            ファイルを複数まとめて読み込めます（id
            が重複する場合は後勝ちで統合）。読み込んだデータはこの端末に保存されます。
          </p>
        </section>

        {responses.length === 0 ? (
          <EmptyHint>
            まだ回答データがありません。回答 JSON を読み込むか、「デモデータ」で
            サンプルを生成してください。
          </EmptyHint>
        ) : (
          <>
            {/* サマリ */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="回答数" value={`${ov.total} 件`} />
              <StatCard
                label="平均回答時間"
                value={
                  ov.avgDurationSec
                    ? `${num(ov.avgDurationSec / 60)} 分`
                    : "—"
                }
              />
              <StatCard
                label="最多の課題"
                value={ov.topStress ? ov.topStress.label : "—"}
                hint={
                  ov.topStress ? pct(ov.topStress.rate) + " が選択" : undefined
                }
              />
              <StatCard
                label="人気の改革案"
                value={ov.topReform ? `${ov.topReform.emoji} ${ov.topReform.id}` : "—"}
                hint={
                  ov.topReform
                    ? `第一希望 ${pct(ov.topReform.firstRate)}`
                    : undefined
                }
              />
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <StressPanel responses={responses} />
              <BalancePanel responses={responses} />
            </div>

            <ShopPanel responses={responses} />
            <BattlePanel responses={responses} />
            <CrossTabPanel responses={responses} />

            {/* 回答一覧 */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <button
                type="button"
                onClick={() => setShowList((v) => !v)}
                className="flex w-full items-center justify-between text-left"
              >
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                  🗂️ 回答一覧（{responses.length} 件）
                </h2>
                <span className="text-sm text-slate-400">
                  {showList ? "閉じる ▲" : "開く ▼"}
                </span>
              </button>
              {showList && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[600px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                        <th className="py-2 pr-3 font-medium">送信日時</th>
                        <th className="px-2 py-2 font-medium">部署</th>
                        <th className="px-2 py-2 font-medium">年代</th>
                        <th className="px-2 py-2 font-medium">働き方</th>
                        <th className="px-2 py-2 font-medium">第一希望</th>
                        <th className="px-2 py-2 font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {responses.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="py-2 pr-3 tabular-nums text-slate-500">
                            {r.submittedAt
                              ? r.submittedAt.replace("T", " ").slice(0, 16)
                              : "—"}
                          </td>
                          <td className="px-2 py-2 text-slate-700">
                            {labelForProfile("department", r.profile.department)}
                          </td>
                          <td className="px-2 py-2 text-slate-700">
                            {labelForProfile("ageGroup", r.profile.ageGroup)}
                          </td>
                          <td className="px-2 py-2 text-slate-700">
                            {labelForProfile("workStyle", r.profile.workStyle)}
                          </td>
                          <td className="px-2 py-2 text-slate-700">
                            {r.battle.firstChoice ?? "—"}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteOne(r.id)}
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              削除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        <footer className="pb-10 pt-4 text-center text-xs text-slate-400">
          集計はすべてこのブラウザ内で行われます（サーバー送信なし）。
        </footer>
      </main>
    </div>
  );
}
