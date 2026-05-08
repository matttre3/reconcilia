"use client";

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import type { Transaction } from "@/types";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { TableRowTooltip } from "@/components/shared/TableRowTooltip";
import { TruncatedText } from "@/components/shared/TruncatedText";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { sumCents } from "@/lib/reconcile/moneyUtils";

type Props = {
  transactions: Transaction[];
};

const columns: ColumnDef<Transaction>[] = [
  {
    id: "rowIndex",
    header: "#",
    accessorFn: (row) => row.originalRowIndex,
    cell: (info) => (
      <span className="text-gray-400 font-mono text-xs">{String(info.getValue())}</span>
    ),
    size: 50,
  },
  {
    accessorKey: "date",
    header: "Data",
    cell: (info) => (
      <span className="font-mono text-sm">{String(info.getValue())}</span>
    ),
  },
  {
    accessorKey: "description",
    header: "Descrizione",
    cell: (info) => (
      <TruncatedText
        text={String(info.getValue() ?? "—")}
        className="max-w-[300px] text-sm"
      />
    ),
  },
  {
    accessorKey: "amountCents",
    header: "Importo",
    cell: (info) => (
      <AmountBadge cents={info.getValue() as number} />
    ),
  },
  {
    accessorKey: "direction",
    header: "Dir.",
    cell: (info) => {
      const dir = info.getValue() as string;
      return (
        <Badge variant="outline" className={dir === "in" ? "text-emerald-700 border-emerald-300" : "text-red-600 border-red-300"}>
          {dir === "in" ? "↑ Entrata" : "↓ Uscita"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "reference",
    header: "Riferimento",
    cell: (info) => (
      <span className="text-xs text-gray-500">{String(info.getValue() ?? "—")}</span>
    ),
  },
];

export function NormalizedTransactionsTable({ transactions }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data: transactions,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row) => row.id,
  });

  const visibleRowsCount = table.getFilteredRowModel().rows.length;
  const visibleTransactions = table.getFilteredRowModel().rows.map((row) => row.original);
  const visibleTotalCents = sumCents(visibleTransactions.map((tx) => tx.amountCents));
  const totalLabel = globalFilter.trim() === "" ? "Totale" : "Totale filtrato";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Cerca…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-xs text-sm"
        />
        <span className="text-sm text-gray-500">
          {visibleRowsCount} / {transactions.length} movimenti
        </span>
      </div>

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
            {table.getRowModel().rows.slice(0, 200).map((row) => (
              <TableRowTooltip
                key={row.id}
                className="hover:bg-gray-50"
                content={row.original.description || "—"}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </TableRowTooltip>
            ))}
            {table.getFilteredRowModel().rows.length > 200 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-2 text-center text-xs text-gray-400">
                  Mostrate le prime 200 righe su {table.getFilteredRowModel().rows.length}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="border-t border-gray-200 bg-gray-50">
            <tr>
              <td colSpan={3} className="px-3 py-2 text-right text-sm font-semibold text-gray-700">
                {totalLabel}
              </td>
              <td className="px-3 py-2">
                <AmountBadge cents={visibleTotalCents} />
              </td>
              <td className="px-3 py-2 text-xs text-gray-500">
                {visibleRowsCount} mov.
              </td>
              <td className="px-3 py-2" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
