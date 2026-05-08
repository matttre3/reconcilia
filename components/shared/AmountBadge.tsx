import { centsToEuro } from "@/lib/reconcile/moneyUtils";
import type { Direction } from "@/types";

type Props = {
  cents: number;
  direction?: Direction;
  showSign?: boolean;
  className?: string;
};

export function AmountBadge({ cents, direction, showSign = true, className = "" }: Props) {
  const isZero = cents === 0;
  const isIn = !isZero && (direction === "in" || cents > 0);
  const display = centsToEuro(Math.abs(cents));
  const prefix = showSign ? (isZero ? "" : isIn ? "+" : "−") : "";
  const toneClass = isZero ? "text-gray-500" : isIn ? "text-emerald-700" : "text-red-600";

  return (
    <span
      className={`font-mono font-medium tabular-nums ${toneClass} ${className}`.trim()}
    >
      {prefix}{display}
    </span>
  );
}
