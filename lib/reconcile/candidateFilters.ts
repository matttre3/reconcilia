import type { Transaction, ReconciliationConfig } from "@/types";
import { isWithinWindow } from "./dateUtils";

/**
 * Filtra i candidati per il subset sum:
 * - stessa direzione del target
 * - data entro la finestra
 * - importo assoluto <= importo target + tolleranza (nessun singolo elemento può superare il target)
 */
export function filterCandidates(
  target: Transaction,
  pool: Transaction[],
  config: ReconciliationConfig
): Transaction[] {
  const maxAmount = target.absAmountCents + config.amountToleranceCents;

  const filtered = pool.filter((tx) => {
    if (tx.direction !== target.direction) return false;
    if (!isWithinWindow(tx.date, target.date, config.dateWindowDays)) return false;
    if (tx.absAmountCents > maxAmount) return false;
    return true;
  });

  // Hard cap: al massimo 50 candidati, ordinati per vicinanza di data
  if (filtered.length <= 50) return filtered;

  return filtered
    .sort((a, b) => {
      const da = Math.abs(new Date(a.date).getTime() - new Date(target.date).getTime());
      const db = Math.abs(new Date(b.date).getTime() - new Date(target.date).getTime());
      return da - db;
    })
    .slice(0, 50);
}
