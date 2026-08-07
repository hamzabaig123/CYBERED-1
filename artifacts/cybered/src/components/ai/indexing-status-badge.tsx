import { cn } from "@/lib/utils";

interface IndexingStatusBadgeProps {
  status?: string | null;
  className?: string;
}

const STATUS_META: Record<string, { label: string; className: string; pulse?: boolean }> = {
  not_created: { label: "No store", className: "border-border text-muted-foreground" },
  pending: { label: "Indexing", className: "border-primary/50 bg-primary/10 text-primary", pulse: true },
  ready: { label: "Ready", className: "border-teal/50 bg-teal/10 text-teal" },
  error: { label: "Error", className: "border-destructive/50 bg-destructive/10 text-destructive" },
};

export function IndexingStatusBadge({ status, className }: IndexingStatusBadgeProps) {
  const meta =
    STATUS_META[status ?? "not_created"] ?? STATUS_META.not_created;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        meta.className,
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          meta.pulse ? "bg-current animate-pulse" : "bg-current"
        )}
      />
      {meta.label}
    </span>
  );
}