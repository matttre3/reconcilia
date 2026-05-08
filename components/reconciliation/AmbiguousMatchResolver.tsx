"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBar } from "@/components/shared/ConfidenceBar";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { TruncatedText } from "@/components/shared/TruncatedText";
import { centsToEuro } from "@/lib/reconcile/moneyUtils";
import type { MatchResult } from "@/types";

type Props = {
  match: MatchResult;
  onConfirm: (matchId: string, candidateIndex: number) => void;
  onMarkUnmatched: (matchId: string) => void;
};

export function AmbiguousMatchResolver({ match, onConfirm, onMarkUnmatched }: Props) {
  const alternatives = match.alternatives ?? [];

  return (
    <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 flex flex-col gap-4">
      {/* Anchor (lato Danea) */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-1">Movimento Danea da riconciliare</p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm">{match.left[0]?.date}</span>
          <TruncatedText text={match.left[0]?.description} className="max-w-[260px] text-sm" />
          <AmountBadge cents={match.leftTotalCents} />
        </div>
      </div>

      <p className="text-xs text-yellow-800">
        {alternatives.length} combinazioni possibili. Scegli quella corretta:
      </p>

      {/* Alternative */}
      <div className="flex flex-col gap-2">
        {alternatives.map((alt, i) => (
          <div
            key={i}
            className="rounded border border-gray-200 bg-white p-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{altTypeLabel(alt.type)}</Badge>
                <ConfidenceBar value={alt.confidence} />
              </div>
              <Button
                size="sm"
                onClick={() => onConfirm(match.id, i)}
              >
                Conferma
              </Button>
            </div>

            <p className="text-xs text-gray-500 italic">{alt.reason}</p>

            {/* Movimenti banca nell'alternativa */}
            <div className="flex flex-col gap-1">
              {alt.right.map((tx) => (
                <div key={tx.id} className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-gray-500">{tx.date}</span>
                  <TruncatedText text={tx.description} className="max-w-[200px]" />
                  <AmountBadge cents={tx.amountCents} showSign={false} />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-500 border-t pt-2 mt-1">
              <span>Totale banca: <span className="font-mono font-medium">{centsToEuro(Math.abs(alt.rightTotalCents))}</span></span>
              <span>Diff: <span className={`font-mono font-medium ${alt.amountDiffCents === 0 ? "text-emerald-600" : "text-red-600"}`}>{centsToEuro(alt.amountDiffCents)}</span></span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 border-red-300 hover:bg-red-50"
          onClick={() => onMarkUnmatched(match.id)}
        >
          Segna come non riconciliato
        </Button>
      </div>
    </div>
  );
}

function altTypeLabel(type: string): string {
  const map: Record<string, string> = {
    one_to_one: "1:1",
    one_to_many: "1:N",
    many_to_one: "N:1",
  };
  return map[type] ?? type;
}
