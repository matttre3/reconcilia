"use client";

import { useState } from "react";
import type { IgnoredRow } from "@/types";

type Props = {
  ignoredRows: IgnoredRow[];
};

export function IgnoredRowsPanel({ ignoredRows }: Props) {
  const [open, setOpen] = useState(false);

  if (ignoredRows.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 text-sm">
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-100 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-gray-600">
          <span className="font-medium">{ignoredRows.length} righe ignorate</span>
          <span className="text-gray-400 ml-2">— totali, saldi, righe senza descrizione, ecc.</span>
        </span>
        <span className="text-gray-400 text-xs">{open ? "▲ nascondi" : "▼ mostra"}</span>
      </button>

      {open && (
        <div className="border-t border-gray-200 overflow-auto max-h-64">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-3 py-1.5 text-left font-medium text-gray-500 w-16">Riga</th>
                <th className="px-3 py-1.5 text-left font-medium text-gray-500">Motivo</th>
                <th className="px-3 py-1.5 text-left font-medium text-gray-500">Contenuto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ignoredRows.map((row) => (
                <tr key={row.originalRowIndex} className="hover:bg-gray-50">
                  <td className="px-3 py-1.5 font-mono text-gray-400">{row.originalRowIndex}</td>
                  <td className="px-3 py-1.5 text-gray-500">{row.reason}</td>
                  <td className="px-3 py-1.5 text-gray-400 truncate max-w-[300px]">
                    {Object.values(row.raw)
                      .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
                      .slice(0, 5)
                      .join(" | ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
