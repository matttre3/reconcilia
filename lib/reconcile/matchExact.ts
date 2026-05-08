import type { Transaction, MatchResult, MatchCandidate, ReconciliationConfig } from "@/types";
import { isWithinWindow } from "./dateUtils";
import { scoreMatch } from "./scoreMatch";
import { newMatchId } from "@/lib/utils/ids";

const CLEAR_WINNER_GAP = 10;

type MatchExactResult = {
  matches: MatchResult[];
  usedLeftIds: Set<string>;
  usedRightIds: Set<string>;
};

/**
 * Livello 1: match esatto 1:1.
 * Cerca coppie con stessa direzione, importo identico (± tolleranza),
 * data entro finestra.
 */
export function matchExact(
  left: Transaction[],
  right: Transaction[],
  config: ReconciliationConfig
): MatchExactResult {
  const matches: MatchResult[] = [];
  const usedLeftIds = new Set<string>();
  const usedRightIds = new Set<string>();

  for (const lTx of left) {
    if (usedLeftIds.has(lTx.id)) continue;

    const candidates = right.filter((rTx) => {
      if (usedRightIds.has(rTx.id)) return false;
      if (rTx.direction !== lTx.direction) return false;
      if (!isWithinWindow(lTx.date, rTx.date, config.dateWindowDays)) return false;

      const diff = Math.abs(lTx.absAmountCents - rTx.absAmountCents);
      return diff <= config.amountToleranceCents;
    });

    if (candidates.length === 0) continue;

    if (candidates.length === 1) {
      // Match unico → esatto
      const rTx = candidates[0];
      const { confidence, reason } = scoreMatch({
        leftTxs: [lTx],
        rightTxs: [rTx],
        leftTotalCents: lTx.amountCents,
        rightTotalCents: rTx.amountCents,
        alternativeCount: 0,
        config,
      });

      matches.push({
        id: newMatchId(),
        status: "exact",
        type: "one_to_one",
        left: [lTx],
        right: [rTx],
        leftTotalCents: lTx.amountCents,
        rightTotalCents: rTx.amountCents,
        amountDiffCents: Math.abs(lTx.absAmountCents - rTx.absAmountCents),
        confidence,
        reason,
        confirmedBy: confidence >= config.minConfidenceForAutoMatch ? "auto" : undefined,
      });

      usedLeftIds.add(lTx.id);
      usedRightIds.add(rTx.id);
    } else {
      // Più candidati con stesso importo → ambiguo
      const alternatives: MatchCandidate[] = candidates.map((rTx) => {
        const { confidence, reason } = scoreMatch({
          leftTxs: [lTx],
          rightTxs: [rTx],
          leftTotalCents: lTx.amountCents,
          rightTotalCents: rTx.amountCents,
          alternativeCount: candidates.length,
          config,
        });
        return {
          type: "one_to_one" as const,
          left: [lTx],
          right: [rTx],
          leftTotalCents: lTx.amountCents,
          rightTotalCents: rTx.amountCents,
          amountDiffCents: Math.abs(lTx.absAmountCents - rTx.absAmountCents),
          confidence,
          reason,
        };
      });

      // Prendi il best come rappresentante
      alternatives.sort((a, b) => b.confidence - a.confidence);
      const best = alternatives[0];
      const secondBest = alternatives[1];
      const hasClearWinner =
        !secondBest || best.confidence - secondBest.confidence >= CLEAR_WINNER_GAP;
      const status = hasClearWinner ? "exact" : "ambiguous";

      matches.push({
        id: newMatchId(),
        status,
        type: "one_to_one",
        left: [lTx],
        right: best.right,
        leftTotalCents: lTx.amountCents,
        rightTotalCents: best.rightTotalCents,
        amountDiffCents: best.amountDiffCents,
        confidence: best.confidence,
        reason: best.reason,
        alternatives: status === "ambiguous" ? alternatives : undefined,
        confirmedBy: status === "exact" ? "auto" : undefined,
      });

      usedLeftIds.add(lTx.id);
      if (status === "exact") {
        usedRightIds.add(best.right[0].id);
      }
      // Non bloccare i right candidati finché l'utente non sceglie
    }
  }

  return { matches, usedLeftIds, usedRightIds };
}
