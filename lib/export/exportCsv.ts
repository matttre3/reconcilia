import type { ReconciliationResult, Transaction } from "@/types";
import { formatCentsPlain } from "@/lib/reconcile/moneyUtils";

export function exportToCsv(result: ReconciliationResult): void {
  const rows: string[][] = [];

  // Header
  rows.push([
    "match_id",
    "status",
    "tipo",
    "confidence",
    "reason",
    "confermato_da",
    "danea_ids",
    "danea_date",
    "danea_descrizioni",
    "danea_totale_eur",
    "banca_ids",
    "banca_date",
    "banca_descrizioni",
    "banca_totale_eur",
    "differenza_eur",
    "direzione",
  ]);

  // Matches
  for (const m of result.matches) {
    rows.push([
      m.id,
      m.status,
      m.type ?? "",
      String(m.confidence),
      m.reason,
      m.confirmedBy ?? "",
      m.left.map((tx) => tx.id).join(";"),
      m.left.map((tx) => tx.date).join(";"),
      m.left.map((tx) => tx.description ?? "").join(";"),
      formatCentsPlain(m.leftTotalCents),
      m.right.map((tx) => tx.id).join(";"),
      m.right.map((tx) => tx.date).join(";"),
      m.right.map((tx) => tx.description ?? "").join(";"),
      formatCentsPlain(m.rightTotalCents),
      formatCentsPlain(m.amountDiffCents),
      m.left[0]?.direction ?? "",
    ]);
  }

  // Non riconciliati Danea
  for (const tx of result.unmatchedLeft) {
    rows.push(unmatchedRow(tx, "Non riconciliato Danea"));
  }

  // Non riconciliati banca
  for (const tx of result.unmatchedRight) {
    rows.push(unmatchedRow(tx, "Non riconciliato banca"));
  }

  const csvContent = rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
  downloadBlob(csvContent, "riconciliazione.csv", "text/csv;charset=utf-8;");
}

function unmatchedRow(tx: Transaction, status: string): string[] {
  const isLeft = tx.source === "danea";
  return [
    tx.id,
    status,
    "",
    "",
    "",
    "",
    isLeft ? tx.id : "",
    isLeft ? tx.date : "",
    isLeft ? (tx.description ?? "") : "",
    isLeft ? formatCentsPlain(tx.amountCents) : "",
    isLeft ? "" : tx.id,
    isLeft ? "" : tx.date,
    isLeft ? "" : (tx.description ?? ""),
    isLeft ? "" : formatCentsPlain(tx.amountCents),
    "",
    tx.direction,
  ];
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob(["﻿" + content], { type: mimeType }); // BOM per Excel UTF-8
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
