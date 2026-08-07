import { useState } from "react";
import { Shell } from "@/components/layout/shell";
import {
  useListAIVerifications,
  useAcceptAIVerification,
  useDismissAIVerification,
  useVerifyQuestion,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AIGeneratedBadge } from "@/components/ai/ai-generated-badge";
import { CitationChip } from "@/components/ai/citation-chip";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Check, X, Sparkles, BookOpen, Quote } from "lucide-react";

const STATUS_FILTERS = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "kept_mine", label: "Kept Mine" },
  { value: "dismissed", label: "Dismissed" },
];

export default function VerificationQueuePage() {
  const [status, setStatus] = useState<"pending" | "accepted" | "kept_mine" | "dismissed" | undefined>("pending");
  const [questionId, setQuestionId] = useState("");

  const { data, refetch } = useListAIVerifications({
    status,
    limit: 50,
  });

  const { mutate: verifyQuestion } = useVerifyQuestion();
  const { mutate: accept } = useAcceptAIVerification();
  const { mutate: dismiss } = useDismissAIVerification();

      const { toast } = useToast();

  const handleVerify = () => {
    const qid = parseInt(questionId, 10);
    if (isNaN(qid)) return;
    verifyQuestion(
      { data: { questionId: qid } },
      { onSuccess: () => { setQuestionId(""); refetch(); } }
    );
  };

  const verifications = data?.verifications ?? [];

  const handleAccept = (verificationId: number) => {
    accept(
      { verificationId },
      {
        onSuccess: () => {
          toast({ title: "Book answer written to question" });
          refetch();
        },
        onError: () => toast({ title: "Accept failed", variant: "destructive" }),
      }
    );
  };

  const handleDismiss = (verificationId: number) => {
    dismiss(
      { verificationId },
      {
        onSuccess: () => {
          toast({ title: "Original answer kept" });
          refetch();
        },
        onError: () => toast({ title: "Dismiss failed", variant: "destructive" }),
      }
    );
  };

  return (
    <Shell>
      <div className="mb-4 border-b border-border pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold font-mono text-primary uppercase tracking-widest">
            AI Verification Queue
          </h1>
          <p className="text-muted-foreground font-mono text-xs mt-2 uppercase">
            Suggest — never auto-write // answer corroboration
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] text-muted-foreground">
          {data?.total ?? 0} total
        </Badge>
      </div>

      {/* Queue by question */}
      <div className="p-3 border border-border bg-card mb-4 flex flex-col gap-2">
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
          Queue A Question For Verification
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            className="h-9 w-40 font-mono text-xs"
            placeholder="Question ID"
            value={questionId}
            onChange={(e) => setQuestionId(e.target.value)}
          />
          <Button size="sm" className="h-9 text-xs" onClick={handleVerify}>
            <BookOpen className="mr-2 h-3 w-3" /> VERIFY AGAINST BOOK
          </Button>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={status === f.value ? "default" : "outline"}
            className="h-7 text-[10px]"
            onClick={() => setStatus(f.value === status ? undefined : (f.value as any))}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {verifications.length === 0 ? (
          <div className="text-center p-12 text-muted-foreground font-mono text-sm border border-dashed border-border">
            NO VERIFICATIONS IN THIS QUEUE
          </div>
        ) : (
          verifications.map((v) => (
            <VerificationCard
              key={v.id}
              v={v}
              onAccept={() => handleAccept(v.id)}
              onDismiss={() => handleDismiss(v.id)}
            />
          ))
        )}
      </div>
    </Shell>
  );
}

function VerificationCard({ v, onAccept, onDismiss }: any) {
  const [showStored, setShowStored] = useState(true);

  return (
    <div className={`border ${v.status === "pending" ? "border-border" : "border-border/60 opacity-80"} bg-card p-4`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="default" className="text-[10px]">{v.questionType}</Badge>
          <AIGeneratedBadge status={v.status === "pending" ? undefined : v.status === "accepted" ? "accepted" : v.status === "kept_mine" ? "kept_mine" : "dismissed"} />
          {v.confidence != null && (
            <Badge variant="outline" className="text-[9px] text-primary border-primary/40">
              conf {(v.confidence * 100).toFixed(0)}%
            </Badge>
          )}
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">
          Q#{v.questionId}
          {(v.subjectName || v.chapterName) && (
            <span className="opacity-70">
              {v.subjectName ? ` · ${v.subjectName}` : ""}
              {v.chapterName ? ` / ${v.chapterName}` : ""}
            </span>
          )}
        </div>
      </div>

      {v.questionText && (
        <div className="mb-3 p-3 border-l-2 border-border bg-muted/20">
          <p className="font-mono text-[10px] text-muted-foreground uppercase mb-1">Question</p>
          <p className="font-sans text-sm">{v.questionText}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {/* Stored answer */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setShowStored(!showStored)}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            <Quote className="h-3 w-3" />
            Current Stored Answer
            <span className="text-[9px] opacity-60">({showStored ? "hide" : "show"})</span>
          </button>
          {showStored && (
            <div className="min-h-[60px] border border-border bg-background p-3 text-xs font-sans leading-relaxed">
              {v.storedAnswer || <span className="text-muted-foreground italic">No stored answer</span>}
            </div>
          )}
        </div>

        {/* AI answer */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-teal">
              <Sparkles className="h-3 w-3" />
              AI Book Answer
            </span>
            {v.sourcePage != null && (
              <CitationChip page={v.sourcePage} source={v.sourceFilename} />
            )}
          </div>
          <div className="min-h-[60px] border border-teal/30 bg-teal/5 p-3 text-xs font-sans leading-relaxed">
            {v.aiAnswer}
          </div>
        </div>
      </div>

      {v.status === "pending" ? (
        <div className="mt-4 flex gap-2">
          <Button size="sm" className="h-8 text-[10px]" onClick={onAccept}>
            <BookOpen className="mr-1 h-3 w-3" /> USE BOOK ANSWER
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-[10px] text-destructive border-destructive/40 hover:bg-destructive/10" onClick={onDismiss}>
            <X className="mr-1 h-3 w-3" /> KEEP MINE
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <ShieldCheck className="h-3 w-3" />
          Resolved · {v.status.replace("_", " ")}
        </div>
      )}
    </div>
  );
}