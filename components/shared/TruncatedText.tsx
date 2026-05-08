import { cn } from "@/lib/utils";

type Props = {
  text?: string | null;
  className?: string;
  fallback?: string;
  showTitle?: boolean;
};

export function TruncatedText({
  text,
  className,
  fallback = "—",
  showTitle = false,
}: Props) {
  const value = text && text.trim() !== "" ? text : fallback;

  return (
    <span
      className={cn("block truncate", className)}
      title={showTitle ? value : undefined}
    >
      {value}
    </span>
  );
}
