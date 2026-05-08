import type {
  ReconciliationInput,
  ReconciliationResult,
  ReconciliationStats,
  MatchResult,
} from "@/types";
import { matchExact } from "./matchExact";
import { matchGrouped } from "./matchGrouped";
import { sumCents } from "./moneyUtils";

export function reconcile(input: ReconciliationInput): ReconciliationResult {
  const { left, right, config } = input;
  const allMatches: MatchResult[] = [];

  // Pool globali di ID già usati
  const usedLeftIds = new Set<string>();
  const usedRightIds = new Set<string>();

  // Livello 1: match esatto 1:1
  if (config.enableExactOneToOne) {
    const result = matchExact(left, right, config);
    allMatches.push(...result.matches);
    result.usedLeftIds.forEach((id) => usedLeftIds.add(id));
    result.usedRightIds.forEach((id) => usedRightIds.add(id));
  }

  // Pool rimanenti dopo livello 1
  const remainingLeft = left.filter((tx) => !usedLeftIds.has(tx.id));
  const remainingRight = right.filter((tx) => !usedRightIds.has(tx.id));

  // Livello 2: match 1:N (un Danea → molti banca)
  if (config.enableOneToMany && remainingLeft.length > 0 && remainingRight.length > 0) {
    const result = matchGrouped(
      remainingLeft,
      remainingRight,
      "one_to_many",
      config,
      usedLeftIds,
      usedRightIds
    );
    allMatches.push(...result.matches);
    result.usedAnchorIds.forEach((id) => usedLeftIds.add(id));
    result.usedGroupIds.forEach((id) => usedRightIds.add(id));
  }

  // Pool dopo livello 2
  const remainingLeft2 = left.filter((tx) => !usedLeftIds.has(tx.id));
  const remainingRight2 = right.filter((tx) => !usedRightIds.has(tx.id));

  // Livello 3: match N:1 (molti Danea → un banca)
  if (config.enableManyToOne && remainingLeft2.length > 0 && remainingRight2.length > 0) {
    const result = matchGrouped(
      remainingRight2,   // anchor = right (banca)
      remainingLeft2,    // group = left (Danea)
      "many_to_one",
      config,
      usedRightIds,
      usedLeftIds
    );
    allMatches.push(...result.matches);
    result.usedAnchorIds.forEach((id) => usedRightIds.add(id));
    result.usedGroupIds.forEach((id) => usedLeftIds.add(id));
  }

  const finalizedMatches = dropAmbiguousMatchesShadowedByResolvedMatches(allMatches);

  // Movimenti non riconciliati
  const unmatchedLeft = left.filter((tx) => !usedLeftIds.has(tx.id));
  const unmatchedRight = right.filter((tx) => !usedRightIds.has(tx.id));

  const stats = computeStats(left, right, finalizedMatches, unmatchedLeft, unmatchedRight);

  return {
    matches: finalizedMatches,
    unmatchedLeft,
    unmatchedRight,
    stats,
  };
}

function dropAmbiguousMatchesShadowedByResolvedMatches(matches: MatchResult[]): MatchResult[] {
  const resolvedLeftIds = new Set<string>();
  const resolvedRightIds = new Set<string>();

  for (const match of matches) {
    if (match.status !== "exact" && match.status !== "grouped") continue;
    match.left.forEach((tx) => resolvedLeftIds.add(tx.id));
    match.right.forEach((tx) => resolvedRightIds.add(tx.id));
  }

  return matches.filter((match) => {
    if (match.status !== "ambiguous") return true;

    const overlapsResolvedLeft = match.left.some((tx) => resolvedLeftIds.has(tx.id));
    const overlapsResolvedRight = match.right.some((tx) => resolvedRightIds.has(tx.id));

    return !(overlapsResolvedLeft || overlapsResolvedRight);
  });
}

function computeStats(
  left: ReturnType<typeof Array.prototype.filter>,
  right: ReturnType<typeof Array.prototype.filter>,
  matches: MatchResult[],
  unmatchedLeft: ReturnType<typeof Array.prototype.filter>,
  unmatchedRight: ReturnType<typeof Array.prototype.filter>
): ReconciliationStats {
  const exactMatches = matches.filter((m) => m.status === "exact");
  const groupedMatches = matches.filter((m) => m.status === "grouped");
  const ambiguousMatches = matches.filter((m) => m.status === "ambiguous");

  const matchedLeft = matches.flatMap((m) => m.left);
  const matchedRight = matches.flatMap((m) => m.right);

  return {
    totalLeft: left.length,
    totalRight: right.length,
    matchedExact: exactMatches.length,
    matchedGrouped: groupedMatches.length,
    ambiguous: ambiguousMatches.length,
    unmatchedLeft: unmatchedLeft.length,
    unmatchedRight: unmatchedRight.length,
    totalLeftCents: sumCents(left.map((tx) => tx.amountCents)),
    totalRightCents: sumCents(right.map((tx) => tx.amountCents)),
    matchedLeftCents: sumCents(matchedLeft.map((tx) => tx.amountCents)),
    matchedRightCents: sumCents(matchedRight.map((tx) => tx.amountCents)),
  };
}
