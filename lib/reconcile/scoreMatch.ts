import type { Transaction, ReconciliationConfig } from "@/types";
import { dateDiffDays } from "./dateUtils";
import { diceSimilarity } from "@/lib/importers/normalizeText";

type ScoreInput = {
  leftTxs: Transaction[];
  rightTxs: Transaction[];
  leftTotalCents: number;
  rightTotalCents: number;
  alternativeCount: number;
  config: ReconciliationConfig;
};

type ScoreOutput = {
  confidence: number;
  reason: string;
};

export function scoreMatch(input: ScoreInput): ScoreOutput {
  const { leftTxs, rightTxs, leftTotalCents, rightTotalCents, alternativeCount, config } = input;

  const parts: string[] = [];
  let score = 0;

  // Differenza importo
  const diff = Math.abs(leftTotalCents - rightTotalCents);
  if (diff === 0) {
    score += 50;
    parts.push("Somma esatta");
  } else if (diff <= config.amountToleranceCents) {
    score += 30;
    parts.push(`Tolleranza applicata (diff ${(diff / 100).toFixed(2)}€)`);
  }

  // Vicinanza date (usa la data media del gruppo vs la data media del target)
  const avgDateLeft = averageDate(leftTxs);
  const avgDateRight = averageDate(rightTxs);
  const daysDiff = dateDiffDays(avgDateLeft, avgDateRight);

  if (daysDiff === 0) {
    score += 20;
    parts.push("Data identica");
  } else if (daysDiff <= 1) {
    score += 15;
    parts.push("Data sfasata 1 giorno");
  } else if (daysDiff <= 3) {
    score += 10;
    parts.push(`Data sfasata ${Math.round(daysDiff)} giorni`);
  } else if (daysDiff <= config.dateWindowDays) {
    score += 5;
    parts.push(`Data entro finestra (${Math.round(daysDiff)}g)`);
  }

  // Similarità descrizione (opzionale)
  if (config.useDescriptionSimilarity) {
    const leftDesc = leftTxs[0]?.description ?? "";
    const rightDesc = rightTxs[0]?.description ?? "";
    if (leftDesc && rightDesc) {
      const sim = diceSimilarity(leftDesc, rightDesc);
      if (sim >= 0.8) {
        score += 10;
        parts.push("Descrizione simile");
      } else if (sim >= 0.5) {
        score += 5;
        parts.push("Descrizione parzialmente simile");
      }
    }
  }

  // Penalità dimensione gruppo
  const groupSize = Math.max(leftTxs.length, rightTxs.length);
  if (groupSize === 1) {
    // nessuna penalità
  } else if (groupSize <= 2) {
    // nessuna penalità
  } else if (groupSize <= 4) {
    score -= 5;
    parts.push(`Gruppo di ${groupSize} movimenti`);
  } else {
    score -= 10;
    parts.push(`Gruppo grande (${groupSize} movimenti)`);
  }

  // Penalità alternative multiple
  if (alternativeCount > 5) {
    score -= 20;
    parts.push(`${alternativeCount} alternative possibili`);
  } else if (alternativeCount > 2) {
    score -= 10;
    parts.push(`${alternativeCount} alternative possibili`);
  }

  const confidence = Math.max(0, Math.min(100, score));
  const reason = parts.join(" · ");

  return { confidence, reason };
}

function averageDate(txs: Transaction[]): string {
  if (txs.length === 0) return "";
  if (txs.length === 1) return txs[0].date;

  const timestamps = txs
    .map((tx) => new Date(tx.date).getTime())
    .filter((t) => !isNaN(t));

  if (timestamps.length === 0) return txs[0].date;

  const avg = timestamps.reduce((a, b) => a + b, 0) / timestamps.length;
  return new Date(avg).toISOString().substring(0, 10);
}
