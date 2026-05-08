import type { Transaction } from "@/types";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { Badge } from "@/components/ui/badge";

type Props = {
  transactions: Transaction[];
  source: "danea" | "bank";
};

export function UnmatchedTransactionsTable({ transactions, source }: Props) {
  if (transactions.length === 0) {
    return (
      <p className="text-center text-sm text-gray-400 py-8">
        Tutti i movimenti {source === "danea" ? "Danea" : "banca"} sono stati riconciliati.
      </p>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-600 text-xs uppercase tracking-wide">Data</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600 text-xs uppercase tracking-wide">Descrizione</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600 text-xs uppercase tracking-wide">Importo</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600 text-xs uppercase tracking-wide">Dir.</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600 text-xs uppercase tracking-wide">Rif.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {transactions.map((tx) => (
            <tr key={tx.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-mono text-xs">{tx.date || "—"}</td>
              <td className="px-3 py-2 truncate max-w-[250px]">{tx.description || "—"}</td>
              <td className="px-3 py-2"><AmountBadge cents={tx.amountCents} /></td>
              <td className="px-3 py-2">
                <Badge variant="outline" className={tx.direction === "in" ? "text-emerald-700 border-emerald-300" : "text-red-600 border-red-300"}>
                  {tx.direction === "in" ? "↑" : "↓"}
                </Badge>
              </td>
              <td className="px-3 py-2 text-xs text-gray-400">{tx.reference || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
