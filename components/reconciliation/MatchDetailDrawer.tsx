"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { ConfidenceBar } from "@/components/shared/ConfidenceBar";
import type { MatchResult } from "@/types";
import { centsToEuro } from "@/lib/reconcile/moneyUtils";

type Props = {
  match: MatchResult | null;
  open: boolean;
  onClose: () => void;
};

export function MatchDetailDrawer({ match, open, onClose }: Props) {
  if (!match) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 flex-wrap">
            Match
            <StatusBadge status={match.status} />
            <TypeBadge type={match.type} />
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-4">
          {/* Confidence */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-28">Confidence</span>
            <ConfidenceBar value={match.confidence} />
          </div>
          <div className="text-xs text-gray-500 italic">{match.reason}</div>

          <Separator />

          {/* Movimenti Danea */}
          <div>
            <h3 className="text-sm font-semibold text-blue-700 mb-2">Movimenti Danea</h3>
            <TransactionTable rows={match.left} />
          </div>

          {/* Movimenti Banca */}
          <div>
            <h3 className="text-sm font-semibold text-violet-700 mb-2">Movimenti Banca</h3>
            <TransactionTable rows={match.right} />
          </div>

          <Separator />

          {/* Totali */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-500">Totale Danea</div>
            <div className="text-right font-mono font-medium">
              {centsToEuro(Math.abs(match.leftTotalCents))}
            </div>
            <div className="text-gray-500">Totale Banca</div>
            <div className="text-right font-mono font-medium">
              {centsToEuro(Math.abs(match.rightTotalCents))}
            </div>
            <div className="text-gray-500">Differenza</div>
            <div className={`text-right font-mono font-medium ${match.amountDiffCents === 0 ? "text-emerald-600" : "text-red-600"}`}>
              {centsToEuro(match.amountDiffCents)}
            </div>
          </div>

          {match.confirmedBy && (
            <div className="text-xs text-gray-400">
              Confermato da: <span className="font-medium">{match.confirmedBy === "auto" ? "sistema" : "utente"}</span>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TransactionTable({ rows }: { rows: MatchResult["left"] }) {
  return (
    <div className="rounded border border-gray-200 overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-2 py-1 text-left font-medium text-gray-500">Data</th>
            <th className="px-2 py-1 text-left font-medium text-gray-500">Descrizione</th>
            <th className="px-2 py-1 text-right font-medium text-gray-500">Importo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((tx) => (
            <tr key={tx.id}>
              <td className="px-2 py-1 font-mono">{tx.date || "—"}</td>
              <td className="px-2 py-1 truncate max-w-[180px]">{tx.description || "—"}</td>
              <td className="px-2 py-1 text-right">
                <AmountBadge cents={tx.amountCents} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: MatchResult["status"] }) {
  const map: Record<string, string> = {
    exact: "bg-emerald-100 text-emerald-800",
    grouped: "bg-blue-100 text-blue-800",
    ambiguous: "bg-yellow-100 text-yellow-800",
    unmatched: "bg-red-100 text-red-800",
  };
  const label: Record<string, string> = {
    exact: "Esatto",
    grouped: "Aggregato",
    ambiguous: "Ambiguo",
    unmatched: "Non ric.",
  };
  return <Badge className={map[status] ?? ""}>{label[status] ?? status}</Badge>;
}

function TypeBadge({ type }: { type?: MatchResult["type"] }) {
  if (!type) return null;
  const label: Record<string, string> = {
    one_to_one: "1:1",
    one_to_many: "1:N",
    many_to_one: "N:1",
    many_to_many: "N:N",
  };
  return <Badge variant="outline">{label[type] ?? type}</Badge>;
}
