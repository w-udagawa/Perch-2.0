"use client";

// ============================================================================
// アンケート全体の状態管理（React Context）
// - 下書きを localStorage に自動保存
// - ステップ間ナビゲーション
// - 送信時に回答一覧へ追記
// ============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type {
  BattleChoice,
  FreeText,
  Profile,
  SurveyDraft,
  SurveyResponse,
} from "./types";
import { SCHEMA_VERSION } from "./types";
import { STEPS } from "./questions";
import {
  appendResponse,
  clearDraft,
  emptyDraft,
  loadDraft,
  saveDraft,
} from "./storage";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `res-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

interface SurveyContextValue {
  /** SSR/初回マウント完了フラグ。false の間は localStorage 未読込。 */
  hydrated: boolean;
  draft: SurveyDraft;
  stepIndex: number;

  setProfile: (patch: Partial<Profile>) => void;
  toggleStress: (id: string) => void;
  setBalance: (id: string, value: number) => void;
  setCoin: (round: "round1" | "round2", id: string, value: number) => void;
  resetRound: (round: "round1" | "round2") => void;
  setBattle: (patch: Partial<BattleChoice>) => void;
  setFreeText: (patch: Partial<FreeText>) => void;

  goNext: () => void;
  goPrev: () => void;
  goTo: (index: number) => void;
  resetAll: () => void;
  submit: () => SurveyResponse;
}

const SurveyContext = createContext<SurveyContextValue | null>(null);

export function SurveyProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState<SurveyDraft>(() => emptyDraft(nowIso()));
  const [stepIndex, setStepIndex] = useState(0);
  const startedRef = useRef<string>(draft.startedAt);

  // 初回マウント時に localStorage から下書きを復元
  useEffect(() => {
    const saved = loadDraft();
    if (saved) {
      setDraft(saved);
      startedRef.current = saved.startedAt;
    }
    setHydrated(true);
  }, []);

  // 下書きが変わるたびに保存（hydrate 後のみ）
  useEffect(() => {
    if (hydrated) saveDraft(draft);
  }, [draft, hydrated]);

  const setProfile = useCallback((patch: Partial<Profile>) => {
    setDraft((d) => ({ ...d, profile: { ...d.profile, ...patch } }));
  }, []);

  const toggleStress = useCallback((id: string) => {
    setDraft((d) => {
      const has = d.stress.includes(id);
      return {
        ...d,
        stress: has ? d.stress.filter((s) => s !== id) : [...d.stress, id],
      };
    });
  }, []);

  const setBalance = useCallback((id: string, value: number) => {
    setDraft((d) => ({ ...d, balance: { ...d.balance, [id]: value } }));
  }, []);

  const setCoin = useCallback(
    (round: "round1" | "round2", id: string, value: number) => {
      setDraft((d) => {
        const safe = Math.max(0, Math.round(value));
        const nextRound = { ...d.shop[round], [id]: safe };
        if (safe === 0) delete nextRound[id];
        return { ...d, shop: { ...d.shop, [round]: nextRound } };
      });
    },
    [],
  );

  const resetRound = useCallback((round: "round1" | "round2") => {
    setDraft((d) => ({ ...d, shop: { ...d.shop, [round]: {} } }));
  }, []);

  const setBattle = useCallback((patch: Partial<BattleChoice>) => {
    setDraft((d) => ({ ...d, battle: { ...d.battle, ...patch } }));
  }, []);

  const setFreeText = useCallback((patch: Partial<FreeText>) => {
    setDraft((d) => ({ ...d, freeText: { ...d.freeText, ...patch } }));
  }, []);

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, index));
    setStepIndex(clamped);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const goNext = useCallback(() => {
    setStepIndex((i) => {
      const next = Math.min(STEPS.length - 1, i + 1);
      if (typeof window !== "undefined")
        window.scrollTo({ top: 0, behavior: "smooth" });
      return next;
    });
  }, []);

  const goPrev = useCallback(() => {
    setStepIndex((i) => {
      const prev = Math.max(0, i - 1);
      if (typeof window !== "undefined")
        window.scrollTo({ top: 0, behavior: "smooth" });
      return prev;
    });
  }, []);

  const resetAll = useCallback(() => {
    const fresh = emptyDraft(nowIso());
    startedRef.current = fresh.startedAt;
    setDraft(fresh);
    clearDraft();
    setStepIndex(0);
  }, []);

  const submit = useCallback((): SurveyResponse => {
    const submittedAt = nowIso();
    const startedMs = Date.parse(startedRef.current);
    const durationSec = Number.isFinite(startedMs)
      ? Math.max(0, Math.round((Date.parse(submittedAt) - startedMs) / 1000))
      : undefined;

    const response: SurveyResponse = {
      schemaVersion: SCHEMA_VERSION,
      id: newId(),
      submittedAt,
      durationSec,
      profile: draft.profile,
      stress: draft.stress,
      balance: draft.balance,
      shop: draft.shop,
      battle: draft.battle,
      freeText: draft.freeText,
    };
    appendResponse(response);
    return response;
  }, [draft]);

  const value = useMemo<SurveyContextValue>(
    () => ({
      hydrated,
      draft,
      stepIndex,
      setProfile,
      toggleStress,
      setBalance,
      setCoin,
      resetRound,
      setBattle,
      setFreeText,
      goNext,
      goPrev,
      goTo,
      resetAll,
      submit,
    }),
    [
      hydrated,
      draft,
      stepIndex,
      setProfile,
      toggleStress,
      setBalance,
      setCoin,
      resetRound,
      setBattle,
      setFreeText,
      goNext,
      goPrev,
      goTo,
      resetAll,
      submit,
    ],
  );

  return (
    <SurveyContext.Provider value={value}>{children}</SurveyContext.Provider>
  );
}

export function useSurvey(): SurveyContextValue {
  const ctx = useContext(SurveyContext);
  if (!ctx) {
    throw new Error("useSurvey must be used within a SurveyProvider");
  }
  return ctx;
}
