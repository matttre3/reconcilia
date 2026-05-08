import { centsToEuro } from "@/lib/reconcile/moneyUtils";
import type { Direction } from "@/types";

type Props = {
  cents: number;
  direction?: Direction;
  showSign?: boolean;
};

export function AmountBadge({ cents, direction, showSign = true }: Props) {
  const isIn = direction === "in" || cents > 0;
  const display = centsToEuro(Math.abs(cents));
  const prefix = showSign ? (isIn ? "+" : "−") : "";

  return (
    <span
      className={`font-mono font-medium tabular-nums ${
        isIn ? "text-emerald-700" : "text-red-600"
      }`}
    >
      {prefix}{display}
    </span>
  );
}
