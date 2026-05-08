"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { ReconciliationConfig } from "@/types";

type Props = {
  config: ReconciliationConfig;
  onChange: (patch: Partial<ReconciliationConfig>) => void;
  onRun: () => void;
  running: boolean;
};

export function ReconciliationSettings({ config, onChange, onRun, running }: Props) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Soglia auto-conferma */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">
              Soglia auto-conferma: <span className="font-mono font-bold">{config.minConfidenceForAutoMatch}</span>
            </Label>
            <Slider
              min={0}
              max={100}
              step={5}
              value={[config.minConfidenceForAutoMatch]}
              onValueChange={(vals) => onChange({ minConfidenceForAutoMatch: Array.isArray(vals) ? vals[0] : vals })}
            />
            <p className="text-xs text-gray-500">
              Match con confidence superiore a questa soglia vengono confermati automaticamente.
            </p>
          </div>

          {/* Toggle 1:N */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Abilita match 1:N</Label>
              <p className="text-xs text-gray-500">Un movimento Danea → più movimenti banca</p>
            </div>
            <Switch
              checked={config.enableOneToMany}
              onCheckedChange={(v) => onChange({ enableOneToMany: v })}
            />
          </div>

          {/* Toggle N:1 */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Abilita match N:1</Label>
              <p className="text-xs text-gray-500">Più movimenti Danea → un movimento banca</p>
            </div>
            <Switch
              checked={config.enableManyToOne}
              onCheckedChange={(v) => onChange({ enableManyToOne: v })}
            />
          </div>

          {/* Toggle similarità descrizione */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Usa similarità descrizione</Label>
              <p className="text-xs text-gray-500">Influenza il punteggio di confidence</p>
            </div>
            <Switch
              checked={config.useDescriptionSimilarity}
              onCheckedChange={(v) => onChange({ useDescriptionSimilarity: v })}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            size="lg"
            onClick={onRun}
            disabled={running}
            className="px-8"
          >
            {running ? "Riconciliazione in corso…" : "Avvia riconciliazione"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
