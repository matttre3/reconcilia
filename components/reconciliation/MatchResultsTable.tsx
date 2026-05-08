"use client";

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import type { MatchResult } from "@/types";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { ConfidenceBar } from "@/components/shared/ConfidenceBar";
import { TableRowTooltip } from "@/components/shared/TableRowTooltip";
import { TruncatedText } from "@/components/shared/TruncatedText";
import { Badge } from "@/components/ui/badge";
import { centsToEuro, sumCents } from "@/lib/reconcile/moneyUtils";

type Props = {
  matches: MatchResult[];
  onRowClick: (match: MatchResult) => void;
};

const columns: ColumnDef<MatchResult>[] = [
  {
    id: "type",
    header: "Tipo",
    accessorFn: (row) => row.type ?? "",
    cell: (info) => {
      const t = String(info.getValue());
      const labels: Record<string, string> = {
        one_to_one: "1:1",
        one_to_many: "1:N",
        many_to_one: "N:1",
      };
      return <Badge variant="outline" className="text-xs">{labels[t] ?? t}</Badge>;
    },
  },
  {
    id: "danea",
    header: "Danea",
    accessorFn: (row) => row.left.map((tx) => tx.description ?? tx.date).join(", "),
    cell: (info) => (
      <TruncatedText
        text={String(info.getValue())}
        className="max-w-[200px] text-sm"
      />
    ),
  },
  {
    id: "leftTotal",
    header: "Tot. Danea",
    accessorFn: (row) => row.leftTotalCents,
    cell: (info) => <AmountBadge cents={info.getValue() as number} />,
  },
  {
    id: "banca",
    header: "Banca",
    accessorFn: (row) => row.right.map((tx) => tx.description ?? tx.date).join(", "),
    cell: (info) => (
      <TruncatedText
        text={String(info.getValue())}
        className="max-w-[200px] text-sm"
      />
    ),
  },
  {
    id: "rightTotal",
    header: "Tot. Banca",
    accessorFn: (row) => row.rightTotalCents,
    cell: (info) => <AmountBadge cents={info.getValue() as number} />,
  },
  {
    id: "diff",
    header: "Diff",
    accessorFn: (row) => row.amountDiffCents,
    cell: (info) => {
      const v = info.getValue() as number;
      return (
        <span className={`font-mono text-sm ${v === 0 ? "text-gray-400" : "text-red-600"}`}>
          {v === 0 ? "—" : centsToEuro(v)}
        </span>
      );
    },
  },
  {
    id: "confidence",
    header: "Confidence",
    accessorFn: (row) => row.confidence,
    cell: (info) => <ConfidenceBar value={info.getValue() as number} />,
  },
];

export function MatchResultsTable({ matches, onRowClick }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: matches,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  });

  if (matches.length === 0) {
    return (
      <p className="text-center text-sm text-gray-400 py-8">
        Nessun risultato in questa categoria.
      </p>
    );
  }

  const displayedMatches = table.getRowModel().rows.map((row) => row.original);
  const totalLeftCents = sumCents(displayedMatches.map((match) => match.leftTotalCents));
  const totalRightCents = sumCents(displayedMatches.map((match) => match.rightTotalCents));

  return (
    <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-2 text-left font-medium text-gray-600 text-xs uppercase tracking-wide cursor-pointer select-none"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getIsSorted() === "asc" ? " ↑" : header.column.getIsSorted() === "desc" ? " ↓" : ""}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-100">
          {table.getRowModel().rows.map((row) => (
            <TableRowTooltip
              key={row.id}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => onRowClick(row.original)}
              content={
                <div className="grid gap-1">
                  <div>
                    <span className="font-semibold">Danea:</span>{" "}
                    {row.original.left.map((tx) => tx.description ?? tx.date).join(", ") || "—"}
                  </div>
                  <div>
                    <span className="font-semibold">Banca:</span>{" "}
                    {row.original.right.map((tx) => tx.description ?? tx.date).join(", ") || "—"}
                  </div>
                </div>
              }
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </TableRowTooltip>
          ))}
        </tbody>
        <tfoot className="border-t border-gray-200 bg-gray-50">
          <tr>
            <td className="px-3 py-2 text-sm font-semibold text-gray-700">
              Saldo riconciliato
            </td>
            <td className="px-3 py-2 text-xs text-gray-500">
              {displayedMatches.length} match
            </td>
            <td className="px-3 py-2">
              <AmountBadge cents={totalLeftCents} className="font-semibold" />
            </td>
            <td className="px-3 py-2" />
            <td className="px-3 py-2">
              <AmountBadge cents={totalRightCents} className="font-semibold" />
            </td>
            <td className="px-3 py-2" />
            <td className="px-3 py-2" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
