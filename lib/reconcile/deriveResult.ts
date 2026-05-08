import type {
  MatchResult,
  ReconciliationResult,
  ReconciliationStats,
  Transaction,
} from "@/types";
import {
  getResolvedMatches,
  sumTransactionCents,
} from "./statsUtils";

type DerivedResultInput = {
  left: Transaction[];
  right: Transaction[];
  matches: MatchResult[];
};

export function deriveReconciliationResult({
  left,
  right,
  matches,
}: DerivedResultInput): ReconciliationResult {
  const usedLeftIds = new Set<string>();
  const usedRightIds = new Set<string>();

  for (const match of matches) {
    if (match.status === "unmatched") continue;

    match.left.forEach((tx) => usedLeftIds.add(tx.id));

    // Gli ambigui non sono ancora confermati: continuiamo a lasciare liberi
    // i movimenti banca finché l'utente non sceglie una combinazione.
    if (match.status !== "ambiguous") {
      match.right.forEach((tx) => usedRightIds.add(tx.id));
    }
  }

  const unmatchedLeft = left.filter((tx) => !usedLeftIds.has(tx.id));
  const unmatchedRight = right.filter((tx) => !usedRightIds.has(tx.id));

  return {
    matches,
    unmatchedLeft,
    unmatchedRight,
    stats: computeStats(left, right, matches, unmatchedLeft, unmatchedRight),
  };
}

function computeStats(
  left: Transaction[],
  right: Transaction[],
  matches: MatchResult[],
  unmatchedLeft: Transaction[],
  unmatchedRight: Transaction[]
): ReconciliationStats {
  const exactMatches = matches.filter((m) => m.status === "exact");
  const groupedMatches = matches.filter((m) => m.status === "grouped");
  const ambiguousMatches = matches.filter((m) => m.status === "ambiguous");
  const matchedMatches = getResolvedMatches(matches);

  const matchedLeft = matchedMatches.flatMap((m) => m.left);
  const matchedRight = matchedMatches.flatMap((m) => m.right);

  return {
    totalLeft: left.length,
    totalRight: right.length,
    matchedExact: exactMatches.length,
    matchedGrouped: groupedMatches.length,
    ambiguous: ambiguousMatches.length,
    unmatchedLeft: unmatchedLeft.length,
    unmatchedRight: unmatchedRight.length,
    totalLeftCents: sumTransactionCents(left),
    totalRightCents: sumTransactionCents(right),
    matchedLeftCents: sumTransactionCents(matchedLeft),
    matchedRightCents: sumTransactionCents(matchedRight),
  };
}
