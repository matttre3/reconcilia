"use client";

import React, { createContext, useContext, useReducer } from "react";
import type {
  AppStep,
  FileState,
  ImportResult,
  ReconciliationConfig,
  ReconciliationResult,
  MatchCandidate,
  MatchResult,
  MatchStatus,
  MatchType,
} from "@/types";
import { DEFAULT_CONFIG } from "@/types";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

type AppState = {
  step: AppStep;
  danea: FileState | null;
  bank: FileState | null;
  config: ReconciliationConfig;
  reconciliationResult: ReconciliationResult | null;
  // Versione mutata dei match (l'utente può confermare ambigui)
  resolvedMatches: MatchResult[] | null;
};

const initialState: AppState = {
  step: "upload",
  danea: null,
  bank: null,
  config: DEFAULT_CONFIG,
  reconciliationResult: null,
  resolvedMatches: null,
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type Action =
  | { type: "SET_STEP"; step: AppStep }
  | { type: "SET_FILE_LOADING"; source: "danea" | "bank"; file: File }
  | { type: "SET_FILE_RESULT"; source: "danea" | "bank"; result: ImportResult }
  | { type: "SET_FILE_ERROR"; source: "danea" | "bank"; error: string }
  | { type: "SET_CONFIG"; config: Partial<ReconciliationConfig> }
  | { type: "SET_RECONCILIATION_RESULT"; result: ReconciliationResult }
  | { type: "CONFIRM_AMBIGUOUS"; matchId: string; candidateIndex: number }
  | { type: "MARK_UNMATCHED"; matchId: string }
  | { type: "RESET" };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step };

    case "SET_FILE_LOADING": {
      const fileState: FileState = {
        file: action.file,
        importResult: null,
        loading: true,
        error: null,
      };
      return { ...state, [action.source]: fileState };
    }

    case "SET_FILE_RESULT": {
      const prev = state[action.source];
      if (!prev) return state;
      return {
        ...state,
        [action.source]: {
          ...prev,
          importResult: action.result,
          loading: false,
          error: null,
        },
      };
    }

    case "SET_FILE_ERROR": {
      const prev = state[action.source];
      if (!prev) return state;
      return {
        ...state,
        [action.source]: {
          ...prev,
          loading: false,
          error: action.error,
        },
      };
    }

    case "SET_CONFIG":
      return { ...state, config: { ...state.config, ...action.config } };

    case "SET_RECONCILIATION_RESULT":
      return {
        ...state,
        reconciliationResult: action.result,
        resolvedMatches: rebalanceResolvedMatches(action.result.matches),
        step: "results",
      };

    case "CONFIRM_AMBIGUOUS": {
      if (!state.resolvedMatches) return state;
      const updated = state.resolvedMatches.map((m) => {
        if (m.id !== action.matchId) return m;
        const chosen = m.alternatives?.[action.candidateIndex];
        if (!chosen) return m;
        const resolvedStatus: MatchStatus =
          chosen.type === "one_to_one" ? "exact" : "grouped";
        return {
          ...m,
          status: resolvedStatus,
          type: chosen.type,
          left: chosen.left,
          right: chosen.right,
          leftTotalCents: chosen.leftTotalCents,
          rightTotalCents: chosen.rightTotalCents,
          amountDiffCents: chosen.amountDiffCents,
          confidence: chosen.confidence,
          reason: chosen.reason,
          alternatives: m.alternatives,
          confirmedBy: "user" as const,
        };
      });
      return { ...state, resolvedMatches: rebalanceResolvedMatches(updated) };
    }

    case "MARK_UNMATCHED": {
      if (!state.resolvedMatches) return state;
      const updated = state.resolvedMatches.map((m) => {
        if (m.id !== action.matchId) return m;
        return { ...m, status: "unmatched" as const, confirmedBy: "user" as const };
      });
      return { ...state, resolvedMatches: rebalanceResolvedMatches(updated) };
    }

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

function rebalanceResolvedMatches(matches: MatchResult[]): MatchResult[] {
  const usedLeftIds = new Set<string>();
  const usedRightIds = new Set<string>();

  return matches.map((match) => {
    if (match.status === "unmatched") return match;

    const availableAlternatives = getAvailableAlternatives(match, usedLeftIds, usedRightIds);

    if (availableAlternatives.length === 0) {
      return {
        ...match,
        status: "unmatched" as const,
        confirmedBy: undefined,
      };
    }

    const selected = pickSelectedAlternative(match, availableAlternatives);

    if (match.status === "ambiguous" && availableAlternatives.length > 1) {
      return {
        ...match,
        status: "ambiguous" as const,
        type: selected.type,
        left: selected.left,
        right: selected.right,
        leftTotalCents: selected.leftTotalCents,
        rightTotalCents: selected.rightTotalCents,
        amountDiffCents: selected.amountDiffCents,
        confidence: selected.confidence,
        reason: selected.reason,
        alternatives: availableAlternatives,
        confirmedBy: undefined,
      };
    }

    addCandidateUsage(selected, usedLeftIds, usedRightIds);

    const resolvedStatus = resolveStatusFromType(selected.type);
    const currentStillSelected = isSameCandidate(selected, match);

    return {
      ...match,
      status: resolvedStatus,
      type: selected.type,
      left: selected.left,
      right: selected.right,
      leftTotalCents: selected.leftTotalCents,
      rightTotalCents: selected.rightTotalCents,
      amountDiffCents: selected.amountDiffCents,
      confidence: selected.confidence,
      reason: selected.reason,
      alternatives: match.alternatives ? availableAlternatives : undefined,
      confirmedBy: currentStillSelected ? match.confirmedBy : "auto",
    };
  });
}

function getAvailableAlternatives(
  match: MatchResult,
  usedLeftIds: Set<string>,
  usedRightIds: Set<string>
): MatchCandidate[] {
  const pool = match.alternatives?.length
    ? match.alternatives
    : [candidateFromMatch(match)];

  return pool
    .filter((candidate) => !hasOverlap(candidate, usedLeftIds, usedRightIds))
    .sort((a, b) => b.confidence - a.confidence);
}

function candidateFromMatch(match: MatchResult): MatchCandidate {
  return {
    type: match.type ?? inferTypeFromMatch(match),
    left: match.left,
    right: match.right,
    leftTotalCents: match.leftTotalCents,
    rightTotalCents: match.rightTotalCents,
    amountDiffCents: match.amountDiffCents,
    confidence: match.confidence,
    reason: match.reason,
  };
}

function inferTypeFromMatch(match: MatchResult): MatchType {
  if (match.left.length === 1 && match.right.length === 1) return "one_to_one";
  if (match.left.length === 1) return "one_to_many";
  if (match.right.length === 1) return "many_to_one";
  return "many_to_many";
}

function resolveStatusFromType(type: MatchType): MatchStatus {
  return type === "one_to_one" ? "exact" : "grouped";
}

function hasOverlap(
  candidate: MatchCandidate,
  usedLeftIds: Set<string>,
  usedRightIds: Set<string>
): boolean {
  return (
    candidate.left.some((tx) => usedLeftIds.has(tx.id)) ||
    candidate.right.some((tx) => usedRightIds.has(tx.id))
  );
}

function addCandidateUsage(
  candidate: MatchCandidate,
  usedLeftIds: Set<string>,
  usedRightIds: Set<string>
): void {
  candidate.left.forEach((tx) => usedLeftIds.add(tx.id));
  candidate.right.forEach((tx) => usedRightIds.add(tx.id));
}

function pickSelectedAlternative(
  match: MatchResult,
  availableAlternatives: MatchCandidate[]
): MatchCandidate {
  return (
    availableAlternatives.find((candidate) => isSameCandidate(candidate, match)) ??
    availableAlternatives[0]
  );
}

function isSameCandidate(candidate: Pick<MatchCandidate, "left" | "right">, match: MatchResult): boolean {
  return (
    sameTransactionSet(candidate.left, match.left) &&
    sameTransactionSet(candidate.right, match.right)
  );
}

function sameTransactionSet(
  a: MatchCandidate["left"],
  b: MatchCandidate["left"]
): boolean {
  if (a.length !== b.length) return false;

  const aIds = a.map((tx) => tx.id).sort();
  const bIds = b.map((tx) => tx.id).sort();

  return aIds.every((id, index) => id === bIds[index]);
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type AppContextValue = {
  state: AppState;
  dispatch: React.Dispatch<Action>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside AppProvider");
  return ctx;
}
