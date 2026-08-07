import { cn } from "@/lib/utils";

interface CitationChipProps {
  page: number;
  source?: string | null;
  className?: string;
}

export function CitationChip({ page, source, className }: CitationChipProps) {
  return (
    <span
      title={source ? `${source} — p.${page}` : `p.${page}`}
      className={cn("rounded bg-amber/10 px-2 py-0.5 font-mono text-xs text-amber border border-amber/20", className)}
    >
      p.{page}
      {source ? ` — ${source}` : ""}
    </span>
  );
}