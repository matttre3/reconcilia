"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MatchResultsTable } from "./MatchResultsTable";
import { AmbiguousMatchResolver } from "./AmbiguousMatchResolver";
import { UnmatchedTransactionsTable } from "./UnmatchedTransactionsTable";
import { MatchDetailDrawer } from "./MatchDetailDrawer";
import { AmountBadge } from "@/components/shared/AmountBadge";
import type { MatchResult, ReconciliationResult, ReconciliationStats } from "@/types";

type Props = {
  matches: MatchResult[];
  unmatchedLeft: ReconciliationResult["unmatchedLeft"];
  unmatchedRight: ReconciliationResult["unmatchedRight"];
  stats: ReconciliationStats;
  onConfirmAmbiguous: (matchId: string, candidateIndex: number) => void;
  onMarkUnmatched: (matchId: string) => void;
};

export function ReconciliationDashboard({
  matches,
  unmatchedLeft,
  unmatchedRight,
  stats,
  onConfirmAmbiguous,
  onMarkUnmatched,
}: Props) {
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const exactMatches = matches.filter((m) => m.status === "exact");
  const groupedMatches = matches.filter((m) => m.status === "grouped");
  const ambiguousMatches = matches.filter((m) => m.status === "ambiguous");

  function openDrawer(match: MatchResult) {
    setSelectedMatch(match);
    setDrawerOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Esatti" value={stats.matchedExact} color="emerald" />
        <StatCard label="Aggregati" value={stats.matchedGrouped} color="blue" />
        <StatCard label="Ambigui" value={stats.ambiguous} color="yellow" highlight={stats.ambiguous > 0} />
        <StatCard label="Non ric. Danea" value={stats.unmatchedLeft} color="red" highlight={stats.unmatchedLeft > 0} />
        <StatCard label="Non ric. Banca" value={stats.unmatchedRight} color="red" highlight={stats.unmatchedRight > 0} />
      </div>

      {/* Sommario importi */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-500">Saldo rilevato Danea</p>
          <AmountBadge cents={stats.totalLeftCents} className="text-xl font-semibold" />
        </div>
        <div>
          <p className="text-xs text-gray-500">Saldo rilevato Banca</p>
          <AmountBadge cents={stats.totalRightCents} className="text-xl font-semibold" />
        </div>
        <div>
          <p className="text-xs text-gray-500">Saldo riconciliato Danea</p>
          <AmountBadge cents={stats.matchedLeftCents} className="text-xl font-semibold" />
        </div>
        <div>
          <p className="text-xs text-gray-500">Saldo riconciliato Banca</p>
          <AmountBadge cents={stats.matchedRightCents} className="text-xl font-semibold" />
        </div>
      </div>

      {/* Tabs risultati */}
      <Tabs defaultValue="exact">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="exact">
            Esatti <CountBadge count={exactMatches.length} />
          </TabsTrigger>
          <TabsTrigger value="grouped">
            Aggregati <CountBadge count={groupedMatches.length} />
          </TabsTrigger>
          <TabsTrigger value="ambiguous">
            Ambigui <CountBadge count={ambiguousMatches.length} variant="yellow" />
          </TabsTrigger>
          <TabsTrigger value="unmatched-danea">
            Non ric. Danea <CountBadge count={unmatchedLeft.length} variant="red" />
          </TabsTrigger>
          <TabsTrigger value="unmatched-bank">
            Non ric. Banca <CountBadge count={unmatchedRight.length} variant="red" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="exact" className="mt-3">
          <MatchResultsTable matches={exactMatches} onRowClick={openDrawer} />
        </TabsContent>

        <TabsContent value="grouped" className="mt-3">
          <MatchResultsTable matches={groupedMatches} onRowClick={openDrawer} />
        </TabsContent>

        <TabsContent value="ambiguous" className="mt-3">
          <div className="flex flex-col gap-3">
            {ambiguousMatches.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">
                Nessun match ambiguo da risolvere.
              </p>
            ) : (
              ambiguousMatches.map((m) => (
                <AmbiguousMatchResolver
                  key={m.id}
                  match={m}
                  onConfirm={onConfirmAmbiguous}
                  onMarkUnmatched={onMarkUnmatched}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="unmatched-danea" className="mt-3">
          <UnmatchedTransactionsTable transactions={unmatchedLeft} source="danea" />
        </TabsContent>

        <TabsContent value="unmatched-bank" className="mt-3">
          <UnmatchedTransactionsTable transactions={unmatchedRight} source="bank" />
        </TabsContent>
      </Tabs>

      <MatchDetailDrawer
        match={selectedMatch}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  highlight = false,
}: {
  label: string;
  value: number;
  color: "emerald" | "blue" | "yellow" | "red";
  highlight?: boolean;
}) {
  const colorMap = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-800",
    red: "bg-red-50 border-red-200 text-red-800",
  };
  return (
    <div className={`rounded-lg border p-3 ${highlight ? colorMap[color] : "bg-white border-gray-200 text-gray-700"}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function CountBadge({ count, variant = "default" }: { count: number; variant?: "default" | "yellow" | "red" }) {
  if (count === 0) return null;
  const cls = variant === "yellow"
    ? "ml-1 bg-yellow-200 text-yellow-800"
    : variant === "red"
    ? "ml-1 bg-red-200 text-red-800"
    : "ml-1 bg-gray-200 text-gray-700";
  return <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${cls}`}>{count}</span>;
}
