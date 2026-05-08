import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ImportWarning } from "@/types";

type Props = {
  warnings: ImportWarning[];
};

export function ImportWarnings({ warnings }: Props) {
  if (warnings.length === 0) return null;

  const errors = warnings.filter((w) => w.severity === "error");
  const warns = warnings.filter((w) => w.severity === "warning");
  const infos = warnings.filter((w) => w.severity === "info");

  return (
    <div className="flex flex-col gap-2">
      {errors.map((w, i) => (
        <Alert key={`e-${i}`} variant="destructive">
          <AlertDescription className="text-sm">
            {w.rowIndex != null && <span className="font-mono mr-2">[riga {w.rowIndex}]</span>}
            {w.message}
          </AlertDescription>
        </Alert>
      ))}
      {warns.map((w, i) => (
        <Alert key={`w-${i}`} className="border-yellow-400 text-yellow-800 bg-yellow-50">
          <AlertDescription className="text-sm">
            {w.rowIndex != null && <span className="font-mono mr-2">[riga {w.rowIndex}]</span>}
            {w.message}
          </AlertDescription>
        </Alert>
      ))}
      {infos.map((w, i) => (
        <Alert key={`i-${i}`} className="border-blue-300 text-blue-800 bg-blue-50">
          <AlertDescription className="text-sm">
            {w.rowIndex != null && <span className="font-mono mr-2">[riga {w.rowIndex}]</span>}
            {w.message}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
