"use client";

import { Button } from "@/components/ui/button";
import { exportToCsv } from "@/lib/export/exportCsv";
import type { ReconciliationResult, MatchResult } from "@/types";

type Props = {
  result: ReconciliationResult;
  resolvedMatches: MatchResult[];
};

export function ExportButton({ result, resolvedMatches }: Props) {
  function handleExport() {
    exportToCsv({
      ...result,
      matches: resolvedMatches,
    });
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      Esporta CSV
    </Button>
  );
}
