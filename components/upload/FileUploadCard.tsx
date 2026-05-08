"use client";

import { useRef, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FileState } from "@/types";

type Props = {
  label: string;
  fileState: FileState | null;
  onFile: (file: File) => void;
};

export function FileUploadCard({ label, fileState, onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!["csv", "xls", "xlsx"].includes(ext)) {
        alert(`Formato non supportato: .${ext}. Usa CSV, XLS o XLSX.`);
        return;
      }
      onFile(file);
    },
    [onFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const profile = fileState?.importResult?.profile;
  const isLoading = fileState?.loading;
  const hasError = !!fileState?.error;

  const borderColor = dragOver
    ? "border-blue-400 bg-blue-50"
    : profile === "danea" || profile === "bank"
    ? "border-emerald-400 bg-emerald-50"
    : hasError
    ? "border-red-400 bg-red-50"
    : "border-gray-300 bg-white hover:border-gray-400";

  return (
    <Card
      className={`cursor-pointer border-2 border-dashed transition-colors ${borderColor}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <CardContent className="flex flex-col items-center justify-center gap-3 py-10 px-6 text-center min-h-[180px]">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-sm">Analisi in corso…</span>
          </div>
        ) : fileState?.file ? (
          <div className="flex flex-col items-center gap-2">
            <StatusIcon profile={profile} hasError={hasError} />
            <p className="font-medium text-sm truncate max-w-[200px]">{fileState.file.name}</p>
            <ProfileBadge profile={profile} hasError={hasError} />
            {hasError && (
              <p className="text-xs text-red-600 mt-1">{fileState.error}</p>
            )}
            {fileState.importResult && (
              <div className="flex flex-col items-center gap-0.5">
                <p className="text-xs text-gray-700 font-medium">
                  {fileState.importResult.transactions.length} movimenti rilevati
                </p>
                {fileState.importResult.ignoredRows.length > 0 && (
                  <p className="text-xs text-gray-400">
                    {fileState.importResult.ignoredRows.length} righe ignorate (totali, saldi, ecc.)
                  </p>
                )}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1">Clicca per sostituire</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <UploadIcon />
            <p className="font-medium text-sm">{label}</p>
            <p className="text-xs">Trascina qui o clicca per scegliere</p>
            <p className="text-xs text-gray-400">CSV, XLS, XLSX</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusIcon({ profile, hasError }: { profile?: string; hasError: boolean }) {
  if (hasError) return <span className="text-3xl">❌</span>;
  if (profile === "danea" || profile === "bank") return <span className="text-3xl">✅</span>;
  return <span className="text-3xl">⚠️</span>;
}

function ProfileBadge({ profile, hasError }: { profile?: string; hasError: boolean }) {
  if (hasError) return <Badge variant="destructive">Errore</Badge>;
  if (profile === "danea") return <Badge className="bg-blue-600 text-white">Danea</Badge>;
  if (profile === "bank") return <Badge className="bg-violet-600 text-white">Banca</Badge>;
  return <Badge variant="outline" className="text-yellow-700 border-yellow-400">Formato sconosciuto</Badge>;
}

function UploadIcon() {
  return (
    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 0L8 8m4-4l4 4" />
    </svg>
  );
}
