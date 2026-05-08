"use client";

import { useCallback, useState } from "react";
import { useAppContext } from "./context";
import { parseFileToRows } from "@/lib/importers/parseFile";
import { importDanea } from "@/lib/importers/daneaImporter";
import { importBank } from "@/lib/importers/bankImporter";
import { reconcile } from "@/lib/reconcile/reconcile";
import { deriveReconciliationResult } from "@/lib/reconcile/deriveResult";
import { FileUploadCard } from "@/components/upload/FileUploadCard";
import { NormalizedTransactionsTable } from "@/components/preview/NormalizedTransactionsTable";
import { ImportWarnings } from "@/components/preview/ImportWarnings";
import { IgnoredRowsPanel } from "@/components/preview/IgnoredRowsPanel";
import { ReconciliationSettings } from "@/components/reconciliation/ReconciliationSettings";
import { ReconciliationDashboard } from "@/components/reconciliation/ReconciliationDashboard";
import { ExportButton } from "@/components/export/ExportButton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default function HomePage() {
  const { state, dispatch } = useAppContext();
  const [running, setRunning] = useState(false);

  const handleFile = useCallback(
    async (source: "danea" | "bank", file: File) => {
      dispatch({ type: "SET_FILE_LOADING", source, file });
      try {
        const rows = await parseFileToRows(file);
        const result = source === "danea" ? importDanea(rows) : importBank(rows);
        dispatch({ type: "SET_FILE_RESULT", source, result });
      } catch (err) {
        dispatch({
          type: "SET_FILE_ERROR",
          source,
          error: err instanceof Error ? err.message : "Errore sconosciuto",
        });
      }
    },
    [dispatch]
  );

  const canPreview =
    (state.danea?.importResult?.transactions.length ?? 0) > 0 ||
    (state.bank?.importResult?.transactions.length ?? 0) > 0;

  const canReconcile =
    (state.danea?.importResult?.transactions.length ?? 0) > 0 &&
    (state.bank?.importResult?.transactions.length ?? 0) > 0;

  function handleRunReconciliation() {
    if (!state.danea?.importResult || !state.bank?.importResult) return;
    setRunning(true);
    setTimeout(() => {
      try {
        const result = reconcile({
          left: state.danea!.importResult!.transactions,
          right: state.bank!.importResult!.transactions,
          config: state.config,
        });
        dispatch({ type: "SET_RECONCILIATION_RESULT", result });
      } finally {
        setRunning(false);
      }
    }, 50);
  }

  const daneaTransactions = state.danea?.importResult?.transactions ?? [];
  const bankTransactions = state.bank?.importResult?.transactions ?? [];
  const daneaWarnings = state.danea?.importResult?.warnings ?? [];
  const bankWarnings = state.bank?.importResult?.warnings ?? [];
  const daneaIgnored = state.danea?.importResult?.ignoredRows ?? [];
  const bankIgnored = state.bank?.importResult?.ignoredRows ?? [];
  const resolvedResult =
    state.resolvedMatches && state.danea?.importResult && state.bank?.importResult
      ? deriveReconciliationResult({
          left: state.danea.importResult.transactions,
          right: state.bank.importResult.transactions,
          matches: state.resolvedMatches,
        })
      : null;

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reconcilia</h1>
        <p className="text-sm text-gray-500 mt-1">
          Riconciliazione movimenti Danea ↔ Banca
        </p>
      </div>

      <Separator />

      {/* Step 1: Upload */}
      <section>
        <SectionTitle step={1} title="Carica i file" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-blue-700">File Danea</p>
            <FileUploadCard
              label="Trascina il file Danea"
              fileState={state.danea}
              onFile={(f) => handleFile("danea", f)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-violet-700">File Banca</p>
            <FileUploadCard
              label="Trascina il file banca"
              fileState={state.bank}
              onFile={(f) => handleFile("bank", f)}
            />
          </div>
        </div>
        {(state.danea || state.bank) && (
          <p className="text-xs text-gray-400 mt-2">
            Nota: i file Apple Numbers devono essere esportati in CSV o Excel prima del caricamento.
          </p>
        )}
      </section>

      {/* Step 2: Anteprima dati normalizzati */}
      {canPreview && (
        <>
          <Separator />
          <section>
            <SectionTitle step={2} title="Anteprima dati normalizzati" />
            <div className="mt-4">
              <Tabs defaultValue="danea">
                <TabsList>
                  <TabsTrigger value="danea">
                    Danea ({daneaTransactions.length})
                  </TabsTrigger>
                  <TabsTrigger value="bank">
                    Banca ({bankTransactions.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="danea" className="mt-3 flex flex-col gap-3">
                  <ImportWarnings warnings={daneaWarnings} />
                  {daneaTransactions.length > 0 ? (
                    <NormalizedTransactionsTable transactions={daneaTransactions} />
                  ) : (
                    <p className="text-sm text-gray-400">Nessun movimento Danea caricato.</p>
                  )}
                  <IgnoredRowsPanel ignoredRows={daneaIgnored} />
                </TabsContent>

                <TabsContent value="bank" className="mt-3 flex flex-col gap-3">
                  <ImportWarnings warnings={bankWarnings} />
                  {bankTransactions.length > 0 ? (
                    <NormalizedTransactionsTable transactions={bankTransactions} />
                  ) : (
                    <p className="text-sm text-gray-400">Nessun movimento banca caricato.</p>
                  )}
                  <IgnoredRowsPanel ignoredRows={bankIgnored} />
                </TabsContent>
              </Tabs>
            </div>
          </section>
        </>
      )}

      {/* Step 3: Impostazioni riconciliazione */}
      {canReconcile && (
        <>
          <Separator />
          <section>
            <SectionTitle step={3} title="Impostazioni riconciliazione" />
            <div className="mt-4">
              <ReconciliationSettings
                config={state.config}
                onChange={(patch) => dispatch({ type: "SET_CONFIG", config: patch })}
                onRun={handleRunReconciliation}
                running={running}
              />
            </div>
          </section>
        </>
      )}

      {/* Step 4: Risultati */}
      {resolvedResult && state.resolvedMatches && (
        <>
          <Separator />
          <section>
            <div className="flex items-center justify-between">
              <SectionTitle step={4} title="Risultati riconciliazione" />
              <ExportButton
                result={resolvedResult}
                resolvedMatches={state.resolvedMatches}
              />
            </div>
            <div className="mt-4">
              <ReconciliationDashboard
                matches={state.resolvedMatches}
                unmatchedLeft={resolvedResult.unmatchedLeft}
                unmatchedRight={resolvedResult.unmatchedRight}
                stats={resolvedResult.stats}
                onConfirmAmbiguous={(matchId, idx) =>
                  dispatch({ type: "CONFIRM_AMBIGUOUS", matchId, candidateIndex: idx })
                }
                onMarkUnmatched={(matchId) =>
                  dispatch({ type: "MARK_UNMATCHED", matchId })
                }
              />
            </div>
          </section>
        </>
      )}

      {/* Reset */}
      {(state.danea || state.bank) && (
        <>
          <Separator />
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400"
              onClick={() => dispatch({ type: "RESET" })}
            >
              Ricomincia da capo
            </Button>
          </div>
        </>
      )}
    </main>
  );
}

function SectionTitle({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-900 text-white text-xs font-bold">
        {step}
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  );
}
