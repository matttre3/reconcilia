import type { Transaction } from "@/types";

/**
 * Cerca sottoinsiemi di `candidates` la cui somma sia
 * uguale a `targetCents` entro `toleranceCents`.
 *
 * Usa backtracking con early exit:
 * - si ferma dopo `maxSolutions` soluzioni trovate
 * - rispetta `maxGroupSize`
 * - ottimizza ordinando i candidati per importo decrescente
 */
export function findSubsetSum(
  targetCents: number,
  candidates: Transaction[],
  toleranceCents: number,
  maxGroupSize: number,
  maxSolutions: number = 10,
  targetDate?: string
): Transaction[][] {
  const solutions: Transaction[][] = [];

  // Ordina per importo decrescente e, a parità, per vicinanza di data al target.
  // Questo aiuta a far emergere prima i gruppi "ovvi" quando ci sono molte
  // commissioni uguali distribuite su date diverse.
  const sorted = [...candidates].sort((a, b) => {
    if (b.absAmountCents !== a.absAmountCents) {
      return b.absAmountCents - a.absAmountCents;
    }

    if (!targetDate) return 0;

    const targetTs = new Date(targetDate).getTime();
    const aTs = new Date(a.date).getTime();
    const bTs = new Date(b.date).getTime();
    const aDiff = isNaN(targetTs) || isNaN(aTs) ? Number.POSITIVE_INFINITY : Math.abs(aTs - targetTs);
    const bDiff = isNaN(targetTs) || isNaN(bTs) ? Number.POSITIVE_INFINITY : Math.abs(bTs - targetTs);
    return aDiff - bDiff;
  });

  function backtrack(start: number, current: Transaction[], currentSum: number): void {
    if (solutions.length >= maxSolutions) return;

    const diff = Math.abs(currentSum - targetCents);

    if (diff <= toleranceCents && current.length > 0) {
      solutions.push([...current]);
      // Non continuare ad espandere: voglio il gruppo minimo
      return;
    }

    if (current.length >= maxGroupSize) return;
    if (currentSum > targetCents + toleranceCents) return;

    for (let i = start; i < sorted.length; i++) {
      if (solutions.length >= maxSolutions) break;

      const tx = sorted[i];
      const nextSum = currentSum + tx.absAmountCents;

      // Pruning: se questo singolo elemento supera il target, tutti i successivi
      // (ordinati decrescente) lo supereranno anch'essi solo se aggiunto da solo.
      // Ma in un gruppo possono sommare — non potiamo qui, potiamo quando nextSum > target + tolerance.
      if (nextSum > targetCents + toleranceCents) {
        // Prova comunque: potrebbe essere l'ultimo elemento esatto del gruppo
        // Solo se current.length == 0 (è il primo) possiamo saltare.
        if (current.length === 0) continue;
        // Altrimenti potrebbe combinare con elementi più piccoli dopo — non potiamo.
        // In realtà con lista ordinata decrescente, se nextSum > target la somma può solo crescere.
        // Quindi si può potare.
        continue;
      }

      current.push(tx);
      backtrack(i + 1, current, nextSum);
      current.pop();
    }
  }

  backtrack(0, [], 0);
  return solutions;
}
