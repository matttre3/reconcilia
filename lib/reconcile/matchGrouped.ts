import type { Transaction, MatchResult, MatchCandidate, MatchType, ReconciliationConfig } from "@/types";
import { filterCandidates } from "./candidateFilters";
import { findSubsetSum } from "./findSubsetSum";
import { scoreMatch } from "./scoreMatch";
import { newMatchId } from "@/lib/utils/ids";
import { sumCents } from "./moneyUtils";

const CLEAR_WINNER_GAP = 10;

type MatchGroupedResult = {
  matches: MatchResult[];
  usedAnchorIds: Set<string>;
  usedGroupIds: Set<string>;
};

/**
 * Livello 2/3: match 1:N o N:1.
 *
 * In modalità "one_to_many": anchors = left (Danea), groupPool = right (banca).
 * In modalità "many_to_one": anchors = right (banca), groupPool = left (Danea).
 * Il tipo finale viene corretto nello switch prima di inserire il risultato.
 */
export function matchGrouped(
  anchors: Transaction[],
  groupPool: Transaction[],
  mode: "one_to_many" | "many_to_one",
  config: ReconciliationConfig,
  usedAnchorIds: Set<string>,
  usedGroupIds: Set<string>
): MatchGroupedResult {
  const newMatches: MatchResult[] = [];
  const newUsedAnchorIds = new Set<string>();
  const newUsedGroupIds = new Set<string>();

  for (const anchor of anchors) {
    if (usedAnchorIds.has(anchor.id)) continue;

    // Pool disponibile: non ancora usato
    const availablePool = groupPool.filter((tx) => !usedGroupIds.has(tx.id) && !newUsedGroupIds.has(tx.id));

    const candidates = filterCandidates(anchor, availablePool, config);

    if (candidates.length < 2) continue; // serve almeno 2 elementi per un gruppo

    const solutions = findSubsetSum(
      anchor.absAmountCents,
      candidates,
      config.amountToleranceCents,
      config.maxGroupSize,
      30,
      anchor.date
    );

    if (solutions.length === 0) continue;

    // Soluzioni con un solo elemento: già gestite da matchExact, salta
    const multiSolutions = solutions.filter((s) => s.length >= 2);
    if (multiSolutions.length === 0) continue;

    const matchType: MatchType = mode === "one_to_many" ? "one_to_many" : "many_to_one";

    const alternatives: MatchCandidate[] = multiSolutions.map((group) => {
      const groupTotal = sumCents(group.map((tx) => tx.absAmountCents));
      const leftTxs = mode === "one_to_many" ? [anchor] : group;
      const rightTxs = mode === "one_to_many" ? group : [anchor];
      const leftTotal = mode === "one_to_many" ? anchor.amountCents : sumCents(group.map((tx) => tx.amountCents));
      const rightTotal = mode === "one_to_many" ? sumCents(group.map((tx) => tx.amountCents)) : anchor.amountCents;

      const { confidence, reason } = scoreMatch({
        leftTxs,
        rightTxs,
        leftTotalCents: leftTotal,
        rightTotalCents: rightTotal,
        alternativeCount: multiSolutions.length,
        config,
      });

      return {
        type: matchType,
        left: leftTxs,
        right: rightTxs,
        leftTotalCents: leftTotal,
        rightTotalCents: rightTotal,
        amountDiffCents: Math.abs(anchor.absAmountCents - groupTotal),
        confidence,
        reason,
      };
    });

    alternatives.sort((a, b) => b.confidence - a.confidence);
    const best = alternatives[0];
    const secondBest = alternatives[1];
    const hasClearWinner =
      !secondBest || best.confidence - secondBest.confidence >= CLEAR_WINNER_GAP;

    const isAmbiguous = alternatives.length > 1 && !hasClearWinner;
    const isAutoMatch = !isAmbiguous && best.confidence >= config.minConfidenceForAutoMatch;

    const match: MatchResult = {
      id: newMatchId(),
      status: isAmbiguous ? "ambiguous" : "grouped",
      type: matchType,
      left: best.left,
      right: best.right,
      leftTotalCents: best.leftTotalCents,
      rightTotalCents: best.rightTotalCents,
      amountDiffCents: best.amountDiffCents,
      confidence: best.confidence,
      reason: best.reason,
      alternatives: isAmbiguous ? alternatives : undefined,
      confirmedBy: isAutoMatch ? "auto" : undefined,
    };

    newMatches.push(match);

    // Un anchor ambiguo non deve bloccare i passaggi successivi:
    // potrebbe trovare un match migliore nel verso opposto (es. N:1)
    // o dopo che altri match più forti hanno ripulito il pool.
    if (!isAmbiguous) {
      newUsedAnchorIds.add(anchor.id);
    }

    // Blocca solo le transazioni del best match (non ambiguo)
    // Per gli ambigui, l'utente sceglierà quale bloccare
    if (!isAmbiguous) {
      const usedGroup = mode === "one_to_many" ? best.right : best.left;
      usedGroup.forEach((tx) => newUsedGroupIds.add(tx.id));
    }
  }

  return {
    matches: newMatches,
    usedAnchorIds: newUsedAnchorIds,
    usedGroupIds: newUsedGroupIds,
  };
}
