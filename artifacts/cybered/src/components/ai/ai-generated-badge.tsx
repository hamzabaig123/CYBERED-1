import { cn } from "@/lib/utils";

interface AIGeneratedBadgeProps {
  status?: string;
  className?: string;
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  approved: { label: "AI-approved", className: "border-teal/40 bg-teal/10 text-teal" },
  dismissed: { label: "AI-dismissed", className: "border-muted bg-muted/30 text-muted-foreground" },
  accepted: { label: "AI-accepted", className: "border-teal/40 bg-teal/10 text-teal" },
  kept_mine: { label: "Kept original", className: "border-teal/40 bg-teal/10 text-teal" },
};

export function AIGeneratedBadge({ status, className }: AIGeneratedBadgeProps) {
  const meta = status ? STATUS_META[status] : undefined;

  if (!meta) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 border border-amber/40 bg-amber/10 px-2 py-0.5 font-mono text-[9px] text-amber uppercase tracking-wider",
          className
        )}
      >
        <span className="h-1.5 w-1.5 bg-amber animate-pulse" />
        AI-generated — unreviewed
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider",
        meta.className,
        className
      )}
    >
      {meta.label}
    </span>
  );
}