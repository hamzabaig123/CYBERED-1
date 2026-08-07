import { Sparkles } from "lucide-react";
import { Citation } from "@workspace/api-client-react";
import { CitationChip } from "./citation-chip";
import { cn } from "@/lib/utils";

interface ExplainPanelProps {
  explanation: string;
  citations?: Citation[];
  loading?: boolean;
  className?: string;
}

export function ExplainPanel({ explanation, citations, loading, className }: ExplainPanelProps) {
  if (loading) {
    return (
      <div className={cn("mt-2 rounded border border-teal/30 bg-teal/5 p-3", className)}>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-teal">
          <Sparkles className="h-3 w-3 animate-pulse" />
          Mining textbook...
        </div>
      </div>
    );
  }

  return (
    <div className={cn("mt-2 rounded border border-teal/30 bg-teal/5 p-3", className)}>
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-teal mb-2">
        <Sparkles className="h-3 w-3" />
        Explain From Book
      </div>
      <p className="font-sans text-sm leading-relaxed">{explanation}</p>
      {citations && citations.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 items-center">
          {citations.map((c, i) => (
            <CitationChip key={i} page={c.page} source={c.filename} />
          ))}
        </div>
      )}
    </div>
  );
}