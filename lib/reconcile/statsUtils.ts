import type { MatchResult, Transaction } from "@/types";
import { sumCents } from "./moneyUtils";

export function getResolvedMatches(matches: MatchResult[]): MatchResult[] {
  return matches.filter((m) => m.status === "exact" || m.status === "grouped");
}

export function uniqueTransactionsById(transactions: Transaction[]): Transaction[] {
  const seen = new Set<string>();
  const unique: Transaction[] = [];

  for (const tx of transactions) {
    if (seen.has(tx.id)) continue;
    seen.add(tx.id);
    unique.push(tx);
  }

  return unique;
}

export function sumAbsoluteTransactionCents(transactions: Transaction[]): number {
  const unique = uniqueTransactionsById(transactions);
  return sumCents(unique.map((tx) => tx.absAmountCents));
}

export function sumTransactionCents(transactions: Transaction[]): number {
  const unique = uniqueTransactionsById(transactions);
  return sumCents(unique.map((tx) => tx.amountCents));
}
