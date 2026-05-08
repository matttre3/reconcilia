type Props = {
  value: number; // 0–100
};

export function ConfidenceBar({ value }: Props) {
  const color =
    value >= 80
      ? "bg-emerald-500"
      : value >= 50
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-gray-600">{value}</span>
    </div>
  );
}
